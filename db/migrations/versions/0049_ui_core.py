"""
0049 — UI Core: saved_views, dashboard_widgets, workspace_layouts, visual_exports.

Bloque 12: Dashboard, UX & Design System Core.

Revision ID: 0049
Revises: 0048
Create Date: 2026-05-05
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── saved_views ────────────────────────────────────────────────────────────
    op.create_table(
        "saved_views",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("modulo_id", sa.String(100), nullable=False),
        sa.Column("filtros", sa.Text, nullable=True),          # JSON
        sa.Column("layout_config", sa.Text, nullable=True),   # JSON
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_saved_views_modulo_id", "saved_views", ["modulo_id"])
    op.create_index("ix_saved_views_user_id", "saved_views", ["user_id"])
    op.create_index("ix_saved_views_tenant_id", "saved_views", ["tenant_id"])

    # RLS: tenant isolation
    op.execute("ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY")
    op.execute(
        """CREATE POLICY tenant_isolation_saved_views ON saved_views
           USING (tenant_id = current_setting('app.tenant_id', true)
                  OR tenant_id IS NULL)"""
    )

    # ── dashboard_widgets ──────────────────────────────────────────────────────
    op.create_table(
        "dashboard_widgets",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("modulo_id", sa.String(100), nullable=False),
        sa.Column("widget_id", sa.String(255), nullable=False),
        sa.Column("widget_type", sa.String(100), nullable=False),
        sa.Column("config", sa.Text, nullable=True),           # JSON
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("modulo_id", "widget_id", "user_id",
                            name="uq_dashboard_widgets_modulo_widget_user"),
    )
    op.create_index("ix_dashboard_widgets_modulo", "dashboard_widgets", ["modulo_id"])
    op.create_index("ix_dashboard_widgets_user", "dashboard_widgets", ["user_id"])

    # ── workspace_layouts ──────────────────────────────────────────────────────
    op.create_table(
        "workspace_layouts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("workspace_id", sa.String(255), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("layout", sa.Text, nullable=True),           # JSON
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("workspace_id", "user_id",
                            name="uq_workspace_layouts_ws_user"),
    )
    op.create_index("ix_workspace_layouts_workspace", "workspace_layouts", ["workspace_id"])
    op.create_index("ix_workspace_layouts_tenant", "workspace_layouts", ["tenant_id"])

    # ── visual_exports ─────────────────────────────────────────────────────────
    op.create_table(
        "visual_exports",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("module_id", sa.String(100), nullable=False),
        sa.Column("export_type", sa.String(50), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("record_count", sa.Integer, nullable=True),
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index("ix_visual_exports_module", "visual_exports", ["module_id"])
    op.create_index("ix_visual_exports_user", "visual_exports", ["user_id"])
    op.create_index("ix_visual_exports_tenant", "visual_exports", ["tenant_id"])
    op.create_index("ix_visual_exports_type", "visual_exports", ["export_type"])


def downgrade() -> None:
    op.drop_table("visual_exports")
    op.drop_table("workspace_layouts")
    op.drop_table("dashboard_widgets")
    op.drop_table("saved_views")
