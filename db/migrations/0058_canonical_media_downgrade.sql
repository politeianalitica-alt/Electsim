-- 0058_canonical_media_downgrade.sql · Sprint 0+1 Prensa canonical
-- Reverse of 0058_canonical_media.sql.
--
-- Drops the 4 new tables (narratives, entity_metrics, pipeline_metrics,
-- topic_prominence_history) and removes the canonical columns + UNIQUE
-- constraint from `article`. Indexes are dropped automatically with their
-- columns / tables.
--
-- WARNING: data in the 4 tables and in the dropped columns is destroyed.
-- Apply only on staging/dev or with explicit ops approval.

BEGIN;

DROP TABLE IF EXISTS topic_prominence_history;
DROP TABLE IF EXISTS pipeline_metrics;
DROP TABLE IF EXISTS entity_metrics;
DROP TABLE IF EXISTS narratives;

ALTER TABLE article
  DROP CONSTRAINT IF EXISTS article_canonical_url_unique,
  DROP COLUMN IF EXISTS canonical_url,
  DROP COLUMN IF EXISTS entities,
  DROP COLUMN IF EXISTS framing,
  DROP COLUMN IF EXISTS quality_score,
  DROP COLUMN IF EXISTS raw_tags,
  DROP COLUMN IF EXISTS ingested_at,
  DROP COLUMN IF EXISTS failed_step,
  DROP COLUMN IF EXISTS processing_status,
  DROP COLUMN IF EXISTS duplicate_of,
  DROP COLUMN IF EXISTS is_duplicate,
  DROP COLUMN IF EXISTS noise_reason,
  DROP COLUMN IF EXISTS is_noise;

COMMIT;
