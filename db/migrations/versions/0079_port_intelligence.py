"""ports + vessel_positions + port_call_events + trade_flows · Módulo Puertos P1

Inteligencia de comercio global: AIS marítimo, congestión portuaria, port calls
y cache de flujos comerciales bilaterales (UN Comtrade + Eurostat Comext).

Tablas:
  - ports                 · catálogo persistente (sincronizado con seed catalog.py)
  - vessel_positions      · time-series AIS por buque
  - port_call_events      · entradas/salidas de buques en puertos
  - trade_flows           · cache bilateral Comtrade/Comext por HS code

Reusa:
  - commodity_alerts (0076-0077) para alertas portuarias (slug='__port_*__')
  - push_subscriptions (0078) para notificaciones

Revision ID: 0079_port_intelligence
Revises: 0078_web_push_subscriptions
"""
from alembic import op
import sqlalchemy as sa


revision = "0079_port_intelligence"
down_revision = "0078_web_push_subscriptions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ports · catálogo persistente ────────────────────────────────
    op.create_table(
        "ports",
        sa.Column("slug", sa.String(length=64), primary_key=True),
        sa.Column("unlocode", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("country_iso", sa.String(length=2), nullable=False),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False,
                  comment="container | bulk | tanker | multipurpose | cruise"),
        sa.Column("region", sa.String(length=30), nullable=False),
        sa.Column("timezone", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("metadata_payload", sa.JSON, nullable=True),
    )
    op.create_index("ix_ports_country", "ports", ["country_iso"])
    op.create_index("ix_ports_type", "ports", ["type"])
    op.create_index("ix_ports_region", "ports", ["region"])

    # ── vessel_positions · time-series AIS ──────────────────────────
    op.create_table(
        "vessel_positions",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("imo", sa.String(length=16), nullable=False,
                  comment="IMO con prefijo (ej. IMO9525338)"),
        sa.Column("mmsi", sa.String(length=12), nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False,
                  comment="Timestamp de la posición AIS reportada"),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("sog", sa.Float, nullable=True,
                  comment="Speed Over Ground · nudos"),
        sa.Column("cog", sa.Float, nullable=True,
                  comment="Course Over Ground · grados (0-360)"),
        sa.Column("heading", sa.Float, nullable=True),
        sa.Column("nav_status", sa.String(length=40), nullable=True,
                  comment="moored | anchored | underway | restricted | etc."),
        sa.Column("draught", sa.Float, nullable=True,
                  comment="Calado · proxy de carga"),
        sa.Column("near_port_slug", sa.String(length=64), nullable=True,
                  comment="Puerto del catálogo a <50nm de la posición"),
        sa.Column("source", sa.String(length=40), nullable=False, server_default="aisstream"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint(
        "uq_vessel_positions_imo_ts", "vessel_positions", ["imo", "ts"]
    )
    op.create_index("ix_vessel_positions_imo_ts", "vessel_positions", ["imo", "ts"])
    op.create_index(
        "ix_vessel_positions_port_ts", "vessel_positions",
        ["near_port_slug", "ts"],
    )

    # ── port_call_events · escalas portuarias ───────────────────────
    op.create_table(
        "port_call_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("port_slug", sa.String(length=64), nullable=False),
        sa.Column("imo", sa.String(length=16), nullable=False),
        sa.Column("arrival_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("departure_ts", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_min", sa.Integer, nullable=True),
        sa.Column("draft_in", sa.Float, nullable=True,
                  comment="Calado al entrar · proxy carga inbound"),
        sa.Column("draft_out", sa.Float, nullable=True,
                  comment="Calado al salir · proxy carga outbound"),
        sa.Column("cargo_inferred", sa.String(length=80), nullable=True,
                  comment="Inferido por tipo de buque y delta calado"),
        sa.Column("source_kind", sa.String(length=40), nullable=False, server_default="ais"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(
        "ix_port_call_events_port_arrival", "port_call_events",
        ["port_slug", "arrival_ts"],
    )
    op.create_index(
        "ix_port_call_events_imo_arrival", "port_call_events",
        ["imo", "arrival_ts"],
    )

    # ── trade_flows · cache bilateral ────────────────────────────────
    op.create_table(
        "trade_flows",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("reporter_iso", sa.String(length=3), nullable=False,
                  comment="ISO-3 alpha-3 del país reportante"),
        sa.Column("partner_iso", sa.String(length=3), nullable=False,
                  comment="ISO-3 alpha-3 del partner"),
        sa.Column("hs_code", sa.String(length=10), nullable=True,
                  comment="HS hasta 8 dígitos · NULL = totales"),
        sa.Column("period_ym", sa.String(length=7), nullable=False,
                  comment="YYYY-MM"),
        sa.Column("flow_kind", sa.String(length=10), nullable=False,
                  comment="export | import | re_export | re_import"),
        sa.Column("value_usd", sa.Float, nullable=True),
        sa.Column("qty", sa.Float, nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=False,
                  comment="comtrade | comext"),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint(
        "uq_trade_flows_natural", "trade_flows",
        ["reporter_iso", "partner_iso", "hs_code", "period_ym", "flow_kind", "source"],
    )
    op.create_index(
        "ix_trade_flows_reporter_period", "trade_flows",
        ["reporter_iso", "period_ym"],
    )
    op.create_index(
        "ix_trade_flows_partner_period", "trade_flows",
        ["partner_iso", "period_ym"],
    )


def downgrade() -> None:
    op.drop_index("ix_trade_flows_partner_period", table_name="trade_flows")
    op.drop_index("ix_trade_flows_reporter_period", table_name="trade_flows")
    op.drop_constraint("uq_trade_flows_natural", "trade_flows", type_="unique")
    op.drop_table("trade_flows")

    op.drop_index("ix_port_call_events_imo_arrival", table_name="port_call_events")
    op.drop_index("ix_port_call_events_port_arrival", table_name="port_call_events")
    op.drop_table("port_call_events")

    op.drop_index("ix_vessel_positions_port_ts", table_name="vessel_positions")
    op.drop_index("ix_vessel_positions_imo_ts", table_name="vessel_positions")
    op.drop_constraint("uq_vessel_positions_imo_ts", "vessel_positions", type_="unique")
    op.drop_table("vessel_positions")

    op.drop_index("ix_ports_region", table_name="ports")
    op.drop_index("ix_ports_type", table_name="ports")
    op.drop_index("ix_ports_country", table_name="ports")
    op.drop_table("ports")
