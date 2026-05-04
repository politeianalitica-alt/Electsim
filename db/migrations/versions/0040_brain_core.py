"""
0040 — Brain Core: agent_runs, tool_calls, rag_documents

Revision: 0040
Down revision: 0039
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── agent_runs ────────────────────────────────────────────────────────────
    op.create_table(
        "agent_runs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("agent_name", sa.String(120), nullable=False),
        sa.Column("module", sa.String(120), nullable=True),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("input_objects", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("tenant_id", sa.Text(), server_default="default", nullable=False),
        sa.Column("model_used", sa.String(200), nullable=True),
        sa.Column("provider", sa.String(100), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("structured_output", postgresql.JSONB(), nullable=True),
        sa.Column("evidence", postgresql.JSONB(), nullable=True),
        sa.Column("tools_used", postgresql.JSONB(), server_default="[]", nullable=True),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=True),
        sa.Column("warnings", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("status", sa.String(30), server_default="completed", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_agent_runs_agent", "agent_runs", ["agent_name"])
    op.create_index("idx_agent_runs_module", "agent_runs", ["module"])
    op.create_index("idx_agent_runs_created", "agent_runs", ["created_at"])
    op.create_index("idx_agent_runs_tenant", "agent_runs", ["tenant_id"])
    op.create_index("idx_agent_runs_status", "agent_runs", ["status"])

    # ── tool_calls ────────────────────────────────────────────────────────────
    op.create_table(
        "tool_calls",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("tool_name", sa.String(150), nullable=False),
        sa.Column("input", postgresql.JSONB(), nullable=True),
        sa.Column("output", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(30), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_tool_calls_run_id", "tool_calls", ["run_id"])
    op.create_index("idx_tool_calls_tool_name", "tool_calls", ["tool_name"])
    op.create_index("idx_tool_calls_created", "tool_calls", ["created_at"])

    # ── rag_documents ─────────────────────────────────────────────────────────
    op.create_table(
        "rag_documents",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("object_type", sa.String(120), nullable=False),
        sa.Column("object_id", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(120), nullable=True),
        sa.Column("collection", sa.String(120), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("text_hash", sa.String(128), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("indexed_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_type", "object_id", "collection", name="uq_rag_document"),
    )
    op.create_index("idx_rag_documents_domain", "rag_documents", ["domain"])
    op.create_index("idx_rag_documents_collection", "rag_documents", ["collection"])
    op.create_index("idx_rag_documents_indexed_at", "rag_documents", ["indexed_at"])


def downgrade() -> None:
    op.drop_table("rag_documents")
    op.drop_table("tool_calls")
    op.drop_table("agent_runs")
