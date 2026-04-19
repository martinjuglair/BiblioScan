import { useEffect, useState } from "react";

/**
 * Marketing landing page shown at `/` to unauthenticated visitors.
 *
 * Goal: persuade visitors to either download the native app (once
 * published) or jump straight into the web version via "Se connecter".
 *
 * Structure:
 *   - Sticky nav (logo + login button)
 *   - Hero (headline + CTAs + phone mockup)
 *   - Feature grid (4 features)
 *   - Stats strip
 *   - Final CTA
 *   - Footer with legal links
 */

interface LandingPageProps {
  onLogin: () => void;
  onOpenLegal: (page: "privacy" | "terms") => void;
}

export function LandingPage({ onLogin, onOpenLegal }: LandingPageProps) {
  // Minimal scroll state so the nav gets a subtle backdrop once the user
  // scrolls past the hero.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-light overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-lg shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2">
            <img src="/ploom-logo.png" alt="Ploom" className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-extrabold text-text-primary tracking-tight">Ploom</span>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="#features"
              className="hidden sm:inline-block text-sm font-semibold text-text-secondary hover:text-text-primary transition"
            >
              Fonctionnalités
            </a>
            <button
              onClick={onLogin}
              className="bg-brand-grape hover:bg-brand-grape/90 text-white font-bold text-sm px-5 py-2.5 rounded-pill shadow-card transition-all duration-200 active:scale-95"
            >
              Se connecter
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        id="hero"
        className="pt-28 pb-16 md:pt-36 md:pb-24 px-5 relative"
      >
        {/* Decorative blobs */}
        <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-brand-grape/15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brand-sun/20 blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center relative">
          {/* Left: text */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-grape/10 text-brand-grape text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-pill mb-6">
              ✨ 100% Gratuit · Zéro pub
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-text-primary tracking-tighter leading-[1.02] mb-5">
              Ton compagnon<br />
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #FB6538 0%, #FF3C7A 50%, #FFC83D 100%)" }}
              >
                de lecture.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary max-w-lg mx-auto md:mx-0 mb-8 leading-relaxed">
              Scanne, note, partage. Toute ta bibliothèque dans ta poche —
              avec les bons outils pour lire plus et mieux.
            </p>

            <div className="flex flex-col sm:flex-row items-center md:items-start md:justify-start justify-center gap-3">
              <button
                onClick={onLogin}
                className="w-full sm:w-auto bg-brand-grape hover:bg-brand-grape/90 text-white font-bold text-base px-8 py-4 rounded-pill shadow-hero transition-all duration-200 active:scale-95"
                style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF8B5F 100%)" }}
              >
                Commencer gratuitement →
              </button>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span>Pas de carte bancaire</span>
                <span>·</span>
                <span>2 min pour démarrer</span>
              </div>
            </div>

            {/* Store badges — greyed out pending actual release */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center md:items-start">
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                Bientôt sur
              </p>
              <div className="flex gap-2 opacity-60">
                <StoreBadge type="apple" />
                <StoreBadge type="google" />
              </div>
            </div>
          </div>

          {/* Right: hero phone mockup showing Collection */}
          <div className="flex justify-center md:justify-end">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-brand-grape uppercase tracking-widest mb-3">
              Fonctionnalités
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">
              Tout ce qu'il te faut,<br />
              <span className="text-brand-grape">rien de plus.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <FeatureCard
              emoji="📚"
              title="Scanne, enregistre"
              description="Code-barres, recherche par titre ou saisie manuelle — en 2 secondes tu récupères la fiche complète et tu la classes par catégorie."
              gradient="from-brand-grape to-brand-peach"
            />
            <FeatureCard
              emoji="📝"
              title="Ta fiche de lecture"
              description="Note chaque livre, écris ton avis, garde une trace de tes dates de lecture. Ton journal littéraire, organisé."
              gradient="from-brand-peach to-brand-sun"
            />
            <FeatureCard
              emoji="🏆"
              title="Monte en niveau"
              description="Chaque livre te fait gagner de l'XP. Débloque des badges, suis ta série de lecture, atteins tes objectifs annuels."
              gradient="from-brand-magenta to-brand-grape"
            />
            <FeatureCard
              emoji="👥"
              title="Lire à plusieurs"
              description="Crée un club avec tes potes, partage tes coups de cœur, découvre les leurs. Les recos de tes amis valent mieux qu'un algo."
              gradient="from-brand-sun to-brand-magenta"
            />
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="py-16 px-5 bg-surface-light">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-6 md:gap-12 text-center">
            <StatCard value="100%" label="Gratuit" hint="Pour toujours." />
            <StatCard value="0" label="Publicité" hint="On respecte ta lecture." />
            <StatCard value="∞" label="Livres" hint="Ta collection illimitée." />
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section
        className="py-20 md:py-28 px-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF3C7A 50%, #FFC83D 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center text-white relative">
          <img
            src="/ploom-logo.png"
            alt="Ploom"
            className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-hero"
          />
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] mb-5">
            Prête à transformer<br />
            ta lecture ?
          </h2>
          <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl mx-auto">
            Plus jamais le même livre racheté deux fois. Plus jamais l'oubli
            d'une pépite. Plus jamais lire seul·e.
          </p>
          <button
            onClick={onLogin}
            className="bg-white text-brand-grape font-extrabold text-lg px-10 py-5 rounded-pill shadow-hero transition-all duration-200 active:scale-95 hover:scale-105"
          >
            Créer mon compte gratuit →
          </button>
          <p className="text-sm font-semibold opacity-80 mt-5">
            Sans engagement · Sans pub · Sans bullshit
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-5 bg-text-primary text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/ploom-logo.png" alt="Ploom" className="w-8 h-8 rounded-lg" />
                <span className="text-lg font-extrabold">Ploom</span>
              </div>
              <p className="text-sm text-white/60 max-w-xs">
                Ton compagnon de lecture. Une app indépendante, sans pub,
                faite pour les amoureux des livres.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                Ploom
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <a href="#features" className="hover:text-white">Fonctionnalités</a>
                </li>
                <li>
                  <button onClick={onLogin} className="hover:text-white">Se connecter</button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                Légal
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <button onClick={() => onOpenLegal("privacy")} className="hover:text-white">
                    Politique de confidentialité
                  </button>
                </li>
                <li>
                  <button onClick={() => onOpenLegal("terms")} className="hover:text-white">
                    Conditions d'utilisation
                  </button>
                </li>
                <li>
                  <a href="mailto:ploomlivre@gmail.com" className="hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-white/50">
              © 2026 Ploom. Tous droits réservés.
            </p>
            <p className="text-xs text-white/50">
              Fait avec ❤️ pour les lecteurs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════ */

function StoreBadge({ type }: { type: "apple" | "google" }) {
  return (
    <button className="flex items-center gap-2 bg-black text-white rounded-xl px-4 py-2 shadow-card cursor-default" disabled>
      <div className="w-6 h-6 flex items-center justify-center">
        {type === "apple" ? (
          <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path fill="#00C4FF" d="M3.6 1.6c-.2.2-.3.5-.3.9v19c0 .4.1.7.3.9l11-11-11-9.8z" />
            <path fill="#FFCC00" d="M18.5 10.2L14.6 8l-3.3 3 3.3 3 3.9-2.2c1.2-.7 1.2-2 0-2.6z" />
            <path fill="#00E676" d="M3.6 1.6l11 9.8 3-2.7L5.2 1c-.7-.2-1.3-.1-1.6.6z" />
            <path fill="#FF3B4E" d="M14.6 11.4l-11 11c.3.7.9.8 1.6.6l12.4-7.1-3-4.5z" />
          </svg>
        )}
      </div>
      <div className="text-left">
        <p className="text-[9px] leading-none opacity-70 uppercase">
          {type === "apple" ? "Télécharger sur l'" : "Disponible sur"}
        </p>
        <p className="text-sm font-bold leading-none mt-0.5">
          {type === "apple" ? "App Store" : "Google Play"}
        </p>
      </div>
    </button>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
  gradient,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group bg-surface-light rounded-card p-6 md:p-8 shadow-card hover:shadow-float transition-all duration-300 hover:-translate-y-1">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 bg-gradient-to-br ${gradient} shadow-card group-hover:scale-110 transition-transform duration-300`}
      >
        {emoji}
      </div>
      <h3 className="text-2xl font-extrabold text-text-primary mb-2 tracking-tight">{title}</h3>
      <p className="text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <p
        className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none bg-clip-text text-transparent"
        style={{ backgroundImage: "linear-gradient(135deg, #FB6538 0%, #FF3C7A 100%)" }}
      >
        {value}
      </p>
      <p className="text-base md:text-lg font-bold text-text-primary mt-2">{label}</p>
      <p className="text-xs text-text-tertiary mt-1">{hint}</p>
    </div>
  );
}

/**
 * Hero phone mockup — a static rendering of the collection screen with
 * real book covers. Intentionally simpler than the animated prototype
 * (no auto-advance, no tab bar transitions) because it's decorative.
 */
function HeroMockup() {
  return (
    <div className="relative">
      {/* Phone shell */}
      <div
        className="relative w-[300px] md:w-[340px] h-[620px] md:h-[700px] bg-surface-light rounded-[44px] overflow-hidden"
        style={{
          boxShadow:
            "0 0 0 10px #1a1a1a, 0 0 0 12px #2a2a2a, 0 40px 80px rgba(251, 101, 56, 0.3)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[90px] h-[24px] bg-[#1a1a1a] rounded-2xl z-10"
        />

        {/* Header */}
        <div className="pt-12 px-4 pb-2 flex items-center gap-2">
          <img src="/ploom-logo.png" alt="" className="w-7 h-7 rounded-md" />
          <span className="text-xs text-text-secondary font-medium">
            Salut, <strong className="text-text-primary font-semibold">Martin</strong>
          </span>
        </div>

        {/* Page title */}
        <div className="px-4 pt-2">
          <h3 className="text-xl font-extrabold text-text-primary">Ma Collection</h3>
        </div>

        {/* Stat bar */}
        <div className="mx-4 mt-2 bg-white rounded-xl p-3 shadow-card flex justify-around">
          <div className="text-center">
            <p className="text-base font-extrabold text-text-primary leading-none">142</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-wider mt-1">Livres</p>
          </div>
          <div className="text-center">
            <p className="text-base font-extrabold text-text-primary leading-none">33</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-wider mt-1">Lus</p>
          </div>
          <div className="text-center">
            <p className="text-base font-extrabold text-text-primary leading-none">8</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-wider mt-1">Catégories</p>
          </div>
        </div>

        {/* Chips */}
        <div className="px-4 mt-3 flex gap-1.5">
          <span className="bg-brand-grape text-white text-[10px] font-semibold px-3 py-1 rounded-pill">Tous</span>
          <span className="bg-white border border-border text-text-secondary text-[10px] font-semibold px-3 py-1 rounded-pill">
            🐉 Fantasy
          </span>
          <span className="bg-white border border-border text-text-secondary text-[10px] font-semibold px-3 py-1 rounded-pill">
            🔍 Thriller
          </span>
        </div>

        {/* Book grid */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {HERO_BOOKS.map((isbn, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-lg shadow-card bg-cover bg-center relative"
                style={{
                  backgroundImage: `url('https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false'), linear-gradient(135deg, #C69A47 0%, #7A4A1A 100%)`,
                  backgroundSize: "cover",
                }}
              >
                {i < 5 && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-brand-grape text-white text-[8px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating decorative badge */}
      <div
        className="absolute -top-4 -right-4 md:-right-8 bg-white rounded-2xl shadow-float px-4 py-3 flex items-center gap-3 animate-bounce-slow"
        style={{ animation: "bounce-gentle 2.5s ease-in-out infinite" }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-grape to-brand-sun flex items-center justify-center">
          <span className="text-lg">🛡️</span>
        </div>
        <div>
          <p className="text-[9px] font-bold text-brand-grape uppercase tracking-wider leading-none">Niveau 4</p>
          <p className="text-xs font-extrabold text-text-primary mt-0.5">Gardien des récits</p>
        </div>
      </div>

      <style>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// Real ISBN covers — mix of popular books with verified OL covers.
const HERO_BOOKS = [
  "9780441172719", // Dune
  "9780525557654", // Someone We Know
  "9780618260300", // Lord of the Rings
  "9780062316097", // Sapiens
  "9780439708180", // Harry Potter 1
  "9780061122415", // The Alchemist
  "9780553293357", // Foundation
  "9780451524935", // 1984
  "9780156012195", // Little Prince
];
