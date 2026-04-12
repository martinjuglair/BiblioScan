import { useEffect, useState, useCallback } from "react";
import { Friend } from "@domain/entities/Friendship";
import { friendshipRepository } from "@infrastructure/container";
import { useToast } from "./Toast";
import { BottomSheet } from "./BottomSheet";
import { hapticLight, hapticMedium } from "@interfaces/utils/haptics";

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadFriends = useCallback(async () => {
    const result = await friendshipRepository.getMyFriends();
    if (result.ok) setFriends(result.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    const result = await friendshipRepository.createInviteCode();
    setGeneratingCode(false);
    if (result.ok) {
      hapticLight();
      setInviteCode(result.value);
    } else {
      toast(result.error, "error");
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    hapticMedium();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ajoutez-moi sur BiblioScan !",
          text: `Ajoutez-moi comme ami sur BiblioScan avec ce code : ${inviteCode}`,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAcceptInvite = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    const result = await friendshipRepository.acceptInvite(joinCode.trim());
    setJoining(false);
    if (result.ok) {
      hapticLight();
      toast("Ami ajout\u00e9 !", "success");
      setShowAdd(false);
      setJoinCode("");
      setInviteCode(null);
      loadFriends();
    } else {
      toast(result.error, "error");
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    if (!confirm(`Retirer ${friend.displayName} de vos amis ?`)) return;
    const result = await friendshipRepository.removeFriend(friend.friendshipId);
    if (result.ok) {
      hapticLight();
      toast(`${friend.displayName} retir\u00e9(e)`, "success");
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
    } else {
      toast(result.error, "error");
    }
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-4">
        <div className="h-7 w-48 rounded-lg mb-4" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card mb-2 h-16" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Mes amis</h2>
        <button
          onClick={() => { setShowAdd(true); setInviteCode(null); setJoinCode(""); }}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-card transition-all active:scale-90"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Aucun ami</h2>
          <p className="text-sm text-text-tertiary mb-6 max-w-xs mx-auto">
            Ajoutez des amis pour partager vos lectures directement avec eux.
          </p>
          <button onClick={() => { setShowAdd(true); setInviteCode(null); setJoinCode(""); }} className="btn-primary text-sm">
            Ajouter un ami
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <div
              key={friend.friendshipId}
              className="card flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-sm font-bold text-text-secondary flex-shrink-0">
                {friend.displayName[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm truncate">{friend.displayName}</p>
                <p className="text-[10px] text-text-muted">
                  Ami depuis le {friend.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => handleRemoveFriend(friend)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-status-error hover:bg-status-error-bg transition-colors active:scale-90 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add friend sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un ami">
        <div className="space-y-4 pb-4">
          {/* Generate invite code */}
          <div>
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Mon code d'invitation
            </h4>
            {inviteCode ? (
              <div className="space-y-2">
                <div className="bg-surface-subtle rounded-xl py-4 px-6 text-center">
                  <p className="text-2xl font-mono font-bold tracking-[0.2em] text-text-primary">
                    {inviteCode}
                  </p>
                </div>
                <button onClick={handleCopyCode} className="btn-primary w-full text-sm">
                  {copied ? "Copi\u00e9 !" : "Partager le code"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generatingCode}
                className="w-full py-3 rounded-xl bg-brand-grape/10 text-brand-grape font-semibold text-sm transition-all active:scale-[0.97]"
              >
                {generatingCode ? "..." : "G\u00e9n\u00e9rer un code"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted font-medium">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Enter a code */}
          <div>
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Entrer un code re\u00e7u
            </h4>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Code d'invitation"
              className="input-field text-center text-lg tracking-widest mb-2"
              maxLength={10}
            />
            <button
              onClick={handleAcceptInvite}
              disabled={joining || !joinCode.trim()}
              className="btn-primary w-full text-sm"
            >
              {joining ? "..." : "Ajouter cet ami"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
