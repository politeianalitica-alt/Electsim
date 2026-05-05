"""
Migration 0056 — Gotham Core Tables.

Tablas para: user_profiles, teams, actor_graph, notifications, integrations.
Expand-only migration — solo añade tablas nuevas.
"""
from alembic import op
from sqlalchemy import text

revision = "0056"
down_revision = "0055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id VARCHAR PRIMARY KEY,
            email VARCHAR UNIQUE,
            full_name VARCHAR,
            role VARCHAR,
            tenant_id VARCHAR,
            workspace_ids JSONB,
            preferences JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS user_teams (
            id VARCHAR PRIMARY KEY,
            workspace_id VARCHAR,
            tenant_id VARCHAR,
            name VARCHAR,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))

    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_user_teams_workspace
        ON user_teams(workspace_id, tenant_id)
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS team_members (
            id VARCHAR PRIMARY KEY,
            team_id VARCHAR REFERENCES user_teams(id),
            user_email VARCHAR,
            user_name VARCHAR,
            team_role VARCHAR,
            workspace_id VARCHAR,
            tenant_id VARCHAR,
            joined_at TIMESTAMP DEFAULT NOW(),
            last_active TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS political_actors (
            id VARCHAR PRIMARY KEY,
            name VARCHAR,
            aliases JSONB DEFAULT '[]',
            actor_type VARCHAR,
            party_affiliation VARCHAR,
            status VARCHAR DEFAULT 'active',
            attributes JSONB DEFAULT '[]',
            tags JSONB DEFAULT '[]',
            influence_score FLOAT DEFAULT 0.5,
            risk_score FLOAT DEFAULT 0.0,
            sentiment_score FLOAT DEFAULT 0.0,
            media_presence FLOAT DEFAULT 0.0,
            description TEXT DEFAULT '',
            tenant_id VARCHAR,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS actor_relationships (
            id VARCHAR PRIMARY KEY,
            from_actor_id VARCHAR,
            to_actor_id VARCHAR,
            relationship_type VARCHAR,
            weight FLOAT DEFAULT 1.0,
            evidence TEXT DEFAULT '',
            since TIMESTAMP,
            active BOOLEAN DEFAULT TRUE,
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS actor_events (
            id VARCHAR PRIMARY KEY,
            actor_id VARCHAR,
            event_type VARCHAR,
            description TEXT,
            date TIMESTAMP,
            source VARCHAR DEFAULT '',
            impact_score FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS intel_alerts (
            id VARCHAR PRIMARY KEY,
            title VARCHAR,
            body TEXT,
            level VARCHAR,
            category VARCHAR,
            source VARCHAR,
            tenant_id VARCHAR,
            workspace_id VARCHAR DEFAULT 'default',
            created_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP,
            escalated BOOLEAN DEFAULT FALSE,
            tags JSONB DEFAULT '[]',
            action_required BOOLEAN DEFAULT FALSE,
            action_text TEXT DEFAULT '',
            related_entity VARCHAR DEFAULT ''
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS user_notifications (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR,
            notification_type VARCHAR,
            priority VARCHAR DEFAULT 'normal',
            title VARCHAR,
            body TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP,
            action_url VARCHAR DEFAULT '',
            action_label VARCHAR DEFAULT '',
            metadata JSONB DEFAULT '{}'
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS integration_sync_log (
            id VARCHAR PRIMARY KEY,
            integration_id VARCHAR,
            tenant_id VARCHAR,
            synced_at TIMESTAMP DEFAULT NOW(),
            documents_synced INTEGER DEFAULT 0,
            status VARCHAR,
            error_message TEXT DEFAULT '',
            duration_ms INTEGER DEFAULT 0
        )
    """))

    op.execute(text("""
        CREATE TABLE IF NOT EXISTS workspace_issues_v2 (
            id VARCHAR PRIMARY KEY,
            workspace_id VARCHAR,
            tenant_id VARCHAR,
            title VARCHAR,
            description TEXT,
            priority VARCHAR,
            status VARCHAR DEFAULT 'open',
            category VARCHAR,
            assigned_to VARCHAR DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP
        )
    """))

    # Indexes
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_intel_alerts_tenant
        ON intel_alerts(tenant_id, created_at DESC)
    """))

    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_user_notifications_user
        ON user_notifications(user_id, created_at DESC)
    """))

    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_actor_relationships_from
        ON actor_relationships(from_actor_id)
    """))

    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_workspace_issues_workspace
        ON workspace_issues_v2(workspace_id, tenant_id)
    """))


def downgrade() -> None:
    op.execute(text("DROP TABLE IF EXISTS workspace_issues_v2"))
    op.execute(text("DROP TABLE IF EXISTS integration_sync_log"))
    op.execute(text("DROP TABLE IF EXISTS user_notifications"))
    op.execute(text("DROP TABLE IF EXISTS intel_alerts"))
    op.execute(text("DROP TABLE IF EXISTS actor_events"))
    op.execute(text("DROP TABLE IF EXISTS actor_relationships"))
    op.execute(text("DROP TABLE IF EXISTS political_actors"))
    op.execute(text("DROP TABLE IF EXISTS team_members"))
    op.execute(text("DROP TABLE IF EXISTS user_teams"))
    op.execute(text("DROP TABLE IF EXISTS user_profiles"))
