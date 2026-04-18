/**
 * Static legal pages — Privacy Policy + Terms of Use.
 *
 * These are content-only routes rendered at /privacy and /terms. Required
 * before App Store / Google Play submission, and linked in the profile
 * footer + confirmation email footer.
 *
 * Content is voluntarily short, plain-spoken, and pas truffé de juridique —
 * écris-le toi-même si tu veux quelque chose de plus costaud pour un
 * lancement à grande échelle. Pour un MVP FR, ça passe.
 */

interface LegalPagesProps {
  page: "privacy" | "terms";
  onBack: () => void;
}

export function LegalPages({ page, onBack }: LegalPagesProps) {
  return (
    <div className="min-h-screen bg-surface-light pb-16">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-tertiary mb-6 hover:text-text-secondary"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-sm">Retour</span>
        </button>

        {page === "privacy" ? <PrivacyContent /> : <TermsContent />}
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <article className="prose prose-sm max-w-none text-text-secondary">
      <h1 className="text-2xl font-extrabold text-text-primary mb-2">Politique de confidentialité</h1>
      <p className="text-xs text-text-tertiary mb-6">Dernière mise à jour : 18 avril 2026</p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">En bref</h2>
      <p>
        Ploom est une app de bibliothèque personnelle. On collecte le strict
        minimum pour que ça marche — ton email pour te connecter, les livres
        que tu ajoutes, tes réglages — et on ne vend rien à personne.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Ce qu'on collecte</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Email et prénom</strong> — pour identifier ton compte et te parler.</li>
        <li><strong>Mot de passe</strong> — stocké chiffré (bcrypt), on ne peut jamais le voir.</li>
        <li><strong>Livres, catégories, notes, groupes</strong> — c'est le contenu que tu crées.</li>
        <li><strong>Données d'usage anonymisées</strong> — crashes et erreurs techniques via Sentry, sans PII (email / IP retirés).</li>
      </ul>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Ce qu'on ne fait pas</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>On <strong>ne vend pas</strong> tes données à des tiers.</li>
        <li>On <strong>n'affiche pas de pubs</strong> — jamais.</li>
        <li>On <strong>ne tracke pas</strong> ton comportement hors de l'app (pas de Google Analytics, pas de Meta pixel).</li>
      </ul>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Où sont stockées tes données</h2>
      <p>
        Tout est hébergé chez <strong>Supabase</strong> (infrastructure AWS
        Europe, Francfort). Les covers de livres sont stockés sur
        Supabase Storage. On utilise <strong>Brevo</strong> (France) pour les
        emails transactionnels (confirmation, reset password) et{" "}
        <strong>Sentry</strong> (USA) pour le monitoring d'erreurs.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Tes droits (RGPD)</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Accès &amp; export</strong> — toutes tes données sont
          dans l'app, exportables en CSV / PDF depuis l'écran Partage.
        </li>
        <li>
          <strong>Suppression</strong> — bouton "Supprimer mon compte"
          dans le Profil. Efface instantanément tes livres, catégories,
          groupes, et ton compte auth.
        </li>
        <li>
          <strong>Rectification</strong> — tu édites directement depuis l'app
          (nom, livres, notes).
        </li>
        <li>
          <strong>Contact</strong> — pour toute question :{" "}
          <a href="mailto:ploomlivre@gmail.com" className="text-brand-grape underline">ploomlivre@gmail.com</a>
        </li>
      </ul>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Cookies</h2>
      <p>
        Le site utilise uniquement un cookie de session pour te garder
        connecté — aucun cookie analytique ni publicitaire.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Modifications</h2>
      <p>
        Si cette politique change, on te préviendra par email. La date en haut
        de page reflète la dernière mise à jour.
      </p>
    </article>
  );
}

function TermsContent() {
  return (
    <article className="prose prose-sm max-w-none text-text-secondary">
      <h1 className="text-2xl font-extrabold text-text-primary mb-2">Conditions d'utilisation</h1>
      <p className="text-xs text-text-tertiary mb-6">Dernière mise à jour : 18 avril 2026</p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Utilisation du service</h2>
      <p>
        Ploom est un service gratuit de gestion de bibliothèque personnelle.
        En créant un compte, tu acceptes de l'utiliser dans un cadre normal :
        pas de spam, pas d'abus de ressources, pas de contenu illégal ou
        haineux dans les champs libres (notes, commentaires de groupe).
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Ton contenu</h2>
      <p>
        Les livres, notes, commentaires que tu ajoutes restent à toi. On ne
        s'en sert pas pour entraîner des modèles, on ne les partage pas hors
        des groupes où tu les mets explicitement.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Disponibilité</h2>
      <p>
        On fait de notre mieux pour que Ploom reste accessible, mais c'est un
        service fourni "tel quel" — on ne garantit pas une disponibilité 24/7,
        notamment pendant les maintenances Supabase ou Vercel.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Résiliation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis le Profil. On peut
        résilier le tien en cas d'abus répétés, après préavis par email.
      </p>

      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Contact</h2>
      <p>
        Pour toute question :{" "}
        <a href="mailto:ploomlivre@gmail.com" className="text-brand-grape underline">ploomlivre@gmail.com</a>
      </p>
    </article>
  );
}
