"""
Migracion 0032 — Narrative Profiles: perfiles narrativos analizados por NarrativeAnalyzer.

Crea:
  narrative_profiles        — un perfil por narrativa identificada
  v_narratives_active_7d    — vista: narrativas con actividad en ultimos 7 dias
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import TIMESTAMP as TIMESTAMPTZ

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # narrative_profiles
    # ------------------------------------------------------------------
    op.create_table(
        "narrative_profiles",
        sa.Column("id",              sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("narrative_label", sa.Text,       nullable=False, unique=True),
        sa.Column("analyzed_at",     TIMESTAMPTZ,   nullable=False),
        sa.Column("last_analyzed_at", TIMESTAMPTZ,  server_default=sa.text("NOW()")),

        # Estructura
        sa.Column("dominant_frame",         sa.String(60)),
        sa.Column("propaganda_techniques",  JSONB, server_default="'[]'"),

        # Actores
        sa.Column("actors", JSONB, server_default="'[]'"),
        # [{name, type, mentions, sentiment, roles}]

        # Audiencia
        sa.Column("target_audience", JSONB, server_default="'{}'"),
        # {audiencia: score}

        # Serie temporal
        sa.Column("timeline",    JSONB, server_default="'[]'"),
        sa.Column("peak_date",   sa.Date),
        sa.Column("drop_date",   sa.Date),

        # Coordinacion
        sa.Column("coordination_score",   sa.Float, server_default="0.0"),
        sa.Column("coordinated_sources",  JSONB, server_default="'[]'"),

        # Analisis LLM (7 componentes)
        sa.Column("llm_analysis",   JSONB, server_default="'{}'"),
        sa.Column("llm_available",  sa.Boolean, server_default="false"),

        # Estadisticas
        sa.Column("total_articles",  sa.Integer, server_default="0"),
        sa.Column("mean_sentiment",  sa.Float,   server_default="0.0"),
        sa.Column("sentiment_trend", sa.Float,   server_default="0.0"),

        # Campos para busqueda rapida / referencia cruzada
        sa.Column("top_keywords", JSONB, server_default="'[]'"),
        sa.Column("clusters",     JSONB, server_default="'[]'"),
    )

    # Indices
    op.create_index("idx_np_label",       "narrative_profiles", ["narrative_label"])
    op.create_index("idx_np_analyzed",    "narrative_profiles", ["last_analyzed_at"],
                    postgresql_ops={"last_analyzed_at": "DESC"})
    op.create_index("idx_np_frame",       "narrative_profiles", ["dominant_frame"])
    op.create_index("idx_np_coord",       "narrative_profiles", ["coordination_score"])
    op.create_index("idx_np_sentiment",   "narrative_profiles", ["mean_sentiment"])

    op.create_index(
        "idx_np_keywords_gin",
        "narrative_profiles", ["top_keywords"],
        postgresql_using="gin",
    )
    op.create_index(
        "idx_np_actors_gin",
        "narrative_profiles", ["actors"],
        postgresql_using="gin",
    )
    op.create_index(
        "idx_np_techniques_gin",
        "narrative_profiles", ["propaganda_techniques"],
        postgresql_using="gin",
    )

    # Full-text sobre narrative_label
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_np_label_ft
        ON narrative_profiles
        USING GIN(to_tsvector('spanish', COALESCE(narrative_label, '')))
        """
    )

    # RLS
    op.execute("ALTER TABLE narrative_profiles ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_narrative_profiles
        ON narrative_profiles
        USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Vista: narrativas activas en ultimos 7 dias
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_narratives_active_7d AS
        SELECT
            id,
            narrative_label,
            dominant_frame,
            propaganda_techniques,
            coordination_score,
            mean_sentiment,
            sentiment_trend,
            total_articles,
            last_analyzed_at,
            llm_analysis ->> 'riesgo_politico'   AS riesgo_politico,
            llm_analysis ->> 'marco_cognitivo'    AS marco_cognitivo,
            llm_analysis ->> 'evolucion_probable' AS evolucion_probable,
            top_keywords -> 0                      AS keyword_principal
        FROM narrative_profiles
        WHERE last_analyzed_at >= NOW() - INTERVAL '7 days'
        ORDER BY coordination_score DESC, total_articles DESC
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_narratives_active_7d")
    op.execute("DROP INDEX IF EXISTS idx_np_label_ft")
    op.drop_index("idx_np_techniques_gin", table_name="narrative_profiles")
    op.drop_index("idx_np_actors_gin",     table_name="narrative_profiles")
    op.drop_index("idx_np_keywords_gin",   table_name="narrative_profiles")
    op.drop_index("idx_np_sentiment",      table_name="narrative_profiles")
    op.drop_index("idx_np_coord",          table_name="narrative_profiles")
    op.drop_index("idx_np_frame",          table_name="narrative_profiles")
    op.drop_index("idx_np_analyzed",       table_name="narrative_profiles")
    op.drop_index("idx_np_label",          table_name="narrative_profiles")
    op.drop_table("narrative_profiles")
