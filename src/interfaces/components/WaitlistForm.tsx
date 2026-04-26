import { useState } from "react";
import { supabase } from "@infrastructure/supabase/client";

interface WaitlistFormProps {
  /** Where on the LP this form is rendered — useful for analytics later. */
  source?: string;
  /** "dark" = on dark gradient (white inputs); "light" = on white (dark inputs). */
  variant?: "light" | "dark";
}

/**
 * Email capture form for the pre-launch waitlist. Inserts into the public
 * `waitlist` table (RLS allows insert for anon). Idempotent — submitting
 * the same email twice silently no-ops thanks to the UNIQUE INDEX.
 *
 * Visible on the LP under the "Bientôt disponible" CTAs since the App
 * Store / Play Store buttons are inactive. Without this we lose every
 * pre-launch lead.
 */
export function WaitlistForm({ source = "lp_hero", variant = "light" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isDark = variant === "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Cette adresse ne semble pas valide.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from("waitlist")
        .insert({
          email: email.trim().toLowerCase(),
          source,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      // Postgres unique violation = email already on list. Treat as success
      // so the user doesn't think the form is broken.
      if (insertErr && insertErr.code !== "23505") {
        setStatus("error");
        setError("Erreur, réessaie dans un instant.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Erreur réseau, réessaie.");
    }
  };

  if (status === "success") {
    return (
      <div className={`mt-4 max-w-sm ${isDark ? "" : "mx-auto md:mx-0"} text-left`}>
        <div className={`rounded-xl px-4 py-3 ${isDark ? "bg-white/15 text-white" : "bg-brand-grape/10 text-brand-grape"}`}>
          <p className="text-sm font-bold">🎉 Merci !</p>
          <p className={`text-xs mt-1 ${isDark ? "text-white/80" : "text-text-secondary"}`}>
            On te prévient dès que Ploom est disponible sur les stores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-4 max-w-sm ${isDark ? "" : "mx-auto md:mx-0"}`}
    >
      <p className={`text-xs font-semibold mb-2 ${isDark ? "text-white/85" : "text-text-secondary"}`}>
        🔔 Préviens-moi à la sortie
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          className={`flex-1 rounded-pill px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-grape transition-all ${
            isDark
              ? "bg-white/15 text-white placeholder-white/60 border border-white/20"
              : "bg-white text-text-primary placeholder-text-muted border border-border"
          }`}
          disabled={status === "loading"}
          aria-label="Adresse email pour la liste d'attente"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`rounded-pill px-5 py-3 text-sm font-bold transition-transform active:scale-95 disabled:opacity-60 ${
            isDark
              ? "bg-white text-brand-grape"
              : "bg-brand-grape text-white"
          }`}
        >
          {status === "loading" ? "…" : "M'inscrire"}
        </button>
      </div>
      {error && (
        <p className={`text-xs mt-2 ${isDark ? "text-yellow-100" : "text-status-error"}`}>
          {error}
        </p>
      )}
    </form>
  );
}
