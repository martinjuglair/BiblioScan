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
import { BottomNav } from "@interfaces/components/BottomNav";
import { ToastProvider } from "@interfaces/components/Toast";
import { Onboarding } from "@interfaces/components/Onboarding";
import { BadgeBanner } from "@interfaces/components/BadgeBanner";
import { useBadgeChecker } from "@interfaces/hooks/useBadgeChecker";

type Tab = "library" | "groups" | "scanner" | "stats" | "profile";

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

  // Global badge detection — safe to call unconditionally, the hook checks library internally
  useBadgeChecker();

  const [tab, setTab] = useState<Tab>("scanner");
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
        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 50%, #F472B6 100%)" }}>
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
    {showOnboarding && (
      <Onboarding firstName={firstName} onComplete={handleOnboardingComplete} />
    )}
    <div className="min-h-screen pb-20 max-w-lg mx-auto px-safe">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 100%)" }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          {firstName && (
            <span className="text-sm font-medium text-text-secondary">
              Salut, <span className="text-text-primary font-semibold">{firstName}</span>
            </span>
          )}
        </div>
      </div>

      {tab === "scanner" && (
        <Scanner
          onBookAdded={refresh}
          firstName={firstName}
          onUpdateFirstName={updateFirstName}
        />
      )}

      {tab === "library" && view.screen === "main" && (
        <Library
          refreshKey={refreshKey}
          onSelectCategory={(categoryId) => setView({ screen: "category", categoryId })}
          onSelectBook={(isbn) => setView({ screen: "book", isbn, fromCategoryId: null })}
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

      {tab === "stats" && <Stats />}

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
