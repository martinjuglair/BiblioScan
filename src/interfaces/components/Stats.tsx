import { useEffect, useState, useMemo, useCallback } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary } from "@infrastructure/container";
import { PullToRefresh } from "./PullToRefresh";
import { LazyImage } from "./LazyImage";
import { hapticSuccess } from "@interfaces/utils/haptics";

// --- Reading Goal persistence (localStorage) ---
const GOAL_KEY = "biblioscan-reading-goal";
function getGoal(): number {
  return parseInt(localStorage.getItem(GOAL_KEY) ?? "0", 10);
}
function setGoalStorage(n: number) {
  localStorage.setItem(GOAL_KEY, String(n));
}

// --- Daily reading log (localStorage) ---
const LOG_KEY = "biblioscan-reading-log";

export function getReadingLog(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveReadingLog(log: string[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hasLoggedToday(log: string[]): boolean {
  return log.includes(todayKey());
}

function logToday(log: string[]): string[] {
  const key = todayKey();
  if (log.includes(key)) return log;
  const updated = [...log, key];
  saveReadingLog(updated);
  return updated;
}

export function computeStreak(log: string[]): { current: number; best: number; total: number } {
  if (log.length === 0) return { current: 0, best: 0, total: 0 };

  const DAY = 86400000;
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y!, m! - 1, d!).getTime();
  };

  const sorted = [...new Set(log)].sort().reverse();
  const total = sorted.length;

  const today = new Date();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const latestMs = toMs(sorted[0]!);

  let current = 0;
  if (latestMs === todayMs || latestMs === todayMs - DAY) {
    let checkDay = latestMs;
    for (const day of sorted) {
      const dayMs = toMs(day);
      if (dayMs === checkDay) {
        current++;
        checkDay -= DAY;
      } else if (dayMs < checkDay) {
        break;
      }
    }
  }

  let best = 1;
  let streak = 1;
  const ascending = [...sorted].reverse();
  for (let i = 1; i < ascending.length; i++) {
    if (toMs(ascending[i]!) - toMs(ascending[i - 1]!) === DAY) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 1;
    }
  }

  return { current, best: Math.max(best, current), total };
}

// --- Level system ---
export const LEVELS = [
  { level: 1, name: "Curieux", min: 0, icon: "seed" },
  { level: 2, name: "Lecteur", min: 5, icon: "sprout" },
  { level: 3, name: "Passionné", min: 15, icon: "tree" },
  { level: 4, name: "Dévoreur", min: 30, icon: "fire" },
  { level: 5, name: "Bibliophile", min: 50, icon: "star" },
  { level: 6, name: "Maître lecteur", min: 100, icon: "crown" },
] as const;

export function getLevel(readCount: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (readCount >= LEVELS[i]!.min) return LEVELS[i]!;
  }
  return LEVELS[0]!;
}

export function getNextLevel(readCount: number) {
  const current = getLevel(readCount);
  const idx = LEVELS.findIndex((l) => l.level === current.level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1]! : null;
}

export const LEVEL_ICONS: Record<string, string> = {
  seed: "\ud83c\udf31",
  sprout: "\ud83c\udf3f",
  tree: "\ud83c\udf33",
  fire: "\ud83d\udd25",
  star: "\u2b50",
  crown: "\ud83d\udc51",
};

// --- Badges ---
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  check: (books: ComicBook[], streakData?: { current: number; best: number; total: number }) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first", name: "Premier pas", description: "Ajouter votre 1er livre", emoji: "\ud83d\udcda", check: (b) => b.length >= 1 },
  { id: "ten", name: "Beau début", description: "10 livres dans la collection", emoji: "\ud83c\udf1f", check: (b) => b.length >= 10 },
  { id: "fifty", name: "Collectionneur", description: "50 livres collectionnés", emoji: "\ud83c\udfc6", check: (b) => b.length >= 50 },
  { id: "reader5", name: "Lecteur assidu", description: "5 livres lus", emoji: "\ud83d\udcd6", check: (b) => b.filter((x) => x.isRead).length >= 5 },
  { id: "reader20", name: "Rat de bibliothèque", description: "20 livres lus", emoji: "\ud83d\udc00", check: (b) => b.filter((x) => x.isRead).length >= 20 },
  { id: "critic", name: "Critique littéraire", description: "Noter 10 livres", emoji: "\u2b50", check: (b) => b.filter((x) => x.rating).length >= 10 },
  { id: "top", name: "Coup de coeur", description: "Donner un 5/5", emoji: "\u2764\ufe0f", check: (b) => b.some((x) => x.rating === 5) },
  { id: "diverse", name: "Éclectique", description: "5 éditeurs différents", emoji: "\ud83c\udf0d", check: (b) => new Set(b.map((x) => x.publisher).filter(Boolean)).size >= 5 },
  { id: "streak3", name: "Régulier", description: "3 jours de lecture d'affilée", emoji: "\ud83d\udd25", check: (_b, s) => (s?.best ?? 0) >= 3 },
  { id: "streak7", name: "Semaine parfaite", description: "7 jours de lecture consécutifs", emoji: "\ud83c\udf1f", check: (_b, s) => (s?.best ?? 0) >= 7 },
  { id: "streak30", name: "Inarrêtable", description: "30 jours de lecture d'affilée", emoji: "\ud83d\udc8e", check: (_b, s) => (s?.best ?? 0) >= 30 },
];

