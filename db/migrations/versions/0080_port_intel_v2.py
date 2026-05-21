"""port_terminals + shipping_lines + carrier_services + shipping_routes + route_legs
   + port_connectivity + port_monthly_traffic + vessels_master + source_observations
   + ALTER ports con 22 columnas enriquecidas · Módulo Puertos Sprint 2

Sprint 2 del módulo Puertos · capas estructurales que faltaban en el MVP:

  - port_terminals          · terminales por puerto (Algeciras→APMT/TTI/CSP…)
  - port_monthly_traffic    · series TEU/toneladas/cruceristas mensuales
  - shipping_lines          · navieras (Maersk, MSC, CMA CGM…)
  - carrier_services        · servicios FAL/AE/TP/MED · port_rotation JSONB
  - shipping_routes         · agregado lógico carrier+service+lane
  - route_legs              · legs origen→destino con chokepoint exposure
  - port_connectivity       · matriz bilateral puerto↔puerto derivada
  - vessels_master          · promoción del seed vessels_seed.py a tabla
  - source_observations     · trazabilidad granular por field+entity

Además extiende `ports` (creada en 0079) con 22 columnas para acomodar el
World Port Index (NGA Pub. 150):
  - authority_name, operator_model, terminal_count
  - max_draft_m, max_loa_m, quay_length_m, yard_area_ha
  - annual_teu_capacity, annual_teu_actual, annual_tonnes
  - reefer_plugs, rail_connected, rail_share_pct, free_zone
  - bunkering, shore_power, dangerous_goods, strategic_notes
  - wpi_index_id (clave FK al World Port Index)
  - data_source, data_quality (trazabilidad por puerto)
  - updated_at

Reusa:
  - ports.slug (PK · de 0079) para todas las FK FK→ports.slug
  - vessel_positions.imo (de 0079) implícito sobre vessels_master.imo

Revision ID: 0080_port_intel_v2
Revises: 0079_port_intelligence
"""
from alembic import op
import sqlalchemy as sa


