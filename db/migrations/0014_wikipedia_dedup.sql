-- 0014_wikipedia_dedup.sql
-- Añade hash de fuente para deduplicación robusta de encuestas importadas desde Wikipedia.

ALTER TABLE encuestas
  ADD COLUMN IF NOT EXISTS source_hash VARCHAR(24);

CREATE UNIQUE INDEX IF NOT EXISTS idx_encuestas_source_hash_unique
  ON encuestas(source_hash)
  WHERE source_hash IS NOT NULL;
