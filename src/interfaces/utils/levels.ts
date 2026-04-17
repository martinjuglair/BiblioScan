/**
 * Gamified reading levels. Each level has a narrative title, a color accent
 * used across the UI, and a subtitle displayed in the hero card / level-up banner.
 *
 * Levels are based on the number of books the user has marked as READ.
 */
export interface LevelDef {
  /** Rank in the progression (1-based). */
  rank: number;
  /** Displayed title, e.g. "Monstre des livres". */
  name: string;
  /** Minimum books read to reach this level. */
  min: number;
  /** Emoji shown in the hero card and banner. */
  emoji: string;
  /** Hex color for accents (backgrounds, bars, borders). */
  color: string;
  /** Slightly darker variant used for gradient. */
  colorDeep: string;
  /** Short narrative subtitle displayed on the hero card + level-up banner. */
  subtitle: string;
}

export const LEVELS: LevelDef[] = [
  {
    rank: 1,
    name: "Éclaireur",
    min: 0,
    emoji: "🔍",
    color: "#9CA3AF",
    colorDeep: "#6B7280",
    subtitle: "Tu découvres tout juste ta bibliothèque.",
  },
  {
    rank: 2,
    name: "Apprenti page",
    min: 2,
    emoji: "📘",
    color: "#60A5FA",
    colorDeep: "#2563EB",
    subtitle: "Les premières pages sont tournées.",
  },
  {
    rank: 3,
    name: "Chasseur d'histoires",
    min: 5,
    emoji: "🏹",
    color: "#34D399",
    colorDeep: "#059669",
    subtitle: "Tu traques les bonnes lectures.",
  },
  {
    rank: 4,
    name: "Gardien des récits",
    min: 10,
    emoji: "🛡️",
    color: "#A78BFA",
    colorDeep: "#7C3AED",
    subtitle: "Ta collection commence à vraiment peser.",
  },
  {
    rank: 5,
    name: "Mage de papier",
    min: 20,
    emoji: "🪄",
    color: "#F472B6",
    colorDeep: "#DB2777",
    subtitle: "Les livres n'ont plus de secrets pour toi.",
  },
  {
    rank: 6,
    name: "Chevalier des lettres",
    min: 35,
    emoji: "⚔️",
    color: "#FBBF24",
    colorDeep: "#D97706",
    subtitle: "Tu combats pour chaque chapitre.",
  },
  {
    rank: 7,
    name: "Dévoreur de mondes",
    min: 50,
    emoji: "🐉",
    color: "#F97316",
    colorDeep: "#C2410C",
    subtitle: "Aucun univers ne résiste à ton appétit.",
  },
  {
    rank: 8,
    name: "Sage des bibliothèques",
    min: 75,
    emoji: "📜",
    color: "#EF4444",
    colorDeep: "#B91C1C",
    subtitle: "On vient te consulter pour un conseil lecture.",
  },
  {
    rank: 9,
    name: "Monstre des livres",
    min: 100,
    emoji: "👹",
    color: "#8B5CF6",
    colorDeep: "#6D28D9",
    subtitle: "Tu dévores plus vite que les éditeurs impriment.",
  },
  {
    rank: 10,
    name: "Oracle éternel",
    min: 150,
    emoji: "🔮",
    color: "#EC4899",
    colorDeep: "#9D174D",
    subtitle: "Tu lis les livres avant qu'ils ne soient écrits.",
  },
  {
    rank: 11,
    name: "Légende vivante",
    min: 250,
    emoji: "🌟",
    color: "#EAB308",
    colorDeep: "#A16207",
    subtitle: "Ton nom circule dans les allées des librairies.",
  },
  {
    rank: 12,
    name: "Dieu-lecteur",
    min: 500,
    emoji: "👁️",
    color: "#D946EF",
    colorDeep: "#6B21A8",
    subtitle: "Au-delà des livres. Un mythe.",
  },
];

/** Find the level matching the current read count. */
export function getLevel(readCount: number): LevelDef {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (readCount >= LEVELS[i]!.min) return LEVELS[i]!;
  }
  return LEVELS[0]!;
}

/** Find the next level above the current read count, or null if maxed. */
export function getNextLevel(readCount: number): LevelDef | null {
  const idx = LEVELS.findIndex((l) => l.min > readCount);
  return idx >= 0 ? LEVELS[idx]! : null;
}

/** Progress percent (0-100) towards the next level. Returns 100 at max. */
export function getLevelProgress(readCount: number): number {
  const cur = getLevel(readCount);
  const next = getNextLevel(readCount);
  if (!next) return 100;
  const span = next.min - cur.min;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, ((readCount - cur.min) / span) * 100));
}
