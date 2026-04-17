import { useState, useCallback } from "react";
import { useAuth } from "@interfaces/hooks/useAuth";
import { LoginScreen } from "@interfaces/components/LoginScreen";
import { Scanner } from "@interfaces/components/Scanner";
import { Library } from "@interfaces/components/Library";
import { CategoryDetail } from "@interfaces/components/CategoryDetail";
import { BookDetail } from "@interfaces/components/BookDetail";
import { Groups } from "@interfaces/components/Groups";
import { GroupDetail } from "@interfaces/components/GroupDetail";
import { Profile } from "@interfaces/components/Profile";
import { Stats } from "@interfaces/components/Stats";
import { Discover } from "@interfaces/components/Discover";
import { BottomNav } from "@interfaces/components/BottomNav";
import { ToastProvider } from "@interfaces/components/Toast";
import { Onboarding } from "@interfaces/components/Onboarding";
import { BadgeBanner } from "@interfaces/components/BadgeBanner";
import { LevelUpBanner } from "@interfaces/components/LevelUpBanner";
import { useBadgeChecker } from "@interfaces/hooks/useBadgeChecker";
import { useLevelChecker } from "@interfaces/hooks/useLevelChecker";

type Tab = "discover" | "groups" | "library" | "stats" | "profile";

type View =
  | { screen: "main" }
  | { screen: "category"; categoryId: string | null }
  | { screen: "book"; isbn: string; fromCategoryId: string | null }
  | { screen: "group"; groupId: string };

// Storage migration BiblioScan → Shelfy (one-shot)
(() => {
  const MIGRATION_KEY = "shelfy-migrated";
  if (!localStorage.getItem(MIGRATION_KEY)) {
    const renames: [string, string][] = [
      ["biblioscan-reading-goal", "shelfy-reading-goal"],
      ["biblioscan-reading-log", "shelfy-reading-log"],
      ["biblioscan-earned-badges", "shelfy-earned-badges"],
      ["biblioscan-onboarding-v1", "shelfy-onboarding-v1"],
    ];
    for (const [old, fresh] of renames) {
      const v = localStorage.getItem(old);
      if (v != null && !localStorage.getItem(fresh)) {
        localStorage.setItem(fresh, v);
        localStorage.removeItem(old);
      }
    }
    localStorage.setItem(MIGRATION_KEY, "1");
  }
})();

export default function App() {
  const { user, firstName, loading, error, signIn, signUp, signOut, updateFirstName, resetPassword, updatePassword } = useAuth();

  // Global badge + level detection — safe to call unconditionally, hooks check library internally
  useBadgeChecker();
  useLevelChecker();

  const [tab, setTab] = useState<Tab>("library");
  const [addMode, setAddMode] = useState<"scan" | "search" | "manual" | null>(null);
  const [view, setView] = useState<View>({ screen: "main" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("shelfy-onboarding-v1");
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("shelfy-onboarding-v1", "1");
    setShowOnboarding(false);
  }, []);

  const handleStartOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView({ screen: "main" });
  };

  // Loading state — branded splash
  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #EA580C 0%, #FB923C 50%, #FCD34D 100%)" }}>
        <img
          src="/shelfy-logo.png"
          alt="Shelfy"
          className="w-[88px] h-[88px] rounded-[22px] shadow-lg animate-pulse"
        />
        <p className="text-white text-2xl font-extrabold mt-4 tracking-tight">Shelfy</p>
        <p className="text-white/70 text-sm mt-1">Votre bibliothèque de poche</p>
        <div className="mt-8 w-6 h-6 border-[2.5px] border-white/25 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <LoginScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        loading={loading}
        error={error}
      />
    );
  }

  // Authenticated
  return (
    <ToastProvider>
    <BadgeBanner />
    <LevelUpBanner />
    {showOnboarding && (
      <Onboarding firstName={firstName} onComplete={handleOnboardingComplete} />
    )}
    <div className="min-h-screen pb-20 max-w-lg mx-auto px-safe">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <img src="/shelfy-logo.png" alt="Shelfy" className="w-8 h-8 rounded-lg" />
          {firstName && (
            <span className="text-sm font-medium text-text-secondary">
              Salut, <span className="text-text-primary font-semibold">{firstName}</span>
            </span>
          )}
        </div>
      </div>

      {tab === "discover" && <Discover onAddBook={(mode) => { setTab("library"); setAddMode(mode); }} />}

      {tab === "library" && view.screen === "main" && (
        <>
        {/* Scanner overlay */}
        {addMode !== null && (
          <div className="fixed inset-0 z-50 bg-bg overflow-y-auto">
            <div className="max-w-lg mx-auto px-safe">
              {/* Close header */}
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => setAddMode(null)}
                  className="w-9 h-9 rounded-full bg-surface-subtle flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="text-base font-bold text-text-primary">Ajouter un livre</span>
                <div className="w-9" />
              </div>
              <Scanner
                onBookAdded={() => { refresh(); setAddMode(null); }}
                firstName={firstName}
                onUpdateFirstName={updateFirstName}
                initialStep={addMode}
                onClose={() => setAddMode(null)}
                embedded
              />
            </div>
          </div>
        )}
      </>
      )}

      {tab === "library" && view.screen === "main" && addMode === null && (
        <Library
          refreshKey={refreshKey}
          onSelectCategory={(categoryId) => setView({ screen: "category", categoryId })}
          onSelectBook={(isbn) => setView({ screen: "book", isbn, fromCategoryId: null })}
          onAddBook={(mode) => setAddMode(mode)}
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

      {tab === "groups" && view.screen === "main" && (
        <Groups onSelectGroup={(groupId) => setView({ screen: "group", groupId })} />
      )}

      {tab === "groups" && view.screen === "group" && (
        <GroupDetail
          groupId={view.groupId}
          onBack={() => setView({ screen: "main" })}
        />
      )}

      {tab === "stats" && <Stats refreshKey={refreshKey} />}

      {tab === "profile" && (
        <Profile
          email={user.email ?? ""}
          firstName={firstName}
          onUpdateFirstName={updateFirstName}
          onUpdatePassword={updatePassword}
          onSignOut={signOut}
          onStartOnboarding={handleStartOnboarding}
        />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
    </ToastProvider>
  );
}
