"""tourism_destinations table (Sprint 15 · S15.4 · sector Turismo)

Catálogo destinos turísticos relevantes en España con métricas
agregadas y nivel de presión turística (cobertura: gestión municipal,
quejas residentes, regulación pisos turísticos).

Cobertura inicial: 14 destinos clave por flujo y/o sensibilidad
política/social.

Revision ID: 0075_tourism_destinations
Revises: 0074_commodity_recipes
"""
from alembic import op
import sqlalchemy as sa


revision = "0075_tourism_destinations"
down_revision = "0074_commodity_recipes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tourism_destinations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador (ej. 'palma_mallorca', 'barcelona_ciutat_vella')",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=40),
            nullable=False,
            comment="'urbano', 'costa', 'rural', 'cultural', 'mixto', 'isla'",
        ),
        sa.Column("ccaa", sa.String(length=60), nullable=False),
        sa.Column("province", sa.String(length=60), nullable=True),
        sa.Column(
            "ine_code",
            sa.String(length=20),
            nullable=True,
        ),
        sa.Column("population", sa.Integer, nullable=True),
        sa.Column(
            "visitors_2024_k",
            sa.Integer,
            nullable=True,
            comment="Visitantes año 2024 · miles",
        ),
        sa.Column(
            "pernoctaciones_2024_k",
            sa.Integer,
            nullable=True,
            comment="Pernoctaciones 2024 · miles",
        ),
        sa.Column(
            "yoy_visitors_pct",
            sa.Numeric(5, 2),
            nullable=True,
        ),
        sa.Column(
            "adr_eur",
            sa.Numeric(8, 2),
            nullable=True,
            comment="Tarifa media diaria hotelera €",
        ),
        sa.Column(
            "rev_par_eur",
            sa.Numeric(8, 2),
            nullable=True,
            comment="RevPAR (ingreso por habitación disponible) €",
        ),
        sa.Column(
            "vivienda_turistica_count",
            sa.Integer,
            nullable=True,
            comment="Viviendas turísticas registradas (último censo CCAA)",
        ),
        sa.Column(
            "vivienda_turistica_per_1000",
            sa.Numeric(8, 2),
            nullable=True,
            comment="VT por cada 1000 habitantes · proxy de saturación",
        ),
        sa.Column(
            "regulacion_pisos_turisticos",
            sa.String(length=40),
            nullable=False,
            server_default="permisivo",
            comment="'permisivo', 'restringido', 'moratoria', 'prohibido_centro'",
        ),
        sa.Column(
            "presion_turistica",
            sa.String(length=20),
            nullable=False,
            server_default="medio",
            comment="'bajo', 'medio', 'alto', 'critico'",
        ),
        sa.Column(
            "tasa_turistica_eur",
            sa.Numeric(6, 2),
            nullable=True,
            comment="Tasa turística vigente por persona/noche · 0 = sin tasa",
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_tourism_dest_kind", "tourism_destinations", ["kind"])
    op.create_index("ix_tourism_dest_ccaa", "tourism_destinations", ["ccaa"])
    op.create_index("ix_tourism_dest_presion", "tourism_destinations", ["presion_turistica"])


def downgrade() -> None:
    op.drop_index("ix_tourism_dest_presion", table_name="tourism_destinations")
    op.drop_index("ix_tourism_dest_ccaa", table_name="tourism_destinations")
    op.drop_index("ix_tourism_dest_kind", table_name="tourism_destinations")
    op.drop_table("tourism_destinations")
