"""
Migracion 0036 — Palantir Advanced Tables.

Crea:
  candidate_entities          — candidatos detectados por DynamicOntologyManager (Bloque 4)
  entity_anomaly_alerts       — columna causal_chain_json anadida (Bloque 6)
  entity_causal_edges         — aristas causales con peso temporal (Bloque 5)
  prediction_results          — resultados de CoalitionPredictor / CrisisEscalation (Bloque 7)
  electoral_shift_signals     — senales de desplazamiento electoral (Bloque 7)

RLS: todas con ENABLE ROW LEVEL SECURITY.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMPTZ

revision = "0036"
down_revision = "0035"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # candidate_entities — entidades desconocidas detectadas por NER
    # que no resuelven en el catalogo canónico (Bloque 4)
    # ------------------------------------------------------------------
    op.create_table(
        "candidate_entities",
        sa.Column("id",               sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("candidate_id",     sa.String(30), unique=True, nullable=False),
        sa.Column("surface_text",     sa.Text, nullable=False),
        sa.Column("surface_norm",     sa.Text),
        sa.Column("ner_label",        sa.String(20)),
        sa.Column("context_sample",   sa.Text),
        sa.Column("embedding",        JSONB),           # vector serializado
        sa.Column("nearest_qid",      sa.String(20)),   # QID mas cercano en catalogo
        sa.Column("nearest_score",    sa.Float),        # similitud coseno vs nearest
        sa.Column("cooccurrence_qids", JSONB, server_default="'[]'"),
        sa.Column("n_mentions",       sa.Integer, server_default="1"),
        sa.Column("status",           sa.String(20), server_default="'pending'"),
        # pending | promoted | merged | discarded
        sa.Column("merged_into_qid",  sa.String(20)),   # si status=merged
        sa.Column("promoted_qid",     sa.String(20)),   # si status=promoted
        sa.Column("created_at",       TIMESTAMPTZ, server_default=sa.text("NOW()")),
        sa.Column("updated_at",       TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_ce_surface_norm", "candidate_entities", ["surface_norm"])
    op.create_index("idx_ce_nearest_qid", "candidate_entities", ["nearest_qid"])
    op.create_index("idx_ce_status",      "candidate_entities", ["status"])
    op.create_index("idx_ce_n_mentions",  "candidate_entities", ["n_mentions"])
    op.create_index(
        "idx_ce_surface_trgm",
        "candidate_entities", ["surface_norm"],
        postgresql_using="gin",
        postgresql_ops={"surface_norm": "gin_trgm_ops"},
    )

    op.execute("ALTER TABLE candidate_entities ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_candidate_entities
        ON candidate_entities USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # entity_causal_edges — aristas causales con peso temporal (Bloque 5)
    # Complementa entity_graph_edges (fallback Postgres del grafo Neo4j)
    # con direccionalidad causal y decaimiento temporal.
    # ------------------------------------------------------------------
    op.create_table(
        "entity_causal_edges",
        sa.Column("id",              sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("source_qid",      sa.String(20), nullable=False),
        sa.Column("target_qid",      sa.String(20), nullable=False),
        sa.Column("causal_direction", sa.String(20)),  # forward | backward | bidirectional
        sa.Column("granger_pvalue",  sa.Float),        # p-valor del test de Granger
        sa.Column("base_strength",   sa.Float, server_default="1.0"),
        sa.Column("frequency_score", sa.Float, server_default="1.0"),
        sa.Column("decayed_weight",  sa.Float),        # calculado en runtime
        sa.Column("last_event_at",   TIMESTAMPTZ),
        sa.Column("evidence_urls",   JSONB, server_default="'[]'"),
        sa.Column("computed_at",     TIMESTAMPTZ, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("source_qid", "target_qid", name="uq_causal_edge"),
    )

    op.create_index("idx_ece_source",   "entity_causal_edges", ["source_qid"])
    op.create_index("idx_ece_target",   "entity_causal_edges", ["target_qid"])
    op.create_index("idx_ece_weight",   "entity_causal_edges", ["decayed_weight"])
    op.create_index("idx_ece_computed", "entity_causal_edges", ["computed_at"])

    op.execute("ALTER TABLE entity_causal_edges ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_entity_causal_edges
        ON entity_causal_edges USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Ampliar entity_anomaly_alerts con causal_chain_json (Bloque 6)
    # ------------------------------------------------------------------
    op.add_column(
        "entity_anomaly_alerts",
        sa.Column("causal_chain_json", JSONB),  # {chain: [...], root_cause: qid}
    )
    op.add_column(
        "entity_anomaly_alerts",
        sa.Column("correlated_entities", JSONB, server_default="'[]'"),
    )
    op.add_column(
        "entity_anomaly_alerts",
        sa.Column("recommended_action", sa.Text),
    )
    op.add_column(
        "entity_anomaly_alerts",
        sa.Column("severity",           sa.Float),   # 0-1 fusion bayesiana
    )
    op.add_column(
        "entity_anomaly_alerts",
        sa.Column("signal_type",        sa.String(40)),
        # volume_spike | sentiment_trajectory | network_centrality_shift | coordinated_attack
    )

    # ------------------------------------------------------------------
    # prediction_results — coaliciones, crisis, escenarios (Bloque 7)
    # ------------------------------------------------------------------
    op.create_table(
        "prediction_results",
        sa.Column("id",               sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("prediction_id",    sa.String(30), unique=True, nullable=False),
        sa.Column("model_type",       sa.String(40)),
        # coalition | crisis_escalation | electoral_shift
        sa.Column("horizon_days",     sa.Integer),
        sa.Column("probability",      sa.Float),
        sa.Column("confidence_low",   sa.Float),
        sa.Column("confidence_high",  sa.Float),
        sa.Column("entities_involved", JSONB, server_default="'[]'"),
        sa.Column("scenario_json",    JSONB),    # detalle completo del escenario
        sa.Column("features_used",    JSONB),    # features con sus pesos
        sa.Column("generated_at",     TIMESTAMPTZ, server_default=sa.text("NOW()")),
    )

    op.create_index("idx_pr_model_type",  "prediction_results", ["model_type"])
    op.create_index("idx_pr_generated",   "prediction_results", ["generated_at"])
    op.create_index("idx_pr_probability", "prediction_results", ["probability"])
    op.create_index(
        "idx_pr_entities_gin",
        "prediction_results", ["entities_involved"],
        postgresql_using="gin",
    )

    op.execute("ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_prediction_results
        ON prediction_results USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # electoral_shift_signals — microdata × media coverage (Bloque 7)
    # ------------------------------------------------------------------
    op.create_table(
        "electoral_shift_signals",
        sa.Column("id",             sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("partido_qid",    sa.String(20), nullable=False),
        sa.Column("partido_siglas", sa.Text),
        sa.Column("date",           sa.Date, nullable=False),
        sa.Column("voto_blando_pct", sa.Float),   # % intención blanda (CIS/encuesta)
        sa.Column("media_coverage", sa.Float),    # vol. menciones normalizadas
        sa.Column("sentiment_avg",  sa.Float),    # tono promedio ese día
        sa.Column("shift_index",    sa.Float),    # correlacion mediatexmicrodata
        sa.Column("shift_direction", sa.String(10)),  # up | down | stable
        sa.Column("created_at",     TIMESTAMPTZ, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("partido_qid", "date", name="uq_electoral_shift"),
    )

    op.create_index("idx_ess_partido",  "electoral_shift_signals", ["partido_qid"])
    op.create_index("idx_ess_date",     "electoral_shift_signals", ["date"])
    op.create_index("idx_ess_shift",    "electoral_shift_signals", ["shift_index"])

    op.execute("ALTER TABLE electoral_shift_signals ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_electoral_shift_signals
        ON electoral_shift_signals USING (TRUE)
        """
    )

    # ------------------------------------------------------------------
    # Vista: candidatos pendientes de revision
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_candidates_pending AS
        SELECT
            candidate_id, surface_text, ner_label, n_mentions,
            nearest_qid, nearest_score, status, created_at
        FROM candidate_entities
        WHERE status = 'pending'
        ORDER BY n_mentions DESC, created_at DESC
        LIMIT 100
        """
    )

    # ------------------------------------------------------------------
    # Vista: predicciones mas recientes por modelo
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE VIEW v_latest_predictions AS
        SELECT DISTINCT ON (model_type)
            prediction_id, model_type, horizon_days,
            probability, confidence_low, confidence_high,
            entities_involved, generated_at
        FROM prediction_results
        ORDER BY model_type, generated_at DESC
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_latest_predictions")
    op.execute("DROP VIEW IF EXISTS v_candidates_pending")
    op.drop_table("electoral_shift_signals")
    op.drop_table("prediction_results")
    for col in ["signal_type", "severity", "recommended_action",
                "correlated_entities", "causal_chain_json"]:
        op.drop_column("entity_anomaly_alerts", col)
    op.drop_table("entity_causal_edges")
    op.drop_table("candidate_entities")
