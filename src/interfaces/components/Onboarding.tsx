import { useState, useEffect, useCallback, useRef } from "react";

interface OnboardingProps {
  firstName: string | null;
  onComplete: () => void;
}

// Tab order matches BottomNav button order in the DOM
const TAB_NAV_INDEX: Record<string, number> = {
  discover: 0,
  groups: 1,
  library: 2,
  stats: 3,
  profile: 4,
};

const STEPS = [
  {
    type: "welcome" as const,
    title: "Bienvenue sur Shelfy",
    description: "Votre bibliothèque numérique personnelle. Scannez, classez et partagez tous vos livres en quelques secondes.",
  },
  {
    type: "tab" as const,
    tab: "library",
    title: "Collection",
    description: "Ajoutez vos livres par scan, recherche ou saisie manuelle, et organisez-les par catégories.",
  },
  {
    type: "tab" as const,
    tab: "discover",
    title: "Découvrir",
    description: "Explorez de nouvelles lectures basées sur vos goûts et trouvez votre prochaine pépite.",
  },
  {
    type: "tab" as const,
    tab: "groups",
    title: "Social",
    description: "Retrouvez vos amis, rejoignez des groupes de lecture et partagez vos collections.",
  },
  {
    type: "tab" as const,
    tab: "stats",
    title: "Statistiques",
    description: "Suivez votre progression de lecture et découvrez des stats sur votre collection.",
  },
  {
    type: "tab" as const,
    tab: "profile",
    title: "Profil",
    description: "Gérez votre compte et personnalisez votre expérience.",
  },
];

function getNavButtonRect(tab: string): DOMRect | null {
  const nav = document.querySelector("nav");
  if (!nav) return null;
  const buttons = nav.querySelectorAll("button");
  const idx = TAB_NAV_INDEX[tab];
  if (idx == null || !buttons[idx]) return null;
  return buttons[idx].getBoundingClientRect();
}

export function Onboarding({ firstName, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStep]!;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const updateSpotlight = useCallback(() => {
    if (step.type === "tab") {
      setSpotlightRect(getNavButtonRect(step.tab));
    } else {
      setSpotlightRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    return () => window.removeEventListener("resize", updateSpotlight);
  }, [updateSpotlight]);

  const goNext = () => {
    if (isLast) { onComplete(); return; }
    setCurrentStep((s) => s + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  // Spotlight cutout dimensions with padding
  const pad = 8;
  const sr = spotlightRect;
  const cx = sr ? sr.left + sr.width / 2 : 0;
  const cy = sr ? sr.top + sr.height / 2 : 0;
  const rw = sr ? sr.width / 2 + pad : 0;
  const rh = sr ? sr.height / 2 + pad : 0;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100]" style={{ pointerEvents: "auto" }}>
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {sr && (
              <ellipse
                cx={cx}
                cy={cy}
                rx={rw + 4}
                ry={rh + 4}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(30, 27, 75, 0.65)"
          mask="url(#onboarding-mask)"
        />
      </svg>

      {/* Spotlight ring glow */}
      {sr && (
        <div
          className="absolute rounded-full border-2 border-white/40 animate-pulse"
          style={{
            left: sr.left - pad,
            top: sr.top - pad,
            width: sr.width + pad * 2,
            height: sr.height + pad * 2,
            boxShadow: "0 0 20px rgba(251, 101, 56, 0.5), 0 0 40px rgba(251, 101, 56, 0.2)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Content card */}
      {step.type === "welcome" ? (
        /* Welcome: centered modal card */
        <div className="absolute inset-0 flex items-center justify-center px-6" style={{ pointerEvents: "none" }}>
          <div
            key={currentStep}
            className="bg-white rounded-card shadow-hero p-6 max-w-sm w-full text-center animate-[scaleIn_0.3s_ease-out]"
            style={{ pointerEvents: "auto" }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-float mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF8B5F 50%, #FF8B5F 100%)" }}
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            {firstName && (
              <p className="text-brand-grape font-semibold text-sm mb-1">
                {firstName}, bienvenue !
              </p>
            )}
            <h2 className="text-xl font-extrabold text-text-primary mb-2">{step.title}</h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-5">{step.description}</p>

            {/* Progress + buttons */}
            <div className="flex justify-center gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 20 : 6,
                    background: i === currentStep ? "#FB6538" : "#E5E7EB",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onComplete}
                className="flex-1 py-2.5 rounded-[14px] text-text-tertiary font-semibold text-sm active:scale-95 transition-all"
              >
                Passer
              </button>
              <button onClick={goNext} className="flex-[2] btn-primary py-2.5 text-sm text-center">
                Découvrir l'app
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab steps: tooltip card above the bottom nav */
        <div
          key={currentStep}
          className="absolute left-4 right-4 animate-[slideUp_0.3s_ease-out]"
          style={{ bottom: sr ? window.innerHeight - sr.top + 16 : 100 }}
        >
          <div className="bg-white rounded-card shadow-hero p-5 max-w-sm mx-auto relative">
            {/* Arrow pointing down to the highlighted nav button */}
            {sr && (
              <div
                className="absolute w-3 h-3 bg-white rotate-45 -bottom-1.5"
                style={{ left: `calc(${((cx - 16) / (window.innerWidth - 32)) * 100}% - 6px)` }}
              />
            )}
            <h3 className="text-lg font-extrabold text-text-primary mb-1">{step.title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">{step.description}</p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-3">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 20 : 6,
                    background: i === currentStep ? "#FB6538" : "#E5E7EB",
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={goPrev}
                className="flex-1 py-2.5 rounded-[14px] bg-surface-subtle text-text-secondary font-semibold text-sm active:scale-95 transition-all"
              >
                {currentStep === 1 ? "Retour" : "Précédent"}
              </button>
              <button onClick={goNext} className="flex-[2] btn-primary py-2.5 text-sm text-center">
                {isLast ? "C'est parti !" : "Suivant"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
