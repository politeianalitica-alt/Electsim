"""
Migration 0043 — Electoral Core

Crea las tablas del módulo Electoral & Campaign Intelligence (Bloque 6):

  elections              — metadatos de elecciones
  parties                — partidos políticos
  election_results       — resultados por partido/circunscripción
  polls                  — encuestas electorales
  poll_estimates         — estimaciones por partido en cada encuesta
  nowcast_snapshots      — snapshots del nowcasting
  coalition_scenarios    — escenarios de coalición
  voter_segments         — segmentos de votante
  soft_vote_estimates    — estimaciones de voto blando
  party_manifestos       — programas electorales
  campaign_messages      — mensajes de campaña
  campaign_simulations   — simulaciones de campaña

Todas las tablas incluyen RLS (row-level security) con política tenant_isolation_*.
"""

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# ─────────────────────────────────────────────────────────────────────────────


def upgrade() -> None:

    # ── elections ─────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS elections (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            source          TEXT    NOT NULL DEFAULT 'manual',
            election_id     TEXT    NOT NULL,
            country         TEXT    NOT NULL DEFAULT 'ES',
            election_type   TEXT    NOT NULL,
            election_date   DATE    NOT NULL,
            name            TEXT    NOT NULL,
            geography       TEXT,
            legislature     TEXT,
            total_seats     INTEGER,
            majority_threshold INTEGER,
            turnout         FLOAT,
            census_size     INTEGER,
            status          TEXT    NOT NULL DEFAULT 'past',
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, election_id)
        );
        ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_elections ON elections;
        CREATE POLICY tenant_isolation_elections ON elections
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── parties ───────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS parties (
            id              SERIAL PRIMARY KEY,
            party_id        TEXT    NOT NULL UNIQUE,
            name            TEXT    NOT NULL,
            siglas          TEXT    NOT NULL,
            ideology_score  FLOAT,
            family          TEXT,
            color           TEXT,
            aliases         JSONB   NOT NULL DEFAULT '[]',
            active          BOOLEAN NOT NULL DEFAULT TRUE,
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ── election_results ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS election_results (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            election_id     TEXT    NOT NULL,
            geography_id    TEXT    NOT NULL,
            geography_type  TEXT    NOT NULL DEFAULT 'province',
            party_id        TEXT    NOT NULL,
            votes           INTEGER,
            vote_share      FLOAT,
            seats           INTEGER,
            seats_share     FLOAT,
            turnout         FLOAT,
            abstention      FLOAT,
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, election_id, geography_id, party_id)
        );
        CREATE INDEX IF NOT EXISTS idx_election_results_election
            ON election_results (election_id);
        CREATE INDEX IF NOT EXISTS idx_election_results_party
            ON election_results (party_id);
        ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_election_results ON election_results;
        CREATE POLICY tenant_isolation_election_results ON election_results
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── polls ─────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS polls (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            source          TEXT    NOT NULL DEFAULT 'manual',
            poll_id         TEXT    NOT NULL,
            pollster        TEXT    NOT NULL,
            fieldwork_start DATE,
            fieldwork_end   DATE,
            publication_date DATE   NOT NULL,
            geography       TEXT    NOT NULL DEFAULT 'ES',
            sample_size     INTEGER,
            methodology     TEXT,
            client          TEXT,
            raw_url         TEXT,
            quality_score   FLOAT,
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, poll_id)
        );
        CREATE INDEX IF NOT EXISTS idx_polls_publication_date
            ON polls (publication_date DESC);
        CREATE INDEX IF NOT EXISTS idx_polls_geography
            ON polls (geography);
        ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_polls ON polls;
        CREATE POLICY tenant_isolation_polls ON polls
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── poll_estimates ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS poll_estimates (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            poll_id         TEXT    NOT NULL,
            party_id        TEXT    NOT NULL,
            vote_share      FLOAT   NOT NULL,
            lower_bound     FLOAT,
            upper_bound     FLOAT,
            seats_estimate  INTEGER,
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, poll_id, party_id)
        );
        CREATE INDEX IF NOT EXISTS idx_poll_estimates_poll_id
            ON poll_estimates (poll_id);
        ALTER TABLE poll_estimates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_poll_estimates ON poll_estimates;
        CREATE POLICY tenant_isolation_poll_estimates ON poll_estimates
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── nowcast_snapshots ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS nowcast_snapshots (
            id                  SERIAL PRIMARY KEY,
            tenant_id           UUID    NOT NULL,
            snapshot_date       TIMESTAMPTZ NOT NULL,
            model_name          TEXT    NOT NULL,
            model_version       TEXT    NOT NULL DEFAULT '1.0',
            geography           TEXT    NOT NULL DEFAULT 'ES',
            party_estimates     JSONB   NOT NULL DEFAULT '{}',
            seat_estimates      JSONB   NOT NULL DEFAULT '{}',
            uncertainty         JSONB   NOT NULL DEFAULT '{}',
            leading_party       TEXT,
            majority_probability JSONB  NOT NULL DEFAULT '{}',
            inputs_summary      JSONB   NOT NULL DEFAULT '{}',
            raw_payload         JSONB   NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_nowcast_snapshots_date
            ON nowcast_snapshots (snapshot_date DESC);
        CREATE INDEX IF NOT EXISTS idx_nowcast_snapshots_geography
            ON nowcast_snapshots (geography);
        ALTER TABLE nowcast_snapshots ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_nowcast ON nowcast_snapshots;
        CREATE POLICY tenant_isolation_nowcast ON nowcast_snapshots
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── coalition_scenarios ───────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS coalition_scenarios (
            id                        SERIAL PRIMARY KEY,
            tenant_id                 UUID   NOT NULL,
            snapshot_id               INTEGER,
            name                      TEXT   NOT NULL,
            parties                   JSONB  NOT NULL DEFAULT '[]',
            seats_total               INTEGER NOT NULL DEFAULT 0,
            has_majority              BOOLEAN NOT NULL DEFAULT FALSE,
            majority_margin           INTEGER NOT NULL DEFAULT 0,
            ideological_compatibility FLOAT,
            historical_plausibility   FLOAT,
            negotiation_complexity    FLOAT,
            probability               FLOAT,
            scenario_type             TEXT   NOT NULL DEFAULT 'government',
            explanation               TEXT,
            created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_coalition_scenarios_snapshot
            ON coalition_scenarios (snapshot_id);
        ALTER TABLE coalition_scenarios ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_coalitions ON coalition_scenarios;
        CREATE POLICY tenant_isolation_coalitions ON coalition_scenarios
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── voter_segments ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS voter_segments (
            id                  SERIAL PRIMARY KEY,
            segment_id          TEXT    NOT NULL UNIQUE,
            label               TEXT    NOT NULL,
            ideology_mean       FLOAT,
            age_group           TEXT,
            geography           TEXT,
            income_group        TEXT,
            education_group     TEXT,
            top_concerns        JSONB   NOT NULL DEFAULT '[]',
            party_preference    JSONB   NOT NULL DEFAULT '{}',
            persuadability      FLOAT   NOT NULL DEFAULT 0.5,
            turnout_probability FLOAT   NOT NULL DEFAULT 0.65,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ── soft_vote_estimates ───────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS soft_vote_estimates (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            estimate_date   DATE    NOT NULL,
            party_id        TEXT    NOT NULL,
            geography       TEXT    NOT NULL DEFAULT 'ES',
            decided_pct     FLOAT,
            soft_pct        FLOAT,
            switchable_to   JSONB   NOT NULL DEFAULT '{}',
            source          TEXT    NOT NULL DEFAULT 'nowcast_model',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, estimate_date, party_id, geography)
        );
        CREATE INDEX IF NOT EXISTS idx_soft_vote_date
            ON soft_vote_estimates (estimate_date DESC);
        ALTER TABLE soft_vote_estimates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_soft_vote ON soft_vote_estimates;
        CREATE POLICY tenant_isolation_soft_vote ON soft_vote_estimates
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── party_manifestos ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS party_manifestos (
            id              SERIAL PRIMARY KEY,
            tenant_id       UUID    NOT NULL,
            manifesto_id    TEXT    NOT NULL,
            party_id        TEXT    NOT NULL,
            election_id     TEXT,
            title           TEXT    NOT NULL,
            text            TEXT    NOT NULL DEFAULT '',
            source_url      TEXT,
            topics          JSONB   NOT NULL DEFAULT '[]',
            policy_positions JSONB  NOT NULL DEFAULT '{}',
            promises        JSONB   NOT NULL DEFAULT '[]',
            ideology_estimate FLOAT,
            raw_payload     JSONB   NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, manifesto_id)
        );
        ALTER TABLE party_manifestos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_manifestos ON party_manifestos;
        CREATE POLICY tenant_isolation_manifestos ON party_manifestos
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── campaign_messages ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS campaign_messages (
            id                  SERIAL PRIMARY KEY,
            tenant_id           UUID   NOT NULL,
            message_id          TEXT   NOT NULL,
            party_id            TEXT,
            theme               TEXT   NOT NULL,
            frame               TEXT   NOT NULL DEFAULT '',
            target_segment      TEXT,
            target_geography    TEXT,
            text                TEXT,
            source              TEXT   NOT NULL DEFAULT 'manual',
            expected_effect     JSONB  NOT NULL DEFAULT '{}',
            risk_flags          JSONB  NOT NULL DEFAULT '[]',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, message_id)
        );
        CREATE INDEX IF NOT EXISTS idx_campaign_messages_party
            ON campaign_messages (party_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_messages_theme
            ON campaign_messages (theme);
        ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_campaign_msg ON campaign_messages;
        CREATE POLICY tenant_isolation_campaign_msg ON campaign_messages
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)

    # ── campaign_simulations ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS campaign_simulations (
            id                    SERIAL PRIMARY KEY,
            tenant_id             UUID   NOT NULL,
            simulation_id         TEXT   NOT NULL,
            message_id            TEXT   NOT NULL,
            party_id              TEXT   NOT NULL,
            geography             TEXT,
            week_of_campaign      INTEGER NOT NULL DEFAULT 1,
            saturation_count      INTEGER NOT NULL DEFAULT 1,
            expected_vote_shift   JSONB  NOT NULL DEFAULT '{}',
            expected_seat_shift   JSONB  NOT NULL DEFAULT '{}',
            affected_segments     JSONB  NOT NULL DEFAULT '[]',
            transfer_flows        JSONB  NOT NULL DEFAULT '[]',
            confidence            FLOAT  NOT NULL DEFAULT 0.5,
            narrative             TEXT   NOT NULL DEFAULT '',
            created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, simulation_id)
        );
        CREATE INDEX IF NOT EXISTS idx_campaign_sim_party
            ON campaign_simulations (party_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_sim_created
            ON campaign_simulations (created_at DESC);
        ALTER TABLE campaign_simulations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_campaign_sim ON campaign_simulations;
        CREATE POLICY tenant_isolation_campaign_sim ON campaign_simulations
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    """)


def downgrade() -> None:
    tables = [
        "campaign_simulations",
        "campaign_messages",
        "party_manifestos",
        "soft_vote_estimates",
        "voter_segments",
        "coalition_scenarios",
        "nowcast_snapshots",
        "poll_estimates",
        "polls",
        "election_results",
        "parties",
        "elections",
    ]
    for table in tables:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
