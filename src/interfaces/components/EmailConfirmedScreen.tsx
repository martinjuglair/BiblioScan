import { useEffect, useState } from "react";

/**
 * Shown when the user lands on the site via the Supabase email-confirmation
 * link (`?type=signup` / `#type=signup`). Without this screen they used to
 * bounce straight into the LandingPage and wonder if confirmation actually
 * worked.
 *
 * We detect the confirmation context by:
 *   - URL fragment containing `type=signup` (Supabase implicit flow), or
 *   - URL pathname starting with `/auth/confirm` (Supabase PKCE flow), or
 *   - The Supabase JS client emitting the SIGNED_IN event for the very
 *     first time on this device (handled by the parent App via prop).
 */
export function EmailConfirmedScreen({ onContinue }: { onContinue: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(ua));
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background:
          "linear-gradient(135deg, #FB6538 0%, #FF3C7A 50%, #FFC83D 100%)",
      }}
    >
      <div className="bg-white rounded-3xl shadow-hero p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-3" role="img" aria-label="Email confirmé">
          🎉
        </div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-2 tracking-tight">
          Email confirmé !
        </h1>
        <p className="text-text-secondary leading-relaxed mb-6">
          Bienvenue sur Ploom. Ton compte est prêt.
        </p>

        {isMobile ? (
          <>
            <p className="text-sm text-text-tertiary mb-4 leading-relaxed">
              Si l'app Ploom est installée sur ton téléphone, tu peux y
              retourner pour te connecter.
            </p>
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-pill bg-brand-grape text-white font-bold text-sm active:scale-95 transition-transform mb-2"
            >
              Continuer ici (Web)
            </button>
            <p className="text-xs text-text-muted">
              Pas encore l'app ? Bientôt sur l'App Store et Google Play.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-tertiary mb-4 leading-relaxed">
              Tu peux maintenant te connecter à Ploom depuis ton téléphone
              ou continuer ici dans le navigateur.
            </p>
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-pill bg-brand-grape text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Entrer dans Ploom
            </button>
          </>
        )}
      </div>
    </div>
  );
}
