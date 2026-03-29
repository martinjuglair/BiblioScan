import { useState, useCallback } from "react";
import { useAuth } from "@interfaces/hooks/useAuth";
import { LoginScreen } from "@interfaces/components/LoginScreen";
import { Scanner } from "@interfaces/components/Scanner";
import { Library } from "@interfaces/components/Library";
import { SeriesDetail } from "@interfaces/components/SeriesDetail";
import { BookDetail } from "@interfaces/components/BookDetail";
import { BottomNav } from "@interfaces/components/BottomNav";

type Tab = "scanner" | "library";

type View =
  | { screen: "main" }
  | { screen: "series"; name: string }
  | { screen: "book"; isbn: string; seriesName: string };

export default function App() {
  const { user, loading, error, signIn, signUp, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("scanner");
  const [view, setView] = useState<View>({ screen: "main" });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView({ screen: "main" });
  };

  // Loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full" />
          <p className="text-text-tertiary text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → login screen
  if (!user) {
    return (
      <LoginScreen
        onSignIn={signIn}
        onSignUp={signUp}
        loading={loading}
        error={error}
      />
    );
  }

  // Authenticated → main app
  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto">
      {/* Sign out button */}
      <div className="flex justify-end p-3">
        <button
          onClick={signOut}
          className="text-text-tertiary text-xs font-medium px-3 py-1.5 rounded-pill border border-border hover:border-border-strong transition-colors"
        >
          Déconnexion
        </button>
      </div>

      {tab === "scanner" && (
        <Scanner onBookAdded={refresh} />
      )}

      {tab === "library" && view.screen === "main" && (
        <Library
          refreshKey={refreshKey}
          onSelectSeries={(name) => setView({ screen: "series", name })}
        />
      )}

      {tab === "library" && view.screen === "series" && (
        <SeriesDetail
          seriesName={view.name}
          refreshKey={refreshKey}
          onBack={() => setView({ screen: "main" })}
          onSelectBook={(isbn) =>
            setView({ screen: "book", isbn, seriesName: view.name })
          }
        />
      )}

      {tab === "library" && view.screen === "book" && (
        <BookDetail
          isbn={view.isbn}
          onBack={() => setView({ screen: "series", name: view.seriesName })}
          onDeleted={() => {
            refresh();
            setView({ screen: "series", name: view.seriesName });
          }}
          onUpdated={refresh}
        />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  );
}
