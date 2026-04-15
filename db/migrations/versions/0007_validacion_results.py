"""Tabla de resultados de validación y métricas del modelo.

Revision ID: 0007_validacion_results
Revises: 0006_realtime_extras
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_validacion_results"
down_revision: Union[str, None] = "0006_realtime_extras"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Resultados agregados de cada ejecución de validación
    op.create_table(
        "resultados_validacion",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(64), nullable=False, unique=True),
        sa.Column("tipo", sa.String(50), nullable=False),  # backtesting|calibracion|calidad
        sa.Column("modelo", sa.String(100)),
        sa.Column("eleccion_objetivo", sa.String(50)),  # e.g. "generales_2023"
        # Métricas principales
        sa.Column("brier_score", sa.Numeric(8, 6)),
        sa.Column("rmse_voto", sa.Numeric(8, 4)),
        sa.Column("mae_escanos", sa.Numeric(8, 4)),
        sa.Column("cobertura_95ci", sa.Numeric(5, 3)),
        sa.Column("crps", sa.Numeric(8, 6)),
        # Calibración de agentes
        sa.Column("ks_stat_ideologia", sa.Numeric(8, 6)),
        sa.Column("ks_pvalue_ideologia", sa.Numeric(8, 6)),
        sa.Column("mad_intencion_voto", sa.Numeric(8, 4)),
        # Calidad de datos
        sa.Column("pct_completitud", sa.Numeric(5, 2)),
        sa.Column("n_checks_ok", sa.Integer),
        sa.Column("n_checks_fail", sa.Integer),
        # Resultado serializado completo
        sa.Column("detalle_json", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
    )

    # Métricas por partido (para backtesting granular)
    op.create_table(
        "validacion_por_partido",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(64), sa.ForeignKey("resultados_validacion.run_id"), nullable=False),
        sa.Column("partido_siglas", sa.String(20), nullable=False),
        sa.Column("eleccion_id", sa.Integer, sa.ForeignKey("elecciones.id")),
        sa.Column("voto_real_pct", sa.Numeric(6, 3)),
        sa.Column("voto_pred_pct", sa.Numeric(6, 3)),
        sa.Column("error_pct", sa.Numeric(6, 3)),
        sa.Column("escanos_reales", sa.Integer),
        sa.Column("escanos_pred_mediana", sa.Numeric(6, 1)),
        sa.Column("escanos_pred_p5", sa.Integer),
        sa.Column("escanos_pred_p95", sa.Integer),
        sa.Column("brier_score", sa.Numeric(8, 6)),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
    )

    op.create_index("ix_resultados_validacion_tipo", "resultados_validacion", ["tipo"])
    op.create_index("ix_resultados_validacion_created", "resultados_validacion", ["created_at"])
    op.create_index("ix_validacion_partido_run", "validacion_por_partido", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_validacion_partido_run")
    op.drop_index("ix_resultados_validacion_created")
    op.drop_index("ix_resultados_validacion_tipo")
    op.drop_table("validacion_por_partido")
    op.drop_table("resultados_validacion")
