import { ComicBook } from "@domain/entities/ComicBook";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  check: (books: ComicBook[], streakData?: { current: number; best: number; total: number }) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first", name: "Premier pas", description: "Ajouter votre 1er livre", emoji: "\ud83d\udcda", check: (b) => b.length >= 1 },
  { id: "ten", name: "Beau debut", description: "10 livres dans la collection", emoji: "\ud83c\udf1f", check: (b) => b.length >= 10 },
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
