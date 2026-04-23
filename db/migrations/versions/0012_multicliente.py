"""multicliente tables and client columns.

Revision ID: 0012_multicliente
Revises: 0011_opposition_research
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0012_multicliente"
down_revision: Union[str, None] = "0011_opposition_research"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ADD_CLIENTE_COLUMN_SQL = """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '{table}'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = 'cliente_id'
        ) THEN
            EXECUTE 'ALTER TABLE {table} ADD COLUMN cliente_id INTEGER';
        END IF;
    END IF;
END $$;
"""


def upgrade() -> None:
    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("ambito", sa.Text(), nullable=True),
        sa.Column("config_json", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    for table in [
        "encuestas",
        "indicadores_macroeconomicos",
        "contenido_mediatico",
        "objetos_seguimiento",
        "alertas_sistema",
    ]:
        op.execute(_ADD_CLIENTE_COLUMN_SQL.format(table=table))

    op.create_table(
        "mensajes_campana",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fecha_inicio", sa.Date(), nullable=True),
        sa.Column("fecha_fin", sa.Date(), nullable=True),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("estado", sa.Text(), server_default=sa.text("'activo'")),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("autor", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "decisiones_estrategicas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("datos_contexto", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("resultado", sa.Text(), nullable=True),
        sa.Column("lecciones", sa.Text(), nullable=True),
        sa.Column("etiquetas", sa.ARRAY(sa.Text()), server_default=sa.text("'{}'")),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_index("ix_mensajes_campana_cliente_estado", "mensajes_campana", ["cliente_id", "estado"])
    op.create_index("ix_decisiones_cliente_fecha", "decisiones_estrategicas", ["cliente_id", "fecha"])


def downgrade() -> None:
    op.drop_index("ix_decisiones_cliente_fecha", table_name="decisiones_estrategicas")
    op.drop_index("ix_mensajes_campana_cliente_estado", table_name="mensajes_campana")
    op.drop_table("decisiones_estrategicas")
    op.drop_table("mensajes_campana")
    op.drop_table("clientes")
