"""social_orgs table (Sprint 9 · S9.4 · Tercer Sector)

Catálogo de organizaciones del Tercer Sector españolas y europeas
relevantes: ONGs, fundaciones, cooperativas sociales, empresas de
inserción, asociaciones de utilidad pública.

Para cada organización mantenemos identificadores externos (NIF, EU
Transparency Register, IRPF/0,7 %, registro de fundaciones) que permiten
cruzar con BDNS, F&T Portal y EIB.

Revision ID: 0069_social_orgs
Revises: 0068_pharma_signals
"""
from alembic import op
import sqlalchemy as sa


revision = "0069_social_orgs"
down_revision = "0068_pharma_signals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_orgs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador estable (ej. 'caritas_es', 'cruz_roja_es')",
        ),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column(
            "legal_form",
            sa.String(length=40),
            nullable=False,
            server_default="ngo",
            comment="'ngo', 'fundacion', 'cooperativa', 'asociacion', 'empresa_insercion'",
        ),
        sa.Column(
            "scope",
            sa.String(length=40),
            nullable=False,
            server_default="national",
            comment="'local', 'regional', 'national', 'european', 'international'",
        ),
        sa.Column("country", sa.String(length=2), nullable=False, server_default="ES"),
        sa.Column(
            "nif",
            sa.String(length=20),
            nullable=True,
            comment="NIF/CIF español · clave de cruce con BDNS",
        ),
        sa.Column(
            "eu_transparency_id",
            sa.String(length=40),
            nullable=True,
            comment="ID en EU Transparency Register",
        ),
        sa.Column(
            "sector",
            sa.String(length=60),
            nullable=True,
            comment="Sector principal: 'social', 'medioambiente', 'cooperacion', 'salud', 'educacion'",
        ),
        sa.Column(
            "annual_budget_eur",
            sa.BigInteger,
            nullable=True,
            comment="Presupuesto anual estimado (último ejercicio)",
        ),
        sa.Column("year_founded", sa.Integer, nullable=True),
        sa.Column(
            "irpf_07",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
            comment="Beneficiaria del 0,7 % IRPF · indicador de relevancia",
        ),
        sa.Column(
            "publica_utilidad",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
            comment="Declarada de utilidad pública (Min. Interior)",
        ),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (governance, ratings, partners…)",
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
    op.create_index("ix_social_orgs_legal_form", "social_orgs", ["legal_form"])
    op.create_index("ix_social_orgs_sector", "social_orgs", ["sector"])
    op.create_index("ix_social_orgs_country", "social_orgs", ["country"])
    op.create_index("ix_social_orgs_nif", "social_orgs", ["nif"])


def downgrade() -> None:
    op.drop_index("ix_social_orgs_nif", table_name="social_orgs")
    op.drop_index("ix_social_orgs_country", table_name="social_orgs")
    op.drop_index("ix_social_orgs_sector", table_name="social_orgs")
    op.drop_index("ix_social_orgs_legal_form", table_name="social_orgs")
    op.drop_table("social_orgs")
