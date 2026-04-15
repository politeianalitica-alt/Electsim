"""Columnas extra: elecciones (feed escrutinio), indicadores (fuente), resultados parciales.

Revision ID: 0006_realtime_extras
Revises: 0005_realtime_tables
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_realtime_extras"
down_revision: Union[str, None] = "0005_realtime_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("elecciones", sa.Column("es_activa", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("elecciones", sa.Column("url_feed_interior", sa.Text()))
    op.add_column(
        "elecciones",
        sa.Column("pct_escrutado_maximo", sa.Numeric(5, 2), server_default=sa.text("0")),
    )

    op.add_column("indicadores_macroeconomicos", sa.Column("fuente", sa.String(length=50)))
    op.add_column(
        "indicadores_macroeconomicos",
        sa.Column("es_preliminar", sa.Boolean(), server_default=sa.text("false")),
    )
    op.add_column("indicadores_macroeconomicos", sa.Column("url_fuente", sa.Text()))
    op.add_column("indicadores_macroeconomicos", sa.Column("tasa_paro", sa.Numeric(6, 3)))
    op.add_column(
        "indicadores_macroeconomicos",
        sa.Column("precio_luz_kwh_residencial", sa.Numeric(12, 6)),
    )

    op.add_column("resultados_electorales", sa.Column("pct_escrutado", sa.Numeric(5, 2)))
    op.add_column("resultados_electorales", sa.Column("timestamp_parcial", sa.TIMESTAMP()))


def downgrade() -> None:
    op.drop_column("resultados_electorales", "timestamp_parcial")
    op.drop_column("resultados_electorales", "pct_escrutado")
    op.drop_column("indicadores_macroeconomicos", "precio_luz_kwh_residencial")
    op.drop_column("indicadores_macroeconomicos", "tasa_paro")
    op.drop_column("indicadores_macroeconomicos", "url_fuente")
    op.drop_column("indicadores_macroeconomicos", "es_preliminar")
    op.drop_column("indicadores_macroeconomicos", "fuente")
    op.drop_column("elecciones", "pct_escrutado_maximo")
    op.drop_column("elecciones", "url_feed_interior")
    op.drop_column("elecciones", "es_activa")
