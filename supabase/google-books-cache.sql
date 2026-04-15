-- Cache partagé pour les réponses Google Books API
-- Réduit drastiquement le nombre d'appels API (quota 1000 req/jour sur free tier)

CREATE TABLE IF NOT EXISTS google_books_cache (
  cache_key  TEXT PRIMARY KEY,           -- ex: "search:roman best seller 2025", "isbn:9782070584628"
  response   JSONB NOT NULL,             -- réponse brute Google Books API
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour le nettoyage périodique des entrées expirées
CREATE INDEX IF NOT EXISTS idx_gbc_fetched ON google_books_cache (fetched_at);

-- RLS : cache public (données Google Books = publiques)
ALTER TABLE google_books_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache lecture publique"
  ON google_books_cache FOR SELECT
  USING (true);

CREATE POLICY "Cache écriture publique"
  ON google_books_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Cache update publique"
  ON google_books_cache FOR UPDATE
  USING (true);
