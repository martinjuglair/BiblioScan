import { useCallback, useEffect, useState } from "react";
import { supabase } from "@infrastructure/supabase/client";

/**
 * Engagement (push + in-app) management view, embedded inside the
 * /admin dashboard. Self-contained: parent passes the admin password
 * once at mount, every action calls a password-gated RPC or the
 * `send_campaign` Edge Function.
 *
 * Layout:
 *   - Header with "Nouvelle campagne" button
 *   - Either the COMPOSER (when creating/editing) or the LIST of
 *     existing campaigns. No tabs — a single screen toggling between
 *     two modes keeps the dashboard footprint minimal.
 *
 * State is loaded fresh on mount (and on every send) — no realtime
 * subscriptions yet. Refresh button is in the header.
 */

interface Props {
  password: string;
}

interface Campaign {
  id: string;
  name: string;
  push_title: string | null;
  push_body: string | null;
  push_deep_link: string | null;
  inapp_title: string | null;
  inapp_body: string | null;
  inapp_cta_label: string | null;
  inapp_cta_link: string | null;
  inapp_image_url: string | null;
  segment: string;
  status: "draft" | "sending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
}

const SEGMENTS: { slug: string; label: string }[] = [
  { slug: "all", label: "Tous les utilisateurs" },
  { slug: "new_7d", label: "Nouveaux (< 7 jours)" },
  { slug: "inactive_30d", label: "Inactifs (> 30 jours)" },
  { slug: "no_book", label: "Sans aucun livre ajouté" },
  { slug: "with_book", label: "Avec ≥ 1 livre" },
  { slug: "in_group", label: "Dans ≥ 1 groupe" },
  { slug: "without_group", label: "Sans aucun groupe" },
];

const STATUS_BADGE: Record<Campaign["status"], { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "#5C5963", bg: "#ECE9EE" },
  sending: { label: "Envoi en cours", color: "#FB6538", bg: "#FFF1EC" },
  sent: { label: "Envoyée", color: "#10B981", bg: "#ECFDF5" },
  failed: { label: "Échec", color: "#DC2626", bg: "#FEF2F2" },
};

