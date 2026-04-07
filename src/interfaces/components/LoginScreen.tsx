import { useState } from "react";

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, firstName?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginScreen({ onSignIn, onSignUp, loading, error }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp) {
      onSignUp(email.trim(), password.trim(), firstName.trim() || undefined);
    } else {
      onSignIn(email.trim(), password.trim());
    }
  };

  return (
    <div className="min-h-screen bg-surface-light flex flex-col items-center justify-center px-5 py-8">
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-hero"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #F472B6 100%)" }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">BiblioScan</h1>
        <p className="text-text-tertiary text-sm mt-1.5">Scannez, classez, partagez vos livres</p>
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

        {isSignUp && (
          <div>
            <label className="text-sm text-text-secondary block mb-1 font-medium">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Martin"
              className="input-field"
              autoComplete="given-name"
            />
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
            className="text-brand-grape font-medium"
          >
            {isSignUp ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </form>
    </div>
  );
}
