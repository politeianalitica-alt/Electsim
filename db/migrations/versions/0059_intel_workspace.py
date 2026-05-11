"""Add intelligence workspace tables — notebooks, canvas, evidence, sources, drafts, watchlists, team, hypotheses, signals.

Revision ID: 0059_intel_workspace
Revises: 0058
Create Date: 2026-05-11

Diseño:
  Cada tabla está pensada para ser CRUD-friendly desde el frontend visual-oscar.
  Los campos `data` (JSONB) permiten extender sin migración cuando la UI evoluciona.
  Todas tienen tenant_id+workspace_id para soporte multitenant.
"""

from alembic import op

revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        -- Notebooks (cuadernos analíticos)
        CREATE TABLE IF NOT EXISTS intel_notebook (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            title           VARCHAR(300) NOT NULL,
            description     TEXT,
            tags            JSONB DEFAULT '[]',
            owner_id        VARCHAR(64),
            status          VARCHAR(20) DEFAULT 'draft',  -- draft / active / archived
            pinned          BOOLEAN DEFAULT FALSE,
            data            JSONB DEFAULT '{}',  -- campos libres
            created_at      TIMESTAMPTZ DEFAULT now(),
            updated_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_notebook_workspace ON intel_notebook(workspace_id, updated_at DESC);

        -- Bloques dentro de un notebook (texto, evidencia, gráfico, etc.)
        CREATE TABLE IF NOT EXISTS intel_notebook_block (
            id              VARCHAR PRIMARY KEY,
            notebook_id     VARCHAR NOT NULL REFERENCES intel_notebook(id) ON DELETE CASCADE,
            position        INTEGER DEFAULT 0,
            block_type      VARCHAR(40) NOT NULL,  -- text / evidence / chart / actor / law / metric
            content         TEXT,
            data            JSONB DEFAULT '{}',
            created_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_notebook_block_nb ON intel_notebook_block(notebook_id, position);

        -- Canvas items (lienzo libre, posicionables, conexiones)
        CREATE TABLE IF NOT EXISTS intel_canvas (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            title           VARCHAR(300) NOT NULL,
            description     TEXT,
            nodes           JSONB DEFAULT '[]',
            edges           JSONB DEFAULT '[]',
            data            JSONB DEFAULT '{}',
            owner_id        VARCHAR(64),
            created_at      TIMESTAMPTZ DEFAULT now(),
            updated_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_canvas_workspace ON intel_canvas(workspace_id, updated_at DESC);

        -- Evidencias (artefactos de soporte: PDFs, capturas, citas)
        CREATE TABLE IF NOT EXISTS intel_evidence (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            title           VARCHAR(500) NOT NULL,
            summary         TEXT,
            url             TEXT,
            source          VARCHAR(200),
            evidence_type   VARCHAR(40),  -- article / pdf / image / quote / link
            relevance       REAL DEFAULT 0.5,
            tags            JSONB DEFAULT '[]',
            data            JSONB DEFAULT '{}',
            captured_at     TIMESTAMPTZ DEFAULT now(),
            created_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_evidence_workspace ON intel_evidence(workspace_id, captured_at DESC);

        -- Fuentes (catálogo de feeds y orígenes vigilados)
        CREATE TABLE IF NOT EXISTS intel_source (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            name            VARCHAR(200) NOT NULL,
            url             TEXT,
            kind            VARCHAR(40),  -- rss / api / scrape / manual
            sector          VARCHAR(60),
            trust_score     REAL DEFAULT 0.5,
            active          BOOLEAN DEFAULT TRUE,
            tags            JSONB DEFAULT '[]',
            data            JSONB DEFAULT '{}',
            last_seen_at    TIMESTAMPTZ,
            created_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_source_workspace ON intel_source(workspace_id, active);

        -- Drafts (borradores de comms / notas internas / memos)
        CREATE TABLE IF NOT EXISTS intel_draft (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            title           VARCHAR(300) NOT NULL,
            kind            VARCHAR(40),  -- memo / note / press / op-ed / brief
            audience        VARCHAR(80),
            status          VARCHAR(20) DEFAULT 'draft',  -- draft / review / approved / published
            body            TEXT,
            evidence_ids    JSONB DEFAULT '[]',
            data            JSONB DEFAULT '{}',
            owner_id        VARCHAR(64),
            created_at      TIMESTAMPTZ DEFAULT now(),
            updated_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_draft_workspace ON intel_draft(workspace_id, updated_at DESC);

        -- Watchlists (listas temáticas que se monitorizan)
        CREATE TABLE IF NOT EXISTS intel_watchlist (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            name            VARCHAR(200) NOT NULL,
            description     TEXT,
            members         JSONB DEFAULT '[]',  -- [{type, id, label}]
            rules           JSONB DEFAULT '{}',   -- reglas de alerta
            severity        VARCHAR(20) DEFAULT 'medium',
            active          BOOLEAN DEFAULT TRUE,
            data            JSONB DEFAULT '{}',
            created_at      TIMESTAMPTZ DEFAULT now(),
            updated_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_watchlist_workspace ON intel_watchlist(workspace_id, active);

        -- Hypotheses (hipótesis con estado de verificación)
        CREATE TABLE IF NOT EXISTS intel_hypothesis (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            claim           TEXT NOT NULL,
            confidence      REAL DEFAULT 0.5,
            status          VARCHAR(20) DEFAULT 'open',  -- open / supported / refuted / abandoned
            evidence_ids    JSONB DEFAULT '[]',
            counter_ids     JSONB DEFAULT '[]',
            tags            JSONB DEFAULT '[]',
            data            JSONB DEFAULT '{}',
            owner_id        VARCHAR(64),
            created_at      TIMESTAMPTZ DEFAULT now(),
            updated_at      TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_hypothesis_workspace ON intel_hypothesis(workspace_id, status);

        -- Team members del workspace
        CREATE TABLE IF NOT EXISTS intel_team_member (
            id              VARCHAR PRIMARY KEY,
            tenant_id       VARCHAR(64),
            workspace_id    VARCHAR(64) DEFAULT 'default',
            name            VARCHAR(200) NOT NULL,
            email           VARCHAR(200),
            role            VARCHAR(60),
            avatar_url      TEXT,
            permissions     JSONB DEFAULT '[]',
            active          BOOLEAN DEFAULT TRUE,
            data            JSONB DEFAULT '{}',
            joined_at       TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_intel_team_workspace ON intel_team_member(workspace_id, active);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS intel_team_member;
        DROP TABLE IF EXISTS intel_hypothesis;
        DROP TABLE IF EXISTS intel_watchlist;
        DROP TABLE IF EXISTS intel_draft;
        DROP TABLE IF EXISTS intel_source;
        DROP TABLE IF EXISTS intel_evidence;
        DROP TABLE IF EXISTS intel_canvas;
        DROP TABLE IF EXISTS intel_notebook_block;
        DROP TABLE IF EXISTS intel_notebook;
        """
    )
