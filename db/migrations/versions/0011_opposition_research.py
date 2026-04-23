"""opposition research tables.

Revision ID: 0011_opposition_research
Revises: 0010_media_monitoring
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0011_opposition_research"
down_revision: Union[str, None] = "0010_media_monitoring"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "declaraciones_politicas",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("persona", sa.Text(), nullable=False),
        sa.Column("partido", sa.Text(), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("medio", sa.Text(), nullable=True),
        sa.Column("contexto", sa.Text(), nullable=True),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("texto_norm", sa.Text(), nullable=True),
        sa.Column("tema", sa.Text(), nullable=True),
        sa.Column("subtema", sa.Text(), nullable=True),
        sa.Column("posicion_x", sa.Float(), nullable=True),
        sa.Column("posicion_y", sa.Float(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("fecha_ingesta", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("url", "texto", name="uq_declaracion_url_texto"),
    )
    op.create_index("idx_decl_persona", "declaraciones_politicas", ["persona"])
    op.create_index("idx_decl_partido", "declaraciones_politicas", ["partido"])
    op.create_index("idx_decl_tema", "declaraciones_politicas", ["tema"])
    op.create_index("idx_decl_fecha", "declaraciones_politicas", ["fecha"])

    op.create_table(
        "contradicciones",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("decl_a_id", sa.BigInteger(), sa.ForeignKey("declaraciones_politicas.id", ondelete="CASCADE"), nullable=True),
        sa.Column("decl_b_id", sa.BigInteger(), sa.ForeignKey("declaraciones_politicas.id", ondelete="CASCADE"), nullable=True),
        sa.Column("persona", sa.Text(), nullable=False),
        sa.Column("partido", sa.Text(), nullable=False),
        sa.Column("tema", sa.Text(), nullable=True),
        sa.Column("tipo", sa.Text(), nullable=True),
        sa.Column("confianza", sa.Float(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("gravedad", sa.Text(), nullable=True),
        sa.Column("dias_entre", sa.Integer(), nullable=True),
        sa.Column("validada", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("fecha_deteccion", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_contra_persona", "contradicciones", ["persona"])
    op.create_index("idx_contra_partido", "contradicciones", ["partido"])
    op.create_index("idx_contra_tema", "contradicciones", ["tema"])

    op.create_table(
        "posicionamiento_partido",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("partido", sa.Text(), nullable=False),
        sa.Column("tema", sa.Text(), nullable=False),
        sa.Column("posicion_x", sa.Float(), nullable=True),
        sa.Column("posicion_y", sa.Float(), nullable=True),
        sa.Column("intensidad", sa.Float(), nullable=True),
        sa.Column("evolucion_json", JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("periodo", sa.Text(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("actualizado", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("partido", "tema", "periodo", name="uq_posicion_partido_tema"),
    )

    op.create_table(
        "argumentarios",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("tema", sa.Text(), nullable=True),
        sa.Column("adversario", sa.Text(), nullable=True),
        sa.Column("partido_propio", sa.Text(), nullable=True),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("metadata_json", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("usado", sa.Boolean(), server_default=sa.text("false")),
    )
    op.create_index("idx_argumentarios_tipo", "argumentarios", ["tipo"])
    op.create_index("idx_argumentarios_tema", "argumentarios", ["tema"])
    op.create_index("idx_argumentarios_cliente", "argumentarios", ["cliente_id"])


def downgrade() -> None:
    op.drop_table("argumentarios")
    op.drop_table("posicionamiento_partido")
    op.drop_table("contradicciones")
    op.drop_table("declaraciones_politicas")
