/**
 * Shown when the user lands on the site via the Supabase email-confirmation
 * link (`type=signup` in the URL). Without this screen they used to bounce
 * straight into the LandingPage and wonder if confirmation worked.
 *
 * The web version has been deprecated in favour of native — so this screen
 * just confirms success and points the user back to the mobile app. No
 * "Continuer ici (Web)" CTA: visitors who land here from an email click on
 * desktop can still close the tab; the message is the goal.
 *
 * `onContinue` is kept as a prop so App.tsx can dismiss the screen if the
 * user really wants to inspect the web (we no longer expose the button).
 */
export function EmailConfirmedScreen({ onContinue: _onContinue }: { onContinue: () => void }) {
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

        <div className="rounded-2xl bg-brand-grape/10 px-4 py-4 mb-4">
          <p className="text-sm font-semibold text-text-primary mb-1">
            📱 Retourne sur l'app Ploom
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Ouvre l'application sur ton téléphone et tape « J'ai confirmé,
            me connecter » pour finaliser ta connexion.
          </p>
        </div>

        <p className="text-xs text-text-muted">
          Pas encore l'app ? Bientôt sur l'App Store et Google Play.
        </p>
      </div>
    </div>
  );
}
