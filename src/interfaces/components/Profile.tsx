import { useState } from "react";
import { useToast } from "./Toast";
import { hapticLight } from "@interfaces/utils/haptics";

interface ProfileProps {
  email: string;
  firstName: string | null;
  onUpdateFirstName: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onStartOnboarding: () => void;
}

export function Profile({ email, firstName, onUpdateFirstName, onSignOut, onStartOnboarding }: ProfileProps) {
  const [nameInput, setNameInput] = useState(firstName ?? "");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    await onUpdateFirstName(nameInput.trim());
    setSaving(false);
    setEdited(false);
    hapticLight();
    toast("Prénom mis à jour", "success");
  };

  const handleChange = (val: string) => {
    setNameInput(val);
    setEdited(val.trim() !== (firstName ?? ""));
  };

  return (
    <div className="px-3 sm:px-4 py-4">
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-6">Mon profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-hero"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)" }}
        >
          {(firstName ?? email)[0]?.toUpperCase() ?? "?"}
        </div>
        {firstName && (
          <p className="mt-2 text-lg font-semibold text-text-primary">{firstName}</p>
        )}
        <p className="text-sm text-text-tertiary">{email}</p>
      </div>

      {/* Edit name */}
      <div className="card space-y-3 mb-4">
        <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Informations</h2>

        <div>
          <label className="text-text-secondary text-sm block mb-1 font-medium">Prénom</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Votre prénom"
            className="input-field"
            maxLength={30}
          />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1 font-medium">Email</label>
          <p className="text-sm text-text-primary bg-surface-subtle rounded-xl px-4 py-3">{email}</p>
        </div>

        {edited && (
          <button
            onClick={handleSave}
            disabled={saving || !nameInput.trim()}
            className="btn-primary w-full"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        )}
      </div>

      {/* App info */}
      <div className="card space-y-2 mb-4">
        <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Application</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Version</span>
          <span className="text-sm text-text-primary font-medium">1.0.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Moteur</span>
          <span className="text-sm text-text-primary font-medium">BiblioScan PWA</span>
        </div>
      </div>

      {/* Replay onboarding */}
      <button
        onClick={onStartOnboarding}
        className="w-full card flex items-center gap-3 mb-4 active:scale-[0.98] transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-grape/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-grape" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-text-primary">Revoir le tutoriel</p>
          <p className="text-xs text-text-tertiary">Découvrir les fonctionnalités</p>
        </div>
        <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-pill bg-status-error-bg text-status-error font-semibold transition-all duration-200 active:scale-95 text-sm"
      >
        Se déconnecter
      </button>
    </div>
  );
}
