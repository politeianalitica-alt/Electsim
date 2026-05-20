"""regulatory_obligations table (Sprint 7 · S7.3 · banca/seguros + cross-sector)

Tracker de obligaciones regulatorias con plazos clave para clientes IBEX.

Sectores cubiertos en seed:
  - Banca: DORA, Basel IV/CRR3-CRD6, MiCA, PSD3, Solvencia II revisión
  - Telecom/Digital: AI Act, DMA, DSA, NIS2, Data Act
  - Vivienda: Ley Vivienda 2023 (ZMT, IMV)
  - Energía: Fit for 55, CSRD (ESG reporting)
  - Cross-sector: GDPR/RGPD, ESG taxonomy, Whistleblower directive

Cada obligación tiene:
  - jurisdicción (ES/EU/internacional)
  - fechas (publication, entry_into_force, deadline)
  - estado (open/in_progress/completed)
  - severidad de incumplimiento (info/medium/high/critical)

Revision ID: 0067_regulatory_obligations
Revises: 0066_party_positions
"""
from alembic import op
import sqlalchemy as sa


revision = "0067_regulatory_obligations"
down_revision = "0066_party_positions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "regulatory_obligations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=80),
            nullable=False,
            unique=True,
            comment="Identificador legible (ej. 'dora', 'basel_iv', 'ai_act')",
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column(
            "sector",
            sa.String(length=40),
            nullable=False,
            comment="'banca', 'telecom', 'energia', 'vivienda', 'cross'",
        ),
        sa.Column(
            "jurisdiction",
            sa.String(length=20),
            nullable=False,
            server_default="EU",
            comment="'ES', 'EU', 'INT' (internacional)",
        ),
        sa.Column(
            "regulator",
            sa.String(length=120),
            nullable=True,
            comment="EBA, EIOPA, ESMA, CNMV, BdE, Comisión Europea, MITECO...",
        ),
        sa.Column(
            "publication_date",
            sa.Date,
            nullable=True,
            comment="Fecha publicación oficial",
        ),
        sa.Column(
            "entry_into_force",
            sa.Date,
            nullable=True,
            comment="Fecha entrada en vigor",
        ),
        sa.Column(
            "compliance_deadline",
            sa.Date,
            nullable=True,
            comment="Plazo final para cumplir · si null = aplicable desde entry_into_force",
        ),
        sa.Column(
            "severity",
            sa.String(length=16),
            nullable=False,
            server_default="medium",
            comment="'info' / 'medium' / 'high' / 'critical' · severidad incumplimiento",
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="open",
            comment="'open' / 'in_progress' / 'completed' / 'deprecated'",
        ),
        sa.Column(
            "summary",
            sa.Text,
            nullable=True,
            comment="Resumen ejecutivo (3-5 frases)",
        ),
        sa.Column(
            "url_oficial",
            sa.String(length=500),
            nullable=True,
            comment="Link a texto oficial (EUR-Lex, BOE, web del regulador)",
        ),
        sa.Column(
            "checklist",
            sa.JSON,
            nullable=True,
            comment="Lista de requisitos como JSON [{id, text, done}, ...]",
        ),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra del sector (entidades obligadas, importes, etc.)",
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
    op.create_index(
        "ix_regulatory_obligations_sector",
        "regulatory_obligations",
        ["sector"],
    )
    op.create_index(
        "ix_regulatory_obligations_deadline",
        "regulatory_obligations",
        ["compliance_deadline"],
    )
    op.create_index(
        "ix_regulatory_obligations_status",
        "regulatory_obligations",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_regulatory_obligations_status", table_name="regulatory_obligations")
    op.drop_index("ix_regulatory_obligations_deadline", table_name="regulatory_obligations")
    op.drop_index("ix_regulatory_obligations_sector", table_name="regulatory_obligations")
    op.drop_table("regulatory_obligations")
