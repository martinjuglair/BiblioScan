type Tab = "scanner" | "library";

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
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors duration-200 ${
            active === "scanner" ? "text-brand-orange" : "text-text-tertiary"
          }`}
        >
          <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
          </svg>
          Scanner
        </button>
        <button
          onClick={() => onChange("library")}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors duration-200 ${
            active === "library" ? "text-brand-orange" : "text-text-tertiary"
          }`}
        >
          <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Collection
        </button>
      </div>
    </nav>
  );
}
