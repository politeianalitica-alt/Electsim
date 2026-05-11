"""
Migracion 0034 — Entity Resolution: capa de identidad de entidades.

Crea:
  entities_canonical   — registro maestro de entidades (QID unico)
  entity_aliases       — tabla de alias por entidad (lookup rapido)
  raw_mentions         — cada mencion de entidad extraida de un articulo
  entity_mentions      — menciones resueltas a entidades canonicas
  resolution_review_queue — cola de revision humana (baja confianza)

Indices:
  - idx_rm_article     — busqueda de menciones por articulo
  - idx_rm_surface     — busqueda de superficie de texto
  - idx_rm_processed   — menciones pendientes de resolver
  - idx_ec_qid         — lookup por QID
  - idx_ea_alias_trgm  — busqueda fuzzy de alias (trigrama)
  - idx_em_entity      — menciones resueltas por entidad
  - idx_rrq_status     — cola de revision por estado

RLS: todas las tablas con ENABLE ROW LEVEL SECURITY + politica tenant_isolation_*
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy import TIMESTAMP as TIMESTAMPTZ

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # Extension pg_trgm para busqueda fuzzy de alias
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # ------------------------------------------------------------------
    # entities_canonical — registro maestro de identidades
    # ------------------------------------------------------------------
    op.create_table(
        "entities_canonical",
        sa.Column("id",           sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("qid",          sa.String(20),  nullable=False, unique=True),
        sa.Column("nombre_oficial", sa.Text,      nullable=False),
        sa.Column("tipo",         sa.String(30),  nullable=False),  # Persona|Partido|Institucion|Medio|Lugar

        # Datos de contexto estructurado
        sa.Column("cargo_actual",  sa.Text),
        sa.Column("partido_qid",   sa.String(20)),
        sa.Column("pais",          sa.String(5)),  # ISO-2

        # Perfil enriquecido (Bloque 3)
        sa.Column("perfil_json",   JSONB, server_default="'{}'"),

        # Embedding vectorial (Bloque 2)
        # Se almacena como JSONB array para evitar dependencia de pgvector
        sa.Column("embedding",     JSONB),

        # Metadata
        sa.Column("fuente_yaml",   sa.Boolean, server_default="TRUE"),  # cargado desde aliases.yaml
        sa.Column("activo",        sa.Boolean, server_default="TRUE"),
        sa.Column("created_at",    TIMESTAMPTZ, server_default=sa.text("NOW()")),
        sa.Column("updated_at",    TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_ec_qid",   "entities_canonical", ["qid"],   unique=True)
    op.create_index("idx_ec_tipo",  "entities_canonical", ["tipo"])
    op.create_index("idx_ec_pais",  "entities_canonical", ["pais"])

    op.execute("ALTER TABLE entities_canonical ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entities_canonical
        ON entities_canonical USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # entity_aliases — tabla de alias (one-to-many desde entities_canonical)
    # ------------------------------------------------------------------
    op.create_table(
        "entity_aliases",
        sa.Column("id",         sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("entity_id",  sa.BigInteger, sa.ForeignKey("entities_canonical.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alias",      sa.Text, nullable=False),
        sa.Column("alias_norm", sa.Text, nullable=False),   # lowercased + stripped para lookup rapido
        # Contextos de exclusion para desambiguacion
        sa.Column("excluir_si_contexto", JSONB, server_default="'[]'"),
        sa.Column("frecuencia",  sa.Integer, server_default="0"),  # veces que este alias fue resuelto
        sa.Column("confianza",   sa.Float,   server_default="1.0"),
    )

    op.create_index("idx_ea_entity",    "entity_aliases", ["entity_id"])
    op.create_index("idx_ea_alias_norm","entity_aliases", ["alias_norm"])

    # GIN trigrama para busqueda fuzzy
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_ea_alias_trgm
        ON entity_aliases USING GIN(alias_norm gin_trgm_ops)
        """
    )

    op.execute("ALTER TABLE entity_aliases ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entity_aliases
        ON entity_aliases USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # raw_mentions — cada mencion de entidad extraida del texto (Bloque 1)
    # ------------------------------------------------------------------
    op.create_table(
        "raw_mentions",
        sa.Column("id",            sa.BigInteger, primary_key=True, autoincrement=True),

        # Origen del articulo
        sa.Column("article_url",   sa.Text,  nullable=False),
        sa.Column("article_id",    sa.BigInteger),  # FK opcional a news_articles.id
        sa.Column("source_media",  sa.String(80)),
        sa.Column("published_at",  TIMESTAMPTZ),

        # Superficie extraida por NER
        sa.Column("surface_text",  sa.Text, nullable=False),   # texto literal extraido
        sa.Column("surface_norm",  sa.Text, nullable=False),   # normalizado T1-T8
        sa.Column("ner_label",     sa.String(20)),              # PER|ORG|LOC|MISC

        # Ventana de contexto (Bloque 1)
        sa.Column("context_window", sa.Text),                   # oracion +/- N palabras
        sa.Column("char_start",     sa.Integer),
        sa.Column("char_end",       sa.Integer),
        sa.Column("sentence_idx",   sa.SmallInteger),

        # Resultado de resolucion (Bloque 2 lo rellena)
        sa.Column("resolved_qid",   sa.String(20)),             # NULL = pendiente
        sa.Column("resolution_method", sa.String(20)),          # yaml|embedding|ollama|review
        sa.Column("resolution_score",  sa.Float),
        sa.Column("resolved_at",    TIMESTAMPTZ),

        # Control
        sa.Column("processed",     sa.Boolean, server_default="FALSE"),
        sa.Column("created_at",    TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_rm_article",   "raw_mentions", ["article_url"])
    op.create_index("idx_rm_surface",   "raw_mentions", ["surface_norm"])
    op.create_index("idx_rm_processed", "raw_mentions", ["processed"],
                    postgresql_where=sa.text("processed = FALSE"))
    op.create_index("idx_rm_published", "raw_mentions", ["published_at"])
    op.create_index("idx_rm_resolved",  "raw_mentions", ["resolved_qid"],
                    postgresql_where=sa.text("resolved_qid IS NOT NULL"))
    op.create_index("idx_rm_ner_label", "raw_mentions", ["ner_label"])

    # Full-text sobre ventana de contexto
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rm_context_ft
        ON raw_mentions
        USING GIN(to_tsvector('spanish', COALESCE(context_window, '')))
        """
    )

    op.execute("ALTER TABLE raw_mentions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_raw_mentions
        ON raw_mentions USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # entity_mentions — menciones resueltas a entidades canonicas (Bloque 2)
    # ------------------------------------------------------------------
    op.create_table(
        "entity_mentions",
        sa.Column("id",             sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("raw_mention_id", sa.BigInteger,
                  sa.ForeignKey("raw_mentions.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("entity_id",      sa.BigInteger,
                  sa.ForeignKey("entities_canonical.id", ondelete="SET NULL")),
        sa.Column("qid",            sa.String(20), nullable=False),

        # Contexto de la mencion para el grafo
        sa.Column("article_url",    sa.Text),
        sa.Column("published_at",   TIMESTAMPTZ),
        sa.Column("context_window", sa.Text),

        # Datos de sentimiento y tono (Bloque 3)
        sa.Column("sentiment",       sa.Float),
        sa.Column("tone",            sa.String(20)),

        # Relaciones con otras entidades en el mismo articulo
        sa.Column("co_entities",     JSONB, server_default="'[]'"),  # lista de QIDs co-mencionados

        # Metadatos de resolucion
        sa.Column("resolution_method",  sa.String(20)),
        sa.Column("resolution_score",   sa.Float),
        sa.Column("created_at",         TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_em_entity",     "entity_mentions", ["entity_id"])
    op.create_index("idx_em_qid",        "entity_mentions", ["qid"])
    op.create_index("idx_em_published",  "entity_mentions", ["published_at"])
    op.create_index("idx_em_raw",        "entity_mentions", ["raw_mention_id"])
    op.create_index("idx_em_coentities", "entity_mentions", ["co_entities"],
                    postgresql_using="gin")

    op.execute("ALTER TABLE entity_mentions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entity_mentions
        ON entity_mentions USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # resolution_review_queue — cola de revision humana (Bloque 2)
    # ------------------------------------------------------------------
    op.create_table(
        "resolution_review_queue",
        sa.Column("id",              sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("raw_mention_id",  sa.BigInteger,
                  sa.ForeignKey("raw_mentions.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("surface_text",    sa.Text, nullable=False),
        sa.Column("context_window",  sa.Text),

        # Candidatos propuestos por el pipeline (QID + score)
        sa.Column("candidates",      JSONB, server_default="'[]'"),
        sa.Column("ollama_response", sa.Text),   # respuesta cruda del juez LLM
        sa.Column("max_score",       sa.Float),

        # Estado de revision
        sa.Column("status",          sa.String(20), server_default="'pending'"),  # pending|approved|rejected|new_entity
        sa.Column("reviewer_decision", sa.String(20)),   # QID elegido o 'new'
        sa.Column("reviewer_notes",   sa.Text),
        sa.Column("reviewed_at",      TIMESTAMPTZ),
        sa.Column("auto_feedback",    sa.Boolean, server_default="FALSE"),  # ya retroalimentado a YAML

        sa.Column("created_at",       TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_rrq_status",   "resolution_review_queue", ["status"],
                    postgresql_where=sa.text("status = 'pending'"))
    op.create_index("idx_rrq_raw",      "resolution_review_queue", ["raw_mention_id"])
    op.create_index("idx_rrq_score",    "resolution_review_queue", ["max_score"])

    op.execute("ALTER TABLE resolution_review_queue ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_resolution_review_queue
        ON resolution_review_queue USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Vista: actividad de entidad en las ultimas 24h
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_entity_activity_24h AS
        SELECT
            ec.qid,
            ec.nombre_oficial,
            ec.tipo,
            ec.cargo_actual,
            COUNT(em.id)                             AS mention_count,
            AVG(em.sentiment)                        AS avg_sentiment,
            MAX(em.published_at)                     AS last_seen_at,
            jsonb_agg(DISTINCT em.co_entities) FILTER (WHERE em.co_entities != '[]'::jsonb) AS co_entities_agg
        FROM entity_mentions em
        JOIN entities_canonical ec ON ec.id = em.entity_id
        WHERE em.published_at >= NOW() - INTERVAL '24 hours'
        GROUP BY ec.qid, ec.nombre_oficial, ec.tipo, ec.cargo_actual
        ORDER BY mention_count DESC
        LIMIT 100
        """
    )

    # ------------------------------------------------------------------
    # Vista: cola de revision pendiente (para dashboard de QA)
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_review_queue_pending AS
        SELECT
            rrq.id,
            rrq.surface_text,
            rrq.context_window,
            rrq.candidates,
            rrq.max_score,
            rrq.created_at,
            rm.article_url,
            rm.source_media,
            rm.published_at
        FROM resolution_review_queue rrq
        JOIN raw_mentions rm ON rm.id = rrq.raw_mention_id
        WHERE rrq.status = 'pending'
        ORDER BY rrq.max_score ASC, rrq.created_at ASC
        LIMIT 200
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_review_queue_pending")
    op.execute("DROP VIEW IF EXISTS v_entity_activity_24h")
    op.drop_table("resolution_review_queue")
    op.drop_table("entity_mentions")
    op.drop_table("raw_mentions")
    op.drop_table("entity_aliases")
    op.drop_table("entities_canonical")
