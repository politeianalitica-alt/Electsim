"""0051 — Geopolitics Core tables.

Revision ID: 0051
Revises: 0050
Create Date: 2026-05-05

5 tablas:
  geo_events         — eventos ACLED/GDELT/UCDP normalizados
  geo_country_risk   — perfiles de riesgo país
  geo_alerts         — alertas geopolíticas estratégicas
  geo_briefings      — briefings estructurados
  geo_domestic_impact — impactos domésticos en España
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── geo_events ───────────────────────────────────────────────────────────
    op.create_table(
        "geo_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Text(), nullable=False, unique=True),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("event_subtype", sa.Text(), nullable=True),
        sa.Column("country", sa.Text(), nullable=False),
        sa.Column("country_iso3", sa.Text(), nullable=True),
        sa.Column("region", sa.Text(), nullable=True),
        sa.Column("location_name", sa.Text(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("actor_1", sa.Text(), nullable=True),
        sa.Column("actor_2", sa.Text(), nullable=True),
        sa.Column("fatalities", sa.Integer(), nullable=True),
        sa.Column("severity", sa.Text(), nullable=False, server_default="LOW"),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_geo_events_country_iso3", "geo_events", ["country_iso3"])
    op.create_index("ix_geo_events_event_date", "geo_events", ["event_date"])
    op.create_index("ix_geo_events_severity", "geo_events", ["severity"])
    op.create_index(
        "ix_geo_events_raw_gin", "geo_events", ["raw_payload"],
        postgresql_using="gin",
    )

    # ── geo_country_risk ─────────────────────────────────────────────────────
    op.create_table(
        "geo_country_risk",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("country_iso3", sa.Text(), nullable=False),
        sa.Column("country_name", sa.Text(), nullable=False),
        sa.Column("risk_date", sa.Date(), nullable=False),
        sa.Column("conflict_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("political_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("economic_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("energy_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("migration_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("defense_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reputation_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("trend", sa.Text(), nullable=False, server_default="stable"),
        sa.Column("interest_for_spain", sa.Float(), nullable=False, server_default="0"),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("country_iso3", "risk_date", name="uq_geo_country_risk_iso3_date"),
    )
    op.create_index("ix_geo_country_risk_iso3", "geo_country_risk", ["country_iso3"])
    op.create_index("ix_geo_country_risk_score", "geo_country_risk", ["total_score"])

    # ── geo_alerts ───────────────────────────────────────────────────────────
    op.create_table(
        "geo_alerts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("alert_id", sa.Text(), nullable=False, unique=True),
        sa.Column("alert_type", sa.Text(), nullable=False),
        sa.Column("country_iso3", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.Text(), nullable=False, server_default="MEDIUM"),
        sa.Column("affected_modules", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("evidence", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_geo_alerts_country_iso3", "geo_alerts", ["country_iso3"])
    op.create_index("ix_geo_alerts_severity", "geo_alerts", ["severity"])
    op.create_index("ix_geo_alerts_created_at", "geo_alerts", ["created_at"])

    # ── geo_briefings ─────────────────────────────────────────────────────────
    op.create_table(
        "geo_briefings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("briefing_id", sa.Text(), nullable=False, unique=True),
        sa.Column("country_iso3", sa.Text(), nullable=True),
        sa.Column("region", sa.Text(), nullable=True),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("situacion", sa.Text(), nullable=True),
        sa.Column("eventos_clave", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("impacto_espana", sa.Text(), nullable=True),
        sa.Column("riesgos", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("escenarios", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("recomendaciones", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("fuentes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_geo_briefings_country_iso3", "geo_briefings", ["country_iso3"])
    op.create_index("ix_geo_briefings_fecha", "geo_briefings", ["fecha"])

    # ── geo_domestic_impact ───────────────────────────────────────────────────
    op.create_table(
        "geo_domestic_impact",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("impact_id", sa.Text(), nullable=False, unique=True),
        sa.Column("country_iso3", sa.Text(), nullable=True),
        sa.Column("event_id", sa.Text(), nullable=True),
        sa.Column("signal_id", sa.Text(), nullable=True),
        sa.Column("impact_domain", sa.Text(), nullable=False),
        sa.Column("affected_sector", sa.Text(), nullable=True),
        sa.Column("affected_actor", sa.Text(), nullable=True),
        sa.Column("affected_territory", sa.Text(), nullable=True),
        sa.Column("impact_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("severity", sa.Text(), nullable=False, server_default="LOW"),
        sa.Column("time_horizon", sa.Text(), nullable=False, server_default="short_term"),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_geo_domestic_impact_country", "geo_domestic_impact", ["country_iso3"])
    op.create_index("ix_geo_domestic_impact_domain", "geo_domestic_impact", ["impact_domain"])
    op.create_index("ix_geo_domestic_impact_severity", "geo_domestic_impact", ["severity"])


def downgrade() -> None:
    op.drop_table("geo_domestic_impact")
    op.drop_table("geo_briefings")
    op.drop_table("geo_alerts")
    op.drop_table("geo_country_risk")
    op.drop_table("geo_events")
