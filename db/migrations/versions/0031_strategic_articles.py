"""
Migracion 0031 — Strategic Articles: capa de inteligencia de noticias.

Crea:
  strategic_articles       — articulos filtrados y enriquecidos por el pipeline de dos fases
  v_strategic_top_24h      — vista para el Command Center (top articulos ultimas 24h)

El campo processed en data_lake_staging ya existe (0030). Aqui solo se
añade la tabla de destino del pipeline estrategico.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMPTZ

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # strategic_articles
    # ------------------------------------------------------------------
    op.create_table(
        "strategic_articles",
        sa.Column("id",           sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("url",          sa.Text,       nullable=False, unique=True),
        sa.Column("source_media", sa.String(80)),
        sa.Column("published_at", TIMESTAMPTZ),
        sa.Column("headline",     sa.Text),
        sa.Column("summary_es",   sa.Text),

        # Entidades estructuradas
        sa.Column("persons",       JSONB, server_default="'[]'"),
        sa.Column("organizations", JSONB, server_default="'[]'"),
        sa.Column("locations",     JSONB, server_default="'[]'"),

        # Clasificacion
        sa.Column("event_type",   sa.String(40)),
        sa.Column("policy_areas", JSONB, server_default="'[]'"),

        # Analisis NLP
        sa.Column("sentiment",    sa.Float),
        sa.Column("tone_primary", sa.String(20)),

        # Inteligencia extraida
        sa.Column("key_facts",         JSONB, server_default="'[]'"),
        sa.Column("direct_quotes",      JSONB, server_default="'[]'"),
        sa.Column("strategic_signals",  JSONB, server_default="'[]'"),

        # Scoring
        sa.Column("score_total",  sa.Float, server_default="0.0"),
        sa.Column("score_detail", JSONB,    server_default="'{}'"),

        sa.Column("processed_at", TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    # Indices para queries del dashboard y Command Center
    op.create_index(
        "idx_sa_published",
        "strategic_articles", ["published_at"],
        postgresql_ops={"published_at": "DESC"},
    )
    op.create_index("idx_sa_score",      "strategic_articles", ["score_total"])
    op.create_index("idx_sa_event_type", "strategic_articles", ["event_type"])
    op.create_index("idx_sa_sentiment",  "strategic_articles", ["sentiment"])
    op.create_index("idx_sa_source",     "strategic_articles", ["source_media"])

    # GIN para queries JSONB: strategic_signals @> '["cambio_posicion"]'::jsonb
    op.create_index(
        "idx_sa_signals_gin",
        "strategic_articles", ["strategic_signals"],
        postgresql_using="gin",
    )
    op.create_index(
        "idx_sa_persons_gin",
        "strategic_articles", ["persons"],
        postgresql_using="gin",
    )

    # Full-text search sobre titulares en espanol
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_sa_headline_ft
        ON strategic_articles
        USING GIN(to_tsvector('spanish', COALESCE(headline, '')))
        """
    )

    # RLS multitenancy (compatible con la politica del sistema)
    op.execute("ALTER TABLE strategic_articles ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_strategic_articles
        ON strategic_articles
        USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Vista Command Center: top articulos ultimas 24h con score alto
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_strategic_top_24h AS
        SELECT
            id,
            headline,
            source_media,
            published_at,
            summary_es,
            event_type,
            tone_primary,
            sentiment,
            score_total,
            strategic_signals,
            persons  -> 0 ->> 'name'  AS person_primary,
            policy_areas -> 0          AS topic_primary
        FROM strategic_articles
        WHERE published_at >= NOW() - INTERVAL '24 hours'
          AND score_total  >= 0.70
        ORDER BY score_total DESC, published_at DESC
        LIMIT 50
        """
    )

    # ------------------------------------------------------------------
    # Asegurar que data_lake_staging tenga columna 'processed'
    # (puede que ya exista si 0030 la creo; IF NOT EXISTS es seguro)
    # ------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE data_lake_staging
        ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT FALSE
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_dls_processed_source
        ON data_lake_staging (processed, source)
        WHERE processed = FALSE
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_strategic_top_24h")
    op.execute("DROP INDEX IF EXISTS idx_dls_processed_source")
    op.drop_index("idx_sa_headline_ft",  table_name="strategic_articles")
    op.drop_index("idx_sa_persons_gin",  table_name="strategic_articles")
    op.drop_index("idx_sa_signals_gin",  table_name="strategic_articles")
    op.drop_index("idx_sa_source",       table_name="strategic_articles")
    op.drop_index("idx_sa_sentiment",    table_name="strategic_articles")
    op.drop_index("idx_sa_event_type",   table_name="strategic_articles")
    op.drop_index("idx_sa_score",        table_name="strategic_articles")
    op.drop_index("idx_sa_published",    table_name="strategic_articles")
    op.drop_table("strategic_articles")
