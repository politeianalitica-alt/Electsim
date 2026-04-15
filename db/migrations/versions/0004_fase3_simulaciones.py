"""Tablas de simulación Fase 3 (encuesta, campaña, propagación red).

Revision ID: 0004_fase3_simulaciones
Revises: 0003_agent_memory_log
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_fase3_simulaciones"
down_revision: Union[str, None] = "0003_agent_memory_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "simulaciones_encuesta",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(length=200)),
        sa.Column("fecha_simulacion", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("n_perfiles", sa.Integer()),
        sa.Column("uso_rag", sa.Boolean()),
        sa.Column("preguntas_json", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "simulaciones_campana",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("partido_emisor", sa.String(length=20)),
        sa.Column("texto_mensaje", sa.Text()),
        sa.Column("tipo", sa.String(length=30)),
        sa.Column("tema", sa.String(length=30)),
        sa.Column("fecha_simulacion", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("receptividad_media", sa.Numeric(5, 3)),
        sa.Column("cambio_intencion_medio", sa.Numeric(5, 3)),
        sa.Column("analisis_json", sa.Text()),
        sa.Column("n_perfiles", sa.Integer()),
    )

    op.create_table(
        "propagaciones_red",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "simulacion_campana_id",
            sa.Integer(),
            sa.ForeignKey("simulaciones_campana.id"),
            nullable=True,
        ),
        sa.Column("fecha_simulacion", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("n_iteraciones", sa.Integer()),
        sa.Column("resultados_json", sa.Text()),
        sa.Column("metricas_red_json", sa.Text()),
    )


def downgrade() -> None:
    op.drop_table("propagaciones_red")
    op.drop_table("simulaciones_campana")
    op.drop_table("simulaciones_encuesta")
