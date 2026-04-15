"""Tablas de salida Fase 2 (modelos, agregados, riesgo, escenarios).

Revision ID: 0002_fase2_output_tables
Revises: 0001_baseline
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_fase2_output_tables"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "perfiles_votante",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cluster_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=100)),
        sa.Column("n_respondentes", sa.Integer()),
        sa.Column("peso_demografico_pct", sa.Numeric(6, 3)),
        sa.Column("edad_media", sa.Numeric(5, 1)),
        sa.Column("ideologia_media", sa.Numeric(4, 2)),
        sa.Column("distribucion_voto_json", sa.Text()),
        sa.Column("descripcion_perfil_llm", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("cluster_id", name="uq_perfiles_votante_cluster_id"),
    )

    op.create_table(
        "estimaciones_voto_agregadas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fecha_estimacion", sa.Date(), nullable=False),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("estimacion_pct", sa.Numeric(6, 3)),
        sa.Column("ic_95_inf", sa.Numeric(6, 3)),
        sa.Column("ic_95_sup", sa.Numeric(6, 3)),
        sa.Column("n_encuestas", sa.Integer()),
        sa.Column("modelo", sa.String(length=50)),
        sa.Column("ventana_dias", sa.Integer()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.UniqueConstraint(
            "fecha_estimacion",
            "partido_id",
            "modelo",
            name="uq_estimaciones_voto_fecha_partido_modelo",
        ),
    )

    op.create_table(
        "volatilidad_electoral_historica",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("eleccion_anterior", sa.Date()),
        sa.Column("eleccion_actual", sa.Date(), nullable=False),
        sa.Column("volatilidad_total", sa.Numeric(6, 3)),
        sa.Column("volatilidad_bloques", sa.Numeric(6, 3)),
        sa.Column("volatilidad_interna", sa.Numeric(6, 3)),
        sa.Column("interpretacion", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.UniqueConstraint(
            "eleccion_anterior",
            "eleccion_actual",
            name="uq_volatilidad_par_elecciones",
        ),
    )

    op.create_table(
        "informes_riesgo_politico",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fecha_calculo", sa.TIMESTAMP()),
        sa.Column("indice_compuesto", sa.Numeric(5, 2)),
        sa.Column("semaforo", sa.String(length=20)),
        sa.Column("dimensiones_json", sa.Text()),
        sa.Column("drivers_json", sa.Text()),
        sa.Column("recomendaciones_json", sa.Text()),
    )

    op.create_table(
        "escenarios_generados",
        sa.Column("id", sa.String(length=20), primary_key=True),
        sa.Column("nombre", sa.String(length=200)),
        sa.Column("probabilidad", sa.Numeric(8, 6)),
        sa.Column("coherencia", sa.Numeric(5, 3)),
        sa.Column("estados_json", sa.Text()),
        sa.Column("descripcion_narrativa", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "simulaciones_mc_escanos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fecha_simulacion", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("n_simulaciones", sa.Integer()),
        sa.Column("escanos_media", sa.Numeric(6, 2)),
        sa.Column("escanos_mediana", sa.Numeric(6, 2)),
        sa.Column("escanos_p5", sa.Numeric(6, 2)),
        sa.Column("escanos_p25", sa.Numeric(6, 2)),
        sa.Column("escanos_p75", sa.Numeric(6, 2)),
        sa.Column("escanos_p95", sa.Numeric(6, 2)),
        sa.Column("prob_mayoria_absoluta", sa.Numeric(6, 4)),
        sa.Column("prob_primer_partido", sa.Numeric(6, 4)),
        sa.Column(
            "escenario_id",
            sa.String(length=20),
            sa.ForeignKey("escenarios_generados.id"),
            nullable=True,
        ),
    )

    op.create_table(
        "stress_test_resultados",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fecha_test", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("escenario_nombre", sa.String(length=100)),
        sa.Column("coalicion_analizada", sa.Text()),
        sa.Column("escanos_base", sa.Numeric(6, 2)),
        sa.Column("escanos_stress", sa.Numeric(6, 2)),
        sa.Column("perdida_escanos", sa.Numeric(6, 2)),
        sa.Column("pierden_mayoria", sa.Boolean()),
        sa.Column("riesgo_ruptura_coalicion", sa.Numeric(5, 3)),
        sa.Column("vare_95", sa.Numeric(6, 2)),
        sa.Column("riesgo_compuesto", sa.Numeric(8, 3)),
    )

    op.create_table(
        "analisis_coaliciones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "eleccion_id",
            sa.Integer(),
            sa.ForeignKey("elecciones.id"),
            nullable=True,
        ),
        sa.Column("partidos_coalicion", sa.Text()),
        sa.Column("escanos_totales", sa.Integer()),
        sa.Column("n_partidos", sa.Integer()),
        sa.Column("distancia_ideologica", sa.Numeric(6, 3)),
        sa.Column("valor_shapley_total", sa.Numeric(6, 4)),
        sa.Column("score_viabilidad", sa.Numeric(7, 3)),
        sa.Column("es_minima", sa.Boolean()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "dafo_partidos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("fecha_calculo", sa.Date(), nullable=False),
        sa.Column("score_interno", sa.Numeric(5, 3)),
        sa.Column("score_externo", sa.Numeric(5, 3)),
        sa.Column("cuadrante", sa.String(length=20)),
        sa.Column("fortalezas_json", sa.Text()),
        sa.Column("debilidades_json", sa.Text()),
        sa.Column("oportunidades_json", sa.Text()),
        sa.Column("amenazas_json", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("dafo_partidos")
    op.drop_table("analisis_coaliciones")
    op.drop_table("stress_test_resultados")
    op.drop_table("simulaciones_mc_escanos")
    op.drop_table("escenarios_generados")
    op.drop_table("informes_riesgo_politico")
    op.drop_table("volatilidad_electoral_historica")
    op.drop_table("estimaciones_voto_agregadas")
    op.drop_table("perfiles_votante")
