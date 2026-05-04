"""
Migracion 0037 — Tablas del modulo de narrativas (Capa 4).

Crea:
  - narratives           : tabla principal con frame, emocion, difusion,
                           ciclo vital y contexto territorial
  - narrative_articles   : articulos asociados a cada narrativa
  - narrative_actors     : actores con rol en cada narrativa
  - narrative_run_log    : registro de ejecuciones del pipeline

Requiere: pgvector instalado (CREATE EXTENSION IF NOT EXISTS vector).

Revision: 0037
Down revision: 0036_palantir_advanced (expand only — no contract step)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY, TEXT

# Alembic identifiers
revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Crea las cuatro tablas del modulo de narrativas."""

    # Asegurar que pgvector esta disponible
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ------------------------------------------------------------------
    # narratives — tabla principal
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS narratives (
            narrative_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            frame_label           VARCHAR(200) NOT NULL,
            frame_tipo            VARCHAR(30),
            frame_embedding       VECTOR(768),
            frame_favorecido      VARCHAR(100),
            frame_perjudicado     VARCHAR(100),
            frame_terminos        TEXT[],
            emocion_dominante     VARCHAR(50),
            emocion_intensidad    FLOAT,
            origen_scope          VARCHAR(20),
            patron_difusion       VARCHAR(20),
            posible_coordinacion  BOOLEAN DEFAULT FALSE,
            ciclo_vital           VARCHAR(20),
            primera_deteccion     TIMESTAMPTZ,
            pico_menciones_at     TIMESTAMPTZ,
            menciones_acumuladas  INTEGER DEFAULT 0,
            fuentes_unicas        INTEGER DEFAULT 0,
            dias_activa           INTEGER DEFAULT 0,
            es_nacional           BOOLEAN DEFAULT FALSE,
            activa_en_ccaas       TEXT[],
            activa_en_provincias  TEXT[],
            titulares             TEXT[],
            created_at            TIMESTAMPTZ DEFAULT NOW(),
            updated_at            TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )

    # Indice de similitud coseno para matching de narrativas
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_narratives_embedding
        ON narratives
        USING ivfflat (frame_embedding vector_cosine_ops)
        WITH (lists = 50)
        """
    )

    # Indices para consultas frecuentes del dashboard
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narratives_updated_at "
        "ON narratives (updated_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narratives_ciclo_vital "
        "ON narratives (ciclo_vital)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narratives_menciones "
        "ON narratives (menciones_acumuladas DESC)"
    )

    # ------------------------------------------------------------------
    # narrative_articles — relacion narrativa ↔ articulo
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS narrative_articles (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            narrative_id  UUID NOT NULL REFERENCES narratives(narrative_id)
                          ON DELETE CASCADE,
            article_id    VARCHAR(64) NOT NULL,
            source_name   VARCHAR(200),
            published_at  TIMESTAMPTZ,
            similarity    FLOAT,
            is_origin     BOOLEAN DEFAULT FALSE,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (narrative_id, article_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_articles_narrative "
        "ON narrative_articles (narrative_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_articles_article "
        "ON narrative_articles (article_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_articles_published "
        "ON narrative_articles (published_at DESC)"
    )

    # ------------------------------------------------------------------
    # narrative_actors — actores con rol en cada narrativa
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS narrative_actors (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            narrative_id   UUID NOT NULL REFERENCES narratives(narrative_id)
                           ON DELETE CASCADE,
            canonical_qid  VARCHAR(50) NOT NULL,
            rol            VARCHAR(20) NOT NULL
                           CHECK (rol IN ('protagonist','antagonist','victim','ally','neutral')),
            frecuencia     INTEGER DEFAULT 1,
            created_at     TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (narrative_id, canonical_qid)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_actors_narrative "
        "ON narrative_actors (narrative_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_actors_qid "
        "ON narrative_actors (canonical_qid)"
    )

    # ------------------------------------------------------------------
    # narrative_run_log — log de ejecuciones del pipeline
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS narrative_run_log (
            run_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            executed_at           TIMESTAMPTZ DEFAULT NOW(),
            articles_processed    INTEGER DEFAULT 0,
            narratives_new        INTEGER DEFAULT 0,
            narratives_updated    INTEGER DEFAULT 0,
            coordinations_flagged INTEGER DEFAULT 0
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_narrative_run_log_executed "
        "ON narrative_run_log (executed_at DESC)"
    )

    # ------------------------------------------------------------------
    # Trigger updated_at automatico en narratives
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_narratives_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_narratives_updated_at ON narratives;
        CREATE TRIGGER trg_narratives_updated_at
        BEFORE UPDATE ON narratives
        FOR EACH ROW EXECUTE FUNCTION update_narratives_updated_at()
        """
    )


def downgrade() -> None:
    """Elimina todas las tablas del modulo de narrativas (rollback limpio)."""
    op.execute("DROP TRIGGER IF EXISTS trg_narratives_updated_at ON narratives")
    op.execute("DROP FUNCTION IF EXISTS update_narratives_updated_at()")
    op.execute("DROP TABLE IF EXISTS narrative_actors    CASCADE")
    op.execute("DROP TABLE IF EXISTS narrative_articles  CASCADE")
    op.execute("DROP TABLE IF EXISTS narrative_run_log   CASCADE")
    op.execute("DROP TABLE IF EXISTS narratives          CASCADE")
