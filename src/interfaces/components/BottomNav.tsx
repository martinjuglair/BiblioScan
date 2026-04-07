type Tab = "library" | "groups" | "scanner" | "stats" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

/**
 * Bottom navigation with 5 tabs.
 * Scanner is in the center position with an elevated floating button.
 * Order: Collection | Groupes | ★ Scanner ★ | Stats | Profil
 */
export function BottomNav({ active, onChange }: BottomNavProps) {
  const tabClass = (tab: Tab) =>
    `flex-1 flex flex-col items-center py-2 text-[10px] sm:text-[11px] font-medium transition-colors duration-200 min-h-[48px] justify-center ${
      active === tab ? "text-brand-grape" : "text-text-tertiary"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border pb-safe z-50">
      <div className="flex items-end max-w-lg mx-auto relative">
        {/* Collection */}
        <button onClick={() => onChange("library")} className={tabClass("library")}>
          <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Collection
        </button>

        {/* Groupes */}
        <button onClick={() => onChange("groups")} className={tabClass("groups")}>
          <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Groupes
        </button>

        {/* Scanner */}
        <button onClick={() => onChange("scanner")} className={tabClass("scanner")}>
          <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
          </svg>
          Scanner
        </button>

        {/* Stats */}
        <button onClick={() => onChange("stats")} className={tabClass("stats")}>
          <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Stats
        </button>

        {/* Profil */}
        <button onClick={() => onChange("profile")} className={tabClass("profile")}>
          <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Profil
        </button>
      </div>
    </nav>
  );
}
