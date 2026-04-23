"""impacto_campana tables.

Revision ID: 0016_impacto_campana
Revises: 0015_tracker_narrativas
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "0016_impacto_campana"
down_revision: Union[str, None] = "0015_tracker_narrativas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "eventos_campana",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("localizacion", sa.Text(), nullable=True),
        sa.Column("ccaa", sa.Text(), nullable=True),
        sa.Column("provincia", sa.Text(), nullable=True),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=True),
        sa.Column("coste_estimado_eur", sa.Numeric(14, 2), nullable=True),
        sa.Column("alcance_estimado", sa.Integer(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_eventos_campana_fecha", "eventos_campana", ["fecha_inicio"])
    op.create_index("idx_eventos_campana_cliente", "eventos_campana", ["cliente_id"])

    op.create_table(
        "impacto_evento_snapshot",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("evento_id", sa.Integer(), sa.ForeignKey("eventos_campana.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ventana", sa.Text(), nullable=False),
        sa.Column("fecha_snapshot", sa.Date(), nullable=False),
        sa.Column("partido", sa.Text(), nullable=True),
        sa.Column("intencion_voto_pct", sa.Numeric(6, 3), nullable=True),
        sa.Column("valoracion_lider", sa.Numeric(6, 3), nullable=True),
        sa.Column("conocimiento_pct", sa.Numeric(6, 3), nullable=True),
        sa.Column("menciones_prensa", sa.Integer(), nullable=True),
        sa.Column("menciones_rrss", sa.Integer(), nullable=True),
        sa.Column("sentiment_medio", sa.Numeric(5, 3), nullable=True),
        sa.Column("engagement_rrss", sa.Integer(), nullable=True),
        sa.Column("datos_adicionales", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index(
        "idx_snapshot_evento_ventana",
        "impacto_evento_snapshot",
        ["evento_id", "ventana", "fecha_snapshot"],
    )

    op.create_table(
        "impacto_evento_resultado",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("evento_id", sa.Integer(), sa.ForeignKey("eventos_campana.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metrica", sa.Text(), nullable=False),
        sa.Column("delta_absoluto", sa.Numeric(10, 4), nullable=True),
        sa.Column("delta_relativo_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("coste_por_punto", sa.Numeric(14, 4), nullable=True),
        sa.Column("metodo", sa.Text(), nullable=True),
        sa.Column("intervalo_inf", sa.Numeric(10, 4), nullable=True),
        sa.Column("intervalo_sup", sa.Numeric(10, 4), nullable=True),
        sa.Column("confianza", sa.Numeric(6, 3), nullable=True),
        sa.Column("calculado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("evento_id", "metrica", name="uq_impacto_evento_metrica"),
    )
    op.create_index(
        "idx_resultado_evento_metrica",
        "impacto_evento_resultado",
        ["evento_id", "metrica"],
    )


def downgrade() -> None:
    op.drop_index("idx_resultado_evento_metrica", table_name="impacto_evento_resultado")
    op.drop_table("impacto_evento_resultado")

    op.drop_index("idx_snapshot_evento_ventana", table_name="impacto_evento_snapshot")
    op.drop_table("impacto_evento_snapshot")

    op.drop_index("idx_eventos_campana_cliente", table_name="eventos_campana")
    op.drop_index("idx_eventos_campana_fecha", table_name="eventos_campana")
    op.drop_table("eventos_campana")
