/**
 * Edge Function: send_test_push
 *
 * Sends a one-off push notification to a specific user (looked up by
 * email). Bypasses the campaign system entirely — used by the
 * dashboard's "Tester sur un email" button to QA a push payload
 * before broadcasting to a real segment.
 *
 * Differences vs send_campaign:
 *   - No campaign / recipient rows are created. The push is
 *     ephemeral and leaves no trace in engagement_*  tables.
 *   - Recipient is identified by email, not segment.
 *   - Returns immediately after the Expo Push API call.
 *
 * Deployment:
 *   cd bd-collection
 *   npx supabase functions deploy send_test_push --project-ref <ref>
 *
 * Invocation:
 *   POST https://<project>.supabase.co/functions/v1/send_test_push
 *   Authorization: Bearer <SUPABASE_ANON_KEY>
 *   Content-Type: application/json
 *   {
 *     "admin_password": "...",
 *     "email": "test@example.com",
 *     "push_title": "Hello",
 *     "push_body": "World",
 *     "push_deep_link": "ploom://discover"   // optional
 *   }
 */
// @ts-expect-error — Deno runtime resolves this URL at edge build time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface TokenRow {
  user_id: string;
  token: string;
  platform: "ios" | "android";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      admin_password,
      email,
      push_title,
      push_body,
      push_deep_link,
    } = body;

    if (!admin_password || !email) {
      return Response.json(
        { ok: false, error: "admin_password and email required" },
        { status: 400 },
      );
    }
    if (!push_title && !push_body) {
      return Response.json(
        { ok: false, error: "At least push_title or push_body required" },
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

    // 1. Lookup tokens via SQL RPC (verifies password + scopes by email)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "admin_get_push_tokens_for_email",
      { p_password: admin_password, p_email: email },
    );

    if (rpcError) {
      const status = rpcError.code === "42501" ? 401 : 500;
      return Response.json(
        { ok: false, error: rpcError.message },
        { status },
      );
    }

    const tokens = (rpcData as { tokens: TokenRow[] } | null)?.tokens ?? [];

    if (tokens.length === 0) {
      return Response.json({
        ok: true,
        sent: 0,
        failed: 0,
        warning:
          "User exists but has no registered push token. They need to open the app at least once on a real device with notifications granted.",
      });
    }

    // 2. Push to Expo
    const messages = tokens.map((t) => ({
      to: t.token,
      title: push_title ?? "Ploom",
      body: push_body ?? "",
      data: {
        deep_link: push_deep_link ?? null,
        test: true,
      },
      sound: "default",
      priority: "high",
    }));

    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const json = (await res.json()) as {
      data?: Array<{ status: "ok" | "error"; message?: string }>;
      errors?: Array<{ message: string }>;
    };

    if (json.errors && json.errors.length > 0) {
      return Response.json({
        ok: false,
        error: json.errors.map((e) => e.message).join("; "),
      }, { status: 502 });
    }

    const receipts = json.data ?? [];
    const sent = receipts.filter((r) => r.status === "ok").length;
    const failed = receipts.filter((r) => r.status === "error").length;
    const firstError = receipts.find((r) => r.status === "error")?.message;

    return Response.json({
      ok: true,
      sent,
      failed,
      total: tokens.length,
      error: firstError ?? undefined,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: errMsg },
      { status: 500 },
    );
  }
});
