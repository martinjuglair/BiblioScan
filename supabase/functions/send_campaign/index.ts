/**
 * Edge Function: send_campaign
 *
 * Triggered from the admin dashboard when an admin clicks "Envoyer
 * maintenant" on a campaign. Orchestrates the full send:
 *
 *   1. Verify admin password by calling `admin_prepare_send_campaign`
 *      (the RPC's own password check is the source of truth — this
 *      function never sees plaintext keys).
 *   2. Read back the campaign payload + audience (user_id × token)
 *      list from the RPC's response.
 *   3. Fan out push messages to the Expo Push API in batches of 100.
 *   4. Update each recipient row with `push_sent_at` / `push_error`.
 *   5. Flip campaign status to 'sent' (or 'failed' on total failure)
 *      via `admin_mark_campaign_sent`.
 *
 * Deployment:
 *   cd bd-collection
 *   npx supabase functions deploy send_campaign --project-ref <ref>
 *
 * Invocation from dashboard:
 *   POST https://<project>.supabase.co/functions/v1/send_campaign
 *   Authorization: Bearer <SUPABASE_ANON_KEY>
 *   Content-Type: application/json
 *   { "campaign_id": "uuid", "admin_password": "..." }
 *
 * Returns: { ok: true, sent: N, failed: N } on success
 */
// @ts-expect-error — Deno runtime resolves these URLs at edge build time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Expo Push API endpoint — global, free, no rate-limit for normal use
const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo accepts up to 100 messages per call

interface RecipientRow {
  user_id: string;
  token: string;
  platform: "ios" | "android";
}

interface CampaignRow {
  id: string;
  push_title: string | null;
  push_body: string | null;
  push_deep_link: string | null;
  recipient_count: number;
}

interface PreparePayload {
  campaign: CampaignRow;
  recipients: RecipientRow[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { campaign_id, admin_password } = await req.json().catch(() => ({}));
    if (!campaign_id || !admin_password) {
      return Response.json(
        { ok: false, error: "campaign_id and admin_password required" },
        { status: 400 },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ── Step 1: prepare (verifies password, inserts recipients,
    //           flips status to 'sending', returns audience) ──
    const { data: prepareData, error: prepareError } = await supabase.rpc(
      "admin_prepare_send_campaign",
      { p_password: admin_password, p_campaign_id: campaign_id },
    );

    if (prepareError) {
      // 42501 = password rejected at SQL level
      const status = prepareError.code === "42501" ? 401 : 500;
      return Response.json(
        { ok: false, error: prepareError.message },
        { status },
      );
    }

    const payload = prepareData as PreparePayload;
    const recipients: RecipientRow[] = payload?.recipients ?? [];
    const campaign = payload?.campaign;

    if (!campaign) {
      return Response.json(
        { ok: false, error: "Campaign payload missing from RPC response" },
        { status: 500 },
      );
    }

    // Determine whether this campaign carries a push payload at all.
    // In-app-only campaigns (no push_title and no push_body) skip the
    // Expo Push API entirely — the recipient rows already exist (the
    // RPC inserted them), so the in-app banner will appear next time
    // each user opens the app. Saves wasted Expo calls + makes
    // delivered_count semantically accurate.
    const hasPushPayload = Boolean(
      (campaign.push_title && campaign.push_title.length > 0) ||
      (campaign.push_body && campaign.push_body.length > 0),
    );

    if (!hasPushPayload || recipients.length === 0) {
      await supabase.rpc("admin_mark_campaign_sent", {
        p_password: admin_password,
        p_campaign_id: campaign_id,
        // No pushes attempted → delivered = 0, but the campaign is
        // still "sent" because the in-app side is fully deployed by
        // the inserted recipient rows.
        p_delivered: 0,
        p_failed: 0,
      });
      return Response.json({
        ok: true,
        sent: 0,
        failed: 0,
        skippedPush: !hasPushPayload,
        recipients: recipients.length,
      });
    }

    // ── Step 2: batch push to Expo ──
    let totalSent = 0;
    let totalFailed = 0;
    const updates: Array<{
      user_id: string;
      campaign_id: string;
      push_sent_at?: string;
      push_error?: string | null;
    }> = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const messages = batch.map((r) => ({
        to: r.token,
        title: campaign.push_title ?? "Ploom",
        body: campaign.push_body ?? "",
        data: {
          campaign_id: campaign.id,
          deep_link: campaign.push_deep_link ?? null,
        },
        sound: "default",
        priority: "high",
      }));

      try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(messages),
        });

        const json = (await res.json()) as {
          data?: Array<{ status: "ok" | "error"; message?: string; id?: string }>;
          errors?: Array<{ message: string }>;
        };

        const receipts = json.data ?? [];
        receipts.forEach((receipt, idx) => {
          const recipient = batch[idx]!;
          const now = new Date().toISOString();
          if (receipt.status === "ok") {
            totalSent++;
            updates.push({
              user_id: recipient.user_id,
              campaign_id,
              push_sent_at: now,
            });
          } else {
            totalFailed++;
            updates.push({
              user_id: recipient.user_id,
              campaign_id,
              push_sent_at: now,
              push_error: receipt.message ?? "unknown",
            });
          }
        });
      } catch (e) {
        // Whole batch failed (network blip, Expo 5xx). Mark every row
        // in the batch as failed and continue with the next batch.
        const errMsg = e instanceof Error ? e.message : String(e);
        const now = new Date().toISOString();
        for (const r of batch) {
          totalFailed++;
          updates.push({
            user_id: r.user_id,
            campaign_id,
            push_sent_at: now,
            push_error: `batch-failed: ${errMsg}`,
          });
        }
      }
    }

    // ── Step 3: persist per-recipient outcomes ──
    // Upsert in chunks so we don't pile up a huge single statement.
    for (let i = 0; i < updates.length; i += 200) {
      const slice = updates.slice(i, i + 200);
      for (const u of slice) {
        await supabase
          .from("engagement_recipients")
          .update({
            push_sent_at: u.push_sent_at,
            push_error: u.push_error ?? null,
          })
          .eq("campaign_id", u.campaign_id)
          .eq("user_id", u.user_id);
      }
    }

    // ── Step 4: final status flip ──
    await supabase.rpc("admin_mark_campaign_sent", {
      p_password: admin_password,
      p_campaign_id: campaign_id,
      p_delivered: totalSent,
      p_failed: totalFailed,
    });

    return Response.json({
      ok: true,
      sent: totalSent,
      failed: totalFailed,
      total: recipients.length,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: errMsg },
      { status: 500 },
    );
  }
});
