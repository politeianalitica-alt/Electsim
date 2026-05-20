"""commodity_recipes + commodity_price_snapshots (Sprint 14 · S14.5 · Agro+Vesper)

commodity_recipes
  - Persiste "recetas" creadas por el usuario en el módulo Vesper-style
  - Cada receta es un mix de commodities con sus cantidades + unidades
  - Permite recalcular coste con precios live periódicamente

commodity_price_snapshots
  - Histórico ligero de precios spot (last_price + change_pct)
  - Una fila por commodity slug + día (idempotente por (slug, snapshot_date))
  - Fuente: cache local del fetcher Yahoo Finance / IMF

Revision ID: 0074_commodity_recipes
Revises: 0073_housing_markets
"""
from alembic import op
import sqlalchemy as sa


revision = "0074_commodity_recipes"
down_revision = "0073_housing_markets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "commodity_recipes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador receta (ej. 'pan_blanco_industrial', 'galleta_maria')",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "sector",
            sa.String(length=40),
            nullable=True,
            comment="'panaderia', 'lacteos', 'chocolate', 'aceite', 'cerveza', 'piensos'...",
        ),
        sa.Column(
            "ingredients",
            sa.JSON,
            nullable=False,
            comment="[{slug, name, quantity, unit, pct_of_total}, ...]",
        ),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
            server_default="EUR",
        ),
        sa.Column(
            "owner_user_id",
            sa.String(length=64),
            nullable=True,
            comment="Usuario que la creó · null = pública/seed",
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
    op.create_index("ix_commodity_recipes_sector", "commodity_recipes", ["sector"])
    op.create_index("ix_commodity_recipes_owner", "commodity_recipes", ["owner_user_id"])

    op.create_table(
        "commodity_price_snapshots",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=80),
            nullable=False,
            comment="commodity slug del catálogo",
        ),
        sa.Column(
            "snapshot_date",
            sa.Date,
            nullable=False,
        ),
        sa.Column(
            "last_price",
            sa.Numeric(18, 6),
            nullable=False,
        ),
        sa.Column("currency", sa.String(length=8), nullable=True),
        sa.Column(
            "change_pct",
            sa.Numeric(8, 4),
            nullable=True,
        ),
        sa.Column(
            "source",
            sa.String(length=32),
            nullable=False,
            server_default="yahoo",
            comment="'yahoo', 'imf', 'manual', 'fao'",
        ),
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
        sa.UniqueConstraint("slug", "snapshot_date", name="uq_commodity_snapshot_slug_date"),
    )
    op.create_index("ix_commodity_snapshots_slug", "commodity_price_snapshots", ["slug"])
    op.create_index("ix_commodity_snapshots_date", "commodity_price_snapshots", ["snapshot_date"])


def downgrade() -> None:
    op.drop_index("ix_commodity_snapshots_date", table_name="commodity_price_snapshots")
    op.drop_index("ix_commodity_snapshots_slug", table_name="commodity_price_snapshots")
    op.drop_table("commodity_price_snapshots")
    op.drop_index("ix_commodity_recipes_owner", table_name="commodity_recipes")
    op.drop_index("ix_commodity_recipes_sector", table_name="commodity_recipes")
    op.drop_table("commodity_recipes")
