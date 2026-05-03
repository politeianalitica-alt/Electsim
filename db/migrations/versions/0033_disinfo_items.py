"""
Migracion 0033 — Disinfo Items: registro de contenido falso y desinformacion.

Crea:
  disinfo_items        — un registro por item de desinformacion verificado
  fimi_operations      — vista agrupando operaciones FIMI por narrativa y origen

FK opcional a narrative_profiles (nullable — item puede no estar enlazado).
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMPTZ

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # disinfo_items
    # ------------------------------------------------------------------
    op.create_table(
        "disinfo_items",
        sa.Column("id",           sa.BigInteger, primary_key=True, autoincrement=True),

        # Identificacion
        sa.Column("item_id",      sa.String(16), nullable=False, unique=True),
        sa.Column("url",          sa.Text,       nullable=False, unique=True),
        sa.Column("source_id",    sa.String(40), nullable=False),
        sa.Column("source_name",  sa.String(80)),

        # Contenido
        sa.Column("title",        sa.Text),
        sa.Column("summary",      sa.Text),
        sa.Column("published_at", TIMESTAMPTZ),
        sa.Column("scraped_at",   TIMESTAMPTZ, server_default=sa.text("NOW()")),

        # Clasificacion
        sa.Column("verdict",   sa.String(30), nullable=False, server_default="'desconocido'"),
        # falso / enganoso / sin_contexto / parcialmente_falso / verdadero / satira / desconocido

        sa.Column("origin",    sa.String(30), nullable=False, server_default="'otro'"),
        # RU / CN / IR / ES / EU / ES_FAR_RIGHT / ES_SEPARATIST / otro

        sa.Column("taxonomy",  sa.String(20), nullable=False, server_default="'DOMESTIC'"),
        # FIMI / DOMESTIC / COORDINATED / ORGANIC

        # Entidades
        sa.Column("actors",   JSONB, server_default="'[]'"),
        sa.Column("keywords", JSONB, server_default="'[]'"),
        sa.Column("raw_tags", JSONB, server_default="'[]'"),

        # Enlace narrativo (FK nullable)
        sa.Column(
            "narrative_id",
            sa.BigInteger,
            sa.ForeignKey("narrative_profiles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("narrative_similarity", sa.Float),

        # Enriquecimiento LLM
        sa.Column("llm_enrichment", JSONB, server_default="'{}'"),
        # {narrativa_padre, audiencia_objetivo, cadena_difusion, contramedida, nivel_alerta, ...}
    )

    # Indices
    op.create_index("idx_di_published",  "disinfo_items", ["published_at"],
                    postgresql_ops={"published_at": "DESC"})
    op.create_index("idx_di_scraped",    "disinfo_items", ["scraped_at"],
                    postgresql_ops={"scraped_at": "DESC"})
    op.create_index("idx_di_verdict",    "disinfo_items", ["verdict"])
    op.create_index("idx_di_origin",     "disinfo_items", ["origin"])
    op.create_index("idx_di_taxonomy",   "disinfo_items", ["taxonomy"])
    op.create_index("idx_di_source",     "disinfo_items", ["source_id"])
    op.create_index("idx_di_narrative",  "disinfo_items", ["narrative_id"])

    op.create_index(
        "idx_di_actors_gin",
        "disinfo_items", ["actors"],
        postgresql_using="gin",
    )
    op.create_index(
        "idx_di_keywords_gin",
        "disinfo_items", ["keywords"],
        postgresql_using="gin",
    )

    # Indice parcial para items FIMI
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_di_fimi
        ON disinfo_items (origin, published_at DESC)
        WHERE taxonomy = 'FIMI'
        """
    )

    # Indice parcial para nivel de alerta CRITICO/ALTO
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_di_alert_high
        ON disinfo_items (scraped_at DESC)
        WHERE llm_enrichment ->> 'nivel_alerta' IN ('CRITICO', 'ALTO')
        """
    )

    # Full-text sobre titulares
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_di_title_ft
        ON disinfo_items
        USING GIN(to_tsvector('spanish', COALESCE(title, '')))
        """
    )

    # RLS
    op.execute("ALTER TABLE disinfo_items ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_disinfo_items
        ON disinfo_items
        USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Vista: operaciones FIMI agrupadas por narrativa y origen
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW fimi_operations AS
        SELECT
            di.narrative_id,
            np.narrative_label,
            di.origin,
            di.taxonomy,
            COUNT(*)                                       AS total_items,
            COUNT(*) FILTER (WHERE di.verdict = 'falso')   AS items_falsos,
            AVG(di.narrative_similarity)                   AS mean_similarity,
            MIN(di.published_at)                           AS first_seen,
            MAX(di.published_at)                           AS last_seen,
            array_agg(DISTINCT di.source_name ORDER BY di.source_name) AS sources,
            jsonb_agg(
                di.llm_enrichment -> 'nivel_alerta'
                ORDER BY di.published_at DESC
            ) FILTER (WHERE di.llm_enrichment ? 'nivel_alerta') AS alert_levels
        FROM disinfo_items di
        LEFT JOIN narrative_profiles np ON np.id = di.narrative_id
        WHERE di.taxonomy IN ('FIMI', 'COORDINATED')
        GROUP BY di.narrative_id, np.narrative_label, di.origin, di.taxonomy
        ORDER BY total_items DESC
        """
    )

    # ------------------------------------------------------------------
    # Vista auxiliar: alertas recientes de nivel alto/critico
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_disinfo_alerts AS
        SELECT
            di.id,
            di.item_id,
            di.title,
            di.source_name,
            di.published_at,
            di.verdict,
            di.origin,
            di.taxonomy,
            di.llm_enrichment ->> 'nivel_alerta'       AS nivel_alerta,
            di.llm_enrichment ->> 'narrativa_padre'     AS narrativa_padre,
            di.llm_enrichment ->> 'contramedida'        AS contramedida,
            np.narrative_label,
            di.narrative_similarity
        FROM disinfo_items di
        LEFT JOIN narrative_profiles np ON np.id = di.narrative_id
        WHERE di.llm_enrichment ->> 'nivel_alerta' IN ('CRITICO', 'ALTO')
          AND di.scraped_at >= NOW() - INTERVAL '48 hours'
        ORDER BY di.scraped_at DESC
        LIMIT 100
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_disinfo_alerts")
    op.execute("DROP VIEW IF EXISTS fimi_operations")
    op.execute("DROP INDEX IF EXISTS idx_di_alert_high")
    op.execute("DROP INDEX IF EXISTS idx_di_fimi")
    op.execute("DROP INDEX IF EXISTS idx_di_title_ft")
    op.drop_index("idx_di_keywords_gin", table_name="disinfo_items")
    op.drop_index("idx_di_actors_gin",   table_name="disinfo_items")
    op.drop_index("idx_di_narrative",    table_name="disinfo_items")
    op.drop_index("idx_di_source",       table_name="disinfo_items")
    op.drop_index("idx_di_taxonomy",     table_name="disinfo_items")
    op.drop_index("idx_di_origin",       table_name="disinfo_items")
    op.drop_index("idx_di_verdict",      table_name="disinfo_items")
    op.drop_index("idx_di_scraped",      table_name="disinfo_items")
    op.drop_index("idx_di_published",    table_name="disinfo_items")
    op.drop_table("disinfo_items")
