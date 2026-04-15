import { ComicBook } from "@domain/entities/ComicBook";

type StreakData = { current: number; best: number; total: number };

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  check: (books: ComicBook[], streakData?: StreakData) => boolean;
  progress?: (books: ComicBook[], streakData?: StreakData) => { current: number; target: number };
}

const rated = (x: ComicBook) => typeof x.rating === "number" && x.rating > 0;
const hasComment = (x: ComicBook) => typeof x.comment === "string" && x.comment.trim().length > 0;

export const BADGES: BadgeDef[] = [
  // --- Collection ---
  {
    id: "first", name: "Premier pas", description: "Ajouter votre 1er livre", emoji: "📚",
    check: (b) => b.length >= 1,
    progress: (b) => ({ current: Math.min(b.length, 1), target: 1 }),
  },
  {
    id: "ten", name: "Beau début", description: "10 livres dans la collection", emoji: "🌟",
    check: (b) => b.length >= 10,
    progress: (b) => ({ current: Math.min(b.length, 10), target: 10 }),
  },
  {
    id: "fifty", name: "Collectionneur", description: "50 livres collectionnés", emoji: "🏆",
    check: (b) => b.length >= 50,
    progress: (b) => ({ current: Math.min(b.length, 50), target: 50 }),
  },
  {
    id: "hundred", name: "Bibliothécaire", description: "100 livres dans la collection", emoji: "🏛️",
    check: (b) => b.length >= 100,
    progress: (b) => ({ current: Math.min(b.length, 100), target: 100 }),
  },

  // --- Lecture ---
  {
    id: "reader5", name: "Lecteur assidu", description: "5 livres lus", emoji: "📖",
    check: (b) => b.filter((x) => x.isRead).length >= 5,
    progress: (b) => ({ current: Math.min(b.filter((x) => x.isRead).length, 5), target: 5 }),
  },
  {
    id: "reader20", name: "Rat de bibliothèque", description: "20 livres lus", emoji: "🐀",
    check: (b) => b.filter((x) => x.isRead).length >= 20,
    progress: (b) => ({ current: Math.min(b.filter((x) => x.isRead).length, 20), target: 20 }),
  },
  {
    id: "reader50", name: "Dévoreur", description: "50 livres lus", emoji: "🦈",
    check: (b) => b.filter((x) => x.isRead).length >= 50,
    progress: (b) => ({ current: Math.min(b.filter((x) => x.isRead).length, 50), target: 50 }),
  },

  // --- Notes & critiques ---
  {
    id: "critic", name: "Critique littéraire", description: "Noter 10 livres", emoji: "⭐",
    check: (b) => b.filter(rated).length >= 10,
    progress: (b) => ({ current: Math.min(b.filter(rated).length, 10), target: 10 }),
  },
  {
    id: "critic25", name: "Expert", description: "Noter 25 livres", emoji: "🎯",
    check: (b) => b.filter(rated).length >= 25,
    progress: (b) => ({ current: Math.min(b.filter(rated).length, 25), target: 25 }),
  },
  {
    id: "top", name: "Coup de coeur", description: "Donner un 5/5", emoji: "❤️",
    check: (b) => b.some((x) => typeof x.rating === "number" && x.rating === 5),
  },

  // --- Commentaires ---
  {
    id: "comment5", name: "Chroniqueur", description: "Écrire 5 commentaires", emoji: "✍️",
    check: (b) => b.filter(hasComment).length >= 5,
    progress: (b) => ({ current: Math.min(b.filter(hasComment).length, 5), target: 5 }),
  },
  {
    id: "comment20", name: "Blogueur littéraire", description: "Écrire 20 commentaires", emoji: "📝",
    check: (b) => b.filter(hasComment).length >= 20,
    progress: (b) => ({ current: Math.min(b.filter(hasComment).length, 20), target: 20 }),
  },

  // --- Diversité ---
  {
    id: "diverse", name: "Éclectique", description: "5 éditeurs différents", emoji: "🌍",
    check: (b) => new Set(b.map((x) => x.publisher).filter(Boolean)).size >= 5,
    progress: (b) => ({ current: Math.min(new Set(b.map((x) => x.publisher).filter(Boolean)).size, 5), target: 5 }),
  },
  {
    id: "diverse10", name: "Globe-trotter", description: "10 éditeurs différents", emoji: "🗺️",
    check: (b) => new Set(b.map((x) => x.publisher).filter(Boolean)).size >= 10,
    progress: (b) => ({ current: Math.min(new Set(b.map((x) => x.publisher).filter(Boolean)).size, 10), target: 10 }),
  },

  // --- Wishlist ---
  {
    id: "wishlist5", name: "Liste de souhaits", description: "5 livres en wishlist", emoji: "🎁",
    check: (b) => b.filter((x) => x.wishlist).length >= 5,
    progress: (b) => ({ current: Math.min(b.filter((x) => x.wishlist).length, 5), target: 5 }),
  },

  // --- Streaks ---
  {
    id: "streak3", name: "Régulier", description: "3 jours de lecture d'affilée", emoji: "🔥",
    check: (_b, s) => (s?.best ?? 0) >= 3,
    progress: (_b, s) => ({ current: Math.min(s?.best ?? 0, 3), target: 3 }),
  },
  {
    id: "streak7", name: "Semaine parfaite", description: "7 jours de lecture consécutifs", emoji: "🌈",
    check: (_b, s) => (s?.best ?? 0) >= 7,
    progress: (_b, s) => ({ current: Math.min(s?.best ?? 0, 7), target: 7 }),
  },
  {
    id: "streak30", name: "Inarrêtable", description: "30 jours de lecture d'affilée", emoji: "💎",
    check: (_b, s) => (s?.best ?? 0) >= 30,
    progress: (_b, s) => ({ current: Math.min(s?.best ?? 0, 30), target: 30 }),
  },

  // --- Vitesse ---
  {
    id: "speed", name: "Lecteur rapide", description: "Lire 3 livres en 7 jours", emoji: "⚡",
    check: (b) => {
      const week = Date.now() - 7 * 86400000;
      return b.filter((x) => x.isRead && x.readAt && new Date(x.readAt).getTime() > week).length >= 3;
    },
    progress: (b) => {
      const week = Date.now() - 7 * 86400000;
      const count = b.filter((x) => x.isRead && x.readAt && new Date(x.readAt).getTime() > week).length;
      return { current: Math.min(count, 3), target: 3 };
    },
  },
];
