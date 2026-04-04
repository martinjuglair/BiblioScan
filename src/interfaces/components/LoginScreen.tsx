import { useState } from "react";

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginScreen({ onSignIn, onSignUp, loading, error }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp) {
      onSignUp(email.trim(), password.trim());
    } else {
      onSignIn(email.trim(), password.trim());
    }
  };

  return (
    <div className="min-h-screen bg-surface-light flex flex-col items-center justify-center px-5 py-8">
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center shadow-float"
          style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}>
          <svg className="w-8 h-8 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">BiblioScan</h1>
        <p className="text-text-tertiary text-sm mt-1">Gérez votre collection de livres</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-text-primary text-center">
          {isSignUp ? "Créer un compte" : "Connexion"}
        </h2>

        {error && (
          <div className="bg-status-error-bg border border-status-error/20 rounded-card p-3">
            <p className="text-status-error text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="text-sm text-text-secondary block mb-1 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="papa@email.com"
            className="input-field"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1 font-medium">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim() || !password.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-text-primary border-t-transparent rounded-full" />
              Chargement...
            </span>
          ) : (
            isSignUp ? "Créer mon compte" : "Se connecter"
          )}
        </button>

        <p className="text-center text-sm text-text-tertiary">
          {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-brand-orange font-medium"
          >
            {isSignUp ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </form>
    </div>
  );
}
