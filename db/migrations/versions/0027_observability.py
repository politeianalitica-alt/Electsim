"""
Migracion 0027 — Tablas de observabilidad LLM (Bloque 7).

Crea:
  llm_trace  — registro de cada llamada LLM (modelo, tokens, latencia, muestreo eval)
  llm_eval   — evaluacion automatica (LLM-as-judge) de traces muestreados
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# Alembic metadata
revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # ------------------------------------------------------------------
    # llm_trace
    # ------------------------------------------------------------------
    op.create_table(
        "llm_trace",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), nullable=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=True),
        sa.Column("trace_id", sa.Text, nullable=True, index=True),          # OTel trace_id (hex)
        sa.Column("span_id", sa.Text, nullable=True),                        # OTel span_id (hex)
        sa.Column("task_type", sa.Text, nullable=False),                     # analysis/classification/...
        sa.Column("model", sa.Text, nullable=False),
        sa.Column("tokens_in", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tokens_out", sa.Integer, nullable=False, server_default="0"),
        sa.Column("latency_ms", sa.Float, nullable=False),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("sample_for_eval", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_llm_trace_org_id", "llm_trace", ["org_id"])
    op.create_index("ix_llm_trace_workspace_id", "llm_trace", ["workspace_id"])
    op.create_index("ix_llm_trace_created_at", "llm_trace", ["created_at"])
    op.create_index(
        "ix_llm_trace_sample_eval",
        "llm_trace",
        ["sample_for_eval"],
        postgresql_where=sa.text("sample_for_eval = true"),
    )

    # RLS
    op.execute("ALTER TABLE llm_trace ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE llm_trace FORCE ROW LEVEL SECURITY")
    op.execute("""
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'llm_trace' AND policyname = 'tenant_isolation_llm_trace'
          ) THEN
            CREATE POLICY tenant_isolation_llm_trace ON llm_trace
              USING (
                org_id::text = current_setting('app.current_org_id', true)
                OR current_setting('app.current_org_id', true) IS NULL
                OR current_setting('app.current_org_id', true) = ''
              );
          END IF;
        END $$;
    """)

    # ------------------------------------------------------------------
    # llm_eval
    # ------------------------------------------------------------------
    op.create_table(
        "llm_eval",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trace_id", UUID(as_uuid=True),
                  sa.ForeignKey("llm_trace.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("eval_type", sa.Text, nullable=False),           # coherence/relevance/factuality/...
        sa.Column("judge_model", sa.Text, nullable=False),         # modelo usado como juez
        sa.Column("score", sa.Float, nullable=False),              # 0.0 - 1.0
        sa.Column("reasoning", sa.Text, nullable=True),            # explicacion del juez
        sa.Column("metadata", JSONB, nullable=False, server_default="'{}'"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_llm_eval_eval_type", "llm_eval", ["eval_type"])
    op.create_index("ix_llm_eval_created_at", "llm_eval", ["created_at"])

    # RLS (acceso libre a evaluaciones — no contienen PII, son metricas internas)
    op.execute("ALTER TABLE llm_eval ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE llm_eval FORCE ROW LEVEL SECURITY")
    op.execute("""
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'llm_eval' AND policyname = 'allow_all_llm_eval'
          ) THEN
            CREATE POLICY allow_all_llm_eval ON llm_eval USING (true);
          END IF;
        END $$;
    """)


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    op.drop_table("llm_eval")
    op.drop_table("llm_trace")
