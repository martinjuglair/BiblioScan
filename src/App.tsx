import { useState, useCallback } from "react";
import { useAuth } from "@interfaces/hooks/useAuth";
import { LoginScreen } from "@interfaces/components/LoginScreen";
import { Scanner } from "@interfaces/components/Scanner";
import { Library } from "@interfaces/components/Library";
import { CategoryDetail } from "@interfaces/components/CategoryDetail";
import { BookDetail } from "@interfaces/components/BookDetail";
import { BottomNav } from "@interfaces/components/BottomNav";
import { ToastProvider } from "@interfaces/components/Toast";

type Tab = "scanner" | "library";

type View =
  | { screen: "main" }
  | { screen: "category"; categoryId: string | null }
  | { screen: "book"; isbn: string; fromCategoryId: string | null };

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
    <ToastProvider>
    <div className="min-h-screen pb-20 max-w-lg mx-auto px-safe">
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
          onSelectCategory={(categoryId) => setView({ screen: "category", categoryId })}
        />
      )}

      {tab === "library" && view.screen === "category" && (
        <CategoryDetail
          categoryId={view.categoryId}
          refreshKey={refreshKey}
          onBack={() => setView({ screen: "main" })}
          onSelectBook={(isbn) =>
            setView({ screen: "book", isbn, fromCategoryId: view.categoryId })
          }
        />
      )}

      {tab === "library" && view.screen === "book" && (
        <BookDetail
          isbn={view.isbn}
          onBack={() => setView({ screen: "category", categoryId: view.fromCategoryId })}
          onDeleted={() => {
            refresh();
            setView({ screen: "category", categoryId: view.fromCategoryId });
          }}
          onUpdated={refresh}
        />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
    </ToastProvider>
  );
}