export function EngagementView({ password }: Props) {
  const [mode, setMode] = useState<"list" | "compose">("list");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "admin_list_campaigns",
        { p_password: password },
      );
      if (rpcError) throw rpcError;
      setCampaigns((data as Campaign[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Engagement
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Envoie des notifications push et des bannières in-app à tes
            utilisateurs.
          </p>
        </div>
        {mode === "list" ? (
          <button
            onClick={() => setMode("compose")}
            className="px-4 py-2 bg-[#FB6538] text-white font-bold rounded-lg hover:opacity-90 transition"
          >
            + Nouvelle campagne
          </button>
        ) : (
          <button
            onClick={() => {
              setMode("list");
              refresh();
            }}
            className="px-4 py-2 text-slate-600 font-semibold hover:text-slate-900 transition"
          >
            ← Retour à la liste
          </button>
        )}
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3 text-sm">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {mode === "list" && (
        <CampaignList
          campaigns={campaigns}
          loading={loading}
          password={password}
          onChange={refresh}
        />
      )}

      {mode === "compose" && (
        <Composer
          password={password}
          onDone={() => {
            setMode("list");
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════ Campaign List ════════════════════════ */

function CampaignList({
  campaigns,
  loading,
  password,
  onChange,
}: {
  campaigns: Campaign[];
  loading: boolean;
  password: string;
  onChange: () => void;
}) {
  if (loading && campaigns.length === 0) {
    return <p className="text-slate-500">Chargement…</p>;
  }
  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-slate-600 mb-1">Aucune campagne pour le moment.</p>
        <p className="text-sm text-slate-400">
          Crée ta première campagne pour engager tes utilisateurs.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Campagne</th>
            <th className="text-left px-4 py-3 font-semibold">Segment</th>
            <th className="text-left px-4 py-3 font-semibold">Statut</th>
            <th className="text-right px-4 py-3 font-semibold">Envoyés</th>
            <th className="text-right px-4 py-3 font-semibold">Cliqués</th>
            <th className="text-left px-4 py-3 font-semibold">Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              password={password}
              onChange={onChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignRow({
  campaign,
  password,
  onChange,
}: {
  campaign: Campaign;
  password: string;
  onChange: () => void;
}) {
  const [sending, setSending] = useState(false);
  const badge = STATUS_BADGE[campaign.status];
  const segmentLabel = SEGMENTS.find((s) => s.slug === campaign.segment)?.label
    ?? campaign.segment;

  const handleSend = async () => {
    const yes = confirm(
      `Envoyer "${campaign.name}" à tous les utilisateurs du segment "${segmentLabel}" ?\n\nCette action est définitive.`,
    );
    if (!yes) return;
    setSending(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send_campaign`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          admin_password: password,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      alert(`✅ Envoyée à ${json.sent} utilisateur(s) (${json.failed} échecs).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`❌ Échec de l'envoi : ${msg}`);
    } finally {
      setSending(false);
      onChange();
    }
  };

  const handleDelete = async () => {
    const yes = confirm(`Supprimer le brouillon "${campaign.name}" ?`);
    if (!yes) return;
    try {
      const { error } = await supabase.rpc("admin_delete_campaign", {
        p_password: password,
        p_campaign_id: campaign.id,
      });
      if (error) throw error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`❌ Échec : ${msg}`);
    }
    onChange();
  };

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{campaign.name}</p>
        {campaign.push_title && (
          <p className="text-xs text-slate-500 truncate max-w-xs">
            🔔 {campaign.push_title}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{segmentLabel}</td>
      <td className="px-4 py-3">
        <span
          className="px-2 py-0.5 text-xs font-bold rounded-full"
          style={{ color: badge.color, backgroundColor: badge.bg }}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {campaign.delivered_count} / {campaign.recipient_count}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{campaign.clicked_count}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">
        {campaign.sent_at
          ? new Date(campaign.sent_at).toLocaleString("fr-FR")
          : new Date(campaign.created_at).toLocaleDateString("fr-FR")}
      </td>
      <td className="px-4 py-3 text-right">
        {campaign.status === "draft" && (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-3 py-1 bg-[#FB6538] text-white text-xs font-bold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "..." : "Envoyer"}
            </button>
            <button
              onClick={handleDelete}
              disabled={sending}
              className="px-3 py-1 text-slate-500 text-xs font-semibold hover:text-rose-600"
            >
              Supprimer
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ════════════════════════ Composer ════════════════════════ */

function Composer({
  password,
  onDone,
}: {
  password: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushDeepLink, setPushDeepLink] = useState("");
  const [inappTitle, setInappTitle] = useState("");
  const [inappBody, setInappBody] = useState("");
  const [inappCtaLabel, setInappCtaLabel] = useState("");
  const [inappCtaLink, setInappCtaLink] = useState("");
  const [inappImageUrl, setInappImageUrl] = useState("");
  const [segment, setSegment] = useState("all");
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Live segment count
  useEffect(() => {
    let cancelled = false;
    setSegmentCount(null);
    supabase
      .rpc("admin_segment_count", { p_password: password, p_segment: segment })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error) setSegmentCount(data as number);
      });
    return () => {
      cancelled = true;
    };
  }, [segment, password]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Donne un nom interne à la campagne.");
      return;
    }
    if (!pushTitle.trim() && !inappTitle.trim()) {
      alert("Au moins un titre push OU un titre in-app est requis.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_create_campaign", {
        p_password: password,
        p_name: name.trim(),
        p_push_title: pushTitle.trim(),
        p_push_body: pushBody.trim(),
        p_push_deep_link: pushDeepLink.trim(),
        p_inapp_title: inappTitle.trim(),
        p_inapp_body: inappBody.trim(),
        p_inapp_cta_label: inappCtaLabel.trim(),
        p_inapp_cta_link: inappCtaLink.trim(),
        p_inapp_image_url: inappImageUrl.trim(),
        p_segment: segment,
      });
      if (error) throw error;
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`❌ Échec : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <Section title="Nom interne" hint="Visible uniquement par toi.">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Reveil des inactifs Mai 2026"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
          />
        </Section>

        <Section title="Notification push" hint="Ce que l'utilisateur voit sur son écran de verrouillage.">
          <input
            type="text"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            placeholder="Titre (court)"
            className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
          />
          <textarea
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            placeholder="Corps du message"
            rows={2}
            className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
          />
          <input
            type="text"
            value={pushDeepLink}
            onChange={(e) => setPushDeepLink(e.target.value)}
            placeholder="Deep link (ex: ploom://discover) — optionnel"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538] text-sm font-mono"
          />
        </Section>

        <Section title="Bannière in-app" hint="Affichée au prochain lancement de l'app. Optionnel.">
          <input
            type="text"
            value={inappTitle}
            onChange={(e) => setInappTitle(e.target.value)}
            placeholder="Titre"
            className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
          />
          <textarea
            value={inappBody}
            onChange={(e) => setInappBody(e.target.value)}
            placeholder="Corps du message"
            rows={3}
            className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={inappCtaLabel}
              onChange={(e) => setInappCtaLabel(e.target.value)}
              placeholder="Label du bouton (ex: Découvrir)"
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538]"
            />
            <input
              type="text"
              value={inappCtaLink}
              onChange={(e) => setInappCtaLink(e.target.value)}
              placeholder="Lien (ex: ploom://discover)"
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538] text-sm font-mono"
            />
          </div>
          <input
            type="text"
            value={inappImageUrl}
            onChange={(e) => setInappImageUrl(e.target.value)}
            placeholder="URL de l'image de bannière — optionnel"
            className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538] text-sm font-mono"
          />
        </Section>

        <Section title="Ciblage" hint="Combien d'utilisateurs reçoivent cette campagne.">
          <div className="space-y-2">
            {SEGMENTS.map((s) => (
              <label key={s.slug} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="segment"
                  value={s.slug}
                  checked={segment === s.slug}
                  onChange={() => setSegment(s.slug)}
                  className="accent-[#FB6538]"
                />
                <span className="flex-1 text-slate-700">{s.label}</span>
                {segment === s.slug && segmentCount !== null && (
                  <span className="text-xs font-semibold text-[#FB6538]">
                    {segmentCount.toLocaleString("fr-FR")} users
                  </span>
                )}
              </label>
            ))}
          </div>
        </Section>

        <div className="pt-2 flex justify-end gap-2">
          <button
            onClick={onDone}
            className="px-4 py-2 text-slate-600 font-semibold hover:text-slate-900"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#FB6538] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          Tu pourras lancer l'envoi depuis la liste, après vérification.
        </p>
      </div>

      {/* Preview pane */}
      <div className="bg-slate-100 rounded-2xl p-5 space-y-4 lg:sticky lg:top-4 h-fit">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Aperçu
        </h3>

        {/* iOS push preview */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-3 shadow-sm border border-slate-200">
          <div className="flex items-start gap-2.5">
            <div
              className="w-10 h-10 rounded-md flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #FB6538 0%, #FF8B5F 50%, #FFC83D 100%)",
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">PLOOM</p>
                <p className="text-[10px] text-slate-400">maintenant</p>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {pushTitle || "Titre du push"}
              </p>
              <p className="text-xs text-slate-600 line-clamp-2">
                {pushBody || "Corps du message…"}
              </p>
            </div>
          </div>
        </div>

        {/* In-app banner preview (only if any in-app field is set) */}
        {(inappTitle || inappBody) && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Bannière in-app
            </p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200">
              {inappImageUrl && (
                <img
                  src={inappImageUrl}
                  alt=""
                  className="w-full h-24 object-cover bg-slate-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="p-3">
                <p className="text-sm font-extrabold text-slate-900 mb-1">
                  {inappTitle || "Titre"}
                </p>
                <p className="text-xs text-slate-600 mb-2 line-clamp-3">
                  {inappBody || "Corps du message…"}
                </p>
                {inappCtaLabel && (
                  <button className="bg-[#FB6538] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {inappCtaLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-900 mb-1">{title}</h4>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}
