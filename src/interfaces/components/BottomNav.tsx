type Tab = "scanner" | "library";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bd-card border-t border-white/5 pb-safe">
      <div className="flex max-w-lg mx-auto">
        <button
          onClick={() => onChange("scanner")}
          className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
            active === "scanner" ? "text-bd-primary" : "text-bd-muted"
          }`}
        >
          <span className="text-xl mb-0.5">📷</span>
          Scanner
        </button>
        <button
          onClick={() => onChange("library")}
          className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
            active === "library" ? "text-bd-primary" : "text-bd-muted"
          }`}
        >
          <span className="text-xl mb-0.5">📚</span>
          Collection
        </button>
      </div>
    </nav>
  );
}
