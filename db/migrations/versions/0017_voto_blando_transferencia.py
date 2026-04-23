"""voto_blando_resultados and transferencia_voto tables.

Revision ID: 0017_voto_blando_transferencia
Revises: 0016_impacto_campana
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "0017_voto_blando_transferencia"
down_revision: Union[str, None] = "0016_impacto_campana"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voto_blando_resultados",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo_eleccion", sa.Text(), nullable=False, server_default=sa.text("'generales'")),
        sa.Column("partido_ref", sa.Text(), nullable=False),
        sa.Column("circunscripcion", sa.Text(), nullable=False),
        sa.Column("segmento_edad", sa.Text(), nullable=True),
        sa.Column("segmento_estudios", sa.Text(), nullable=True),
        sa.Column("segmento_ideologia", sa.Text(), nullable=True),
        sa.Column("score_medio_blando", sa.Numeric(6, 4), nullable=True),
        sa.Column("pct_voto_blando", sa.Numeric(6, 4), nullable=True),
        sa.Column("pct_probable_abst", sa.Numeric(6, 4), nullable=True),
        sa.Column("pct_transferible", sa.Numeric(6, 4), nullable=True),
        sa.Column("etiqueta", sa.Text(), nullable=True),
        sa.Column("n_electores_est", sa.Integer(), nullable=True),
        sa.Column("contribuciones_json", JSONB, nullable=True),
        sa.Column("calculado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index(
        "ix_vb_partido_circ",
        "voto_blando_resultados",
        ["partido_ref", "circunscripcion"],
    )
    op.create_index(
        "ix_vb_tipo_eleccion",
        "voto_blando_resultados",
        ["tipo_eleccion"],
    )

    op.create_table(
        "transferencia_voto",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo_eleccion", sa.Text(), nullable=False, server_default=sa.text("'generales'")),
        sa.Column("partido_origen", sa.Text(), nullable=False),
        sa.Column("partido_destino", sa.Text(), nullable=False),
        sa.Column("circunscripcion", sa.Text(), nullable=True),
        sa.Column("prob_transferencia", sa.Numeric(6, 4), nullable=True),
        sa.Column("votos_captables_est", sa.Integer(), nullable=True),
        sa.Column("metodo", sa.Text(), nullable=True),
        sa.Column("calculado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index(
        "ix_tv_origen_destino",
        "transferencia_voto",
        ["partido_origen", "partido_destino"],
    )


def downgrade() -> None:
    op.drop_index("ix_tv_origen_destino", table_name="transferencia_voto")
    op.drop_table("transferencia_voto")

    op.drop_index("ix_vb_tipo_eleccion", table_name="voto_blando_resultados")
    op.drop_index("ix_vb_partido_circ", table_name="voto_blando_resultados")
    op.drop_table("voto_blando_resultados")
