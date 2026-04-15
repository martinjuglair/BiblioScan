import { useState, useEffect, useMemo } from "react";
import { useToast } from "./Toast";
import { hapticLight } from "@interfaces/utils/haptics";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary } from "@infrastructure/container";
import { supabase } from "@infrastructure/supabase/client";
import { LEVEL_ICONS, getLevel, getNextLevel, BADGES, computeStreak, getReadingLog } from "./Stats";

interface ProfileProps {
  email: string;
  firstName: string | null;
  onUpdateFirstName: (name: string) => Promise<void>;
  onUpdatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  onSignOut: () => Promise<void>;
  onStartOnboarding: () => void;
}

export function Profile({ email, firstName, onUpdateFirstName, onUpdatePassword, onSignOut, onStartOnboarding }: ProfileProps) {
  const [nameInput, setNameInput] = useState(firstName ?? "");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [books, setBooks] = useState<ComicBook[]>([]);
  const { toast } = useToast();

  // Feedback
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackHover, setFeedbackHover] = useState(0);

  useEffect(() => {
    getCategorizedLibrary.execute().then((result) => {
      if (result.ok) {
        setBooks([
          ...result.value.categories.flatMap((c) => c.books),
          ...result.value.uncategorized,
        ]);
      }
    });

  }, []);

  const readCount = useMemo(() => books.filter((b) => b.isRead).length, [books]);
  const level = getLevel(readCount);
  const nextLevel = getNextLevel(readCount);
  const levelProgress = nextLevel ? ((readCount - level.min) / (nextLevel.min - level.min)) * 100 : 100;
  const streak = useMemo(() => computeStreak(getReadingLog()), []);
  const earnedBadges = useMemo(() => BADGES.filter((b) => b.check(books, streak)), [books, streak]);
  const lockedBadges = useMemo(() => BADGES.filter((b) => !b.check(books, streak)), [books, streak]);

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    await onUpdateFirstName(nameInput.trim());
    setSaving(false);
    setEdited(false);
    hapticLight();
    toast("Prénom mis à jour", "success");
  };

  const handleFeedback = async () => {
    if (feedbackRating < 1) return;
    setFeedbackSending(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { error } = await supabase.from("app_feedback").insert({
        user_id: data.user.id,
        rating: feedbackRating,
        message: feedbackMsg.trim(),
      });
      if (!error) {
        setFeedbackSent(true);
        hapticLight();
        toast("Merci pour votre avis !", "success");
      }
    } catch {}
    setFeedbackSending(false);
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

      {/* Level card */}
      {books.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{LEVEL_ICONS[level.icon]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-grape uppercase">Niveau {level.level}</span>
                <span className="text-sm font-bold text-text-primary">{level.name}</span>
              </div>
              {nextLevel ? (
                <>
                  <div className="h-2 bg-surface-subtle rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${levelProgress}%`,
                        background: "linear-gradient(90deg, #8B5CF6, #F472B6)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    {readCount}/{nextLevel.min} livres lus pour "{nextLevel.name}" {LEVEL_ICONS[nextLevel.icon]}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-status-success font-semibold mt-1">Niveau maximum atteint !</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      {books.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
            Badges ({earnedBadges.length}/{BADGES.length})
          </h3>

          {/* Earned */}
          {earnedBadges.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {earnedBadges.map((badge) => (
                <div key={badge.id} className="text-center">
                  <div className="text-2xl mb-0.5">{badge.emoji}</div>
                  <p className="text-[10px] text-text-primary font-semibold leading-tight">{badge.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Locked — show description + progression */}
          {lockedBadges.length > 0 && (
            <div className="space-y-2">
              {earnedBadges.length > 0 && <div className="border-t border-border pt-2" />}
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">À débloquer</p>
              {lockedBadges.map((badge) => {
                const prog = badge.progress?.(books, streak);
                return (
                  <div key={badge.id} className="flex items-start gap-2.5">
                    <div className="text-xl grayscale opacity-40 flex-shrink-0 mt-0.5">{badge.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-secondary font-semibold leading-tight">{badge.name}</p>
                      <p className="text-[10px] text-text-muted leading-tight">{badge.description}</p>
                      {prog && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 flex-1 bg-surface-subtle rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%`, backgroundColor: "rgba(139,92,246,0.4)" }}
                            />
                          </div>
                          <span className="text-[9px] text-text-muted font-semibold">{prog.current}/{prog.target}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
          <span className="text-sm text-text-primary font-medium">Shelfy PWA</span>
        </div>
      </div>

      {/* Feedback */}
      <div className="card space-y-3 mb-4">
        <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Votre avis compte</h2>
        {feedbackSent ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-base font-bold text-text-primary">Merci pour votre avis !</p>
            <p className="text-xs text-text-tertiary mt-1">Votre retour nous aide à améliorer Shelfy.</p>
            <button
              onClick={() => { setFeedbackSent(false); setFeedbackRating(0); setFeedbackMsg(""); }}
              className="mt-3 text-sm font-semibold text-brand-grape"
            >
              Donner un nouvel avis
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">Comment trouvez-vous Shelfy ?</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  onMouseEnter={() => setFeedbackHover(star)}
                  onMouseLeave={() => setFeedbackHover(0)}
                  className="text-3xl transition-transform hover:scale-110 active:scale-95 p-1"
                >
                  {(feedbackHover || feedbackRating) >= star ? "★" : "☆"}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              placeholder="Dites-nous ce que vous en pensez..."
              className="input-field w-full min-h-[80px] resize-none"
              rows={3}
            />
            <button
              onClick={handleFeedback}
              disabled={feedbackSending || feedbackRating < 1}
              className="btn-primary w-full"
            >
              {feedbackSending ? "Envoi..." : "Envoyer"}
            </button>
          </>
        )}
      </div>

      {/* Change password */}
      <button
        onClick={() => { setShowPasswordModal(true); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }}
        className="w-full card flex items-center gap-3 mb-2 active:scale-[0.98] transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-bubblegum/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-bubblegum" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-text-primary">Changer le mot de passe</p>
          <p className="text-xs text-text-tertiary">Modifier votre mot de passe</p>
        </div>
        <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

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

      {/* Password change modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-auto p-5 space-y-4 shadow-hero">
            <h2 className="text-lg font-bold text-text-primary">Changer le mot de passe</h2>

            {passwordError && (
              <p className="text-status-error text-sm bg-status-error-bg rounded-xl p-2.5">{passwordError}</p>
            )}

            <div>
              <label className="text-sm text-text-secondary block mb-1 font-medium">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 caractères minimum"
                className="input-field w-full"
                minLength={6}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1 font-medium">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="input-field w-full"
                minLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                onClick={async () => {
                  setPasswordError(null);
                  if (newPassword.length < 6) {
                    setPasswordError("Le mot de passe doit faire au moins 6 caractères");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError("Les mots de passe ne correspondent pas");
                    return;
                  }
                  setPasswordSaving(true);
                  const result = await onUpdatePassword(newPassword);
                  setPasswordSaving(false);
                  if (result.ok) {
                    setShowPasswordModal(false);
                    hapticLight();
                    toast("Mot de passe mis à jour", "success");
                  } else {
                    setPasswordError(result.error ?? "Erreur");
                  }
                }}
                disabled={passwordSaving || !newPassword || !confirmPassword}
                className="btn-primary flex-1"
              >
                {passwordSaving ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