// --- Reading history by month ---
function getReadingHistory(books: ComicBook[]): { month: string; books: ComicBook[] }[] {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const readBooks = books.filter((b) => b.readAt).sort((a, b) => b.readAt!.getTime() - a.readAt!.getTime());

  const groups = new Map<string, ComicBook[]>();
  const result: { month: string; books: ComicBook[] }[] = [];
  const seen = new Set<string>();

  for (const book of readBooks) {
    const d = book.readAt!;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(book);

    if (!seen.has(key)) {
      seen.add(key);
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      result.push({ month: label, books: groups.get(key)! });
    }
  }
  return result;
}

export function Stats() {
  const [books, setBooks] = useState<ComicBook[]>([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(getGoal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [readingLog, setReadingLog] = useState(getReadingLog);
  const [justLogged, setJustLogged] = useState(false);

  const load = useCallback(async () => {
    const result = await getCategorizedLibrary.execute();
    if (result.ok) {
      const all = [
        ...result.value.categories.flatMap((c) => c.books),
        ...result.value.uncategorized,
      ];
      setBooks(all);
      setCategoryCount(result.value.categories.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => computeStats(books, categoryCount), [books, categoryCount]);

  // Year goal progress
  const now = new Date();
  const yearReadCount = useMemo(() =>
    books.filter((b) => b.readAt && b.readAt.getFullYear() === now.getFullYear()).length,
  [books, now]);
  const goalPercent = goal > 0 ? Math.min(100, Math.round((yearReadCount / goal) * 100)) : 0;

  // Streak
  const streak = useMemo(() => computeStreak(readingLog), [readingLog]);
  const loggedToday = hasLoggedToday(readingLog);

  // Reading history
  const history = useMemo(() => getReadingHistory(books), [books]);

  const handleSaveGoal = () => {
    const n = parseInt(goalInput, 10);
    if (n > 0) {
      setGoal(n);
      setGoalStorage(n);
      hapticSuccess();
    }
    setEditingGoal(false);
    setGoalInput("");
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-surface-subtle" />
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="px-3 sm:px-4 py-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">Statistiques</h1>
        <p className="text-text-tertiary text-sm py-12">
          Ajoutez des livres pour voir vos statistiques.
        </p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="px-3 sm:px-4 py-4">

        {/* Hero: Streak + Daily CTA */}
        <div
          className="rounded-2xl p-4 mb-4 text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80">Streak en cours</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl">{streak.current > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
                <span className="text-3xl font-extrabold leading-none">{streak.current} j</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] opacity-75">
                {streak.best > streak.current && <span>Record : {streak.best} j</span>}
                <span>{streak.total} jour{streak.total > 1 ? "s" : ""} au total</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!loggedToday) {
                  hapticSuccess();
                  setReadingLog(logToday(readingLog));
                  setJustLogged(true);
                  setTimeout(() => setJustLogged(false), 2000);
                }
              }}
              disabled={loggedToday}
              className="flex-shrink-0 px-5 py-3 rounded-full font-bold text-sm transition-all active:scale-95"
              style={{
                background: loggedToday ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
              }}
            >
              {loggedToday
                ? justLogged ? "✓ Noté !" : "✓ Lu"
                : "J'ai lu"}
            </button>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-4">Statistiques</h1>

        {/* Annual goal */}
        <div
          className="card mb-3 flex items-center gap-4"
          onClick={() => { setEditingGoal(true); setGoalInput(goal > 0 ? String(goal) : ""); }}
        >
          {goal > 0 ? (
            <>
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#F5F3FF" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="url(#goalGrad)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - goalPercent / 100)}`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-text-primary">{yearReadCount}<span className="text-text-muted font-semibold text-sm">/{goal}</span></span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Objectif {now.getFullYear()}</h3>
                <p className="text-sm text-text-tertiary mt-0.5">
                  {goalPercent}% — {goal - yearReadCount > 0 ? `${goal - yearReadCount} livres restants` : ""}
                </p>
                {goalPercent >= 100 ? (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-success/10 text-status-success">
                    Objectif atteint !
                  </span>
                ) : goalPercent >= 50 ? (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-success/10 text-status-success">
                    En bonne voie
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="text-3xl">{"\ud83c\udfaf"}</div>
              <div>
                <p className="text-sm font-bold text-brand-grape">Fixer un objectif de lecture</p>
                <p className="text-xs text-text-muted mt-0.5">Combien de livres en {now.getFullYear()} ?</p>
              </div>
              <svg className="w-4 h-4 text-text-muted ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Goal edit modal */}
        {editingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingGoal(false)}>
            <div className="card w-72 text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-text-primary mb-2">Objectif de lecture {now.getFullYear()}</h3>
              <p className="text-xs text-text-tertiary mb-3">Combien de livres voulez-vous lire cette année ?</p>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Ex: 24"
                className="input-field text-center text-lg mb-3"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveGoal(); }}
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingGoal(false)} className="btn-secondary flex-1 text-sm">Annuler</button>
                <button onClick={handleSaveGoal} className="btn-primary flex-1 text-sm">Valider</button>
              </div>
            </div>
          </div>
        )}

        {/* Main stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBadge value={stats.totalBooks} label="Livres" color="brand-grape" />
          <StatBadge value={stats.totalCategories} label={stats.totalCategories > 1 ? "Catégories" : "Catégorie"} color="brand-bubblegum" />
          <StatBadge
            value={stats.totalValue ? formatEur(stats.totalValue) : "\u2014"}
            label="Valeur neuf"
            color="status-success"
          />
        </div>

        {/* Quick stats */}
        {(stats.avgPrice > 0 || stats.thisMonth > 0 || stats.oldestBook || stats.newestBook) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {stats.avgPrice > 0 && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-mint">{formatEur(stats.avgPrice)}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Prix moyen</p>
              </div>
            )}
            {stats.thisMonth > 0 && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-grape">+{stats.thisMonth}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Ce mois-ci</p>
              </div>
            )}
            {stats.oldestBook && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-text-secondary">{stats.oldestBook.year}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Le + ancien</p>
                <p className="text-[10px] text-brand-grape truncate mt-0.5 font-medium">{truncate(stats.oldestBook.title, 18)}</p>
              </div>
            )}
            {stats.newestBook && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-mint">{stats.newestBook.year}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Le + récent</p>
                <p className="text-[10px] text-brand-grape truncate mt-0.5 font-medium">{truncate(stats.newestBook.title, 18)}</p>
              </div>
            )}
          </div>
        )}

        {/* Publisher distribution */}
        {stats.publishers.length > 0 && (
          <div className="card mb-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Top éditeurs</h3>
            <div className="space-y-2">
              {stats.publishers.slice(0, 5).map((pub) => (
                <div key={pub.name}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-text-primary font-medium truncate mr-2">{pub.name}</span>
                    <span className="text-text-tertiary text-xs flex-shrink-0">{pub.count} livre{pub.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(pub.count / stats.totalBooks) * 100}%`,
                        background: "linear-gradient(90deg, #8B5CF6, #F472B6)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly additions */}
        {stats.monthlyData.length > 0 && (
          <div className="card mb-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Ajouts par mois</h3>
            <div className="flex items-end gap-1 h-20">
              {stats.monthlyData.map((m, i) => {
                const maxCount = Math.max(...stats.monthlyData.map((d) => d.count), 1);
                const height = (m.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-text-tertiary font-medium">{m.count > 0 ? m.count : ""}</span>
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        background: m.count > 0 ? "linear-gradient(180deg, #34D399, #34D399aa)" : "#F5F3FF",
                      }}
                    />
                    <span className="text-[9px] text-text-muted">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating distribution */}
        {stats.ratingDistribution.some((r) => r > 0) && (
          <div className="card mb-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Répartition des notes</h3>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star - 1]!;
                const maxRating = Math.max(...stats.ratingDistribution, 1);
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary w-4 text-right">{star}</span>
                    <svg className="w-3.5 h-3.5 text-brand-lemon flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                    <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-lemon transition-all duration-500"
                        style={{ width: `${(count / maxRating) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            {stats.avgRating > 0 && (
              <p className="text-xs text-text-tertiary mt-2 text-center">
                Note moyenne : <span className="font-semibold text-brand-lemon">{stats.avgRating.toFixed(1)}</span>/5
                ({stats.ratedCount} livre{stats.ratedCount > 1 ? "s" : ""} noté{stats.ratedCount > 1 ? "s" : ""})
              </p>
            )}
          </div>
        )}

        {/* Reading history timeline */}
        {history.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">Historique de lecture</h3>
            <div className="space-y-3">
              {history.slice(0, 4).map(({ month, books: monthBooks }) => (
                <div key={month}>
                  <p className="text-xs font-semibold text-text-secondary mb-1.5 px-1">{month}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
                    {monthBooks.map((book) => (
                      <div key={book.isbn} className="flex-shrink-0 w-16">
                        {book.coverUrl ? (
                          <LazyImage src={book.coverUrl} alt={book.title} className="w-16 h-22 rounded-lg" />
                        ) : (
                          <div className="w-16 h-22 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs">?</div>
                        )}
                        <p className="text-[10px] text-text-primary mt-0.5 truncate font-medium">{book.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PullToRefresh>
  );
}

function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="card text-center py-2.5 px-1">
      <span className={`text-xl font-bold leading-tight text-${color}`}>{value}</span>
      <p className="text-[11px] text-text-tertiary leading-tight mt-0.5">{label}</p>
    </div>
  );
}

interface StatsData {
  totalBooks: number;
  totalCategories: number;
  totalValue: number;
  avgPrice: number;
  thisMonth: number;
  publishers: { name: string; count: number }[];
  monthlyData: { label: string; count: number }[];
  ratingDistribution: number[];
  avgRating: number;
  ratedCount: number;
  oldestBook: { year: string; title: string } | null;
  newestBook: { year: string; title: string } | null;
}

function computeStats(books: ComicBook[], categoryCount: number): StatsData {
  const totalBooks = books.length;
  const totalCategories = categoryCount;

  const booksWithPrice = books.filter((b) => b.retailPrice !== null);
  const totalValue = booksWithPrice.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  const avgPrice = booksWithPrice.length > 0 ? totalValue / booksWithPrice.length : 0;

  const now = new Date();
  const thisMonth = books.filter(
    (b) => b.addedAt.getMonth() === now.getMonth() && b.addedAt.getFullYear() === now.getFullYear(),
  ).length;

  const pubMap = new Map<string, number>();
  for (const b of books) {
    const pub = b.publisher || "Inconnu";
    pubMap.set(pub, (pubMap.get(pub) ?? 0) + 1);
  }
  const publishers = [...pubMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const monthlyData: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = books.filter(
      (b) => b.addedAt.getMonth() === d.getMonth() && b.addedAt.getFullYear() === d.getFullYear(),
    ).length;
    monthlyData.push({ label: months[d.getMonth()]!, count });
  }

  const ratingDistribution = [0, 0, 0, 0, 0];
  let ratedCount = 0;
  let ratingSum = 0;
  for (const b of books) {
    if (b.rating && b.rating >= 1 && b.rating <= 5) {
      ratingDistribution[b.rating - 1]!++;
      ratedCount++;
      ratingSum += b.rating;
    }
  }
  const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

  const dated = books
    .filter((b) => b.publishedDate.length >= 4)
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  const oldestBook = dated.length > 0 ? { year: extractYear(dated[0]!.publishedDate), title: dated[0]!.title } : null;
  const newestBook = dated.length > 1 ? { year: extractYear(dated[dated.length - 1]!.publishedDate), title: dated[dated.length - 1]!.title } : null;

  return {
    totalBooks, totalCategories, totalValue, avgPrice, thisMonth,
    publishers, monthlyData, ratingDistribution, avgRating, ratedCount,
    oldestBook, newestBook,
  };
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractYear(date: string): string {
  const match = date.match(/\d{4}/);
  return match?.[0] ?? date;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}

