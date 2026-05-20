"""pharma_signals table (Sprint 8 · S8.3 · sector Farma)

Tracker de señales farmacéuticas operativas para clientes IBEX (Almirall,
Grifols, Rovi, Reig Jofre, PharmaMar, Faes Farma) y compradores institucionales:

  - Problemas de suministro (AEMPS/EMA) · medicamentos críticos
  - Retiradas de lote / defectos calidad
  - Nuevas autorizaciones EPAR · ventana competitiva
  - Referrals / safety reviews · revisiones de seguridad europeas
  - Genéricos · entrada al mercado

Cada señal tiene:
  - source (aemps/ema)
  - signal_kind ('shortage', 'recall', 'epar', 'referral', 'genericization')
  - producto / principio activo
  - severity (info/medium/high/critical)
  - status (active/resolved/monitoring)
  - fechas (detected_at, resolved_at)

Revision ID: 0068_pharma_signals
Revises: 0067_regulatory_obligations
"""
from alembic import op
import sqlalchemy as sa


revision = "0068_pharma_signals"
down_revision = "0067_regulatory_obligations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pharma_signals",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
            unique=True,
            comment="Identificador estable (ej. 'aemps_psum_12345', 'ema_epar_xyz')",
        ),
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            comment="'aemps', 'ema', 'fda', 'manual'",
        ),
        sa.Column(
            "signal_kind",
            sa.String(length=30),
            nullable=False,
            comment="'shortage', 'recall', 'epar', 'referral', 'genericization', 'pricing'",
        ),
        sa.Column("product_name", sa.String(length=300), nullable=False),
        sa.Column(
            "active_principle",
            sa.String(length=200),
            nullable=True,
            comment="Principio activo (DCI)",
        ),
        sa.Column(
            "lab_holder",
            sa.String(length=200),
            nullable=True,
            comment="Laboratorio titular autorización",
        ),
        sa.Column(
            "atc_code",
            sa.String(length=20),
            nullable=True,
            comment="Anatomical Therapeutic Chemical (ATC) code",
        ),
        sa.Column(
            "severity",
            sa.String(length=16),
            nullable=False,
            server_default="medium",
            comment="'info' / 'medium' / 'high' / 'critical'",
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
            comment="'active' / 'resolved' / 'monitoring' / 'archived'",
        ),
        sa.Column("detected_at", sa.Date, nullable=False),
        sa.Column("resolved_at", sa.Date, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "url_oficial",
            sa.String(length=500),
            nullable=True,
            comment="Link a ficha CIMA / EPAR / nota",
        ),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Datos extra (nregistro, dosis, vías, motivo, sustitutos...)",
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
    op.create_index("ix_pharma_signals_source", "pharma_signals", ["source"])
    op.create_index("ix_pharma_signals_kind", "pharma_signals", ["signal_kind"])
    op.create_index("ix_pharma_signals_status", "pharma_signals", ["status"])
    op.create_index("ix_pharma_signals_detected", "pharma_signals", ["detected_at"])


def downgrade() -> None:
    op.drop_index("ix_pharma_signals_detected", table_name="pharma_signals")
    op.drop_index("ix_pharma_signals_status", table_name="pharma_signals")
    op.drop_index("ix_pharma_signals_kind", table_name="pharma_signals")
    op.drop_index("ix_pharma_signals_source", table_name="pharma_signals")
    op.drop_table("pharma_signals")
