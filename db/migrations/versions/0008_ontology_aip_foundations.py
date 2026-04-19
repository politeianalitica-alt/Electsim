"""Ontology/AIP foundations: decision log, evals, pgvector, tenant/RLS.

Revision ID: 0008_ontology_aip_foundations
Revises: 0007_validacion_results
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_ontology_aip_foundations"
down_revision: Union[str, None] = "0007_validacion_results"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _safe_add_tenant_col(table_name: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='{table_name}'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='{table_name}' AND column_name='tenant_id'
            ) THEN
                EXECUTE 'ALTER TABLE {table_name} ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT ''default''';
            END IF;
        END $$;
        """
    )


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.execute(
        """
        ALTER TABLE posts_redes_sociales
        ADD COLUMN IF NOT EXISTS embedding vector(1536)
        """
    )
    op.execute(
        """
        ALTER TABLE microdatos_encuesta
        ADD COLUMN IF NOT EXISTS embedding vector(1536)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_posts_redes_embedding_ivfflat
        ON posts_redes_sociales USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_microdatos_embedding_ivfflat
        ON microdatos_encuesta USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )

    op.create_table(
        "decision_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("object_type", sa.String(64), nullable=True),
        sa.Column("object_id", sa.String(64), nullable=True),
        sa.Column("action_name", sa.String(128), nullable=False),
        sa.Column("input_params", sa.JSON(), nullable=False),
        sa.Column("output_summary", sa.Text(), nullable=False),
        sa.Column("evaluation", sa.Text(), nullable=True),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_decision_log_tenant_created", "decision_log", ["tenant_id", "created_at"])

    op.create_table(
        "agent_eval_run",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("cluster_id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("n_prompts", sa.Integer(), nullable=False),
        sa.Column("coherence_score", sa.Numeric(6, 4), nullable=True),
        sa.Column("detalle_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "ingest_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("source_name", sa.String(120), nullable=False, unique=True),
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    for table in ("perfiles_votante", "simulaciones_encuesta", "simulaciones_campana", "agent_memory_log"):
        _safe_add_tenant_col(table)

    # RLS base (aplicable sobre tablas con tenant_id)
    for table in ("decision_log", "agent_eval_run", "agent_memory_log", "simulaciones_campana", "simulaciones_encuesta"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='{table}' AND policyname='tenant_isolation'
                ) THEN
                    EXECUTE 'CREATE POLICY tenant_isolation ON {table} USING (tenant_id = current_setting(''app.tenant_id'', true))';
                END IF;
            END $$;
            """
        )


def downgrade() -> None:
    op.drop_table("ingest_log")
    op.drop_table("agent_eval_run")
    op.drop_index("ix_decision_log_tenant_created", table_name="decision_log")
    op.drop_table("decision_log")
    op.execute("DROP INDEX IF EXISTS idx_microdatos_embedding_ivfflat")
    op.execute("DROP INDEX IF EXISTS idx_posts_redes_embedding_ivfflat")
    op.execute("ALTER TABLE microdatos_encuesta DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE posts_redes_sociales DROP COLUMN IF EXISTS embedding")
