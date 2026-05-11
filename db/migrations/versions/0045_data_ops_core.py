"""
0045 — Data Operations Core — Bloque 8.

Crea las tablas operacionales del sistema de datos:
  - source_registry        (registro de fuentes de datos)
  - pipeline_registry      (catálogo de pipelines)
  - pipeline_runs          (historial de ejecuciones)
  - data_quality_checks    (definición de checks de calidad)
  - data_quality_results   (resultados de checks)
  - source_health          (estado de salud por fuente)
  - raw_data_manifest      (manifiesto de ficheros brutos)
  - data_lineage           (linaje entre objetos de datos)

NO duplica: scraping_log, cache_http, alertas_sistema (ya existen).

Revision:      0045
Down revision: 0044
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── source_registry ──────────────────────────────────────────────────────
    op.create_table(
        "source_registry",
        sa.Column("source_id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("domain", sa.Text, nullable=False),
        sa.Column("source_type", sa.Text, nullable=False, server_default="api"),
        sa.Column("base_url", sa.Text),
        sa.Column("refresh_interval_minutes", sa.Integer, server_default="60"),
        sa.Column("expected_latency_minutes", sa.Integer, server_default="90"),
        sa.Column("requires_credentials", sa.Boolean, server_default="false"),
        sa.Column("active", sa.Boolean, server_default="true"),
        sa.Column("risk_level", sa.Text, server_default="low"),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_source_registry_domain", "source_registry", ["domain"])
    op.create_index("ix_source_registry_active", "source_registry", ["active"])

    op.execute("ALTER TABLE source_registry ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_source_registry
        ON source_registry
        USING (true)
    """)

    # ── pipeline_registry ─────────────────────────────────────────────────────
    op.create_table(
        "pipeline_registry",
        sa.Column("pipeline_id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("domain", sa.Text, nullable=False),
        sa.Column("entrypoint", sa.Text, nullable=False),
        sa.Column("schedule", sa.Text),
        sa.Column("sources", JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("output_tables", JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("owner", sa.Text, server_default=sa.text("'system'")),
        sa.Column("active", sa.Boolean, server_default="true"),
        sa.Column("retry_policy", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_pipeline_registry_domain", "pipeline_registry", ["domain"])

    op.execute("ALTER TABLE pipeline_registry ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_pipeline_registry
        ON pipeline_registry
        USING (true)
    """)

    # ── pipeline_runs ─────────────────────────────────────────────────────────
    op.create_table(
        "pipeline_runs",
        sa.Column("run_id", sa.Text, primary_key=True),
        sa.Column("pipeline_id", sa.Text, nullable=False),
        sa.Column("source_id", sa.Text),
        sa.Column("status", sa.Text, nullable=False, server_default="running"),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("finished_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("duration_seconds", sa.Float),
        sa.Column("records_extracted", sa.Integer, server_default="0"),
        sa.Column("records_loaded", sa.Integer, server_default="0"),
        sa.Column("records_updated", sa.Integer, server_default="0"),
        sa.Column("records_duplicate", sa.Integer, server_default="0"),
        sa.Column("records_failed", sa.Integer, server_default="0"),
        sa.Column("error_message", sa.Text),
        sa.Column("error_type", sa.Text),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_pipeline_runs_pipeline_id", "pipeline_runs", ["pipeline_id"])
    op.create_index("ix_pipeline_runs_started_at", "pipeline_runs", ["started_at"])
    op.create_index("ix_pipeline_runs_status", "pipeline_runs", ["status"])
    op.create_index("ix_pipeline_runs_source_id", "pipeline_runs", ["source_id"])

    op.execute("ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_pipeline_runs
        ON pipeline_runs
        USING (true)
    """)

    # ── data_quality_checks ───────────────────────────────────────────────────
    op.create_table(
        "data_quality_checks",
        sa.Column("check_id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("table_name", sa.Text, nullable=False),
        sa.Column("domain", sa.Text, nullable=False),
        sa.Column("check_type", sa.Text, nullable=False),
        sa.Column("severity", sa.Text, nullable=False, server_default="warning"),
        sa.Column("query", sa.Text),
        sa.Column("rule", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_dq_checks_domain", "data_quality_checks", ["domain"])
    op.create_index("ix_dq_checks_table", "data_quality_checks", ["table_name"])

    op.execute("ALTER TABLE data_quality_checks ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_data_quality_checks
        ON data_quality_checks
        USING (true)
    """)

    # ── data_quality_results ──────────────────────────────────────────────────
    op.create_table(
        "data_quality_results",
        sa.Column("result_id", sa.Text, primary_key=True,
                  server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("check_id", sa.Text, nullable=False),
        sa.Column("run_id", sa.Text),
        sa.Column("status", sa.Text, nullable=False),
        sa.Column("checked_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("records_checked", sa.Integer),
        sa.Column("records_failed", sa.Integer),
        sa.Column("metric_value", sa.Float),
        sa.Column("threshold", sa.Float),
        sa.Column("details", JSONB, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_dq_results_check_id", "data_quality_results", ["check_id"])
    op.create_index("ix_dq_results_checked_at", "data_quality_results", ["checked_at"])
    op.create_index("ix_dq_results_status", "data_quality_results", ["status"])

    op.execute("ALTER TABLE data_quality_results ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_data_quality_results
        ON data_quality_results
        USING (true)
    """)

    # ── source_health ─────────────────────────────────────────────────────────
    op.create_table(
        "source_health",
        sa.Column("health_id", sa.Text, primary_key=True,
                  server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("source_id", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="unknown"),
        sa.Column("last_success_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("last_failure_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("freshness_lag_minutes", sa.Float),
        sa.Column("consecutive_failures", sa.Integer, server_default="0"),
        sa.Column("avg_latency_ms", sa.Float),
        sa.Column("last_error", sa.Text),
        sa.Column("checked_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_source_health_source_id", "source_health", ["source_id"])
    op.create_index("ix_source_health_checked_at", "source_health", ["checked_at"])
    op.create_index("ix_source_health_status", "source_health", ["status"])

    op.execute("ALTER TABLE source_health ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_source_health
        ON source_health
        USING (true)
    """)

    # ── raw_data_manifest ─────────────────────────────────────────────────────
    op.create_table(
        "raw_data_manifest",
        sa.Column("manifest_id", sa.Text, primary_key=True),
        sa.Column("source_id", sa.Text, nullable=False),
        sa.Column("run_id", sa.Text),
        sa.Column("path", sa.Text, nullable=False),
        sa.Column("file_format", sa.Text, server_default="parquet"),
        sa.Column("size_bytes", sa.BigInteger),
        sa.Column("checksum", sa.Text),
        sa.Column("record_count", sa.Integer),
        sa.Column("extracted_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("immutable", sa.Boolean, server_default="true"),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_raw_manifest_source_id", "raw_data_manifest", ["source_id"])
    op.create_index("ix_raw_manifest_extracted_at", "raw_data_manifest", ["extracted_at"])
    op.create_index(
        "ix_raw_manifest_checksum", "raw_data_manifest", ["checksum"],
        postgresql_where=sa.text("checksum IS NOT NULL"),
    )

    op.execute("ALTER TABLE raw_data_manifest ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_raw_data_manifest
        ON raw_data_manifest
        USING (true)
    """)

    # ── data_lineage ──────────────────────────────────────────────────────────
    op.create_table(
        "data_lineage",
        sa.Column("lineage_id", sa.Text, primary_key=True,
                  server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("source_object_type", sa.Text, nullable=False),
        sa.Column("source_object_id", sa.Text, nullable=False),
        sa.Column("target_object_type", sa.Text, nullable=False),
        sa.Column("target_object_id", sa.Text, nullable=False),
        sa.Column("transformation", sa.Text),
        sa.Column("pipeline_id", sa.Text),
        sa.Column("run_id", sa.Text),
        sa.Column("confidence", sa.Float, server_default="1.0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("NOW()")),
    )
    op.create_index(
        "ix_lineage_source", "data_lineage",
        ["source_object_type", "source_object_id"],
    )
    op.create_index(
        "ix_lineage_target", "data_lineage",
        ["target_object_type", "target_object_id"],
    )
    op.create_index("ix_lineage_pipeline_id", "data_lineage", ["pipeline_id"])

    op.execute("ALTER TABLE data_lineage ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_data_lineage
        ON data_lineage
        USING (true)
    """)


def downgrade() -> None:
    op.drop_table("data_lineage")
    op.drop_table("raw_data_manifest")
    op.drop_table("source_health")
    op.drop_table("data_quality_results")
    op.drop_table("data_quality_checks")
    op.drop_table("pipeline_runs")
    op.drop_table("pipeline_registry")
    op.drop_table("source_registry")
