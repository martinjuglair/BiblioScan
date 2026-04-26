/**
 * Pre-seed the google_books_cache table with the most-popular FR titles.
 *
 * Run once before launch (and again whenever the seed list grows) to:
 *   - Lower the daily Google API call count to near-zero for the
 *     "warmup" period (most users will scan an Astérix or a Musso).
 *   - Make first-time users see book details instantly without a network
 *     round-trip.
 *
 * Usage:
 *   1. Set env:
 *        SUPABASE_URL=https://xskrtqoojqtqcfzdpyrx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=...   (NOT the anon key)
 *        GOOGLE_BOOKS_API_KEY=...
 *   2. node scripts/seed-google-cache.mjs
 *
 * Idempotent — uses upsert on cache_key.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Curated list of well-known FR ISBNs likely to be scanned in the first
// weeks. Tweak / extend at will.
//
// Mix:
// - Astérix tomes 1–10 (Hachette, ~2010–2020 reprints)
// - Tintin tomes 1–10 (Casterman)
// - Lucky Luke
// - Thorgal
// - Goscinny / Uderzo standalone
// - Mangas populaires (One Piece, Naruto)
// - Romans grand public (Musso, Grimaldi, Foenkinos, Levy)
const ISBNS = [
  // Astérix
  "9782012101333", // Astérix le Gaulois
  "9782012101340", // La serpe d'or
  "9782012101357", // Astérix et les Goths
  "9782012101364", // Astérix gladiateur
  "9782012101371", // Le tour de Gaule d'Astérix
  "9782012101388", // Astérix et Cléopâtre
  "9782012101395", // Le combat des chefs
  "9782012101401", // Astérix chez les Bretons
  "9782012101418", // Astérix et les Normands
  "9782012101425", // Astérix légionnaire
  // Tintin
  "9782203001022", // Tintin au pays des Soviets
  "9782203001039", // Tintin au Congo
  "9782203001046", // Tintin en Amérique
  "9782203001053", // Les cigares du pharaon
  "9782203001060", // Le Lotus bleu
  "9782203001077", // L'oreille cassée
  "9782203001084", // L'île noire
  "9782203001091", // Le sceptre d'Ottokar
  "9782203001107", // Le crabe aux pinces d'or
  "9782203001114", // L'étoile mystérieuse
  // Lucky Luke
  "9782884714501", // La mine d'or de Dick Digger
  "9782884714808", // Rodéo
  // Romans grand public
  "9782266309349", // La jeune fille et la nuit (Musso)
  "9782266322706", // Il est grand temps de rallumer les étoiles (Grimaldi)
  "9782266314138", // Il nous restera ça (Grimaldi)
  "9782070643943", // Pénélope (Gutman/Hallensleben — jeunesse)
  "9782266233040", // Et soudain la liberté (Vigan)
  // Mangas
  "9782723492348", // One Piece tome 1
  "9782505011218", // Naruto tome 1
];

const POPULAR_QUERIES = [
  "Astérix",
  "Tintin",
  "Lucky Luke",
  "Thorgal",
  "Largo Winch",
  "Blake et Mortimer",
  "XIII",
  "Joël Dicker",
  "Guillaume Musso",
  "Marc Levy",
  "Fred Vargas",
  "Virginie Grimaldi",
];

function normalizeKey(prefix, query) {
  return `${prefix}:${query.toLowerCase().trim().replace(/\s+/g, " ")}`;
}

async function fetchGoogle(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Books HTTP ${res.status}`);
  }
  return res.json();
}

async function seedIsbn(isbn) {
  const cacheKey = normalizeKey("isbn", isbn);
  const apiKey = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=FR${apiKey}`;

  const data = await fetchGoogle(url);
  await supabase.from("google_books_cache").upsert(
    { cache_key: cacheKey, response: data, fetched_at: new Date().toISOString() },
    { onConflict: "cache_key" },
  );
  return data.totalItems ?? 0;
}

async function seedQuery(query) {
  const cacheKey = normalizeKey("search", query);
  const apiKey = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query,
  )}&langRestrict=fr&maxResults=12&country=FR&orderBy=relevance${apiKey}`;

  const data = await fetchGoogle(url);
  await supabase.from("google_books_cache").upsert(
    { cache_key: cacheKey, response: data, fetched_at: new Date().toISOString() },
    { onConflict: "cache_key" },
  );
  return data.totalItems ?? 0;
}

async function main() {
  console.log(`Seeding ${ISBNS.length} ISBNs + ${POPULAR_QUERIES.length} title searches…`);
  let ok = 0;
  let fail = 0;

  for (const isbn of ISBNS) {
    try {
      const total = await seedIsbn(isbn);
      console.log(`  ✓ ISBN ${isbn} (${total} volumes)`);
      ok++;
      // Throttle — stay nice to Google.
      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      console.warn(`  ✗ ISBN ${isbn}: ${e.message}`);
      fail++;
    }
  }

  for (const query of POPULAR_QUERIES) {
    try {
      const total = await seedQuery(query);
      console.log(`  ✓ "${query}" (${total} volumes)`);
      ok++;
      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      console.warn(`  ✗ "${query}": ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} cached, ${fail} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
