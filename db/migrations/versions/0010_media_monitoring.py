"""media_monitoring tables.

Revision ID: 0010_media_monitoring
Revises: 0009_alertas_v2_and_vector_index
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0010_media_monitoring"
down_revision: Union[str, None] = "0009_alertas_v2_and_vector_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contenido_mediatico",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("fuente", sa.Text(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("autor", sa.Text(), nullable=True),
        sa.Column("medio", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True, unique=True),
        sa.Column("titular", sa.Text(), nullable=True),
        sa.Column("resumen", sa.Text(), nullable=True),
        sa.Column("texto_completo", sa.Text(), nullable=True),
        sa.Column("fecha_publicacion", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fecha_ingesta", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("idioma", sa.Text(), server_default=sa.text("'es'")),
        sa.Column("alcance_est", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("likes", sa.Integer(), server_default=sa.text("0")),
        sa.Column("shares", sa.Integer(), server_default=sa.text("0")),
        sa.Column("comentarios", sa.Integer(), server_default=sa.text("0")),
        sa.Column("sentimiento_score", sa.Float(), nullable=True),
        sa.Column("sentimiento_label", sa.Text(), nullable=True),
        sa.Column("tono", sa.Text(), nullable=True),
        sa.Column("categoria", sa.Text(), nullable=True),
        sa.Column("categorias_json", JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("partidos_mencionados", sa.Text(), nullable=True),
        sa.Column("personas_mencionadas", sa.Text(), nullable=True),
        sa.Column("embedding_vector", sa.Text(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("procesado", sa.Boolean(), server_default=sa.text("false")),
    )
    op.create_index("idx_contenido_fecha", "contenido_mediatico", ["fecha_publicacion"])
    op.create_index("idx_contenido_tipo", "contenido_mediatico", ["tipo"])
    op.create_index("idx_contenido_fuente", "contenido_mediatico", ["fuente"])
    op.create_index("idx_contenido_cliente", "contenido_mediatico", ["cliente_id"])
    op.create_index("idx_contenido_categoria", "contenido_mediatico", ["categoria"])

    op.create_table(
        "tags_contenido",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("contenido_id", sa.BigInteger(), sa.ForeignKey("contenido_mediatico.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo_objeto", sa.Text(), nullable=False),
        sa.Column("valor", sa.Text(), nullable=False),
        sa.Column("confianza", sa.Float(), server_default=sa.text("1.0")),
    )
    op.create_index("idx_tags_contenido_id", "tags_contenido", ["contenido_id"])
    op.create_index("idx_tags_tipo_valor", "tags_contenido", ["tipo_objeto", "valor"])

    op.create_table(
        "alertas_mediaticas",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tipo_objeto", sa.Text(), nullable=False),
        sa.Column("valor", sa.Text(), nullable=False),
        sa.Column("canal", sa.Text(), nullable=False),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("magnitud", sa.Float(), nullable=True),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("leida", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("detalle_json", JSONB, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("idx_alertas_mediaticas_fecha", "alertas_mediaticas", ["fecha"])
    op.create_index("idx_alertas_mediaticas_leida", "alertas_mediaticas", ["leida"])

    op.create_table(
        "objetos_seguimiento",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("valor", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("config_alertas", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tipo", "valor", "cliente_id", name="uq_objeto_cliente"),
    )


def downgrade() -> None:
    op.drop_table("objetos_seguimiento")
    op.drop_table("alertas_mediaticas")
    op.drop_table("tags_contenido")
    op.drop_table("contenido_mediatico")
