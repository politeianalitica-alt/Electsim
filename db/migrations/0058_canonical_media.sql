-- 0058_canonical_media.sql · Sprint 0+1 Prensa canonical
-- Spec: docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md
--
-- Expand the `article` table with canonical-ingestion fields and create 4 new
-- tables consumed by the canonical pipeline (filled by Sprints 2/3/4):
--   · narratives                 — Sprint 4 narrative detection
--   · entity_metrics             — Sprint 3 actor ProminenceScore
--   · pipeline_metrics           — Sprint 2 ingestion jobs telemetry
--   · topic_prominence_history   — Sprint 2 cron 15min snapshots
--
-- Idempotent (IF NOT EXISTS). The constraint UNIQUE on article.canonical_url
-- is applied after the backfill from `url`, so existing rows are preserved.
--
-- Manual application required (see 0058_README.md). DO NOT auto-apply.

BEGIN;

-- 0. Habilitar pgcrypto para gen_random_uuid() (si no ya activa)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Expandir tabla article con campos canónicos (idempotente con IF NOT EXISTS)
ALTER TABLE article
  ADD COLUMN IF NOT EXISTS is_noise BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS noise_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_of TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS failed_step TEXT,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS raw_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(4,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS framing TEXT,
  ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Backfill canonical_url desde url legacy
-- En el schema legacy (migración 0012) la columna se llamó `url_canonical`.
-- Si en algún despliegue antiguo se llamó `url`, también lo cubrimos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='article' AND column_name='url_canonical') THEN
    UPDATE article SET canonical_url = url_canonical WHERE canonical_url IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='article' AND column_name='url') THEN
    EXECUTE 'UPDATE article SET canonical_url = url WHERE canonical_url IS NULL';
  END IF;
END $$;

-- Constraints (solo si no existen ya)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'article_canonical_url_unique') THEN
    ALTER TABLE article ALTER COLUMN canonical_url SET NOT NULL;
    ALTER TABLE article ADD CONSTRAINT article_canonical_url_unique UNIQUE (canonical_url);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_article_processing_status ON article(processing_status);
CREATE INDEX IF NOT EXISTS idx_article_ingested_at ON article(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_is_noise ON article(is_noise) WHERE is_noise = FALSE;
CREATE INDEX IF NOT EXISTS idx_article_quality_score ON article(quality_score DESC);

-- 2. Tabla narratives (Sprint 4 lo llena)
CREATE TABLE IF NOT EXISTS narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  subtopic_id TEXT,
  primary_entity TEXT NOT NULL,
  framing TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  source_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  momentum NUMERIC(4,3) NOT NULL DEFAULT 0,
  first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  representative_articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_trail JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_narratives_topic ON narratives(topic_id);
CREATE INDEX IF NOT EXISTS idx_narratives_entity ON narratives(primary_entity);
CREATE INDEX IF NOT EXISTS idx_narratives_active ON narratives(active, last_updated DESC);

-- 3. Tabla entity_metrics (Sprint 3 lo llena)
CREATE TABLE IF NOT EXISTS entity_metrics (
  entity_id TEXT NOT NULL,
  window_spec TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prominence_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  topic_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  sentiment_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  co_occurrences JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (entity_id, window_spec, computed_at)
);
CREATE INDEX IF NOT EXISTS idx_entity_metrics_window ON entity_metrics(window_spec, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_metrics_entity ON entity_metrics(entity_id, computed_at DESC);

-- 4. Tabla pipeline_metrics
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id BIGSERIAL PRIMARY KEY,
  window_from TIMESTAMPTZ NOT NULL,
  window_to TIMESTAMPTZ NOT NULL,
  fetched_total INTEGER NOT NULL DEFAULT 0,
  duplicates_exact INTEGER NOT NULL DEFAULT 0,
  duplicates_titular INTEGER NOT NULL DEFAULT 0,
  noise_filtered INTEGER NOT NULL DEFAULT 0,
  processed_successfully INTEGER NOT NULL DEFAULT 0,
  classified_with_taxonomy INTEGER NOT NULL DEFAULT 0,
  with_entities INTEGER NOT NULL DEFAULT 0,
  clustered_existing INTEGER NOT NULL DEFAULT 0,
  clustered_new INTEGER NOT NULL DEFAULT 0,
  failed_in_pipeline JSONB NOT NULL DEFAULT '{}'::jsonb,
  classification_by_method JSONB NOT NULL DEFAULT '{}'::jsonb,
  classification_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  otro_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_window ON pipeline_metrics(window_to DESC);

-- 5. Tabla topic_prominence_history
CREATE TABLE IF NOT EXISTS topic_prominence_history (
  topic_id TEXT NOT NULL,
  subtopic_id TEXT NOT NULL DEFAULT '',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_spec TEXT NOT NULL,
  score NUMERIC(4,3) NOT NULL DEFAULT 0,
  volume_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  momentum_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  source_diversity_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  tier_weight_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  entity_density_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'STABLE',
  volume INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (topic_id, subtopic_id, computed_at, window_spec)
);
CREATE INDEX IF NOT EXISTS idx_topic_prominence_recent ON topic_prominence_history(computed_at DESC);

COMMIT;
