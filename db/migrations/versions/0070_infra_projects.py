"""infra_projects table (Sprint 10 · S10.4 · sector Infraestructuras)

Catálogo de grandes proyectos de infraestructura en España con su estado:
plazos, presupuesto, contratista principal, riesgo de retraso, fuente
de financiación.

Cobertura del seed inicial (12 proyectos críticos):
  - Alta Velocidad ferroviaria: Y Vasca, AVE Galicia, Corredor Mediterráneo,
    Murcia-Almería, Madrid-Extremadura, AVE Cantabria
  - Aeropuertos: Ampliación T1 Barajas, T2 El Prat, ampliación Málaga
  - Carreteras: Túnel Cantábrico, Cierre M-50
  - Puertos: Ampliación Valencia (norte), Algeciras Zona Franca
  - Energía / interconexiones: Marubia, Biscay Gulf interconexión Francia

Revision ID: 0070_infra_projects
Revises: 0069_social_orgs
"""
from alembic import op
import sqlalchemy as sa


revision = "0070_infra_projects"
down_revision = "0069_social_orgs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "infra_projects",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador estable (ej. 'ave_galicia', 'cmm_valencia_norte')",
        ),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=40),
            nullable=False,
            comment="'ferroviario_av', 'ferroviario', 'aeropuerto', 'puerto', "
                    "'carretera', 'energia', 'agua', 'telecom'",
        ),
        sa.Column(
            "owner_organism",
            sa.String(length=120),
            nullable=False,
            comment="ADIF, AENA, Puertos del Estado, DGC, REE, MITMS…",
        ),
        sa.Column(
            "main_contractor",
            sa.String(length=200),
            nullable=True,
            comment="Constructor principal (UTE o empresa)",
        ),
        sa.Column(
            "region",
            sa.String(length=60),
            nullable=True,
            comment="CCAA o ámbito (ej. 'Galicia', 'Madrid', 'Multi-CCAA')",
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="en_obras",
            comment="'estudio_informativo', 'licitado', 'en_obras', "
                    "'parado', 'completado', 'cancelado'",
        ),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column(
            "planned_end_date",
            sa.Date,
            nullable=True,
            comment="Fecha de finalización planificada (último plan)",
        ),
        sa.Column(
            "original_end_date",
            sa.Date,
            nullable=True,
            comment="Fecha de finalización original del proyecto",
        ),
        sa.Column(
            "budget_initial_eur",
            sa.BigInteger,
            nullable=True,
            comment="Presupuesto inicial (€)",
        ),
        sa.Column(
            "budget_current_eur",
            sa.BigInteger,
            nullable=True,
            comment="Presupuesto vigente (€) — refleja modificados",
        ),
        sa.Column(
            "executed_eur",
            sa.BigInteger,
            nullable=True,
            comment="Certificado ejecutado a fecha (€)",
        ),
        sa.Column(
            "delay_months",
            sa.Integer,
            nullable=True,
            comment="Retraso vs plan original (meses, positivo = retraso)",
        ),
        sa.Column(
            "funding_source",
            sa.String(length=120),
            nullable=True,
            comment="'PGE', 'NGEU', 'CEF', 'BEI', 'mixto'",
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "url_oficial",
            sa.String(length=500),
            nullable=True,
            comment="Web institucional del proyecto",
        ),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (tramos, modificados, hitos, riesgos…)",
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
    op.create_index("ix_infra_projects_kind", "infra_projects", ["kind"])
    op.create_index("ix_infra_projects_status", "infra_projects", ["status"])
    op.create_index("ix_infra_projects_owner", "infra_projects", ["owner_organism"])
    op.create_index("ix_infra_projects_region", "infra_projects", ["region"])


def downgrade() -> None:
    op.drop_index("ix_infra_projects_region", table_name="infra_projects")
    op.drop_index("ix_infra_projects_owner", table_name="infra_projects")
    op.drop_index("ix_infra_projects_status", table_name="infra_projects")
    op.drop_index("ix_infra_projects_kind", table_name="infra_projects")
    op.drop_table("infra_projects")
