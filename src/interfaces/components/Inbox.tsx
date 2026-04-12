import { useEffect, useState, useCallback } from "react";
import { DirectShare, DirectShareType } from "@domain/entities/Friendship";
import { friendshipRepository } from "@infrastructure/container";
import { useToast } from "./Toast";
import { hapticLight } from "@interfaces/utils/haptics";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "\u00e0 l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const TYPE_BADGE: Record<DirectShareType, { label: string; bg: string; text: string }> = {
  share: { label: "Partage", bg: "bg-brand-grape/10", text: "text-brand-grape" },
  lend: { label: "Pr\u00eat", bg: "bg-brand-sky/10", text: "text-brand-sky" },
  return: { label: "Retour", bg: "bg-status-success/10", text: "text-status-success" },
};

export function Inbox() {
  const [items, setItems] = useState<DirectShare[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadInbox = useCallback(async () => {
    const result = await friendshipRepository.getInbox();
    if (result.ok) setItems(result.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleMarkRead = async (item: DirectShare) => {
    if (item.isRead) return;
    const result = await friendshipRepository.markAsRead(item.id);
    if (result.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
      );
    }
  };

  const handleMarkReturned = async (item: DirectShare) => {
    if (!confirm(`Marquer "\u00ab ${item.title} \u00bb" comme rendu ?`)) return;
    hapticLight();
    const result = await friendshipRepository.markLendReturned(item.id);
    if (result.ok) {
      toast("Marqu\u00e9 comme rendu", "success");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, lendReturned: true } : i))
      );
    } else {
      toast(result.error, "error");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-7 w-36 rounded-lg mb-4" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card mb-2 h-24" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-4">Bo\u00eete de r\u00e9ception</h2>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Rien pour le moment</h2>
          <p className="text-sm text-text-tertiary max-w-xs mx-auto">
            Quand un ami vous enverra un livre, il appara\u00eetra ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const badge = TYPE_BADGE[item.type];
            return (
              <button
                key={item.id}
                onClick={() => handleMarkRead(item)}
                className={`card flex gap-3 text-left active:scale-[0.98] transition-all duration-200 ${
                  !item.isRead ? "ring-2 ring-brand-grape/30 bg-brand-grape/[0.03]" : ""
                }`}
              >
                {/* Cover thumbnail */}
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-14 h-20 object-cover rounded-lg shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-20 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs flex-shrink-0">
                    ?
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-0.5">
                    {/* Unread dot */}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-grape flex-shrink-0 mt-1.5" />
                    )}
                    <p className={`text-sm truncate flex-1 ${!item.isRead ? "font-bold text-text-primary" : "font-semibold text-text-primary"}`}>
                      {item.title}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary truncate">
                    De {item.fromUserName ?? "Quelqu'un"}
                  </p>

                  {item.message && (
                    <p className="text-xs text-text-tertiary mt-0.5 truncate italic">
                      \u00ab {item.message} \u00bb
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-text-muted">{timeAgo(item.createdAt)}</p>

                    {item.type === "lend" && !item.lendReturned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkReturned(item);
                        }}
                        className="text-[10px] font-semibold text-brand-sky bg-brand-sky/10 px-2 py-0.5 rounded-pill transition-all active:scale-95"
                      >
                        Marquer comme rendu
                      </button>
                    )}

                    {item.type === "lend" && item.lendReturned && (
                      <span className="text-[10px] font-semibold text-status-success bg-status-success/10 px-2 py-0.5 rounded-pill">
                        Rendu
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
