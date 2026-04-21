"""Runtime tables for daily electoral dashboard ingestion.

Revision ID: 0009_electoral_dashboard_ingestion
Revises: 0008_ontology_aip_foundations
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_electoral_dashboard_ingestion"
down_revision: Union[str, None] = "0008_ontology_aip_foundations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingestion_run",
        sa.Column("run_id", sa.String(length=64), primary_key=True),
        sa.Column("pipeline_name", sa.String(length=100), nullable=False),
        sa.Column("mode", sa.String(length=20), nullable=False),
        sa.Column("requested_from", sa.Date(), nullable=True),
        sa.Column("requested_to", sa.Date(), nullable=True),
        sa.Column("triggered_by", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="running"),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ingestion_run_pipeline_started", "ingestion_run", ["pipeline_name", "started_at"])

    op.create_table(
        "ingestion_watermark",
        sa.Column("pipeline_name", sa.String(length=100), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=False),
        sa.Column("watermark_value", sa.String(length=200), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_full_refresh_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("pipeline_name", "source_id"),
    )

    op.create_table(
        "ingestion_run_source",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(length=64), sa.ForeignKey("ingestion_run.run_id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("extraction_mode", sa.String(length=40), nullable=False),
        sa.Column("precedence_rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("supports_incremental", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("raw_snapshot_path", sa.Text(), nullable=True),
        sa.Column("watermark_before", sa.String(length=200), nullable=True),
        sa.Column("watermark_after", sa.String(length=200), nullable=True),
        sa.Column("records_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_inserted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_rejected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_deduplicated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warnings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warnings_json", sa.Text(), nullable=True),
        sa.Column("errors_json", sa.Text(), nullable=True),
        sa.Column("validation_json", sa.Text(), nullable=True),
        sa.Column("extra_metrics_json", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_ingestion_run_source_source_finished",
        "ingestion_run_source",
        ["source_id", "finished_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_ingestion_run_source_source_finished", table_name="ingestion_run_source")
    op.drop_table("ingestion_run_source")
    op.drop_table("ingestion_watermark")
    op.drop_index("ix_ingestion_run_pipeline_started", table_name="ingestion_run")
    op.drop_table("ingestion_run")
