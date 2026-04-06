import { useEffect, useState, useCallback } from "react";
import { ReadingGroup } from "@domain/entities/ReadingGroup";
import { readingGroupRepository } from "@infrastructure/container";
import { useToast } from "./Toast";
import { BottomSheet } from "./BottomSheet";
import { hapticLight } from "@interfaces/utils/haptics";

interface GroupsProps {
  onSelectGroup: (groupId: string) => void;
}

const EMOJIS = ["📚", "📖", "🎭", "🐉", "⚔️", "🌍", "🔮", "🎨", "🧙", "💫", "🏴‍☠️", "🚀"];

export function Groups({ onSelectGroup }: GroupsProps) {
  const [groups, setGroups] = useState<ReadingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const { toast } = useToast();

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    const result = await readingGroupRepository.findMyGroups();
    if (result.ok) setGroups(result.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const result = await readingGroupRepository.createGroup(name.trim(), description.trim(), emoji);
    setCreating(false);
    if (result.ok) {
      hapticLight();
      toast(`Groupe "${name}" créé !`, "success");
      setShowCreate(false);
      setName("");
      setDescription("");
      setEmoji("📚");
      loadGroups();
    } else {
      toast(result.error, "error");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    // Find group by invite code
    const findResult = await readingGroupRepository.findByInviteCode(joinCode.trim());
    if (!findResult.ok || !findResult.value) {
      toast("Code d'invitation invalide", "error");
      setJoining(false);
      return;
    }

    const joinResult = await readingGroupRepository.joinGroup(findResult.value.id);
    setJoining(false);
    if (joinResult.ok) {
      hapticLight();
      toast(`Rejoint "${findResult.value.name}" !`, "success");
      setShowJoin(false);
      setJoinCode("");
      loadGroups();
    } else {
      toast(joinResult.error, "error");
    }
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-4">
        <div className="h-7 w-48 rounded-lg mb-4" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card mb-2 h-20" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Groupes de lecture</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-card transition-all active:scale-90 border border-border"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-card transition-all active:scale-90"
            style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}
          >
            <svg className="w-5 h-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Aucun groupe</h2>
          <p className="text-sm text-text-tertiary mb-6 max-w-xs mx-auto">
            Créez un groupe pour partager vos lectures avec vos proches, ou rejoignez-en un avec un code d'invitation.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowJoin(true)} className="btn-secondary text-sm">
              Rejoindre
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              Créer un groupe
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="card flex items-center gap-3 text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center text-2xl flex-shrink-0">
                {group.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary truncate">{group.name}</h3>
                {group.description && (
                  <p className="text-text-tertiary text-xs truncate">{group.description}</p>
                )}
              </div>
              <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Create group sheet */}
      <BottomSheet isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau groupe">
        <div className="space-y-3 pb-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1 font-medium">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    emoji === e ? "bg-brand-amber/20 scale-110 shadow-sm" : "bg-surface-subtle"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1 font-medium">Nom du groupe</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Club BD de la famille"
              className="input-field"
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1 font-medium">Description (optionnel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nos coups de coeur du moment"
              className="input-field"
              maxLength={100}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="btn-primary w-full"
          >
            {creating ? "Création..." : "Créer le groupe"}
          </button>
        </div>
      </BottomSheet>

      {/* Join group sheet */}
      <BottomSheet isOpen={showJoin} onClose={() => setShowJoin(false)} title="Rejoindre un groupe">
        <div className="space-y-3 pb-4">
          <p className="text-sm text-text-tertiary">Entrez le code d'invitation partagé par un membre du groupe.</p>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Code d'invitation"
            className="input-field text-center text-lg tracking-widest"
            maxLength={10}
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={joining || !joinCode.trim()}
            className="btn-primary w-full"
          >
            {joining ? "..." : "Rejoindre"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
