import { useEffect, useState, useCallback } from "react";
import { ReadingGroup, GroupMember, GroupBook, GroupReview, GroupActivity } from "@domain/entities/ReadingGroup";
import { readingGroupRepository, scanComicBook, authService } from "@infrastructure/container";
import { BottomSheet } from "./BottomSheet";
import { LazyImage } from "./LazyImage";
import { useToast } from "./Toast";
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from "@interfaces/utils/haptics";

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const FALLBACK_CONFIG = {
  icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  color: "text-text-muted",
  label: (a: GroupActivity) => `${a.userName ?? "Quelqu'un"} a fait une action`,
};

const ACTIVITY_CONFIG: Record<string, { icon: string; color: string; label: (a: GroupActivity) => string }> = {
  join: {
    icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    color: "text-status-success",
    label: (a) => `${a.userName ?? "Quelqu'un"} a rejoint le groupe`,
  },
  leave: {
    icon: "M22 10.5h-6m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    color: "text-text-muted",
    label: (a) => `${a.userName ?? "Quelqu'un"} a quitté le groupe`,
  },
  share_book: {
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    color: "text-brand-lemon",
    label: (a) => `${a.userName ?? "Quelqu'un"} a partagé ${a.bookTitle ? `« ${a.bookTitle} »` : "un livre"}`,
  },
  review: {
    icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    color: "text-brand-bubblegum",
    label: (a) => `${a.userName ?? "Quelqu'un"} a noté ${a.bookTitle ? `« ${a.bookTitle} »` : "un livre"}`,
  },
};

