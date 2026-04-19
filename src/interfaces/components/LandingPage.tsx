import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Marketing landing page shown at `/` to unauthenticated visitors.
 *
 * Narrative is "download-first": the native app is the destination, but
 * the web version is always one click away via "Essayer sur le web". The
 * app is not yet published on the stores so the primary CTA is softly
 * teased as "Bientôt disponible".
 *
 * Visual strategy: multiple phone mockups reproducing the real app
 * screens (Collection, Book detail, Stats, Discover, Social) with
 * faithful typography, spacing, SVG tab bar and real OpenLibrary covers.
 */

interface LandingPageProps {
  onLogin: () => void;
  onOpenLegal: (page: "privacy" | "terms") => void;
}

/* ═══════════════════════════════════════════════════════════════════════
   Shared constants
   ═══════════════════════════════════════════════════════════════════════ */

// Real ISBN covers — each one is a verified OpenLibrary JPEG with a
// matching gradient fallback so the mockups stay beautiful if the image
// fails to load.
const COVERS = {
  dune: {
    isbn: "9780441172719",
    gradient: "linear-gradient(135deg,#C69A47,#7A4A1A)",
  },
  lapena: {
    isbn: "9780525557654",
    gradient: "linear-gradient(135deg,#8b1f4a,#d94880)",
  },
  lotr: {
    isbn: "9780618260300",
    gradient: "linear-gradient(135deg,#1a2a4e,#3a5a8e)",
  },
  sapiens: {
    isbn: "9780062316097",
    gradient: "linear-gradient(135deg,#2d4a1e,#5a7a3e)",
  },
  hp1: {
    isbn: "9780439708180",
    gradient: "linear-gradient(135deg,#3a1a4e,#6a3a8e)",
  },
  alchemist: {
    isbn: "9780061122415",
    gradient: "linear-gradient(135deg,#8e6a1a,#ceaa4a)",
  },
  foundation: {
    isbn: "9780553293357",
    gradient: "linear-gradient(135deg,#1e4a3a,#3e7a5a)",
  },
  nineteen84: {
    isbn: "9780451524935",
    gradient: "linear-gradient(135deg,#4e1a1a,#8e3a3a)",
  },
  littlePrince: {
    isbn: "9780156012195",
    gradient: "linear-gradient(135deg,#1a3a4e,#3a6a8e)",
  },
  stranger: {
    isbn: "9780735221079",
    gradient: "linear-gradient(135deg,#2d1e4e,#5a3e8e)",
  },
  notHappy: {
    isbn: "9781984830173",
    gradient: "linear-gradient(135deg,#1e4a4e,#3e8a8e)",
  },
  coupleNextDoor: {
    isbn: "9780735221475",
    gradient: "linear-gradient(135deg,#4e1a1a,#8e3a3a)",
  },
  endOfHer: {
    isbn: "9781984821645",
    gradient: "linear-gradient(135deg,#1a3a4e,#3a6a8e)",
  },
  dragonTattoo: {
    isbn: "9780307269751",
    gradient: "linear-gradient(135deg,#1a2a3e,#2a4a7e)",
  },
  womanWindow: {
    isbn: "9780062678416",
    gradient: "linear-gradient(135deg,#2d1e4e,#5a3e8e)",
  },
  goneGirl: {
    isbn: "9780307588371",
    gradient: "linear-gradient(135deg,#8b1f4a,#d94880)",
  },
} as const;

function coverStyle(key: keyof typeof COVERS) {
  const { isbn, gradient } = COVERS[key];
  return {
    backgroundImage: `url('https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false'), ${gradient}`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
}

/* ═══════════════════════════════════════════════════════════════════════
   Hooks — reveal on scroll, count up, parallax tilt
   ═══════════════════════════════════════════════════════════════════════ */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns a ref + boolean `inView`. Once the element enters the viewport it
 * stays true (we only play the reveal once per session).
 */
function useInView<T extends HTMLElement>(
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView];
}

/**
 * Animates from 0 → `target` once `trigger` flips true. Uses easeOutCubic for
 * the punchy-then-settle feel product counters love.
 */
function useCountUp(target: number, duration: number, trigger: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, trigger]);

  return value;
}

/**
 * Subtle 3D tilt on desktop mousemove. Returns a ref to attach to the tilted
 * element and a style object to spread. Disabled on touch / reduced motion.
 */
function useMouseTilt<T extends HTMLElement>(
  maxDeg = 5,
): [React.RefObject<T>, CSSProperties, (e: React.MouseEvent) => void, () => void] {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties>({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
    transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
  });

  const onMove = (e: React.MouseEvent) => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * (maxDeg * 2);
    const rx = -(py - 0.5) * (maxDeg * 2);
    setStyle({
      transform: `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`,
      transition: "transform 120ms linear",
    });
  };

  const onLeave = () => {
    setStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    });
  };

  return [ref, style, onMove, onLeave];
}

/* ═══════════════════════════════════════════════════════════════════════
   Reveal wrapper — applies scroll-triggered fade+slide with optional stagger
   ═══════════════════════════════════════════════════════════════════════ */

