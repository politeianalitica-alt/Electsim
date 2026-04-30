"""Bloque 6 — Product & Module Config: tablas de modulos, alertas y saved searches por workspace.

Crea:
  workspace_module        — modulos activos por workspace (source of truth para flags)
  workspace_alert_config  — alertas preconfiguradas por workspace (de producto/DLC)
  workspace_saved_search  — saved searches / watchlists por workspace

Revision ID: 0026_workspace_modules
Revises: 0025_multitenant_saas
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0026_workspace_modules"
down_revision: Union[str, None] = "0025_multitenant_saas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # workspace_module — un modulo activo por workspace
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace_module (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            organisation_id UUID        NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            workspace_id    UUID        NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
            module_code     TEXT        NOT NULL,
            enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
            source_product  TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_module_unique
            ON workspace_module (workspace_id, module_code)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_workspace_module_org
            ON workspace_module (organisation_id, enabled)
    """)

    # -----------------------------------------------------------------------
    # workspace_alert_config — plantillas de alerta activas por workspace
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace_alert_config (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id    UUID        NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
            organisation_id UUID        NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            alert_code      TEXT        NOT NULL,
            alert_name      TEXT        NOT NULL,
            enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
            level           TEXT        NOT NULL DEFAULT 'medium',
            channels        JSONB       NOT NULL DEFAULT '[]'::jsonb,
            conditions      JSONB       NOT NULL DEFAULT '{}'::jsonb,
            source_product  TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_alert_config_unique
            ON workspace_alert_config (workspace_id, alert_code)
    """)

    # -----------------------------------------------------------------------
    # workspace_saved_search — saved searches y watchlists por workspace
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace_saved_search (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id    UUID        NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
            organisation_id UUID        NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            search_code     TEXT        NOT NULL,
            search_name     TEXT        NOT NULL,
            search_type     TEXT        NOT NULL DEFAULT 'search',
            semantic_query  TEXT,
            watchlist_config JSONB      NOT NULL DEFAULT '[]'::jsonb,
            source_product  TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_saved_search_unique
            ON workspace_saved_search (workspace_id, search_code)
    """)

    # -----------------------------------------------------------------------
    # RLS sobre las nuevas tablas
    # -----------------------------------------------------------------------
    for table in ("workspace_module", "workspace_alert_config", "workspace_saved_search"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'workspace_module'
                  AND policyname = 'workspace_module_tenant_isolation'
            ) THEN
                CREATE POLICY workspace_module_tenant_isolation ON workspace_module
                USING (
                    organisation_id::text =
                        coalesce(current_setting('app.current_org_id', true), '')
                    AND workspace_id::text =
                        coalesce(current_setting('app.current_workspace_id', true), '')
                );
            END IF;
        END$$
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'workspace_alert_config'
                  AND policyname = 'workspace_alert_config_tenant_isolation'
            ) THEN
                CREATE POLICY workspace_alert_config_tenant_isolation ON workspace_alert_config
                USING (
                    organisation_id::text =
                        coalesce(current_setting('app.current_org_id', true), '')
                    AND workspace_id::text =
                        coalesce(current_setting('app.current_workspace_id', true), '')
                );
            END IF;
        END$$
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'workspace_saved_search'
                  AND policyname = 'workspace_saved_search_tenant_isolation'
            ) THEN
                CREATE POLICY workspace_saved_search_tenant_isolation ON workspace_saved_search
                USING (
                    organisation_id::text =
                        coalesce(current_setting('app.current_org_id', true), '')
                    AND workspace_id::text =
                        coalesce(current_setting('app.current_workspace_id', true), '')
                );
            END IF;
        END$$
    """)


def downgrade() -> None:
    for table in ("workspace_saved_search", "workspace_alert_config", "workspace_module"):
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
