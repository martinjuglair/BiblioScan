type Tab = "scanner" | "library" | "groups";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border pb-safe z-50">
      <div className="flex max-w-lg mx-auto">
        <button
          onClick={() => onChange("scanner")}
          className={`flex-1 flex flex-col items-center py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium transition-colors duration-200 min-h-[48px] justify-center ${
            active === "scanner" ? "text-brand-orange" : "text-text-tertiary"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
          </svg>
          Scanner
        </button>
        <button
          onClick={() => onChange("library")}
          className={`flex-1 flex flex-col items-center py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium transition-colors duration-200 min-h-[48px] justify-center ${
            active === "library" ? "text-brand-orange" : "text-text-tertiary"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Collection
        </button>
        <button
          onClick={() => onChange("groups")}
          className={`flex-1 flex flex-col items-center py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium transition-colors duration-200 min-h-[48px] justify-center ${
            active === "groups" ? "text-brand-orange" : "text-text-tertiary"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Groupes
        </button>
      </div>
    </nav>
  );
}