function Reveal({
  children,
  delay = 0,
  as: As = "div",
  className = "",
  y = 30,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "span";
  className?: string;
  y?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const style: CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : `translateY(${y}px)`,
    transition: `opacity 800ms cubic-bezier(.4,0,.2,1) ${delay}ms, transform 800ms cubic-bezier(.4,0,.2,1) ${delay}ms`,
    willChange: "opacity, transform",
  };
  // React treats `as` prop via element type; cast to any since union is narrow.
  const Component = As as unknown as "div";
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Root component
   ═══════════════════════════════════════════════════════════════════════ */

export function LandingPage({ onLogin, onOpenLegal }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-light landing-root">
      {/* Global styles scoped to the landing page */}
      <style>{`
        html, body { margin: 0; padding: 0; }
        .landing-root { overflow-x: clip; }
        @keyframes ploom-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ploom-breath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
        @keyframes ploom-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes ploom-word-rise {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .ploom-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(14px);
          animation: ploom-word-rise 700ms cubic-bezier(.22,1,.36,1) forwards;
        }
        .ploom-breath {
          animation: ploom-breath 5s ease-in-out infinite;
        }
        .ploom-cover-tile {
          transition: transform 240ms cubic-bezier(.22,1,.36,1), filter 240ms ease;
        }
        .ploom-cover-grid:hover .ploom-cover-tile { filter: brightness(0.85); }
        .ploom-cover-grid .ploom-cover-tile:hover {
          transform: translateY(-4px);
          filter: brightness(1.05);
          z-index: 2;
        }
        .ploom-mockup-wrap {
          transition: transform 400ms cubic-bezier(.22,1,.36,1), box-shadow 400ms ease;
        }
        @media (hover: hover) {
          .ploom-mockup-wrap:hover { transform: translateY(-4px) scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ploom-word,
          .ploom-breath,
          .ploom-mockup-wrap,
          .ploom-cover-tile {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-lg shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto h-full px-5 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2">
            <img src="/ploom-logo.png" alt="Ploom" className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-extrabold text-text-primary tracking-tight">
              Ploom
            </span>
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
        className="relative pt-16 pb-16 md:pb-24 px-5 overflow-hidden"
      >
        {/* Decorative blobs — positioned so they don't push layout */}
        <div className="absolute top-16 -left-20 w-80 h-80 rounded-full bg-brand-grape/15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brand-sun/20 blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto pt-6 md:pt-12 grid md:grid-cols-2 gap-12 md:gap-16 items-center relative">
          {/* Left: text */}
          <div className="text-center md:text-left order-2 md:order-1">
            <div className="inline-flex items-center gap-2 bg-brand-grape/10 text-brand-grape text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-pill mb-6">
              <span>✨</span>
              <span>100% Gratuit · Zéro pub</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary tracking-tighter leading-[1.02] mb-5">
              <AnimatedHeadline
                lines={[
                  ["Ton", "compagnon"],
                  ["de", "lecture."],
                ]}
              />
            </h1>
            <p className="text-lg md:text-xl text-text-secondary max-w-lg mx-auto md:mx-0 mb-8 leading-relaxed">
              Scanne, note, partage. Toute ta bibliothèque dans ta poche —
              avec les bons outils pour lire plus et mieux.
            </p>

            {/* CTAs — primary (teased download) + secondary (web) */}
            <div className="flex flex-col sm:flex-row items-center md:items-start md:justify-start justify-center gap-3">
              <button
                type="button"
                className="group relative w-full sm:w-auto bg-text-primary text-white font-bold text-base px-7 py-4 rounded-pill shadow-hero transition-all duration-200 active:scale-95 cursor-default overflow-hidden"
                disabled
                aria-label="Télécharger — bientôt disponible"
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="flex -space-x-1">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </span>
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-sun">
                      Bientôt disponible
                    </span>
                    <span className="text-[15px] font-extrabold mt-0.5">
                      Télécharger l'app
                    </span>
                  </span>
                </span>
              </button>

              <button
                onClick={onLogin}
                className="w-full sm:w-auto bg-white text-text-primary border-2 border-border-strong hover:border-brand-grape hover:text-brand-grape font-bold text-base px-7 py-[14px] rounded-pill transition-all duration-200 active:scale-95"
              >
                Essayer sur le web →
              </button>
            </div>

            <p className="mt-4 text-xs text-text-tertiary">
              Dispo dès maintenant sur ton navigateur · Version iOS & Android en préparation
            </p>
          </div>

          {/* Right: hero phone mockup showing Collection */}
          <HeroMockup />
        </div>
      </section>

      {/* ─── SECTION 1: Book detail ─── */}
      <FeatureSection
        id="features"
        bg="white"
        reversed={false}
        eyebrow="Ta bibliothèque"
        title={
          <>
            Chaque livre,
            <br />
            <span className="text-brand-grape">une fiche complète.</span>
          </>
        }
        description="Scan du code-barres, recherche par titre ou saisie manuelle. En 2 secondes tu récupères la cover, les infos, le résumé. Puis tu notes, tu écris ton avis, tu classes par catégorie. Ton journal littéraire, organisé."
        bullets={[
          "Scan ISBN · Recherche Google Books intégrée",
          "Note 5 étoiles + commentaire perso",
          "Marque comme lu + date de lecture",
          "Partage direct sur Instagram, WhatsApp, X",
        ]}
        mockup={
          <TiltedMockup>
            <PhoneMockup>
              <BookDetailScreen />
            </PhoneMockup>
          </TiltedMockup>
        }
      />

      {/* ─── SECTION 2: Stats & progression ─── */}
      <FeatureSection
        bg="surface"
        reversed
        eyebrow="Progression"
        title={
          <>
            Monte en niveau,
            <br />
            <span className="text-brand-grape">débloque des badges.</span>
          </>
        }
        description="Chaque livre te fait gagner de l'XP. Tu passes les paliers — « Gardien des récits », « Mage de papier »… Tu gardes ta série de lecture vivante, tu suis ton objectif annuel, et tu collectionnes les badges. La lecture comme un jeu."
        bullets={[
          "19 niveaux · 19 badges à débloquer",
          "Streak de lecture quotidien (ton feu)",
          "Objectif annuel visualisé",
          "Répartition de tes notes",
        ]}
        mockup={
          <TiltedMockup>
            <PhoneMockup tint="violet">
              <StatsScreen />
            </PhoneMockup>
          </TiltedMockup>
        }
      />

      {/* ─── SECTION 3: Discover ─── */}
      <FeatureSection
        bg="white"
        reversed={false}
        eyebrow="Découverte"
        title={
          <>
            L'algo connaît tes goûts.
            <br />
            <span className="text-brand-grape">Mieux que toi.</span>
          </>
        }
        description="Ploom regarde ce que tu as lu, adoré, noté — et te propose de nouvelles pépites. Par auteur, par genre, par ambiance. Zéro sponso, zéro ranking payé. Juste des livres qui devraient te parler."
        bullets={[
          "Recos basées sur ta collection",
          "Par auteur favori, par thème",
          "Pas de sponsoring, pas de biais",
          "Ajout en 1 tap à ta wishlist",
        ]}
        mockup={
          <TiltedMockup>
            <PhoneMockup>
              <DiscoverScreen />
            </PhoneMockup>
          </TiltedMockup>
        }
      />

      {/* ─── SECTION 4: Social / groups ─── */}
      <FeatureSection
        bg="surface"
        reversed
        eyebrow="Entre amis"
        title={
          <>
            Crée un club
            <br />
            <span className="text-brand-grape">avec tes potes.</span>
          </>
        }
        description="Partage tes coups de cœur, découvre les leurs. Les recos de tes amis valent mieux qu'un algo. Un club, des livres partagés, un fil d'activité — et voilà, la lecture redevient sociale."
        bullets={[
          "Groupes privés (2 à 100 personnes)",
          "Livres partagés en commun",
          "Avis + notes en temps réel",
          "Notifications douces (pas de spam)",
        ]}
        mockup={
          <TiltedMockup>
            <PhoneMockup tint="magenta">
              <SocialScreen />
            </PhoneMockup>
          </TiltedMockup>
        }
      />

      {/* ─── STATS STRIP ─── */}
      <section
        className="py-16 md:py-20 px-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,101,56,0.04) 0%, rgba(255,200,61,0.08) 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-6 md:gap-12 text-center">
            <AnimatedStatCard
              value={100}
              suffix="%"
              label="Gratuit"
              hint="Pour toujours."
              delay={0}
            />
            <AnimatedStatCard
              value={0}
              label="Publicité"
              hint="On respecte ta lecture."
              delay={120}
            />
            <AnimatedStatCard
              value={null}
              overrideDisplay="∞"
              label="Livres"
              hint="Ta collection illimitée."
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section
        className="py-20 md:py-28 px-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #FB6538 0%, #FF3C7A 50%, #FFC83D 100%)",
        }}
      >
        <Reveal as="div" className="max-w-3xl mx-auto text-center text-white relative">
          <img
            src="/ploom-logo.png"
            alt="Ploom"
            className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-hero"
          />
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] mb-5">
            Transforme
            <br />
            ta façon de lire.
          </h2>
          <p className="text-lg md:text-xl opacity-95 mb-8 max-w-xl mx-auto">
            Plus jamais le même livre racheté deux fois. Plus jamais l'oubli
            d'une pépite. Plus jamais lire seul·e.
          </p>

          {/* Store badges — primary CTA, presented as "coming soon" */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
            <StoreBadge type="apple" />
            <StoreBadge type="google" />
          </div>

          <p className="text-sm font-semibold opacity-90 mb-6">
            Bientôt sur l'App Store et Google Play.
          </p>

          <div className="inline-flex flex-col items-center gap-2">
            <button
              onClick={onLogin}
              className="bg-white text-brand-grape font-extrabold text-base px-8 py-4 rounded-pill shadow-hero transition-all duration-200 active:scale-95 hover:scale-105"
            >
              Déjà dispo : essayer sur le web →
            </button>
            <p className="text-xs font-semibold opacity-80">
              Sans engagement · Sans pub · Pour toujours
            </p>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-5 bg-text-primary text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/ploom-logo.png"
                  alt="Ploom"
                  className="w-8 h-8 rounded-lg"
                />
                <span className="text-lg font-extrabold">Ploom</span>
              </div>
              <p className="text-sm text-white/60 max-w-xs">
                Ton compagnon de lecture. Une app indépendante, sans pub,
                faite pour les amoureux des livres.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                Fonctionnalités
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <a href="#features" className="hover:text-white">
                    Ta bibliothèque
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white">
                    Stats & progression
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white">
                    Découverte
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white">
                    Clubs de lecture
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                Légal
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <button
                    onClick={() => onOpenLegal("privacy")}
                    className="hover:text-white text-left"
                  >
                    Politique de confidentialité
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onOpenLegal("terms")}
                    className="hover:text-white text-left"
                  >
                    Conditions d'utilisation
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:ploomlivre@gmail.com"
                    className="hover:text-white"
                  >
                    ploomlivre@gmail.com
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
   Hero headline — word-by-word stagger reveal
   ═══════════════════════════════════════════════════════════════════════ */

function AnimatedHeadline({ lines }: { lines: string[][] }) {
  // Flat index controls stagger across both lines
  let wordIndex = 0;
  return (
    <>
      {lines.map((words, lineIdx) => (
        <span key={lineIdx} className="block">
          {lineIdx === 1 ? (
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #FB6538 0%, #FF3C7A 50%, #FFC83D 100%)",
              }}
            >
              {words.map((w, i) => {
                const delay = wordIndex++ * 90;
                return (
                  <span key={`${lineIdx}-${i}`}>
                    <span
                      className="ploom-word"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      {w}
                    </span>
                    {i < words.length - 1 && " "}
                  </span>
                );
              })}
            </span>
          ) : (
            words.map((w, i) => {
              const delay = wordIndex++ * 90;
              return (
                <span key={`${lineIdx}-${i}`}>
                  <span
                    className="ploom-word"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {w}
                  </span>
                  {i < words.length - 1 && " "}
                </span>
              );
            })
          )}
        </span>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HeroMockup — phone + floating badge, contained inside column grid
   ═══════════════════════════════════════════════════════════════════════ */

function HeroMockup() {
  const [tiltRef, tiltStyle, onMove, onLeave] =
    useMouseTilt<HTMLDivElement>(4);
  const [viewRef, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={viewRef}
      className="flex justify-center md:justify-end order-1 md:order-2"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition:
          "opacity 800ms cubic-bezier(.4,0,.2,1) 150ms, transform 800ms cubic-bezier(.4,0,.2,1) 150ms",
      }}
    >
      {/* Column-scoped wrapper so the floating badge can anchor to the
          phone's right edge without escaping the grid cell. */}
      <div
        className="relative inline-block"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div
          ref={tiltRef}
          className="ploom-breath"
          style={{ ...tiltStyle, transformStyle: "preserve-3d" }}
        >
          <PhoneMockup size="lg" tint="orange">
            <CollectionScreen activeTab={2} animateStats={inView} />
          </PhoneMockup>
        </div>

        {/* Floating level badge — anchored slightly outside the phone but
            inside the column wrapper so it never escapes the grid. */}
        <div
          className="absolute -top-3 right-0 translate-x-3 md:translate-x-5 bg-white rounded-2xl shadow-float px-4 py-3 flex items-center gap-3 z-20"
          style={{ animation: "ploom-bounce 2.5s ease-in-out infinite" }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-grape to-brand-sun flex items-center justify-center">
            <span className="text-lg">🛡️</span>
          </div>
          <div>
            <p className="text-[9px] font-bold text-brand-grape uppercase tracking-wider leading-none">
              Niveau 4
            </p>
            <p className="text-xs font-extrabold text-text-primary mt-0.5">
              Gardien des récits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TiltedMockup — reusable tilt+breath+reveal wrapper for feature sections
   ═══════════════════════════════════════════════════════════════════════ */

function TiltedMockup({ children }: { children: ReactNode }) {
  const [tiltRef, tiltStyle, onMove, onLeave] =
    useMouseTilt<HTMLDivElement>(5);
  return (
    <div
      className="relative inline-block ploom-mockup-wrap"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        ref={tiltRef}
        className="ploom-breath"
        style={{ ...tiltStyle, transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FeatureSection — two-column alternating layout
   ═══════════════════════════════════════════════════════════════════════ */

function FeatureSection({
  id,
  bg,
  reversed,
  eyebrow,
  title,
  description,
  bullets,
  mockup,
}: {
  id?: string;
  bg: "white" | "surface";
  reversed: boolean;
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets: string[];
  mockup: ReactNode;
}) {
  const bgClass = bg === "white" ? "bg-white" : "bg-surface-light";
  return (
    <section id={id} className={`py-20 md:py-28 px-5 ${bgClass}`}>
      <div className="max-w-6xl mx-auto">
        <div
          className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center ${
            reversed ? "md:[&>*:first-child]:order-2" : ""
          }`}
        >
          {/* Text column */}
          <Reveal>
            <p className="text-xs font-bold text-brand-grape uppercase tracking-widest mb-4">
              {eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight leading-[1.05] mb-5">
              {title}
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed mb-6">
              {description}
            </p>
            <ul className="space-y-3">
              {bullets.map((b, i) => (
                <Reveal key={b} as="li" delay={80 + i * 90}>
                  <div className="flex items-start gap-3 text-text-primary">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-grape/15 text-brand-grape flex items-center justify-center text-sm font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-base leading-relaxed">{b}</span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          {/* Mockup column */}
          <Reveal delay={120} className="flex justify-center">
            {mockup}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PhoneMockup — reusable phone shell
   ═══════════════════════════════════════════════════════════════════════ */

function PhoneMockup({
  children,
  size = "md",
  tint = "orange",
}: {
  children: ReactNode;
  size?: "md" | "lg";
  tint?: "orange" | "violet" | "magenta";
}) {
  const dims =
    size === "lg"
      ? "w-[300px] md:w-[340px] h-[620px] md:h-[700px]"
      : "w-[280px] md:w-[310px] h-[580px] md:h-[640px]";

  const tintRgba =
    tint === "violet"
      ? "rgba(124, 58, 237, 0.28)"
      : tint === "magenta"
      ? "rgba(255, 60, 122, 0.28)"
      : "rgba(251, 101, 56, 0.28)";

  return (
    <div
      className={`relative ${dims} bg-surface-light rounded-[44px] overflow-hidden`}
      style={{
        boxShadow: `0 0 0 10px #1a1a1a, 0 0 0 12px #2a2a2a, 0 30px 80px ${tintRgba}`,
      }}
    >
      {/* Notch */}
      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-[#1a1a1a] rounded-2xl z-30" />

      {/* Screen content — flex column to let tab bar stick at bottom */}
      <div className="absolute inset-0 flex flex-col">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Mockup screens — all sharing the same AppHeader + TabBar chrome
   ═══════════════════════════════════════════════════════════════════════ */

function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <div className="pt-11 px-3.5 pb-1.5 flex items-center gap-1.5 bg-surface-light relative z-10">
      <img
        src="/ploom-logo.png"
        alt=""
        className="w-7 h-7 rounded-md shadow-card"
      />
      <div className="text-[12px] text-text-secondary font-medium">
        Salut, <span className="text-text-primary font-semibold">Martin</span>
      </div>
      {actions && (
        <>
          <div className="flex-1" />
          {actions}
        </>
      )}
    </div>
  );
}

function HeaderSearchIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#14131A"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    </div>
  );
}

function HeaderAddIcon() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shadow-hero"
      style={{
        background: "linear-gradient(135deg, #FB6538, #FF8B5F)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </div>
  );
}

function TabBar({ active }: { active: 0 | 1 | 2 | 3 | 4 }) {
  const tabs = [
    {
      label: "Découvrir",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 9l-4.5 6-1.5-1.5-1.5 1.5z"
            transform="rotate(-45 12 12)"
          />
        </svg>
      ),
    },
    {
      label: "Social",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M13 7a4 4 0 11-8 0 4 4 0 018 0zm8 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      label: "Collection",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18s-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      label: "Stats",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.5V21h3v-7.5H3zm6-5V21h3V8.5H9zm6-5V21h3V3.5h-3z"
          />
        </svg>
      ),
    },
    {
      label: "Profil",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="w-5 h-5"
        >
          <circle cx="12" cy="7" r="4" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 21v-2a6 6 0 0116 0v2"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute left-0 right-0 bottom-0 h-[58px] bg-white border-t border-border flex items-start pt-1.5 pb-3 z-20">
      {tabs.map((t, i) => {
        const isActive = i === active;
        return (
          <div
            key={t.label}
            className="flex-1 flex flex-col items-center gap-0.5"
            style={{
              color: isActive ? "#FF8B5F" : "#8F8B94",
              strokeWidth: isActive ? 2 : 1.8,
            }}
          >
            {t.icon}
            <span
              className="text-[9px] font-semibold"
              style={{ color: isActive ? "#FF8B5F" : "#8F8B94" }}
            >
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Collection screen ─────────────────────────── */

function CollectionScreen({
  activeTab = 2,
  animateStats = false,
}: {
  activeTab?: 0 | 1 | 2 | 3 | 4;
  animateStats?: boolean;
}) {
  const books: { key: keyof typeof COVERS; read: boolean }[] = [
    { key: "dune", read: true },
    { key: "lapena", read: true },
    { key: "lotr", read: false },
    { key: "sapiens", read: true },
    { key: "hp1", read: false },
    { key: "alchemist", read: true },
    { key: "foundation", read: false },
    { key: "nineteen84", read: false },
    { key: "littlePrince", read: false },
  ];

  const total = useCountUp(142, 1500, animateStats);
  const read = useCountUp(33, 1500, animateStats);
  const cats = useCountUp(8, 1500, animateStats);

  return (
    <>
      <AppHeader
        actions={
          <div className="flex items-center gap-1.5">
            <HeaderSearchIcon />
            <HeaderAddIcon />
          </div>
        }
      />
      <div className="flex-1 overflow-hidden px-3.5 pb-[66px]">
        <h3 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2.5 mb-2">
          Ma Collection
        </h3>

        {/* Stat bar */}
        <div className="bg-white rounded-xl px-3 py-2.5 mb-2.5 shadow-card flex justify-around">
          {[
            { n: total, l: "Livres" },
            { n: read, l: "Lus" },
            { n: cats, l: "Catégories" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-[17px] font-extrabold text-text-primary leading-none tracking-tight tabular-nums">
                {s.n}
              </p>
              <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-semibold mt-1">
                {s.l}
              </p>
            </div>
          ))}
        </div>

        {/* Chips */}
        <div className="flex gap-1.5 mb-2.5 overflow-hidden">
          <span className="bg-brand-grape text-white text-[11px] font-semibold px-3 py-[5px] rounded-pill whitespace-nowrap">
            Tous
          </span>
          <span className="bg-white border border-border text-text-secondary text-[11px] font-semibold px-3 py-[5px] rounded-pill whitespace-nowrap">
            🐉 Fantasy
          </span>
          <span className="bg-white border border-border text-text-secondary text-[11px] font-semibold px-3 py-[5px] rounded-pill whitespace-nowrap">
            🔍 Thriller
          </span>
          <span className="bg-white border border-border text-text-secondary text-[11px] font-semibold px-3 py-[5px] rounded-pill whitespace-nowrap">
            📚 Classiques
          </span>
        </div>

        {/* Grid with per-cover hover lift effect */}
        <div className="grid grid-cols-3 gap-2 ploom-cover-grid">
          {books.map((b) => (
            <div
              key={b.key}
              className="aspect-[2/3] rounded-lg shadow-card relative overflow-hidden ploom-cover-tile"
              style={coverStyle(b.key)}
            >
              {b.read && (
                <div className="absolute top-1 right-1 w-[18px] h-[18px] bg-brand-grape text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <TabBar active={activeTab} />
    </>
  );
}

/* ───────────────────────── Book detail screen ────────────────────────── */

function BookDetailScreen() {
  return (
    <>
      {/* Back header */}
      <div className="pt-11 px-3.5 pb-1.5 flex items-center justify-between bg-surface-light relative z-10">
        <div className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-text-primary text-base leading-none">
          ‹
        </div>
        <div className="flex gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-[13px]">
            ♡
          </div>
          <div className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-[13px]">
            ⋯
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden pb-[66px]">
        {/* Hero */}
        <div className="flex gap-3 px-3.5 mt-1">
          <div
            className="w-[100px] h-[150px] rounded-[10px] flex-shrink-0"
            style={{
              ...coverStyle("dune"),
              boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
            }}
          />
          <div className="flex-1 pt-0.5 min-w-0">
            <div className="text-[20px] font-extrabold text-text-primary tracking-tight leading-[1.15]">
              Dune
            </div>
            <div className="text-[12px] text-text-secondary font-medium mt-0.5">
              Frank Herbert
            </div>
            <div className="text-[10px] text-text-tertiary mt-0.5">
              Robert Laffont · 1965
            </div>
            <div className="flex gap-0.5 mt-2 text-[17px]">
              <span className="text-brand-grape">★</span>
              <span className="text-brand-grape">★</span>
              <span className="text-brand-grape">★</span>
              <span className="text-brand-grape">★</span>
              <span className="text-[#E5E1EA]">★</span>
            </div>
          </div>
        </div>

        {/* Marquer comme lu pill */}
        <div className="mx-3.5 mt-2.5 bg-emerald-50 border-[1.5px] border-emerald-200 rounded-pill py-2 px-3.5 flex items-center justify-center gap-1.5 text-[13px] font-extrabold text-emerald-700 shadow-card">
          <span className="w-[18px] h-[18px] bg-emerald-600 rounded-full text-white flex items-center justify-center text-[10px]">
            ✓
          </span>
          Lu · 12 mars
        </div>

        {/* Résumé */}
        <div className="mx-3.5 mt-2.5 bg-white rounded-xl px-3 py-2.5 shadow-card">
          <div className="text-[9px] font-extrabold text-brand-grape uppercase tracking-widest mb-1">
            📖 Résumé
          </div>
          <div className="text-[11px] text-text-secondary leading-snug line-clamp-3">
            Sur la planète Arrakis, seule source de l'Épice, le duc Leto
            Atréides affronte ses ennemis. Son fils Paul découvre son destin
            au sein des Fremen.
          </div>
        </div>

        {/* Fiche de lecture */}
        <div className="mx-3.5 mt-2.5 bg-white rounded-xl px-3 py-2.5 shadow-card border-l-[3px] border-brand-grape">
          <div className="text-[9px] font-extrabold text-brand-grape uppercase tracking-widest mb-1 flex items-center gap-1">
            📝 Ma fiche
            <span className="text-[10px] text-brand-grape ml-auto">★★★★</span>
          </div>
          <div className="text-[11px] text-text-primary italic leading-snug mt-0.5">
            Un chef-d'œuvre. Paul Atréides reste l'un de mes personnages
            préférés — chaque page vaut le détour.
          </div>
        </div>

        {/* Share section */}
        <div className="mx-3.5 mt-2.5 bg-white rounded-[14px] px-3 py-2.5 shadow-card">
          <div className="text-[10px] font-extrabold text-brand-grape uppercase tracking-widest mb-2 text-center">
            📱 Partager
          </div>
          <div className="flex justify-around">
            {[
              { bg: "linear-gradient(135deg,#FEDA77,#F58529,#DD2A7B,#8134AF,#515BD4)", label: "Story" },
              { bg: "#000", label: "TikTok" },
              { bg: "#25D366", label: "WhatsApp" },
              { bg: "linear-gradient(135deg,#6DD4FF,#0A84FF)", label: "Messages" },
              { bg: "#000", label: "X" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-[10px] shadow-card"
                  style={{ background: s.bg }}
                />
                <div className="text-[8px] font-bold text-text-secondary">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active={2} />
    </>
  );
}

/* ───────────────────────── Stats screen ──────────────────────────────── */

function StatsScreen() {
  return (
    <>
      <AppHeader />
      <div className="flex-1 overflow-hidden px-3.5 pb-[66px]">
        {/* Level hero */}
        <div
          className="rounded-[18px] p-3.5 text-white mb-2"
          style={{
            background: "#7C3AED",
            boxShadow: "0 10px 25px rgba(167,139,250,0.35)",
          }}
        >
          <div className="flex gap-2.5 items-center">
            <div className="w-11 h-11 rounded-xl bg-[rgba(167,139,250,0.33)] flex items-center justify-center text-[26px]">
              🛡️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-extrabold text-[#A78BFA] uppercase tracking-widest">
                Niveau 4
              </div>
              <div className="text-[15px] font-extrabold tracking-tight mt-0.5">
                Gardien des récits
              </div>
              <div className="text-[9px] opacity-80 mt-0.5">
                Ta collection commence à peser.
              </div>
            </div>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: "86%",
                background: "linear-gradient(90deg,#A78BFA,#F472B6)",
              }}
            />
          </div>
          <div className="text-[9px] opacity-80 mt-1">
            19 / 22 livres — plus qu'un swipe avant Mage de papier
          </div>
        </div>

        {/* Badges strip */}
        <div className="bg-white rounded-[14px] p-2.5 mb-2 shadow-card">
          <div className="text-[10px] font-extrabold text-text-primary mb-1.5 flex justify-between">
            <span>🏆 Badges</span>
            <span className="text-brand-grape">10 / 19</span>
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            {["📚", "🌟", "📖", "⭐", "❤️", "✍️", "🌍"].map((e) => (
              <div
                key={e}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#FFF1EC,#FFD4C4)",
                }}
              >
                {e}
              </div>
            ))}
            {["🗺️", "🎁"].map((e) => (
              <div
                key={e}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-base bg-[#F5F3F6] opacity-50 grayscale flex-shrink-0"
              >
                {e}
              </div>
            ))}
          </div>
        </div>

        {/* Streak card */}
        <div
          className="rounded-[14px] px-3 py-2.5 text-white mb-3 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg,#FB6538 0%,#FF8B5F 100%)",
            boxShadow: "0 6px 18px rgba(251,101,56,0.25)",
          }}
        >
          <div className="text-[22px] leading-none">🔥</div>
          <div className="flex-1 text-[10px] leading-tight">
            <span className="text-[16px] font-extrabold">12</span> jours
            d'affilée · 47 j au total
          </div>
          <div className="bg-white rounded-pill px-3.5 py-1 text-[10px] font-extrabold text-brand-grape min-w-[62px] text-center">
            J'ai lu
          </div>
        </div>

        {/* Goal card */}
        <div className="bg-white rounded-[14px] p-3 shadow-card flex items-center gap-3 mb-2">
          <div className="w-16 h-16 relative flex-shrink-0">
            <svg
              viewBox="0 0 64 64"
              className="w-16 h-16"
              style={{ transform: "rotate(-90deg)" }}
            >
              <defs>
                <linearGradient
                  id="goal-grad-landing"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#FB6538" />
                  <stop offset="100%" stopColor="#FF3C7A" />
                </linearGradient>
              </defs>
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#F5F3F6"
                strokeWidth={5}
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="url(#goal-grad-landing)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={163.4}
                strokeDashoffset={23}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[16px] font-extrabold text-text-primary leading-none tracking-tight">
                19
              </div>
              <div className="text-[9px] text-text-tertiary font-semibold mt-0.5">
                /22
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-[13px] font-extrabold text-text-primary">
              Objectif 2026
            </h3>
            <p className="text-[10px] text-text-tertiary mt-0.5">
              86% — 3 livres restants
            </p>
            <div
              className="inline-block rounded-pill text-white text-[9px] font-extrabold px-2 py-0.5 mt-1"
              style={{
                background: "linear-gradient(90deg,#FB6538,#FFC83D)",
              }}
            >
              En bonne voie
            </div>
          </div>
        </div>

        {/* 3-col stats */}
        <div className="flex gap-1.5">
          {[
            { n: "33", l: "Livres", c: "#FB6538" },
            { n: "8", l: "Catégories", c: "#FF3C7A" },
            { n: "344€", l: "Valeur", c: "#FFC83D" },
          ].map((m) => (
            <div
              key={m.l}
              className="flex-1 bg-white rounded-xl py-2.5 px-1.5 text-center shadow-card"
            >
              <div
                className="text-[17px] font-extrabold tracking-tight"
                style={{ color: m.c }}
              >
                {m.n}
              </div>
              <div className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider mt-0.5">
                {m.l}
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active={3} />
    </>
  );
}

/* ───────────────────────── Discover screen ───────────────────────────── */

function DiscoverScreen() {
  const row1: { key: keyof typeof COVERS; t: string; r: string }[] = [
    { key: "lapena", t: "Someone We Know", r: "4.3" },
    { key: "stranger", t: "A Stranger in the House", r: "4.1" },
    { key: "notHappy", t: "Not a Happy Family", r: "4.5" },
    { key: "coupleNextDoor", t: "The Couple Next Door", r: "4.2" },
  ];
  const row2: { key: keyof typeof COVERS; t: string; a: string; r: string }[] = [
    { key: "dragonTattoo", t: "Dragon Tattoo", a: "S. Larsson", r: "4.2" },
    { key: "womanWindow", t: "Woman in the Window", a: "A.J. Finn", r: "3.9" },
    { key: "goneGirl", t: "Gone Girl", a: "G. Flynn", r: "4.1" },
  ];

  return (
    <>
      <AppHeader />
      <div className="flex-1 overflow-hidden px-3.5 pb-[66px]">
        <h3 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2.5 mb-3">
          Découvrir
        </h3>

        {/* Row 1 */}
        <div className="mb-3.5 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[13px]">🖊️</span>
            <span className="text-[13px] font-extrabold text-text-primary tracking-tight">
              De Shari Lapena
            </span>
          </div>
          <div className="text-[10px] text-text-tertiary mb-2">
            Tu as 3 livres de cet auteur
          </div>
          <div className="flex gap-2 overflow-hidden">
            {row1.map((r) => (
              <div key={r.t} className="flex-shrink-0 w-[76px]">
                <div
                  className="w-full aspect-[2/3] rounded-[7px] shadow-card mb-1"
                  style={coverStyle(r.key)}
                />
                <div className="text-[10px] font-bold text-text-primary leading-[1.25] line-clamp-2">
                  {r.t}
                </div>
                <div className="text-[8px] text-text-tertiary mt-0.5">
                  S. Lapena
                </div>
                <div className="text-[8px] text-brand-grape font-extrabold mt-0.5">
                  ⭐ {r.r}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[13px]">🔥</span>
            <span className="text-[13px] font-extrabold text-text-primary tracking-tight">
              Thrillers à dévorer
            </span>
          </div>
          <div className="text-[10px] text-text-tertiary mb-2">
            Sélection du moment
          </div>
          <div className="flex gap-2 overflow-hidden">
            {row2.map((r) => (
              <div key={r.t} className="flex-shrink-0 w-[76px]">
                <div
                  className="w-full aspect-[2/3] rounded-[7px] shadow-card mb-1"
                  style={coverStyle(r.key)}
                />
                <div className="text-[10px] font-bold text-text-primary leading-[1.25] line-clamp-2">
                  {r.t}
                </div>
                <div className="text-[8px] text-text-tertiary mt-0.5">
                  {r.a}
                </div>
                <div className="text-[8px] text-brand-grape font-extrabold mt-0.5">
                  ⭐ {r.r}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active={0} />
    </>
  );
}

/* ───────────────────────── Social screen ─────────────────────────────── */

function SocialScreen() {
  return (
    <>
      <AppHeader />
      <div className="flex-1 overflow-hidden px-3.5 pb-[66px]">
        <h3 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2.5 mb-2.5">
          Social
        </h3>

        {/* Group card */}
        <div
          className="rounded-[16px] p-3.5 text-white mb-3"
          style={{
            background: "linear-gradient(135deg,#FB6538 0%,#FF3C7A 100%)",
            boxShadow: "0 8px 20px rgba(251,60,122,0.3)",
          }}
        >
          <div className="text-[15px] font-extrabold tracking-tight">
            📖 Club du jeudi
          </div>
          <div className="text-[11px] opacity-90 mt-0.5">
            4 membres · 28 livres partagés
          </div>
          <div className="flex mt-2">
            {[
              { c: "#FFD4C4", l: "M" },
              { c: "#FFE8A8", l: "C" },
              { c: "#FFC9D9", l: "L" },
              { c: "#D4C4FF", l: "A" },
            ].map((a, i) => (
              <div
                key={a.l}
                className="w-[26px] h-[26px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-extrabold text-text-primary"
                style={{
                  background: a.c,
                  marginLeft: i === 0 ? 0 : "-7px",
                }}
              >
                {a.l}
              </div>
            ))}
          </div>
        </div>

        {/* Shared books */}
        <div className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-widest mb-1.5">
          📚 Livres partagés
        </div>
        <div className="flex gap-1.5 mb-3">
          {(
            ["dune", "sapiens", "alchemist", "lapena", "dragonTattoo"] as const
          ).map((k) => (
            <div
              key={k}
              className="flex-1 aspect-[2/3] rounded-[7px] shadow-card"
              style={coverStyle(k)}
            />
          ))}
        </div>

        {/* Activities */}
        <div className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-widest mb-1.5">
          💬 Dernières activités
        </div>
        {[
          {
            dotColor: "#FFE8A8",
            letter: "C",
            cover: "lapena" as const,
            who: "Caroline",
            action: "a partagé",
            book: "Someone We Know",
            quote: "⭐⭐⭐⭐⭐ « Glaçant, impossible à lâcher. »",
          },
          {
            dotColor: "#FFC9D9",
            letter: "L",
            cover: "sapiens" as const,
            who: "Léa",
            action: "a ajouté",
            book: "Sapiens",
            quote: "⭐⭐⭐⭐⭐ « Ouvre l'esprit. »",
          },
          {
            dotColor: "#D4C4FF",
            letter: "A",
            cover: "dragonTattoo" as const,
            who: "Alex",
            action: "a recommandé",
            book: "Dragon Tattoo",
            quote: "⭐⭐⭐⭐ « Un thriller qui marque. »",
          },
        ].map((a) => (
          <div
            key={a.who}
            className="bg-white rounded-xl px-2.5 py-2 flex gap-2 items-center shadow-card mb-1.5"
          >
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-extrabold text-text-primary"
              style={{ background: a.dotColor }}
            >
              {a.letter}
            </div>
            <div
              className="w-[22px] h-[32px] rounded-[3px] flex-shrink-0 shadow-card"
              style={coverStyle(a.cover)}
            />
            <div className="flex-1 text-[9px] text-text-secondary leading-tight min-w-0">
              <span className="text-text-primary font-extrabold">{a.who}</span>{" "}
              {a.action}{" "}
              <span className="text-text-primary font-bold">{a.book}</span>
              <span className="block mt-0.5 text-brand-grape font-semibold italic truncate">
                {a.quote}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TabBar active={1} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-components (Store badge, Stat card)
   ═══════════════════════════════════════════════════════════════════════ */

function StoreBadge({ type }: { type: "apple" | "google" }) {
  return (
    <button
      className="flex items-center gap-2 bg-black text-white rounded-xl px-4 py-3 shadow-card cursor-default relative overflow-hidden"
      disabled
      aria-label={`${type === "apple" ? "App Store" : "Google Play"} — bientôt disponible`}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {type === "apple" ? (
          <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path
              fill="#00C4FF"
              d="M3.6 1.6c-.2.2-.3.5-.3.9v19c0 .4.1.7.3.9l11-11-11-9.8z"
            />
            <path
              fill="#FFCC00"
              d="M18.5 10.2L14.6 8l-3.3 3 3.3 3 3.9-2.2c1.2-.7 1.2-2 0-2.6z"
            />
            <path
              fill="#00E676"
              d="M3.6 1.6l11 9.8 3-2.7L5.2 1c-.7-.2-1.3-.1-1.6.6z"
            />
            <path
              fill="#FF3B4E"
              d="M14.6 11.4l-11 11c.3.7.9.8 1.6.6l12.4-7.1-3-4.5z"
            />
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

/* Animated stat card used in the "100% Gratuit / 0 Pub / ∞ Livres" strip. */
function AnimatedStatCard({
  value,
  suffix = "",
  overrideDisplay,
  label,
  hint,
  delay = 0,
}: {
  value: number | null;
  suffix?: string;
  overrideDisplay?: string;
  label: string;
  hint: string;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const animated = useCountUp(value ?? 0, 1500, inView && value !== null);
  const display = overrideDisplay ?? `${animated}${suffix}`;

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 800ms cubic-bezier(.4,0,.2,1) ${delay}ms, transform 800ms cubic-bezier(.4,0,.2,1) ${delay}ms`,
      }}
    >
      <p
        className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none bg-clip-text text-transparent tabular-nums"
        style={{
          backgroundImage: "linear-gradient(135deg, #FB6538 0%, #FF3C7A 100%)",
        }}
      >
        {display}
      </p>
      <p className="text-base md:text-lg font-bold text-text-primary mt-2">
        {label}
      </p>
      <p className="text-xs text-text-tertiary mt-1">{hint}</p>
    </div>
  );
}
