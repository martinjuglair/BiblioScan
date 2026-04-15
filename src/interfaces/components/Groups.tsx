import { useEffect, useState, useCallback } from "react";
import { ReadingGroup } from "@domain/entities/ReadingGroup";
import { readingGroupRepository, friendshipRepository } from "@infrastructure/container";
import { useToast } from "./Toast";
import { BottomSheet } from "./BottomSheet";
import { hapticLight } from "@interfaces/utils/haptics";

interface GroupsProps {
  onSelectGroup: (groupId: string) => void;
}

const EMOJIS = ["📚", "📖", "🎭", "🐉", "⚔️", "🌍", "🔮", "🎨", "🧙", "💫", "🏴‍☠️", "🚀"];

interface GroupWithFriendName extends ReadingGroup {
  friendName?: string;
}

export function Groups({ onSelectGroup }: GroupsProps) {
  const [groups, setGroups] = useState<GroupWithFriendName[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [showMyCode, setShowMyCode] = useState(false);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { toast } = useToast();

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    const result = await readingGroupRepository.findMyGroups();
    if (result.ok) {
      const enriched: GroupWithFriendName[] = await Promise.all(
        result.value.map(async (g) => {
          if (g.isPrivate) {
            const friendName = await readingGroupRepository.getFriendName(g.id);
            return { ...g, friendName: friendName ?? "Ami" };
          }
          return g;
        }),
      );
      setGroups(enriched);
    }
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
      toast(`Groupe "${name}" cree !`, "success");
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

  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;
    setAddingFriend(true);
    const result = await friendshipRepository.acceptInvite(friendCode.trim());
    setAddingFriend(false);
    if (result.ok) {
      hapticLight();
      toast("Ami ajoute !", "success");
      setShowAddFriend(false);
      setFriendCode("");
      loadGroups();
    } else {
      toast(result.error, "error");
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    const result = await friendshipRepository.createInviteCode();
    if (result.ok) setMyCode(result.value);
    setGeneratingCode(false);
  };

  const handleShowMyCode = async () => {
    setShowActions(false);
    setShowMyCode(true);
    if (!myCode) await handleGenerateCode();
  };

  const privateGroups = groups.filter((g) => g.isPrivate);
  const publicGroups = groups.filter((g) => !g.isPrivate);

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
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Social</h1>
        <button
          onClick={() => setShowActions(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-card transition-all active:scale-90"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 100%)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Votre espace social</h2>
          <p className="text-sm text-text-tertiary mb-6 max-w-xs mx-auto">
            Ajoutez des amis ou creez des groupes pour partager vos lectures et vos avis.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowAddFriend(true)} className="btn-secondary text-sm">
              Ajouter un ami
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              Creer un groupe
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Friends section */}
          {privateGroups.length > 0 && (
            <>
              {publicGroups.length > 0 && (
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-1">Amis</p>
              )}
              {privateGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className="card flex items-center gap-3 text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 100%)" }}
                  >
                    {(group.friendName ?? "A")[0]!.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{group.friendName}</h3>
                    <p className="text-text-tertiary text-xs">Conversation privee</p>
                  </div>
                  <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </>
          )}

          {/* Groups section */}
          {publicGroups.length > 0 && (
            <>
              {privateGroups.length > 0 && (
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-3">Groupes</p>
              )}
              {publicGroups.map((group) => (
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
            </>
          )}
        </div>
      )}

      {/* Actions sheet */}
      <BottomSheet isOpen={showActions} onClose={() => setShowActions(false)} title="Que souhaitez-vous faire ?">
        <div className="space-y-1 pb-4">
          <button
            onClick={() => { setShowActions(false); setTimeout(() => setShowAddFriend(true), 300); }}
            className="flex items-center gap-3 w-full py-3 px-1 rounded-xl hover:bg-surface-subtle transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-grape/10 flex items-center justify-center text-xl">👤</div>
            <div>
              <p className="font-semibold text-sm text-text-primary">Ajouter un ami</p>
              <p className="text-xs text-text-tertiary">Avec un code d'invitation</p>
            </div>
          </button>
          <button
            onClick={() => { setShowActions(false); setTimeout(() => handleShowMyCode(), 300); }}
            className="flex items-center gap-3 w-full py-3 px-1 rounded-xl hover:bg-surface-subtle transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-lemon/20 flex items-center justify-center text-xl">🔑</div>
            <div>
              <p className="font-semibold text-sm text-text-primary">Mon code ami</p>
              <p className="text-xs text-text-tertiary">Partager votre code</p>
            </div>
          </button>

          <div className="border-t border-border my-2" />

          <button
            onClick={() => { setShowActions(false); setTimeout(() => setShowCreate(true), 300); }}
            className="flex items-center gap-3 w-full py-3 px-1 rounded-xl hover:bg-surface-subtle transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📚</div>
            <div>
              <p className="font-semibold text-sm text-text-primary">Creer un groupe</p>
              <p className="text-xs text-text-tertiary">Groupe de lecture avec plusieurs personnes</p>
            </div>
          </button>
          <button
            onClick={() => { setShowActions(false); setTimeout(() => setShowJoin(true), 300); }}
            className="flex items-center gap-3 w-full py-3 px-1 rounded-xl hover:bg-surface-subtle transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">🔗</div>
            <div>
              <p className="font-semibold text-sm text-text-primary">Rejoindre un groupe</p>
              <p className="text-xs text-text-tertiary">Avec un code d'invitation</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Add friend sheet */}
      <BottomSheet isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} title="Ajouter un ami">
        <div className="space-y-3 pb-4">
          <p className="text-sm text-text-tertiary">Entrez le code ami de votre contact.</p>
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            placeholder="Code ami"
            className="input-field text-center text-lg tracking-widest"
            maxLength={6}
            autoFocus
          />
          <button
            onClick={handleAddFriend}
            disabled={addingFriend || !friendCode.trim()}
            className="btn-primary w-full"
          >
            {addingFriend ? "..." : "Ajouter"}
          </button>
        </div>
      </BottomSheet>

      {/* My code sheet */}
      <BottomSheet isOpen={showMyCode} onClose={() => setShowMyCode(false)} title="Mon code ami">
        <div className="space-y-3 pb-4 text-center">
          <p className="text-sm text-text-tertiary">Partagez ce code avec vos amis :</p>
          {generatingCode ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-brand-grape border-t-transparent rounded-full" />
            </div>
          ) : myCode ? (
            <>
              <div className="bg-surface-subtle rounded-xl py-4 px-6">
                <p className="text-2xl font-mono font-bold tracking-[0.2em] text-text-primary">{myCode}</p>
              </div>
              <button onClick={handleGenerateCode} className="btn-primary w-full">
                Generer un nouveau code
              </button>
            </>
          ) : null}
        </div>
      </BottomSheet>

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
                    emoji === e ? "bg-brand-grape/20 scale-110 shadow-sm" : "bg-surface-subtle"
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
            {creating ? "Creation..." : "Creer le groupe"}
          </button>
        </div>
      </BottomSheet>

      {/* Join group sheet */}
      <BottomSheet isOpen={showJoin} onClose={() => setShowJoin(false)} title="Rejoindre un groupe">
        <div className="space-y-3 pb-4">
          <p className="text-sm text-text-tertiary">Entrez le code d'invitation partage par un membre du groupe.</p>
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