export function GroupDetail({ groupId, onBack }: GroupDetailProps) {
  const [group, setGroup] = useState<ReadingGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [books, setBooks] = useState<GroupBook[]>([]);
  const [activity, setActivity] = useState<GroupActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedIsbn, setSelectedIsbn] = useState<string | null>(null);
  const [reviews, setReviews] = useState<GroupReview[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [friendName, setFriendName] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const userId = await authService.getUserId();
    setCurrentUserId(userId);

    const [groupsResult, membersResult, booksResult, activityResult] = await Promise.all([
      readingGroupRepository.findMyGroups(),
      readingGroupRepository.getMembers(groupId),
      readingGroupRepository.getGroupBooks(groupId),
      readingGroupRepository.getActivity(groupId),
    ]);

    if (groupsResult.ok) {
      const found = groupsResult.value.find((g) => g.id === groupId) ?? null;
      setGroup(found);
      if (found?.isPrivate) {
        const fname = await readingGroupRepository.getFriendName(groupId);
        setFriendName(fname);
      }
    }
    if (membersResult.ok) setMembers(membersResult.value);
    if (booksResult.ok) setBooks(booksResult.value);
    if (activityResult.ok) setActivity(activityResult.value);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReviews = async (isbn: string) => {
    setSelectedIsbn(isbn);
    setReviewRating(0);
    setReviewComment("");
    const result = await readingGroupRepository.getReviews(groupId, isbn);
    if (result.ok) setReviews(result.value);
  };

  const handleSaveReview = async () => {
    if (!selectedIsbn || reviewRating === 0) return;
    hapticLight();
    setSavingReview(true);
    const selectedBook = books.find((b) => b.isbn === selectedIsbn);
    const result = await readingGroupRepository.addReview(
      groupId,
      selectedIsbn,
      reviewRating,
      reviewComment.trim() || null,
      selectedBook?.title ?? null,
    );
    setSavingReview(false);
    if (result.ok) {
      toast("Avis enregistré", "success");
      loadReviews(selectedIsbn);
      // Refresh activity
      const actResult = await readingGroupRepository.getActivity(groupId);
      if (actResult.ok) setActivity(actResult.value);
    }
  };

  const handleCopyInvite = async () => {
    if (!group) return;
    hapticMedium();
    const deepLink = `shelfy://join/${group.inviteCode}`;
    const text = `Rejoins mon groupe de lecture "${group.name}" sur Shelfy !\n\n👉 ${deepLink}\n\nOu entre le code : ${group.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Groupe ${group.name}`, text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToLibrary = async (book: GroupBook) => {
    setAddingToLibrary(true);
    const result = await scanComicBook.confirm({
      isbn: book.isbn,
      title: book.title,
      authors: [],
      publisher: "",
      publishedDate: "",
      coverUrl: book.coverUrl,
      retailPrice: null,
    });
    setAddingToLibrary(false);
    if (result.ok) {
      hapticMedium();
      toast(`"${book.title}" ajouté à votre collection`, "success");
    } else {
      toast(result.error, "error");
    }
  };

  const handleLeave = async () => {
    const msg = group?.isPrivate
      ? "Retirer cet ami ? La conversation sera supprimee."
      : "Quitter ce groupe ?";
    if (!confirm(msg)) return;

    if (group?.isPrivate) {
      const result = await readingGroupRepository.deleteGroup(groupId);
      if (result.ok) {
        toast("Ami retire", "success");
        onBack();
      }
    } else {
      const result = await readingGroupRepository.leaveGroup(groupId);
      if (result.ok) {
        toast("Groupe quitte", "success");
        onBack();
      }
    }
  };

  const isAdmin = !!(group && currentUserId && group.createdBy === currentUserId);

  const handleOpenSettings = () => {
    if (!group) return;
    setEditName(group.name);
    setEditEmoji(group.emoji || "📚");
    setShowSettings(true);
    hapticLight();
  };

  const handleSaveGroupSettings = async () => {
    if (!group || !editName.trim()) return;
    setSavingSettings(true);
    const result = await readingGroupRepository.updateGroup(groupId, {
      name: editName.trim(),
      emoji: editEmoji.trim() || "📚",
    });
    setSavingSettings(false);
    if (result.ok) {
      setGroup(result.value);
      hapticSuccess();
      toast("Groupe mis à jour", "success");
      setShowSettings(false);
    } else {
      hapticError();
      toast(result.error, "error");
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (member.userId === currentUserId) return;
    if (!confirm(`Retirer ${member.firstName ?? member.email} du groupe ?`)) return;
    setRemovingMemberId(member.userId);
    const result = await readingGroupRepository.removeMember(groupId, member.userId);
    setRemovingMemberId(null);
    if (result.ok) {
      hapticSuccess();
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      toast("Membre retiré", "success");
    } else {
      hapticError();
      toast(result.error, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-brand-grape border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="text-brand-bubblegum font-medium mb-3 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <p className="text-status-error">Groupe introuvable</p>
      </div>
    );
  }

  const selectedBook = books.find((b) => b.isbn === selectedIsbn);

  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Header */}
      <button onClick={onBack} className="text-brand-bubblegum font-medium mb-3 flex items-center gap-1 min-h-[44px]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <div className="flex items-center gap-3 mb-4">
        {group.isPrivate ? (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 100%)" }}
          >
            {(friendName ?? "A")[0]!.toUpperCase()}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-surface-subtle flex items-center justify-center text-3xl">
            {group.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary truncate">
            {group.isPrivate ? friendName ?? "Ami" : group.name}
          </h1>
          {!group.isPrivate && group.description && (
            <p className="text-text-tertiary text-sm truncate">{group.description}</p>
          )}
          <p className="text-text-muted text-xs mt-0.5">
            {group.isPrivate
              ? `${books.length} livre${books.length > 1 ? "s" : ""} partage${books.length > 1 ? "s" : ""}`
              : `${members.length} membre${members.length > 1 ? "s" : ""} · ${books.length} livre${books.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Action buttons (not for private groups) */}
      {!group.isPrivate && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowInvite(true)}
            className="flex-1 card flex items-center justify-center gap-2 py-3 active:scale-[0.97] transition-all"
          >
            <svg className="w-4 h-4 text-brand-lemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Inviter</span>
          </button>
          <button
            onClick={() => setShowMembers(true)}
            className="flex-1 card flex items-center justify-center gap-2 py-3 active:scale-[0.97] transition-all"
          >
            <svg className="w-4 h-4 text-brand-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Membres</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenSettings}
              className="flex-1 card flex items-center justify-center gap-2 py-3 active:scale-[0.97] transition-all"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">Reglages</span>
            </button>
          )}
        </div>
      )}

      {/* Activity feed */}
      {activity.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            Activité récente
          </h2>
          <div className="card mb-4 divide-y divide-border">
            {activity.slice(0, 10).map((a) => {
              const config = ACTIVITY_CONFIG[a.type] ?? FALLBACK_CONFIG;
              return (
                <div key={a.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">
                      {config.label(a)}
                    </p>
                    {a.message && (
                      <p className="text-xs text-text-secondary mt-0.5 italic">
                        « {a.message} »
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Shared books */}
      <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-2">
        Bibliothèque commune
      </h2>

      {books.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <p className="text-sm">Aucun livre partagé encore.</p>
          <p className="text-xs mt-1">Partagez un livre depuis sa page de détail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 min-[360px]:grid-cols-4 gap-2">
          {books.map((book) => (
            <button
              key={book.isbn}
              onClick={() => loadReviews(book.isbn)}
              className="flex flex-col items-center active:scale-95 transition-transform"
            >
              {book.coverUrl ? (
                <LazyImage
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full aspect-[2/3] rounded-lg shadow-card"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs">
                  ?
                </div>
              )}
              <p className="text-xs text-text-primary mt-1 truncate w-full text-center font-medium">
                {book.title}
              </p>
              {book.sharedByName && (
                <p className="text-[10px] text-text-muted truncate w-full text-center">
                  par {book.sharedByName}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Leave group / Remove friend */}
      <button
        onClick={handleLeave}
        className="w-full mt-6 py-3 rounded-pill bg-status-error-bg text-status-error font-semibold transition-all duration-200 active:scale-95 text-sm"
      >
        {group.isPrivate ? "Retirer cet ami" : "Quitter le groupe"}
      </button>

      {/* Invite sheet */}
      <BottomSheet isOpen={showInvite} onClose={() => setShowInvite(false)} title="Inviter des membres">
        <div className="space-y-3 pb-4 text-center">
          <p className="text-sm text-text-tertiary">Partagez ce code pour inviter quelqu'un :</p>
          <div className="bg-surface-subtle rounded-xl py-4 px-6">
            <p className="text-2xl font-mono font-bold tracking-[0.2em] text-text-primary">
              {group.inviteCode}
            </p>
          </div>
          <button onClick={handleCopyInvite} className="btn-primary w-full">
            {copied ? "Copié !" : "Partager le code"}
          </button>
        </div>
      </BottomSheet>

      {/* Members sheet */}
      <BottomSheet isOpen={showMembers} onClose={() => setShowMembers(false)} title="Membres">
        <div className="flex flex-col gap-2 pb-4">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-sm font-bold text-text-secondary">
                {(m.firstName ?? m.email)[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">
                  {m.firstName ?? m.email.split("@")[0]}
                </p>
                <p className="text-xs text-text-muted">{m.email}</p>
              </div>
              {m.role === "admin" && (
                <span className="text-[10px] bg-brand-grape/10 text-brand-lemon font-semibold px-2 py-0.5 rounded-pill">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Settings sheet (admin only) */}
      <BottomSheet isOpen={showSettings} onClose={() => setShowSettings(false)} title="Réglages du groupe">
        <div className="space-y-4 pb-4">
          <div>
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">Emoji</label>
            <input
              type="text"
              value={editEmoji}
              onChange={(e) => setEditEmoji(e.target.value)}
              maxLength={2}
              className="input-rect w-20 text-center text-2xl"
              placeholder="📚"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">Nom du groupe</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-rect w-full"
              placeholder="Nom du groupe"
            />
          </div>
          <button
            onClick={handleSaveGroupSettings}
            disabled={savingSettings || !editName.trim()}
            className="btn-primary w-full text-sm"
          >
            {savingSettings ? "..." : "Enregistrer"}
          </button>

          <div className="border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Membres ({members.length})
            </h4>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-sm font-bold text-text-secondary">
                    {(m.firstName ?? m.email)[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">
                      {m.firstName ?? m.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-text-muted">{m.email}</p>
                  </div>
                  {m.role === "admin" ? (
                    <span className="text-[10px] bg-brand-grape/10 text-brand-lemon font-semibold px-2 py-0.5 rounded-pill">
                      Admin
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveMember(m)}
                      disabled={removingMemberId === m.userId}
                      className="text-xs font-semibold text-status-error border border-status-error rounded-pill px-3 py-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {removingMemberId === m.userId ? "..." : "Retirer"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Book reviews sheet */}
      <BottomSheet
        isOpen={selectedIsbn !== null}
        onClose={() => setSelectedIsbn(null)}
        title={selectedBook?.title ?? "Avis"}
      >
        <div className="space-y-4 pb-4">
          {/* Add to my library */}
          {selectedBook && (
            <button
              onClick={() => handleAddToLibrary(selectedBook)}
              disabled={addingToLibrary}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-grape/10 text-brand-grape font-semibold text-sm transition-all active:scale-[0.97]"
            >
              {addingToLibrary ? (
                <div className="animate-spin w-4 h-4 border-2 border-brand-grape border-t-transparent rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
              Ajouter à ma collection
            </button>
          )}

          {/* Existing reviews */}
          {reviews.length > 0 && (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-text-primary">
                      {r.userName ?? "Anonyme"}
                    </span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= r.rating ? "text-brand-lemon" : "text-border"}`}
                          fill={s <= r.rating ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-text-secondary">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {reviews.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-2">Aucun avis encore. Soyez le premier !</p>
          )}

          {/* Add review */}
          <div className="border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Votre avis</h4>
            <div className="flex gap-0 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(reviewRating === star ? 0 : star)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <svg
                    className={`w-7 h-7 ${star <= reviewRating ? "text-brand-lemon" : "text-border-strong"}`}
                    fill={star <= reviewRating ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Votre commentaire..."
              rows={2}
              className="input-rect w-full resize-none mb-2"
            />
            <button
              onClick={handleSaveReview}
              disabled={savingReview || reviewRating === 0}
              className="btn-primary w-full text-sm"
            >
              {savingReview ? "..." : "Enregistrer mon avis"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
