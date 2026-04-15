"""Tabla de trazas y memoria episódica de agentes sintéticos (Fase 3).

Revision ID: 0003_agent_memory_log
Revises: 0002_fase2_output_tables
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_agent_memory_log"
down_revision: Union[str, None] = "0002_fase2_output_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_memory_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "perfil_id",
            sa.Integer(),
            sa.ForeignKey("perfiles_votante.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("cluster_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'turn'"),
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("modelo", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_agent_memory_log_session_id", "agent_memory_log", ["session_id"])
    op.create_index(
        "ix_agent_memory_log_perfil_created",
        "agent_memory_log",
        ["perfil_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_agent_memory_log_perfil_created", table_name="agent_memory_log")
    op.drop_index("ix_agent_memory_log_session_id", table_name="agent_memory_log")
    op.drop_table("agent_memory_log")
