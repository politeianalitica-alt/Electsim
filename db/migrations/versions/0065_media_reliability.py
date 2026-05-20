"""media_reliability table (MBFC dataset · Sprint 2 · S2.3)

Tabla con 3920 medios etiquetados con:
  - bias (left / left-center / neutral / right-center / right)
  - factual_reporting (high / mixed / low)

Origen: Media Bias/Fact Check (MBFC) via repo Factual-Reporting-and-
Political-Bias-Web-Interactions (CLEF 2023).

Carga inicial: scripts/load_mbfc.py importa data/media_reliability/mbfc.csv
tras aplicar la migracion.

Uso en pipeline:
  - Cuando un NormalizedItem llega con source='rss' y URL conocida, el
    OntologyMapper consulta media_reliability(host) → enriquece con
    media_bias y media_factuality. Permite al cliente:
      a) Filtrar feed por nivel de fiabilidad
      b) Tabla comparativa "X medio dice esto, Y medio dice otra cosa"
      c) Score de confianza ponderado por reputacion del medio

Revision ID: 0065_media_reliability
Revises: 0064_analyst_memory
"""
from alembic import op
import sqlalchemy as sa


revision = "0065_media_reliability"
down_revision = "0064_analyst_memory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_reliability",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "source",
            sa.String(length=240),
            nullable=False,
            unique=True,
            comment="Host del medio (ej. 'elpais.com', '9news.com')",
        ),
        sa.Column(
            "bias",
            sa.String(length=24),
            nullable=False,
            comment="left / left-center / neutral / right-center / right",
        ),
        sa.Column(
            "factual_reporting",
            sa.String(length=16),
            nullable=False,
            comment="high / mixed / low",
        ),
        sa.Column(
            "dataset",
            sa.String(length=40),
            nullable=False,
            server_default="mbfc",
            comment="Origen del dato · 'mbfc' por defecto · permite añadir otros datasets",
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
        "ix_media_reliability_source",
        "media_reliability",
        ["source"],
        unique=True,
    )
    op.create_index(
        "ix_media_reliability_bias",
        "media_reliability",
        ["bias"],
    )
    op.create_index(
        "ix_media_reliability_factual",
        "media_reliability",
        ["factual_reporting"],
    )


def downgrade() -> None:
    op.drop_index("ix_media_reliability_factual", table_name="media_reliability")
    op.drop_index("ix_media_reliability_bias", table_name="media_reliability")
    op.drop_index("ix_media_reliability_source", table_name="media_reliability")
    op.drop_table("media_reliability")