revision = "0080_port_intel_v2"
down_revision = "0079_port_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ────────────────────────────────────────────────────────────────
    # ALTER ports · 22 columnas enriquecidas para acomodar World Port Index
    # Todas nullable · backfill incremental sin downtime
    # ────────────────────────────────────────────────────────────────
    with op.batch_alter_table("ports") as batch:
        batch.add_column(sa.Column("authority_name", sa.String(length=200), nullable=True,
                                   comment="Ej. 'Autoridad Portuaria de Valencia'"))
        batch.add_column(sa.Column("operator_model", sa.String(length=40), nullable=True,
                                   comment="public | concession | landlord_port | private"))
        batch.add_column(sa.Column("terminal_count", sa.Integer, nullable=True))
        batch.add_column(sa.Column("max_draft_m", sa.Float, nullable=True))
        batch.add_column(sa.Column("max_loa_m", sa.Float, nullable=True))
        batch.add_column(sa.Column("quay_length_m", sa.Float, nullable=True))
        batch.add_column(sa.Column("yard_area_ha", sa.Float, nullable=True))
        batch.add_column(sa.Column("annual_teu_capacity", sa.BigInteger, nullable=True))
        batch.add_column(sa.Column("annual_teu_actual", sa.BigInteger, nullable=True))
        batch.add_column(sa.Column("annual_tonnes", sa.BigInteger, nullable=True))
        batch.add_column(sa.Column("reefer_plugs", sa.Integer, nullable=True))
        batch.add_column(sa.Column("rail_connected", sa.Boolean, nullable=True))
        batch.add_column(sa.Column("rail_share_pct", sa.Float, nullable=True))
        batch.add_column(sa.Column("free_zone", sa.Boolean, nullable=True))
        batch.add_column(sa.Column("bunkering", sa.String(length=100), nullable=True,
                                   comment="csv: fuel,lng,methanol,h2"))
        batch.add_column(sa.Column("shore_power", sa.Boolean, nullable=True))
        batch.add_column(sa.Column("dangerous_goods", sa.Boolean, nullable=True))
        batch.add_column(sa.Column("strategic_notes", sa.Text, nullable=True))
        batch.add_column(sa.Column("wpi_index_id", sa.String(length=20), nullable=True,
                                   comment="World Port Index INDEX_NO de la NGA"))
        batch.add_column(sa.Column("data_source", sa.String(length=40), nullable=True,
                                   comment="seed | wpi | aapp | scraped"))
        batch.add_column(sa.Column("data_quality", sa.String(length=20), nullable=True,
                                   comment="live | cache | seed | synthetic | missing"))
        batch.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    # ────────────────────────────────────────────────────────────────
    # port_terminals · operadores y muelles dentro de cada puerto
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "port_terminals",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("port_slug", sa.String(length=64), nullable=False),
        sa.Column("terminal_name", sa.String(length=200), nullable=False),
        sa.Column("operator_name", sa.String(length=200), nullable=True),
        sa.Column("operator_lei", sa.String(length=20), nullable=True,
                  comment="LEI · GLEIF · identifica entidad legal del operador"),
        sa.Column("type", sa.String(length=20), nullable=False,
                  comment="container | bulk | tanker | lng | roro | cruise | multipurpose"),
        sa.Column("lat", sa.Float, nullable=True),
        sa.Column("lon", sa.Float, nullable=True),
        sa.Column("capacity_teu", sa.BigInteger, nullable=True),
        sa.Column("capacity_tonnes", sa.BigInteger, nullable=True),
        sa.Column("berths_count", sa.Integer, nullable=True),
        sa.Column("max_draft_m", sa.Float, nullable=True),
        sa.Column("quay_length_m", sa.Float, nullable=True),
        sa.Column("reefer_plugs", sa.Integer, nullable=True),
        sa.Column("rail_access", sa.Boolean, nullable=True),
        sa.Column("concession_end_year", sa.Integer, nullable=True),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint(
        "uq_port_terminals_natural", "port_terminals",
        ["port_slug", "terminal_name"],
    )
    op.create_index("ix_port_terminals_port", "port_terminals", ["port_slug"])
    op.create_index("ix_port_terminals_operator", "port_terminals", ["operator_name"])

    # ────────────────────────────────────────────────────────────────
    # port_monthly_traffic · series mensuales TEU/toneladas
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "port_monthly_traffic",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("port_slug", sa.String(length=64), nullable=False),
        sa.Column("period_ym", sa.String(length=7), nullable=False,
                  comment="YYYY-MM"),
        sa.Column("teu_total", sa.BigInteger, nullable=True),
        sa.Column("teu_full", sa.BigInteger, nullable=True),
        sa.Column("teu_empty", sa.BigInteger, nullable=True),
        sa.Column("teu_transshipment", sa.BigInteger, nullable=True),
        sa.Column("tonnes_total", sa.BigInteger, nullable=True),
        sa.Column("tonnes_liquid_bulk", sa.BigInteger, nullable=True),
        sa.Column("tonnes_solid_bulk", sa.BigInteger, nullable=True),
        sa.Column("tonnes_general_cargo", sa.BigInteger, nullable=True),
        sa.Column("tonnes_roro", sa.BigInteger, nullable=True),
        sa.Column("vehicles_units", sa.BigInteger, nullable=True),
        sa.Column("passengers", sa.BigInteger, nullable=True),
        sa.Column("cruise_passengers", sa.BigInteger, nullable=True),
        sa.Column("fishing_tonnes", sa.BigInteger, nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False,
                  comment="puertos_estado | aapp | emodnet | estimate"),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint(
        "uq_port_traffic_natural", "port_monthly_traffic",
        ["port_slug", "period_ym", "source"],
    )
    op.create_index(
        "ix_port_traffic_port_period", "port_monthly_traffic",
        ["port_slug", "period_ym"],
    )

    # ────────────────────────────────────────────────────────────────
    # shipping_lines · navieras top mundial
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "shipping_lines",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("parent_company", sa.String(length=200), nullable=True),
        sa.Column("country_iso", sa.String(length=2), nullable=True),
        sa.Column("lei", sa.String(length=20), nullable=True,
                  comment="LEI GLEIF · útil para sanctions screening"),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("alliance", sa.String(length=30), nullable=True,
                  comment="2M | OCEAN | THE | standalone"),
        sa.Column("main_trades", sa.JSON, nullable=True,
                  comment="JSONB array de trade lanes: ['asia_eu','transpac',...]"),
        sa.Column("fleet_size", sa.Integer, nullable=True),
        sa.Column("fleet_teu", sa.BigInteger, nullable=True),
        sa.Column("sanctions_risk", sa.String(length=20), nullable=True,
                  comment="none | monitor | sanctioned"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint("uq_shipping_lines_slug", "shipping_lines", ["slug"])
    op.create_index("ix_shipping_lines_alliance", "shipping_lines", ["alliance"])
    op.create_index("ix_shipping_lines_lei", "shipping_lines", ["lei"])

    # ────────────────────────────────────────────────────────────────
    # carrier_services · servicios concretos con port_rotation
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "carrier_services",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("service_code", sa.String(length=40), nullable=False),
        sa.Column("service_name", sa.String(length=200), nullable=False),
        sa.Column("shipping_line_slug", sa.String(length=64), nullable=True),
        sa.Column("alliance", sa.String(length=30), nullable=True),
        sa.Column("trade_lane", sa.String(length=40), nullable=False,
                  comment="asia_eu | transpac | transatlantic | intra_eu | me_eu | intra_asia | …"),
        sa.Column("frequency_days", sa.Integer, nullable=True),
        sa.Column("port_rotation", sa.JSON, nullable=True,
                  comment="JSONB array de {port_slug, order, dwell_days?}"),
        sa.Column("estimated_transit_days", sa.Integer, nullable=True),
        sa.Column("vessel_class", sa.String(length=20), nullable=True,
                  comment="ULCV | VLCS | NPX | FMX | sub_pmx"),
        sa.Column("avg_capacity_teu", sa.Integer, nullable=True),
        sa.Column("main_chokepoints", sa.JSON, nullable=True,
                  comment="JSONB array de slugs chokepoint: ['suez','gibraltar',…]"),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("TRUE")),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_unique_constraint(
        "uq_carrier_services_code", "carrier_services", ["service_code"],
    )
    op.create_index("ix_carrier_services_line", "carrier_services", ["shipping_line_slug"])
    op.create_index("ix_carrier_services_lane", "carrier_services", ["trade_lane"])

    # ────────────────────────────────────────────────────────────────
    # shipping_routes · agregado lógico de un servicio en una dirección
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "shipping_routes",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("route_name", sa.String(length=200), nullable=False),
        sa.Column("carrier_service_id", sa.BigInteger, nullable=True),
        sa.Column("origin_port_slug", sa.String(length=64), nullable=False),
        sa.Column("destination_port_slug", sa.String(length=64), nullable=False),
        sa.Column("via_chokepoints", sa.JSON, nullable=True),
        sa.Column("distance_nm", sa.Float, nullable=True),
        sa.Column("transit_days", sa.Float, nullable=True),
        sa.Column("weekly_frequency", sa.Float, nullable=True),
        sa.Column("risk_score", sa.Float, nullable=True,
                  comment="0..100 · derivado de chokepoint exposure + ACLED"),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
    )
    op.create_index("ix_shipping_routes_origin", "shipping_routes", ["origin_port_slug"])
    op.create_index("ix_shipping_routes_dest", "shipping_routes", ["destination_port_slug"])

    # ────────────────────────────────────────────────────────────────
    # route_legs · legs origen→destino dentro de una ruta multi-call
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "route_legs",
        sa.Column("route_id", sa.BigInteger, primary_key=True),
        sa.Column("leg_order", sa.Integer, primary_key=True),
        sa.Column("origin_port_slug", sa.String(length=64), nullable=False),
        sa.Column("destination_port_slug", sa.String(length=64), nullable=False),
        sa.Column("distance_nm", sa.Float, nullable=True),
        sa.Column("transit_days", sa.Float, nullable=True),
        sa.Column("chokepoint_exposure", sa.JSON, nullable=True,
                  comment="JSONB array de slugs chokepoint cruzados en el leg"),
    )

    # ────────────────────────────────────────────────────────────────
    # port_connectivity · matriz bilateral puerto↔puerto derivada
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "port_connectivity",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("port_slug", sa.String(length=64), nullable=False),
        sa.Column("connected_port_slug", sa.String(length=64), nullable=False),
        sa.Column("shipping_line_slug", sa.String(length=64), nullable=True),
        sa.Column("service_code", sa.String(length=40), nullable=True),
        sa.Column("weekly_calls", sa.Float, nullable=True),
        sa.Column("avg_transit_days", sa.Float, nullable=True),
        sa.Column("direction", sa.String(length=20), nullable=True,
                  comment="origin | destination | transit"),
        sa.Column("cargo_type", sa.String(length=40), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_port_connectivity_natural", "port_connectivity",
        ["port_slug", "connected_port_slug", "shipping_line_slug", "service_code"],
    )
    op.create_index("ix_port_connectivity_port", "port_connectivity", ["port_slug"])
    op.create_index(
        "ix_port_connectivity_connected", "port_connectivity", ["connected_port_slug"],
    )

    # ────────────────────────────────────────────────────────────────
    # vessels_master · ficha persistente del buque (promoción del seed)
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "vessels_master",
        sa.Column("imo", sa.String(length=15), primary_key=True),
        sa.Column("mmsi", sa.String(length=12), nullable=True),
        sa.Column("name_current", sa.String(length=200), nullable=False),
        sa.Column("names_previous", sa.JSON, nullable=True,
                  comment="JSONB array de nombres históricos"),
        sa.Column("type", sa.String(length=30), nullable=True,
                  comment="container | bulk_carrier | tanker | lng | roro | cruise | fishing"),
        sa.Column("subtype", sa.String(length=40), nullable=True),
        sa.Column("dwt", sa.Integer, nullable=True),
        sa.Column("gt", sa.Integer, nullable=True),
        sa.Column("nt", sa.Integer, nullable=True),
        sa.Column("teu_capacity", sa.Integer, nullable=True),
        sa.Column("loa_m", sa.Float, nullable=True),
        sa.Column("beam_m", sa.Float, nullable=True),
        sa.Column("draft_max_m", sa.Float, nullable=True),
        sa.Column("year_built", sa.Integer, nullable=True),
        sa.Column("builder", sa.String(length=200), nullable=True),
        sa.Column("flag_current", sa.String(length=2), nullable=True),
        sa.Column("flag_history", sa.JSON, nullable=True,
                  comment="JSONB array de {flag, since, until?} · detector flag_of_convenience"),
        sa.Column("owner_name", sa.String(length=200), nullable=True),
        sa.Column("owner_lei", sa.String(length=20), nullable=True),
        sa.Column("beneficial_owner", sa.String(length=200), nullable=True),
        sa.Column("manager", sa.String(length=200), nullable=True),
        sa.Column("charterer", sa.String(length=200), nullable=True),
        sa.Column("class_society", sa.String(length=100), nullable=True),
        sa.Column("pni_club", sa.String(length=100), nullable=True),
        sa.Column("sanctions_status", sa.String(length=20), nullable=True,
                  comment="clear | monitor | listed"),
        sa.Column("sanctions_evidence", sa.JSON, nullable=True),
        sa.Column("emissions_cii", sa.String(length=4), nullable=True,
                  comment="IMO CII rating A..E"),
        sa.Column("emissions_eexi", sa.Float, nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("data_quality", sa.String(length=20), nullable=True),
    )
    op.create_index("ix_vessels_master_mmsi", "vessels_master", ["mmsi"])
    op.create_index("ix_vessels_master_flag", "vessels_master", ["flag_current"])
    op.create_index("ix_vessels_master_owner_lei", "vessels_master", ["owner_lei"])

    # ────────────────────────────────────────────────────────────────
    # source_observations · trazabilidad granular por field+entity
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "source_observations",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(length=30), nullable=False,
                  comment="port | vessel | route | trade_flow | company | terminal"),
        sa.Column("entity_id", sa.String(length=64), nullable=False,
                  comment="slug del puerto, IMO del buque, etc."),
        sa.Column("field_name", sa.String(length=80), nullable=False,
                  comment="ej. 'annual_teu_actual', 'sanctions_status'"),
        sa.Column("value", sa.JSON, nullable=True,
                  comment="valor observado (puede ser cualquier tipo · JSON-encoded)"),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("source_date", sa.Date, nullable=True,
                  comment="fecha del documento fuente"),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("confidence_score", sa.Float, nullable=True,
                  comment="0..1 · estimación interna de confianza"),
        sa.Column("is_synthetic", sa.Boolean, nullable=False,
                  server_default=sa.text("FALSE")),
        sa.Column("is_estimated", sa.Boolean, nullable=False,
                  server_default=sa.text("FALSE")),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index(
        "ix_source_observations_entity",
        "source_observations",
        ["entity_type", "entity_id"],
    )
    op.create_index(
        "ix_source_observations_field",
        "source_observations",
        ["entity_type", "field_name"],
    )


