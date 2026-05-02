"""
Migración 0029 — Tabla legislation para el scraper multinivel EU/Nacional/Regional.

Crea:
  legislation   — normas legislativas con análisis Ollama estructurado

Índices:
  ix_leg_level         — filtro por nivel (european/national/regional)
  ix_leg_region        — filtro por CCAA o "nacional"/"EU"
  ix_leg_published_at  — ordenación temporal
  ix_leg_status        — filtro por estado (pending/published/amended/derogated)
  ix_leg_category      — filtro por categoría IA
  ix_leg_impact        — filtro por impacto IA (high/medium/low)
  ix_leg_relevance     — filtro por relevancia IA (1-10)
  ix_leg_hash          — deduplicación rápida
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:

    op.execute("""
        CREATE TABLE IF NOT EXISTS legislation (
            id                  BIGSERIAL       PRIMARY KEY,
            hash                TEXT            NOT NULL UNIQUE,

            -- Identificación
            title               TEXT            NOT NULL,
            reference_id        TEXT,
            url                 TEXT,
            pdf_url             TEXT,

            -- Clasificación multinivel
            level               TEXT            NOT NULL DEFAULT 'national',
                                                -- european | national | regional
            region              TEXT            NOT NULL DEFAULT 'nacional',
                                                -- EU | nacional | Andalucía | ...
            doc_type            TEXT            NOT NULL DEFAULT 'other',
                                                -- ley | decreto | directiva | reglamento | resolucion | other
            section             TEXT,           -- sección BOE, p.e. "I. Disposiciones generales"
            department          TEXT,           -- ministerio / consejería

            -- Estado
            status              TEXT            NOT NULL DEFAULT 'pending',
                                                -- pending | published | amended | derogated

            -- Contenido
            summary             TEXT,
            full_text           TEXT,

            -- Fechas
            published_at        TIMESTAMPTZ,
            effective_date      TIMESTAMPTZ,
            fetched_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

            -- IA — campos generados por Ollama
            ai_summary          TEXT,
            ai_topics           JSONB           NOT NULL DEFAULT '[]',
            ai_sectors          JSONB           NOT NULL DEFAULT '[]',
            ai_impact_level     TEXT,           -- high | medium | low
            ai_relevance        SMALLINT        CHECK (ai_relevance BETWEEN 1 AND 10),
            ai_keywords         JSONB           NOT NULL DEFAULT '[]',
            ai_entities         JSONB           NOT NULL DEFAULT '{}',
            ai_obligations      TEXT,
            ai_deadlines        JSONB           NOT NULL DEFAULT '[]',
            ai_affected_regions JSONB           NOT NULL DEFAULT '[]',
            ai_eu_relation      TEXT,
            ai_category         TEXT,

            -- Auditoría
            created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_level
            ON legislation (level)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_region
            ON legislation (region)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_published_at
            ON legislation (published_at DESC NULLS LAST)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_status
            ON legislation (status)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_category
            ON legislation (ai_category)
            WHERE ai_category IS NOT NULL
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_impact
            ON legislation (ai_impact_level)
            WHERE ai_impact_level IS NOT NULL
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_relevance
            ON legislation (ai_relevance DESC NULLS LAST)
            WHERE ai_relevance IS NOT NULL
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_leg_hash
            ON legislation (hash)
    """)

    # RLS: aislamiento por tenant (tabla global, lectura sin restricción de tenant
    # pero protegida por service role en API)
    op.execute("ALTER TABLE legislation ENABLE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY IF NOT EXISTS leg_service_full_access
            ON legislation
            USING (current_setting('role', true) IN ('service_role', 'authenticated'))
    """)

    # Trigger para updated_at automático
    op.execute("""
        CREATE OR REPLACE FUNCTION set_legislation_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$
    """)

    op.execute("""
        CREATE TRIGGER trg_legislation_updated_at
            BEFORE UPDATE ON legislation
            FOR EACH ROW EXECUTE FUNCTION set_legislation_updated_at()
    """)


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_legislation_updated_at ON legislation")
    op.execute("DROP FUNCTION IF EXISTS set_legislation_updated_at()")
    op.execute("DROP TABLE IF EXISTS legislation CASCADE")
