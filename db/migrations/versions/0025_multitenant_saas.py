"""Bloque 5 — Multi-tenant SaaS: organisaciones, workspaces, roles y RLS.

Crea:
  organisation        — tenant raiz (consultora / partido / empresa)
  plan                — planes de suscripcion (starter, pro, enterprise)
  subscription        — vinculacion org <-> plan activo
  user_account        — cuenta de usuario referenciada al sub del JWT
  role                — roles de plataforma (5 niveles)
  workspace           — espacio de trabajo dentro de una org
  organisation_member — usuario <-> org con rol
  workspace_member    — usuario <-> workspace con rol

Altera:
  risk_snapshots, intelligence_briefings, impact_assessments,
  narrative_clusters, alertas_sistema
  -> ADD COLUMN organisation_id UUID, workspace_id UUID

Activa RLS y crea policies sobre todas las tablas de negocio scopeadas.

Revision ID: 0025_multitenant_saas
Revises: 0024_intelligence_layer
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0025_multitenant_saas"
down_revision: Union[str, None] = "0024_intelligence_layer"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return conn.dialect.has_table(conn, name)


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # organisation
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS organisation (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name        TEXT        NOT NULL,
            slug        TEXT        NOT NULL UNIQUE,
            market_code TEXT        NOT NULL DEFAULT 'spain',
            plan_id     UUID,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            is_active   BOOLEAN     NOT NULL DEFAULT TRUE
        )
    """)

    # -----------------------------------------------------------------------
    # plan
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS plan (
            id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
            code                TEXT    NOT NULL UNIQUE,
            name                TEXT    NOT NULL,
            description         TEXT,
            max_users           INTEGER,
            max_workspaces      INTEGER,
            max_alerts_per_day  INTEGER,
            is_default          BOOLEAN NOT NULL DEFAULT FALSE,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # Seed planes
    op.execute("""
        INSERT INTO plan (code, name, description, max_users, max_workspaces, max_alerts_per_day, is_default)
        VALUES
          ('starter',    'Starter',    'Plan de entrada para equipos pequenos',    3,  2,  50,  FALSE),
          ('pro',        'Pro',        'Plan profesional para consultoras',        10, 10, 500, TRUE),
          ('enterprise', 'Enterprise', 'Sin limites para grandes organizaciones',  NULL, NULL, NULL, FALSE)
        ON CONFLICT (code) DO NOTHING
    """)

    # -----------------------------------------------------------------------
    # subscription
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS subscription (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            organisation_id UUID        NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            plan_id         UUID        NOT NULL REFERENCES plan(id),
            starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            ends_at         TIMESTAMPTZ,
            is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_subscription_org_active
            ON subscription (organisation_id, is_active)
    """)

    # -----------------------------------------------------------------------
    # user_account
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_account (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_subject TEXT NOT NULL UNIQUE,
            email        TEXT NOT NULL,
            full_name    TEXT,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # -----------------------------------------------------------------------
    # role
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS role (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code        TEXT NOT NULL UNIQUE,
            name        TEXT NOT NULL,
            description TEXT
        )
    """)

    op.execute("""
        INSERT INTO role (code, name, description) VALUES
          ('SUPERADMIN',      'SuperAdmin plataforma',  'Admin global de ElectSim'),
          ('ORG_ADMIN',       'Admin organizacion',     'Admin de una consultora o cliente'),
          ('ANALYST_SENIOR',  'Analista Senior',        'Configura alertas, productos, supervisa'),
          ('ANALYST_JUNIOR',  'Analista Junior',        'Ejecuta analisis, usa herramientas'),
          ('CLIENT_VIEW',     'Cliente Solo Lectura',   'Visualiza dashboards y briefings')
        ON CONFLICT (code) DO NOTHING
    """)

    # -----------------------------------------------------------------------
    # workspace
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace (
            id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
            organisation_id UUID    NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            name            TEXT    NOT NULL,
            client_profile  JSONB   NOT NULL DEFAULT '{}'::jsonb,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            is_active       BOOLEAN NOT NULL DEFAULT TRUE
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_workspace_org
            ON workspace (organisation_id)
    """)

    # -----------------------------------------------------------------------
    # organisation_member
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS organisation_member (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organisation_id UUID NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
            user_id         UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
            role_id         UUID NOT NULL REFERENCES role(id),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (organisation_id, user_id)
        )
    """)

    # -----------------------------------------------------------------------
    # workspace_member
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace_member (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
            user_id      UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
            role_id      UUID NOT NULL REFERENCES role(id),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (workspace_id, user_id)
        )
    """)

    # -----------------------------------------------------------------------
    # Anadir organisation_id + workspace_id a tablas de negocio existentes
    # -----------------------------------------------------------------------
    _tenant_columns = [
        "risk_snapshots",
        "intelligence_briefings",
        "impact_assessments",
        "narrative_clusters",
        "alertas_sistema",
    ]

    for table in _tenant_columns:
        if not _table_exists(table):
            continue
        if not _column_exists(table, "organisation_id"):
            op.execute(f"ALTER TABLE {table} ADD COLUMN organisation_id UUID")
        if not _column_exists(table, "workspace_id"):
            op.execute(f"ALTER TABLE {table} ADD COLUMN workspace_id UUID")
        op.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{table}_tenancy
                ON {table} (organisation_id, workspace_id)
        """)

    # -----------------------------------------------------------------------
    # RLS — activar y crear policies
    # -----------------------------------------------------------------------
    _rls_tables = [
        "workspace",
        "organisation_member",
        "workspace_member",
        "risk_snapshots",
        "intelligence_briefings",
        "impact_assessments",
        "narrative_clusters",
        "alertas_sistema",
    ]

    for table in _rls_tables:
        if not _table_exists(table):
            continue
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    # Policy para workspace (filtra por org)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'workspace'
                  AND policyname = 'workspace_org_isolation'
            ) THEN
                CREATE POLICY workspace_org_isolation ON workspace
                USING (
                    organisation_id::text =
                        coalesce(current_setting('app.current_org_id', true), '')
                );
            END IF;
        END$$
    """)

    # Policy para organisation_member
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'organisation_member'
                  AND policyname = 'org_member_isolation'
            ) THEN
                CREATE POLICY org_member_isolation ON organisation_member
                USING (
                    organisation_id::text =
                        coalesce(current_setting('app.current_org_id', true), '')
                );
            END IF;
        END$$
    """)

    # Policy para workspace_member
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'workspace_member'
                  AND policyname = 'workspace_member_isolation'
            ) THEN
                CREATE POLICY workspace_member_isolation ON workspace_member
                USING (
                    workspace_id IN (
                        SELECT w.id FROM workspace w
                        WHERE w.organisation_id::text =
                            coalesce(current_setting('app.current_org_id', true), '')
                    )
                );
            END IF;
        END$$
    """)

    # Policy para tablas con organisation_id + workspace_id
    _dual_rls_tables = [
        "risk_snapshots",
        "intelligence_briefings",
        "impact_assessments",
        "narrative_clusters",
        "alertas_sistema",
    ]

    for table in _dual_rls_tables:
        if not _table_exists(table):
            continue
        policy_name = f"{table}_tenant_isolation"
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = '{table}'
                      AND policyname = '{policy_name}'
                ) THEN
                    CREATE POLICY {policy_name} ON {table}
                    USING (
                        (organisation_id IS NULL)
                        OR (
                            organisation_id::text =
                                coalesce(current_setting('app.current_org_id', true), '')
                            AND workspace_id::text =
                                coalesce(current_setting('app.current_workspace_id', true), '')
                        )
                    );
                END IF;
            END$$
        """)


def downgrade() -> None:
    # Eliminar policies
    _policy_tables = [
        ("workspace",           "workspace_org_isolation"),
        ("organisation_member", "org_member_isolation"),
        ("workspace_member",    "workspace_member_isolation"),
        ("risk_snapshots",      "risk_snapshots_tenant_isolation"),
        ("intelligence_briefings", "intelligence_briefings_tenant_isolation"),
        ("impact_assessments",  "impact_assessments_tenant_isolation"),
        ("narrative_clusters",  "narrative_clusters_tenant_isolation"),
        ("alertas_sistema",     "alertas_sistema_tenant_isolation"),
    ]
    for table, policy in _policy_tables:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")

    for table in [
        "workspace_member", "organisation_member", "workspace",
        "subscription", "user_account", "role", "organisation", "plan",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