def downgrade() -> None:
    # Drop en orden inverso (tablas hijas primero, padres después)
    op.drop_index("ix_source_observations_field", table_name="source_observations")
    op.drop_index("ix_source_observations_entity", table_name="source_observations")
    op.drop_table("source_observations")

    op.drop_index("ix_vessels_master_owner_lei", table_name="vessels_master")
    op.drop_index("ix_vessels_master_flag", table_name="vessels_master")
    op.drop_index("ix_vessels_master_mmsi", table_name="vessels_master")
    op.drop_table("vessels_master")

    op.drop_index("ix_port_connectivity_connected", table_name="port_connectivity")
    op.drop_index("ix_port_connectivity_port", table_name="port_connectivity")
    op.drop_constraint("uq_port_connectivity_natural", "port_connectivity", type_="unique")
    op.drop_table("port_connectivity")

    op.drop_table("route_legs")

    op.drop_index("ix_shipping_routes_dest", table_name="shipping_routes")
    op.drop_index("ix_shipping_routes_origin", table_name="shipping_routes")
    op.drop_table("shipping_routes")

    op.drop_index("ix_carrier_services_lane", table_name="carrier_services")
    op.drop_index("ix_carrier_services_line", table_name="carrier_services")
    op.drop_constraint("uq_carrier_services_code", "carrier_services", type_="unique")
    op.drop_table("carrier_services")

    op.drop_index("ix_shipping_lines_lei", table_name="shipping_lines")
    op.drop_index("ix_shipping_lines_alliance", table_name="shipping_lines")
    op.drop_constraint("uq_shipping_lines_slug", "shipping_lines", type_="unique")
    op.drop_table("shipping_lines")

    op.drop_index("ix_port_traffic_port_period", table_name="port_monthly_traffic")
    op.drop_constraint("uq_port_traffic_natural", "port_monthly_traffic", type_="unique")
    op.drop_table("port_monthly_traffic")

    op.drop_index("ix_port_terminals_operator", table_name="port_terminals")
    op.drop_index("ix_port_terminals_port", table_name="port_terminals")
    op.drop_constraint("uq_port_terminals_natural", "port_terminals", type_="unique")
    op.drop_table("port_terminals")

    # Revert ALTER ports · drop columnas añadidas
    with op.batch_alter_table("ports") as batch:
        for col in (
            "updated_at",
            "data_quality",
            "data_source",
            "wpi_index_id",
            "strategic_notes",
            "dangerous_goods",
            "shore_power",
            "bunkering",
            "free_zone",
            "rail_share_pct",
            "rail_connected",
            "reefer_plugs",
            "annual_tonnes",
            "annual_teu_actual",
            "annual_teu_capacity",
            "yard_area_ha",
            "quay_length_m",
            "max_loa_m",
            "max_draft_m",
            "terminal_count",
            "operator_model",
            "authority_name",
        ):
            batch.drop_column(col)
