"""Tablas tiempo real: scraping, alertas, tracking encuestas prensa, cache HTTP.

Revision ID: 0005_realtime_tables
Revises: 0004_fase3_simulaciones
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_realtime_tables"
down_revision: Union[str, None] = "0004_fase3_simulaciones"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scraping_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fuente", sa.String(length=100), nullable=False),
        sa.Column("tipo", sa.String(length=50)),
        sa.Column("url", sa.Text()),
        sa.Column("estado", sa.String(length=20)),
        sa.Column("n_registros_nuevos", sa.Integer(), server_default=sa.text("0")),
        sa.Column("n_registros_duplicados", sa.Integer(), server_default=sa.text("0")),
        sa.Column("error_mensaje", sa.Text()),
        sa.Column("duracion_segundos", sa.Numeric(8, 3)),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "alertas_sistema",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tipo", sa.String(length=50)),
        sa.Column("severidad", sa.String(length=20)),
        sa.Column("titulo", sa.String(length=200)),
        sa.Column("descripcion", sa.Text()),
        sa.Column("datos_json", sa.Text()),
        sa.Column("leida", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "encuestas_tracking",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("url_fuente", sa.Text(), nullable=False),
        sa.Column("titular", sa.Text()),
        sa.Column("casa_encuestadora", sa.String(length=100)),
        sa.Column("fecha_publicacion", sa.Date()),
        sa.Column("fecha_campo_inicio", sa.Date()),
        sa.Column("fecha_campo_fin", sa.Date()),
        sa.Column("n_entrevistas", sa.Integer()),
        sa.Column("partido_datos_json", sa.Text()),
        sa.Column("confianza_parseo", sa.Numeric(4, 3)),
        sa.Column("procesada", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("url_fuente", name="uq_encuestas_tracking_url_fuente"),
    )

    op.create_table(
        "cache_http",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("url_hash", sa.String(length=64), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("respuesta_body", sa.Text()),
        sa.Column("content_type", sa.String(length=100)),
        sa.Column("status_code", sa.Integer()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("expires_at", sa.TIMESTAMP(), nullable=False),
        sa.UniqueConstraint("url_hash", name="uq_cache_http_url_hash"),
    )


def downgrade() -> None:
    op.drop_table("cache_http")
    op.drop_table("encuestas_tracking")
    op.drop_table("alertas_sistema")
    op.drop_table("scraping_log")
