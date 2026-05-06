"""Politeia v3 — tablas adicionales para frontend Next.js.

Revision ID: 0057
Revises: 0056
Create Date: 2026-05-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0057"
down_revision = "0056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add tables that the v3 frontend (Next.js) expects."""

    # API runs / observability
    op.create_table(
        "api_request_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(64), index=True),
        sa.Column("user_id", sa.String(64)),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("status_code", sa.Integer),
        sa.Column("latency_ms", sa.Integer),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("ip", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index("ix_api_log_created", "api_request_log", ["created_at"])

    # Live ticker cache (optional persistence)
    op.create_table(
        "live_ticker_snapshots",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(64), index=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("items", sa.JSON, nullable=False)
    )

    # Frontend session preferences
    op.create_table(
        "frontend_sessions",
        sa.Column("session_id", sa.String(128), primary_key=True),
        sa.Column("user_id", sa.String(64), index=True),
        sa.Column("tenant_id", sa.String(64)),
        sa.Column("active_workspace_id", sa.String(64)),
        sa.Column("preferences", sa.JSON, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # Briefing assets (PDF / audio cache)
    op.create_table(
        "briefing_assets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("briefing_id", sa.String(64), index=True, nullable=False),
        sa.Column("asset_type", sa.String(20), nullable=False),  # pdf/audio/markdown
        sa.Column("filename", sa.String(255)),
        sa.Column("size_bytes", sa.Integer),
        sa.Column("storage_path", sa.String(500)),
        sa.Column("checksum", sa.String(64)),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True))
    )

    # Saved searches (already in services but persist them)
    op.create_table(
        "saved_searches_v3",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), index=True, nullable=False),
        sa.Column("user_id", sa.String(64), index=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("page", sa.String(100)),
        sa.Column("filter_json", sa.JSON),
        sa.Column("sort_field", sa.String(100), server_default=""),
        sa.Column("sort_direction", sa.String(10), server_default="desc"),
        sa.Column("shared", sa.Boolean, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_run", sa.DateTime(timezone=True)),
        sa.Column("run_count", sa.Integer, server_default="0")
    )

    # Frontend feature flags
    op.create_table(
        "feature_flags",
        sa.Column("flag_key", sa.String(100), primary_key=True),
        sa.Column("enabled", sa.Boolean, server_default=sa.true()),
        sa.Column("tenant_overrides", sa.JSON, server_default="{}"),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now())
    )


def downgrade() -> None:
    op.drop_table("feature_flags")
    op.drop_table("saved_searches_v3")
    op.drop_table("briefing_assets")
    op.drop_table("frontend_sessions")
    op.drop_table("live_ticker_snapshots")
    op.drop_index("ix_api_log_created", table_name="api_request_log")
    op.drop_table("api_request_log")
