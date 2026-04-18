-- ═══════════════════════════════════════════════════════════════════
-- Ploom — Pré-lancement: indexes + delete_my_account + RLS sanity
-- ═══════════════════════════════════════════════════════════════════
--
-- À exécuter dans Supabase SQL Editor une fois. Idempotent: peut être
-- relancé sans risque.
--
-- Ce script :
--   1. Ajoute les indexes manquants sur comic_books pour tenir la charge
--      (user_id + category_id + is_read) — sinon seq scan à 1000+ livres.
--   2. Crée la fonction delete_my_account() utilisée par le bouton
--      "Supprimer mon compte" côté client (App Store 5.1.1(v)).
--   3. Vérifie rapide la sanity RLS des tables principales.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. INDEXES COMIC_BOOKS ─────────────────────────────────────────

-- Couvre les requêtes les plus fréquentes : findAll, findByCategory,
-- findByIsRead. user_id est quasi toujours dans le WHERE à cause du RLS.
CREATE INDEX IF NOT EXISTS idx_comic_books_user_id
  ON comic_books (user_id);

CREATE INDEX IF NOT EXISTS idx_comic_books_user_category
  ON comic_books (user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_comic_books_user_isread
  ON comic_books (user_id, is_read);

-- Lookup rapide par ISBN (utilisé pour la dedup des recos + add book)
CREATE INDEX IF NOT EXISTS idx_comic_books_user_isbn
  ON comic_books (user_id, isbn);

-- ── 2. INDEXES CATEGORIES ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories (user_id);

-- ── 3. FONCTION delete_my_account ──────────────────────────────────
-- SECURITY DEFINER permet à un utilisateur authentifié de supprimer
-- sa propre ligne auth.users (qui est normalement réservée au
-- service_role). On garde le scope strict via auth.uid() dans le WHERE.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Order matters: delete child data first, then parent tables, then auth
  DELETE FROM public.comic_books WHERE user_id = uid;
  DELETE FROM public.categories WHERE user_id = uid;

  -- Groups: delete memberships + any group the user solely owns
  -- (cascade will handle group_books via FK ON DELETE CASCADE if set)
  DELETE FROM public.group_members WHERE user_id = uid;
  DELETE FROM public.reading_groups WHERE created_by = uid;

  -- Feedback trace
  DELETE FROM public.app_feedback WHERE user_id = uid;

  -- Finally, the auth row — this cascades the session and JWT becomes invalid
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Expose the function to authenticated users only (no anon call)
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ── 4. SANITY CHECKS (lecture seule, pour vérif manuelle) ──────────

-- RLS actif sur les tables sensibles ?
SELECT tablename,
       rowsecurity AS rls_enabled
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  tablename IN (
    'comic_books', 'categories', 'reading_groups',
    'group_members', 'group_books', 'app_feedback'
  )
ORDER  BY tablename;

-- Nombre de policies par table
SELECT schemaname, tablename, count(*) AS policy_count
FROM   pg_policies
WHERE  schemaname = 'public'
GROUP  BY schemaname, tablename
ORDER  BY tablename;

-- Indexes existants (sanity)
SELECT tablename, indexname
FROM   pg_indexes
WHERE  schemaname = 'public'
  AND  tablename IN ('comic_books', 'categories')
ORDER  BY tablename, indexname;

-- Taille des tables (pour surveiller la free tier 500 MB)
SELECT schemaname,
       tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT  10;
