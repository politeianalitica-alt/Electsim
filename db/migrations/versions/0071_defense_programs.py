"""defense_programs table (Sprint 11 · S11.4 · sector Defensa)

Catálogo de programas de armamento y equipamiento militar en los que
participa España, con presupuesto, contratistas, hitos y estado.

Cobertura del seed inicial (12 programas críticos):
  - Aeronaves: Eurofighter T4, FCAS/NGWS, EuroMALE/Eurodrone, NH90, A400M
  - Navales: F-110 frigatas Navantia, S-80 submarinos Navantia
  - Terrestres: VCR 8x8 Dragón, Leopard 2E modernización
  - Espaciales: SpainSat NG, PAZ-2, IRIS²
  - Misiles: Halcón / SPYDER, Iron Dome SAMP/T NG

Cada programa incluye:
  - lead_country / consortium (cooperación industrial)
  - status (planificación / firma / producción / entrega / retiro)
  - presupuesto comprometido + ejecutado
  - hitos clave (next_milestone)

Revision ID: 0071_defense_programs
Revises: 0070_infra_projects
"""
from alembic import op
import sqlalchemy as sa


revision = "0071_defense_programs"
down_revision = "0070_infra_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "defense_programs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador estable (ej. 'f110_navantia', 'fcas_ngws')",
        ),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column(
            "domain",
            sa.String(length=30),
            nullable=False,
            comment="'aire', 'tierra', 'mar', 'espacio', 'ciber', 'multi'",
        ),
        sa.Column(
            "kind",
            sa.String(length=40),
            nullable=False,
            comment="'aeronave', 'helicoptero', 'buque', 'submarino', 'vehiculo', "
                    "'misil', 'satelite', 'radar', 'munition', 'plataforma'",
        ),
        sa.Column(
            "lead_country",
            sa.String(length=60),
            nullable=False,
            comment="País líder (ISO o nombre)",
        ),
        sa.Column(
            "consortium",
            sa.String(length=300),
            nullable=True,
            comment="Cooperación (lista separada por coma: ES, FR, DE...)",
        ),
        sa.Column(
            "framework",
            sa.String(length=40),
            nullable=True,
            comment="'PESCO', 'EDF', 'OCCAR', 'NATO', 'bilateral', 'nacional'",
        ),
        sa.Column(
            "prime_contractor",
            sa.String(length=200),
            nullable=True,
            comment="Contratista principal (UTE o empresa)",
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="produccion",
            comment="'planificacion', 'rfp', 'firma', 'desarrollo', "
                    "'produccion', 'entrega', 'operacion', 'retiro', 'cancelado'",
        ),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("planned_end_date", sa.Date, nullable=True),
        sa.Column(
            "budget_committed_eur",
            sa.BigInteger,
            nullable=True,
            comment="Presupuesto total comprometido España (€)",
        ),
        sa.Column(
            "budget_executed_eur",
            sa.BigInteger,
            nullable=True,
            comment="Pagos certificados a fecha (€)",
        ),
        sa.Column("units_planned", sa.Integer, nullable=True),
        sa.Column("units_delivered", sa.Integer, nullable=True),
        sa.Column(
            "next_milestone",
            sa.String(length=300),
            nullable=True,
            comment="Próximo hito clave (firma, primer vuelo, entrega...)",
        ),
        sa.Column(
            "next_milestone_date",
            sa.Date,
            nullable=True,
            comment="Fecha del próximo hito",
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("url_oficial", sa.String(length=500), nullable=True),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (cronograma, riesgos, exportaciones…)",
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
    op.create_index("ix_defense_programs_domain", "defense_programs", ["domain"])
    op.create_index("ix_defense_programs_kind", "defense_programs", ["kind"])
    op.create_index("ix_defense_programs_status", "defense_programs", ["status"])
    op.create_index("ix_defense_programs_framework", "defense_programs", ["framework"])


def downgrade() -> None:
    op.drop_index("ix_defense_programs_framework", table_name="defense_programs")
    op.drop_index("ix_defense_programs_status", table_name="defense_programs")
    op.drop_index("ix_defense_programs_kind", table_name="defense_programs")
    op.drop_index("ix_defense_programs_domain", table_name="defense_programs")
    op.drop_table("defense_programs")
