"""Tablas para microdatos de encuestas propias y análisis de cohortes.

Revision ID: 0010_microdatos_encuesta
Revises: 0007_validacion_results
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_microdatos_encuesta"
down_revision: Union[str, None] = "0007_validacion_results"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Estudios / Encuestas cargadas ─────────────────────────────────────────
    op.create_table(
        "microdatos_estudios",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("codigo_estudio", sa.String(50), nullable=False),
        sa.Column("titulo", sa.String(500)),
        sa.Column("fuente", sa.String(100)),          # "CIS", "Propio", "Externo"
        sa.Column("fecha_campo_inicio", sa.Date),
        sa.Column("fecha_campo_fin", sa.Date),
        sa.Column("n_registros", sa.Integer),
        sa.Column("n_variables", sa.Integer),
        sa.Column("archivo_bronze", sa.Text),         # ruta parquet en bronze
        sa.Column("variables_json", sa.Text),         # lista de variables disponibles
        sa.Column("descripcion", sa.Text),
        sa.Column("activo", sa.Boolean, server_default=sa.text("true")),
        sa.Column("uploaded_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("codigo_estudio", name="uq_microdatos_codigo_estudio"),
    )

    # ── Cohortes definidos y pre-calculados ───────────────────────────────────
    op.create_table(
        "microdatos_cohortes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("estudio_id", sa.Integer, sa.ForeignKey("microdatos_estudios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text),
        # Criterios de filtrado (serializado como JSON)
        sa.Column("criterios_json", sa.Text),
        # Estadísticos del cohorte
        sa.Column("n_respondentes", sa.Integer),
        sa.Column("peso_ponderado", sa.Numeric(12, 4)),
        sa.Column("peso_pct_sobre_total", sa.Numeric(6, 3)),
        # Variables clave del cohorte
        sa.Column("escideol_media", sa.Numeric(5, 2)),
        sa.Column("escideol_std", sa.Numeric(5, 2)),
        sa.Column("edad_media", sa.Numeric(5, 1)),
        # Distribuciones serializadas
        sa.Column("distribucion_voto_json", sa.Text),       # {partido: pct, ...}
        sa.Column("distribucion_ideo_json", sa.Text),       # {1:pct, 2:pct, ...}
        sa.Column("distribucion_sexo_json", sa.Text),
        sa.Column("distribucion_estudios_json", sa.Text),
        sa.Column("distribucion_ccaa_json", sa.Text),
        sa.Column("distribucion_edad_json", sa.Text),
        sa.Column("preocupaciones_json", sa.Text),
        # Perfil LLM generado
        sa.Column("perfil_llm_prompt", sa.Text),
        sa.Column("computed_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_cohortes_estudio", "microdatos_cohortes", ["estudio_id"])

    # ── Análisis de contingencia entre variables ──────────────────────────────
    op.create_table(
        "microdatos_contingencias",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("estudio_id", sa.Integer, sa.ForeignKey("microdatos_estudios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("var_fila", sa.String(100), nullable=False),
        sa.Column("var_columna", sa.String(100), nullable=False),
        sa.Column("chi2", sa.Numeric(14, 4)),
        sa.Column("p_valor", sa.Numeric(14, 10)),
        sa.Column("tau_gk", sa.Numeric(8, 6)),         # Goodman-Kruskal tau
        sa.Column("cramer_v", sa.Numeric(8, 6)),
        sa.Column("tabla_json", sa.Text),              # tabla contingencia normalizada
        sa.Column("computed_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("estudio_id", "var_fila", "var_columna", name="uq_contingencia_vars"),
    )
    op.create_index("ix_contingencias_estudio", "microdatos_contingencias", ["estudio_id"])

    # ── Perfiles de votante derivados de microdatos ───────────────────────────
    # (complementa o reemplaza la tabla perfiles_votante con datos reales)
    op.create_table(
        "microdatos_perfiles_votante",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("estudio_id", sa.Integer, sa.ForeignKey("microdatos_estudios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cohorte_id", sa.Integer, sa.ForeignKey("microdatos_cohortes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("etiqueta", sa.String(150), nullable=False),
        sa.Column("peso_electoral_pct", sa.Numeric(6, 3)),
        sa.Column("n_respondentes", sa.Integer),
        sa.Column("edad_media", sa.Numeric(5, 1)),
        sa.Column("edad_rango", sa.String(50)),
        sa.Column("escideol_media", sa.Numeric(5, 2)),
        sa.Column("ideo_label", sa.String(50)),
        sa.Column("intencion_voto_json", sa.Text),     # {partido: pct}
        sa.Column("preocupaciones_json", sa.Text),     # [(tema, pct), ...]
        sa.Column("distribucion_ccaa_json", sa.Text),
        sa.Column("micro_eco_json", sa.Text),
        sa.Column("descripcion_perfil", sa.Text),
        sa.Column("prompt_llm", sa.Text),              # prompt listo para LLM
        sa.Column("fuente_datos", sa.String(200)),     # "microdatos:estudio_XXX"
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_md_perfiles_estudio", "microdatos_perfiles_votante", ["estudio_id"])


def downgrade() -> None:
    op.drop_index("ix_md_perfiles_estudio")
    op.drop_index("ix_contingencias_estudio")
    op.drop_index("ix_cohortes_estudio")
    op.drop_table("microdatos_perfiles_votante")
    op.drop_table("microdatos_contingencias")
    op.drop_table("microdatos_cohortes")
    op.drop_table("microdatos_estudios")
