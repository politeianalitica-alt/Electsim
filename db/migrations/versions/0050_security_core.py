"""
0050 — Security Core: tenants, users, workspaces, roles, user_roles,
       audit_events, data_classifications, api_tokens, export_jobs.

Bloque 13: Security, Tenant & Deployment Core.

Revision ID: 0050
Revises: 0049
Create Date: 2026-05-05
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── tenants ────────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("plan", sa.String(50), nullable=False, server_default="starter"),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("max_users", sa.Integer, nullable=False, server_default="10"),
        sa.Column("max_workspaces", sa.Integer, nullable=False, server_default="3"),
        sa.Column("features", sa.Text, nullable=True),       # JSON array
        sa.Column("config", sa.Text, nullable=True),          # JSON object
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])
    op.create_index("ix_tenants_activo", "tenants", ["activo"])

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("nombre", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(500), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_superadmin", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("last_login", sa.DateTime, nullable=True),
        sa.Column("metadata", sa.Text, nullable=True),        # JSON
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_activo", "users", ["activo"])

    # RLS: users aislados por tenant
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute(
        """CREATE POLICY tenant_isolation_users ON users
           USING (tenant_id = current_setting('app.tenant_id', true)
                  OR tenant_id IS NULL
                  OR current_setting('app.is_superadmin', true) = 'true')"""
    )

    # ── workspaces ─────────────────────────────────────────────────────────────
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tenant_id", sa.String(255), nullable=False),
        sa.Column("owner_id", sa.String(255), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("data_classification", sa.String(50), nullable=False, server_default="internal"),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("members", sa.Text, nullable=True),         # JSON array de user IDs
        sa.Column("config", sa.Text, nullable=True),          # JSON
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_workspaces_tenant_id", "workspaces", ["tenant_id"])
    op.create_index("ix_workspaces_owner_id", "workspaces", ["owner_id"])

    # ── roles ──────────────────────────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tenant_id", sa.String(255), nullable=True),  # NULL = sistema
        sa.Column("permissions", sa.Text, nullable=True),       # JSON array
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_roles_tenant_id", "roles", ["tenant_id"])
    op.create_index("ix_roles_is_system", "roles", ["is_system"])

    # ── user_roles ─────────────────────────────────────────────────────────────
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("role_id", sa.String(100), nullable=False),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("granted_by", sa.String(255), nullable=True),
        sa.Column("granted_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("user_id", "role_id", "tenant_id",
                            name="uq_user_roles_user_role_tenant"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])
    op.create_index("ix_user_roles_tenant_id", "user_roles", ["tenant_id"])

    # ── audit_events ───────────────────────────────────────────────────────────
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", sa.String(255), nullable=True),
        sa.Column("action", sa.String(255), nullable=True),
        sa.Column("result", sa.String(50), nullable=False, server_default="ok"),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("details", sa.Text, nullable=True),          # JSON
        sa.Column("risk_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"])
    op.create_index("ix_audit_events_tenant_id", "audit_events", ["tenant_id"])
    op.create_index("ix_audit_events_result", "audit_events", ["result"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])
    op.create_index("ix_audit_events_risk_score", "audit_events", ["risk_score"])

    # audit_events NO tiene RLS — super_admin necesita ver todos
    # El filtro de tenant se aplica en la capa de servicio

    # ── data_classifications ────────────────────────────────────────────────────
    op.create_table(
        "data_classifications",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("level", sa.String(50), nullable=False, server_default="internal"),
        sa.Column("classified_by", sa.String(255), nullable=True),
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("pii_detected", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("pii_types", sa.Text, nullable=True),       # JSON array
        sa.Column("retention_days", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("resource_type", "resource_id",
                            name="uq_data_classifications_resource"),
    )
    op.create_index("ix_data_classifications_resource_type", "data_classifications", ["resource_type"])
    op.create_index("ix_data_classifications_level", "data_classifications", ["level"])
    op.create_index("ix_data_classifications_pii", "data_classifications", ["pii_detected"])

    # ── api_tokens ─────────────────────────────────────────────────────────────
    op.create_table(
        "api_tokens",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(500), nullable=False),  # Nunca el valor real
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("permissions", sa.Text, nullable=True),     # JSON: subset de permisos
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_used_at", sa.DateTime, nullable=True),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_api_tokens_user_id", "api_tokens", ["user_id"])
    op.create_index("ix_api_tokens_tenant_id", "api_tokens", ["tenant_id"])
    op.create_index("ix_api_tokens_activo", "api_tokens", ["activo"])

    # ── export_jobs ────────────────────────────────────────────────────────────
    op.create_table(
        "export_jobs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("module_id", sa.String(100), nullable=False),
        sa.Column("export_type", sa.String(50), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("tenant_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("requires_approval", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("record_count", sa.Integer, nullable=True),
        sa.Column("data_classification", sa.String(50), nullable=False, server_default="internal"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_export_jobs_user_id", "export_jobs", ["user_id"])
    op.create_index("ix_export_jobs_tenant_id", "export_jobs", ["tenant_id"])
    op.create_index("ix_export_jobs_status", "export_jobs", ["status"])
    op.create_index("ix_export_jobs_module_id", "export_jobs", ["module_id"])


def downgrade() -> None:
    op.drop_table("export_jobs")
    op.drop_table("api_tokens")
    op.drop_table("data_classifications")
    op.drop_table("audit_events")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("workspaces")
    op.drop_table("users")
    op.drop_table("tenants")
