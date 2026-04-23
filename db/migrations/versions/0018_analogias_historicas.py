"""historical analogies tables.

Revision ID: 0018_analogias_historicas
Revises: 0017_voto_blando_transferencia
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "0018_analogias_historicas"
down_revision: Union[str, None] = "0017_voto_blando_transferencia"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "elecciones_historicas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("pais", sa.Text(), nullable=False),
        sa.Column("anio", sa.SmallInteger(), nullable=False),
        sa.Column("mes", sa.SmallInteger(), nullable=True),
        sa.Column("tipo", sa.Text(), nullable=False, server_default=sa.text("'generales'")),
        sa.Column("nombre_ref", sa.Text(), nullable=False),
        sa.Column("pib_crecimiento", sa.Numeric(6, 2), nullable=True),
        sa.Column("tasa_paro", sa.Numeric(5, 2), nullable=True),
        sa.Column("inflacion", sa.Numeric(5, 2), nullable=True),
        sa.Column("deficit_pib", sa.Numeric(5, 2), nullable=True),
        sa.Column("satisfaccion_eco", sa.Numeric(4, 2), nullable=True),
        sa.Column("incumbente_anios", sa.SmallInteger(), nullable=True),
        sa.Column("aprobacion_gobierno", sa.Numeric(5, 2), nullable=True),
        sa.Column("fragmentacion_pre", sa.Numeric(4, 2), nullable=True),
        sa.Column("polarizacion", sa.Numeric(4, 3), nullable=True),
        sa.Column("escandalo_mayor", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("tension_territorial", sa.Numeric(4, 3), nullable=True),
        sa.Column("crisis_internacional", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("ganador", sa.Text(), nullable=True),
        sa.Column("pct_ganador", sa.Numeric(5, 2), nullable=True),
        sa.Column("participacion", sa.Numeric(5, 2), nullable=True),
        sa.Column("vuelco_gobierno", sa.Boolean(), nullable=True),
        sa.Column("volatilidad_total", sa.Numeric(5, 2), nullable=True),
        sa.Column("resultados_json", JSONB, nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("fuente", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("pais", "anio", "mes", "tipo", name="uq_eleccion"),
    )
    op.create_index("ix_eh_pais_anio", "elecciones_historicas", ["pais", "anio"])
    op.create_index("ix_eh_tipo", "elecciones_historicas", ["tipo"])

    op.create_table(
        "snapshots_analogia",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo_eleccion", sa.Text(), nullable=False, server_default=sa.text("'generales'")),
        sa.Column("contexto_json", JSONB, nullable=False),
        sa.Column("resultados_json", JSONB, nullable=False),
        sa.Column("proyeccion_json", JSONB, nullable=True),
        sa.Column("partido_ref", sa.Text(), nullable=True),
        sa.Column("calculado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_snapshots_analogia_calculado", "snapshots_analogia", ["calculado_en"])
    op.create_index("ix_snapshots_analogia_cliente", "snapshots_analogia", ["cliente_id", "tipo_eleccion"])


def downgrade() -> None:
    op.drop_index("ix_snapshots_analogia_cliente", table_name="snapshots_analogia")
    op.drop_index("ix_snapshots_analogia_calculado", table_name="snapshots_analogia")
    op.drop_table("snapshots_analogia")

    op.drop_index("ix_eh_tipo", table_name="elecciones_historicas")
    op.drop_index("ix_eh_pais_anio", table_name="elecciones_historicas")
    op.drop_table("elecciones_historicas")
