import { useEffect, useState } from "react";
import { supabase } from "@infrastructure/supabase/client";

/**
 * Modal shown when Supabase emits a PASSWORD_RECOVERY event.
 * This fires automatically when the user lands on the app via the link
 * in the reset-password email (Supabase auto-hydrates the session from
 * the URL fragment). We just let them pick a new password.
 */
export function ResetPasswordModal() {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setVisible(true);
      }
    });

    // Also detect direct visits to /auth/reset-password (e.g. if Supabase
    // has processed the fragment before this effect runs).
    if (window.location.pathname.startsWith("/auth/reset-password")) {
      setVisible(true);
    }

    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Ajoute au moins un chiffre.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  const handleClose = async () => {
    await supabase.auth.signOut();
    setVisible(false);
    // Strip the recovery hash/pathname so the page returns to /
    window.location.replace("/");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-hero max-w-sm w-full p-6">
        {done ? (
          <>
            <div className="text-4xl text-center mb-3">🎉</div>
            <h2 className="text-xl font-extrabold text-text-primary text-center mb-2">
              Mot de passe mis à jour
            </h2>
            <p className="text-sm text-text-secondary text-center mb-5">
              Tu peux maintenant te connecter avec ton nouveau mot de passe.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-pill bg-brand-grape text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Me connecter
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-text-primary mb-2 -tracking-[0.5px]">
              Nouveau mot de passe
            </h2>
            <p className="text-sm text-text-secondary mb-5">
              Choisis un nouveau mot de passe — au moins 8 caractères avec un chiffre.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="input-field w-full mb-3"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmer"
              className="input-field w-full mb-3"
              autoComplete="new-password"
            />

            {error && (
              <p className="text-status-error text-sm mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-pill bg-brand-grape text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
