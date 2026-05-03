"""
Migracion 0035 — Enrichment Tables: tablas para Bloque 3.

Crea:
  entity_graph_edges     — fallback PostgreSQL para el grafo Neo4j
  entity_anomaly_alerts  — alertas de anomalias detectadas (z-score)
  client_briefings       — briefings markdown generados por Ollama
  client_subscriptions   — suscripciones de clientes a entidades/alertas

RLS: todas las tablas con ENABLE ROW LEVEL SECURITY.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMPTZ

revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # entity_graph_edges — fallback de grafo sin Neo4j
    # ------------------------------------------------------------------
    op.create_table(
        "entity_graph_edges",
        sa.Column("id",          sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("source_qid",  sa.String(20), nullable=False),
        sa.Column("target_qid",  sa.String(20), nullable=False),
        sa.Column("rel_type",    sa.String(20), nullable=False),
        sa.Column("peso",        sa.Integer,    server_default="1"),
        sa.Column("sentimiento", sa.Float,      server_default="0"),
        sa.Column("ultimo_at",   TIMESTAMPTZ),
        sa.Column("ultimo_url",  sa.Text),
        sa.UniqueConstraint("source_qid", "target_qid", "rel_type",
                            name="uq_graph_edge"),
    )

    op.create_index("idx_ge_source",  "entity_graph_edges", ["source_qid"])
    op.create_index("idx_ge_target",  "entity_graph_edges", ["target_qid"])
    op.create_index("idx_ge_reltype", "entity_graph_edges", ["rel_type"])
    op.create_index("idx_ge_peso",    "entity_graph_edges", ["peso"])

    op.execute("ALTER TABLE entity_graph_edges ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entity_graph_edges
        ON entity_graph_edges USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # entity_anomaly_alerts
    # ------------------------------------------------------------------
    op.create_table(
        "entity_anomaly_alerts",
        sa.Column("id",              sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("qid",             sa.String(20), nullable=False),
        sa.Column("nombre_oficial",  sa.Text),
        sa.Column("alert_type",      sa.String(40)),   # spike_menciones | cambio_tono
        sa.Column("z_score",         sa.Float),
        sa.Column("value_current",   sa.Float),
        sa.Column("value_baseline",  sa.Float),
        sa.Column("hypothesis",      sa.Text),
        sa.Column("activa",          sa.Boolean, server_default="TRUE"),
        sa.Column("generated_at",    TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_aa_qid",         "entity_anomaly_alerts", ["qid"])
    op.create_index("idx_aa_alert_type",  "entity_anomaly_alerts", ["alert_type"])
    op.create_index("idx_aa_activa",      "entity_anomaly_alerts", ["activa"],
                    postgresql_where=sa.text("activa = TRUE"))
    op.create_index("idx_aa_generated",   "entity_anomaly_alerts", ["generated_at"])

    op.execute("ALTER TABLE entity_anomaly_alerts ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entity_anomaly_alerts
        ON entity_anomaly_alerts USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # client_briefings
    # ------------------------------------------------------------------
    op.create_table(
        "client_briefings",
        sa.Column("id",                sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("briefing_id",       sa.String(20), unique=True),
        sa.Column("titulo",            sa.Text),
        sa.Column("entidades_qids",    JSONB, server_default="'[]'"),
        sa.Column("periodo",           sa.String(10)),   # 24h | 7d | custom
        sa.Column("contenido_md",      sa.Text),
        sa.Column("resumen_ejecutivo", sa.Text),
        sa.Column("alertas_incluidas", JSONB, server_default="'[]'"),
        sa.Column("generated_at",      TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_cb_generated",  "client_briefings", ["generated_at"])
    op.create_index("idx_cb_periodo",    "client_briefings", ["periodo"])
    op.create_index(
        "idx_cb_entities_gin",
        "client_briefings", ["entidades_qids"],
        postgresql_using="gin",
    )

    op.execute("ALTER TABLE client_briefings ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_client_briefings
        ON client_briefings USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # client_subscriptions — que entidades/alertas sigue cada cliente
    # ------------------------------------------------------------------
    op.create_table(
        "client_subscriptions",
        sa.Column("id",             sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("tenant_id",      sa.String(40), nullable=False),
        sa.Column("entity_qids",    JSONB, server_default="'[]'"),   # entidades seguidas
        sa.Column("alert_types",    JSONB, server_default="'[]'"),   # tipos de alerta
        sa.Column("briefing_periodo", sa.String(10), server_default="'24h'"),
        sa.Column("activa",         sa.Boolean, server_default="TRUE"),
        sa.Column("created_at",     TIMESTAMPTZ, server_default=sa.text("NOW()")),
        sa.Column("updated_at",     TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_cs_tenant",  "client_subscriptions", ["tenant_id"])
    op.create_index("idx_cs_activa",  "client_subscriptions", ["activa"])

    op.execute("ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_client_subscriptions
        ON client_subscriptions
        USING (tenant_id = current_setting('app.current_tenant', TRUE))
        """
    )

    # ------------------------------------------------------------------
    # Vista: briefings recientes
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_recent_briefings AS
        SELECT
            id, briefing_id, titulo, periodo,
            resumen_ejecutivo,
            jsonb_array_length(entidades_qids)  AS num_entities,
            jsonb_array_length(alertas_incluidas) AS num_alerts,
            generated_at
        FROM client_briefings
        ORDER BY generated_at DESC
        LIMIT 30
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_recent_briefings")
    op.drop_table("client_subscriptions")
    op.drop_table("client_briefings")
    op.drop_table("entity_anomaly_alerts")
    op.drop_table("entity_graph_edges")
