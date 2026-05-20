"""housing_markets table (Sprint 13 · S13.4 · sector Inmobiliario)

Catálogo de mercados de vivienda relevantes en España con métricas
agregadas (precio €/m², stock, demanda, presión, declaración de Zona
de Mercado Residencial Tensionado · ZMT bajo Ley 12/2023).

Cobertura inicial: 14 mercados clave por valor económico y/o
sensibilidad política/regulatoria.

Revision ID: 0073_housing_markets
Revises: 0072_telecom_operators
"""
from alembic import op
import sqlalchemy as sa


revision = "0073_housing_markets"
down_revision = "0072_telecom_operators"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "housing_markets",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador (ej. 'madrid_centro', 'barcelona_eixample')",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "scope",
            sa.String(length=40),
            nullable=False,
            comment="'distrito', 'municipio', 'comarca', 'provincia', 'ccaa'",
        ),
        sa.Column("ccaa", sa.String(length=60), nullable=False),
        sa.Column(
            "province",
            sa.String(length=60),
            nullable=True,
        ),
        sa.Column(
            "ine_code",
            sa.String(length=20),
            nullable=True,
            comment="Código INE (municipio o distrito)",
        ),
        sa.Column(
            "population",
            sa.Integer,
            nullable=True,
            comment="Población (último censo)",
        ),
        sa.Column(
            "precio_m2_venta_eur",
            sa.Numeric(8, 2),
            nullable=True,
            comment="Precio medio €/m² venta (último trimestre disponible)",
        ),
        sa.Column(
            "precio_alquiler_eur_mes",
            sa.Numeric(8, 2),
            nullable=True,
            comment="Renta media mensual € (vivienda completa)",
        ),
        sa.Column(
            "yoy_precio_venta_pct",
            sa.Numeric(5, 2),
            nullable=True,
            comment="Variación interanual precio venta %",
        ),
        sa.Column(
            "yoy_precio_alquiler_pct",
            sa.Numeric(5, 2),
            nullable=True,
            comment="Variación interanual precio alquiler %",
        ),
        sa.Column(
            "esfuerzo_hogares_pct",
            sa.Numeric(5, 2),
            nullable=True,
            comment="% renta media destinada a vivienda (alquiler)",
        ),
        sa.Column(
            "stock_alquiler_aprox",
            sa.Integer,
            nullable=True,
            comment="Aproximación stock viviendas en alquiler vivo",
        ),
        sa.Column(
            "zona_mercado_tensionado",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
            comment="¿Declarada ZMT bajo Ley 12/2023?",
        ),
        sa.Column(
            "fecha_declaracion_zmt",
            sa.Date,
            nullable=True,
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (índice estatal, sub-distritos…)",
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
    op.create_index("ix_housing_markets_scope", "housing_markets", ["scope"])
    op.create_index("ix_housing_markets_ccaa", "housing_markets", ["ccaa"])
    op.create_index("ix_housing_markets_zmt", "housing_markets", ["zona_mercado_tensionado"])


def downgrade() -> None:
    op.drop_index("ix_housing_markets_zmt", table_name="housing_markets")
    op.drop_index("ix_housing_markets_ccaa", table_name="housing_markets")
    op.drop_index("ix_housing_markets_scope", table_name="housing_markets")
    op.drop_table("housing_markets")
