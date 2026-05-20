"""telecom_operators table (Sprint 12 · S12.4 · sector Telecom)

Catálogo de operadores de telecomunicaciones activos en España con su
cuota de mercado, ingresos, infraestructura y propiedad.

Cobertura del seed inicial (12 operadores):
  - Móvil + fijo: MásOrange (fusión Orange+MásMóvil 2024), Movistar (Telefónica),
    Vodafone España (Zegona), Digi España (Digi Communications)
  - Mayoristas / OMV / FTTH: Avatel, Adamo, Yoigo (parte MásOrange),
    Pepephone, Lowi, O2, Simyo
  - Tower: Cellnex (separación spinoff)

Revision ID: 0072_telecom_operators
Revises: 0071_defense_programs
"""
from alembic import op
import sqlalchemy as sa


revision = "0072_telecom_operators"
down_revision = "0071_defense_programs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telecom_operators",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador estable (ej. 'movistar', 'masorange', 'digi_es')",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=40),
            nullable=False,
            comment="'incumbente', 'mvno', 'omv', 'mayorista', 'tower', "
                    "'isp', 'satelital', 'submarino'",
        ),
        sa.Column(
            "parent_group",
            sa.String(length=200),
            nullable=True,
            comment="Grupo matriz (ej. 'Telefónica', 'MásOrange JV', 'Zegona', 'Digi')",
        ),
        sa.Column(
            "country",
            sa.String(length=2),
            nullable=False,
            server_default="ES",
        ),
        sa.Column(
            "market_share_movil_pct",
            sa.Numeric(5, 2),
            nullable=True,
            comment="Cuota mercado móvil (clientes activos) %",
        ),
        sa.Column(
            "market_share_fijo_pct",
            sa.Numeric(5, 2),
            nullable=True,
            comment="Cuota mercado banda ancha fija %",
        ),
        sa.Column(
            "annual_revenue_eur_m",
            sa.BigInteger,
            nullable=True,
            comment="Ingresos anuales España (M€)",
        ),
        sa.Column(
            "subscribers_movil",
            sa.BigInteger,
            nullable=True,
            comment="Clientes móvil activos",
        ),
        sa.Column(
            "subscribers_fijo",
            sa.BigInteger,
            nullable=True,
            comment="Clientes banda ancha fija",
        ),
        sa.Column(
            "ftth_homes_passed",
            sa.BigInteger,
            nullable=True,
            comment="Hogares con cobertura FTTH propia",
        ),
        sa.Column(
            "spectrum_900_1800",
            sa.Numeric(6, 2),
            nullable=True,
            comment="MHz adjudicados en 900+1800 MHz",
        ),
        sa.Column(
            "spectrum_2100",
            sa.Numeric(6, 2),
            nullable=True,
            comment="MHz adjudicados en 2100 MHz UMTS",
        ),
        sa.Column(
            "spectrum_2600",
            sa.Numeric(6, 2),
            nullable=True,
            comment="MHz adjudicados en 2600 MHz LTE",
        ),
        sa.Column(
            "spectrum_3500",
            sa.Numeric(6, 2),
            nullable=True,
            comment="MHz adjudicados en 3.5 GHz 5G",
        ),
        sa.Column(
            "spectrum_700",
            sa.Numeric(6, 2),
            nullable=True,
            comment="MHz adjudicados en 700 MHz 5G",
        ),
        sa.Column(
            "spectrum_26ghz",
            sa.Numeric(7, 2),
            nullable=True,
            comment="MHz adjudicados en 26 GHz mmWave",
        ),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (CEO, sede, M&A, listado bursátil…)",
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
    op.create_index("ix_telecom_operators_kind", "telecom_operators", ["kind"])
    op.create_index("ix_telecom_operators_parent", "telecom_operators", ["parent_group"])


def downgrade() -> None:
    op.drop_index("ix_telecom_operators_parent", table_name="telecom_operators")
    op.drop_index("ix_telecom_operators_kind", table_name="telecom_operators")
    op.drop_table("telecom_operators")
