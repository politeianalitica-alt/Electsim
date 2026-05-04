"""
Migration 0044 — Territorial Core (Bloque 7).

Tablas nuevas:
  - territory_geometries      → geometrías GeoJSON por territorio y resolución
  - territorial_signals       → señales territoriales (swing, stress, etc.)
  - territory_profiles_cache  → caché de perfiles territoriales
  - territorial_adjacency     → adyacencia entre territorios

Reutiliza las tablas geográficas existentes:
  - comunidades_autonomas, provincias, municipios, secciones_censales

NO duplica datos geográficos ya existentes.

Revision ID: 0044
Revises: 0043
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── territory_geometries ───────────────────────────────────────────────────
    op.create_table(
        "territory_geometries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),

        # Identificación estable
        sa.Column("territory_id", sa.String(64), nullable=False),
        sa.Column("territory_type", sa.String(32), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("ine_code", sa.String(16), nullable=True),

        # Geometrías por resolución (GeoJSON almacenado como JSONB)
        sa.Column("geometry_full", postgresql.JSONB(), nullable=True,
                  comment="GeoJSON completo (full resolution)"),
        sa.Column("geometry_medium", postgresql.JSONB(), nullable=True,
                  comment="GeoJSON simplificado ~0.01° tolerancia"),
        sa.Column("geometry_low", postgresql.JSONB(), nullable=True,
                  comment="GeoJSON muy simplificado ~0.05° tolerancia"),

        # Centroides y bbox
        sa.Column("centroid_lat", sa.Float(), nullable=True),
        sa.Column("centroid_lon", sa.Float(), nullable=True),
        sa.Column("bbox_minx", sa.Float(), nullable=True),
        sa.Column("bbox_miny", sa.Float(), nullable=True),
        sa.Column("bbox_maxx", sa.Float(), nullable=True),
        sa.Column("bbox_maxy", sa.Float(), nullable=True),

        # Metadatos
        sa.Column("source", sa.String(64), nullable=True,
                  comment="Fuente: INE, IGN, OpenStreetMap, etc."),
        sa.Column("source_date", sa.Date(), nullable=True),
        sa.Column("loaded_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()"), nullable=False),

        # Multi-tenancy
        sa.Column("tenant_id", sa.String(64), nullable=True,
                  comment="NULL = compartido por todos los tenants"),
    )

    op.create_unique_constraint(
        "uq_territory_geometries_id_type",
        "territory_geometries",
        ["territory_id", "territory_type"],
    )
    op.create_index(
        "ix_territory_geometries_type",
        "territory_geometries",
        ["territory_type"],
    )
    op.create_index(
        "ix_territory_geometries_ine_code",
        "territory_geometries",
        ["ine_code"],
    )

    # RLS
    op.execute("ALTER TABLE territory_geometries ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_territory_geometries
        ON territory_geometries
        USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true))
    """)

    # ── territorial_signals ────────────────────────────────────────────────────
    op.create_table(
        "territorial_signals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),

        # Territorio
        sa.Column("territory_id", sa.String(64), nullable=False),
        sa.Column("territory_type", sa.String(32), nullable=False),

        # Señal
        sa.Column("signal_type", sa.String(64), nullable=False,
                  comment="electoral_swing, economic_stress, media_intensity, ..."),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False,
                  comment="Valor de la señal (0-100)"),
        sa.Column("severity", sa.String(16), nullable=False,
                  comment="LOW, MEDIUM, HIGH, CRITICAL"),

        # Fuente
        sa.Column("source_module", sa.String(64), nullable=True),
        sa.Column("source_object_id", sa.String(128), nullable=True),

        # Descripción
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True,
                  comment="Confianza del detector (0-1)"),

        # Payload raw
        sa.Column("raw_payload", postgresql.JSONB(), nullable=True),

        # Multi-tenancy
        sa.Column("tenant_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_index(
        "ix_territorial_signals_territory",
        "territorial_signals",
        ["territory_id", "date"],
    )
    op.create_index(
        "ix_territorial_signals_type_date",
        "territorial_signals",
        ["signal_type", "date"],
    )
    op.create_index(
        "ix_territorial_signals_severity",
        "territorial_signals",
        ["severity", "date"],
    )

    op.execute("ALTER TABLE territorial_signals ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_territorial_signals
        ON territorial_signals
        USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true))
    """)

    # ── territory_profiles_cache ───────────────────────────────────────────────
    op.create_table(
        "territory_profiles_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),

        # Identificación
        sa.Column("territory_id", sa.String(64), nullable=False),
        sa.Column("territory_type", sa.String(32), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("profile_date", sa.Date(), nullable=False),

        # Métricas clave (denormalizadas para acceso rápido)
        sa.Column("economic_risk", sa.Float(), nullable=True),
        sa.Column("unemployment_rate", sa.Float(), nullable=True),
        sa.Column("income_avg", sa.Float(), nullable=True),
        sa.Column("campaign_priority", sa.Float(), nullable=True),
        sa.Column("active_alerts", sa.Integer(), nullable=True,
                  server_default="0"),

        # Datos electorales
        sa.Column("last_election_winner", sa.String(32), nullable=True),
        sa.Column("turnout_last", sa.Float(), nullable=True),
        sa.Column("swing_index", sa.Float(), nullable=True),

        # Perfil completo
        sa.Column("full_profile", postgresql.JSONB(), nullable=True),

        # Multi-tenancy y auditoría
        sa.Column("tenant_id", sa.String(64), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_unique_constraint(
        "uq_territory_profiles_id_date",
        "territory_profiles_cache",
        ["territory_id", "profile_date"],
    )
    op.create_index(
        "ix_territory_profiles_type_date",
        "territory_profiles_cache",
        ["territory_type", "profile_date"],
    )
    op.create_index(
        "ix_territory_profiles_priority",
        "territory_profiles_cache",
        ["campaign_priority"],
    )

    op.execute("ALTER TABLE territory_profiles_cache ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_territory_profiles_cache
        ON territory_profiles_cache
        USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true))
    """)

    # ── territorial_adjacency ──────────────────────────────────────────────────
    op.create_table(
        "territorial_adjacency",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),

        # Par de territorios adyacentes
        sa.Column("territory_id_a", sa.String(64), nullable=False),
        sa.Column("territory_id_b", sa.String(64), nullable=False),
        sa.Column("territory_type", sa.String(32), nullable=False),

        # Tipo de adyacencia
        sa.Column("adjacency_type", sa.String(32), nullable=False,
                  server_default="border",
                  comment="border (frontera), maritime (litoral), administrative"),

        # Distancia entre centroides (km)
        sa.Column("distance_km", sa.Float(), nullable=True),

        # Multi-tenancy
        sa.Column("tenant_id", sa.String(64), nullable=True),
    )

    op.create_unique_constraint(
        "uq_territorial_adjacency_pair",
        "territorial_adjacency",
        ["territory_id_a", "territory_id_b", "territory_type"],
    )
    op.create_index(
        "ix_territorial_adjacency_a",
        "territorial_adjacency",
        ["territory_id_a"],
    )
    op.create_index(
        "ix_territorial_adjacency_b",
        "territorial_adjacency",
        ["territory_id_b"],
    )

    op.execute("ALTER TABLE territorial_adjacency ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_territorial_adjacency
        ON territorial_adjacency
        USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true))
    """)


def downgrade() -> None:
    # Eliminar en orden inverso (respetando dependencias)
    for table in [
        "territorial_adjacency",
        "territory_profiles_cache",
        "territorial_signals",
        "territory_geometries",
    ]:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
