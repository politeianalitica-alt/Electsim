"""0058 — OSINT: tablas social_post, narrativa, propagacion_narrativa, alerta_osint.

Block 5: Monitor de narrativas y desinformación.

Revision ID: 0058
Revises: 0057
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── social_post ────────────────────────────────────────────────────
    op.create_table(
        "social_post",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("platform",         sa.String(30), nullable=False),
        sa.Column("external_id",      sa.String(100), nullable=False),
        sa.Column("hash_id",          sa.String(64), nullable=False, unique=True),
        sa.Column("url",              sa.Text),
        sa.Column("texto",            sa.Text),
        sa.Column("texto_norm",       sa.Text),
        sa.Column("hashtags",         JSONB, server_default="[]"),
        sa.Column("menciones",        JSONB, server_default="[]"),
        # Autor
        sa.Column("autor_id",         sa.String(100)),
        sa.Column("autor_handle",     sa.String(100)),
        sa.Column("autor_nombre",     sa.String(200)),
        sa.Column("autor_seguidores", sa.Integer, server_default="0"),
        sa.Column("autor_verificado", sa.Boolean, server_default="false"),
        sa.Column("autor_tipo",       sa.String(30)),  # persona | organizacion | medio | bot
        # Métricas
        sa.Column("n_likes",          sa.Integer, server_default="0"),
        sa.Column("n_shares",         sa.Integer, server_default="0"),
        sa.Column("n_replies",        sa.Integer, server_default="0"),
        sa.Column("n_views",          sa.BigInteger, server_default="0"),
        sa.Column("engagement_rate",  sa.Float, server_default="0"),
        # NLP
        sa.Column("sentiment",           sa.Float, server_default="0"),
        sa.Column("toxicidad",           sa.Float, server_default="0"),
        sa.Column("emocion",             sa.String(30), server_default="'neutra'"),
        sa.Column("entidades_ner",        JSONB, server_default="[]"),
        sa.Column("relevancia_politica", sa.Integer, server_default="0"),
        # Narrativa
        sa.Column("narrativa_id",  sa.Integer, sa.ForeignKey("narrativa.id", ondelete="SET NULL"), nullable=True),
        # Timestamps
        sa.Column("publicado_en", sa.DateTime(timezone=True)),
        sa.Column("ingerido_en",  sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("idioma",       sa.String(10), server_default="'es'"),
    )
    op.create_index("ix_social_post_platform",    "social_post", ["platform"])
    op.create_index("ix_social_post_ingerido_en", "social_post", ["ingerido_en"])
    op.create_index("ix_social_post_toxicidad",   "social_post", ["toxicidad"])
    op.create_index("ix_social_post_narrativa",   "social_post", ["narrativa_id"])
    op.create_index("ix_social_post_autor",       "social_post", ["autor_handle"])

    # ── narrativa ──────────────────────────────────────────────────────
    op.create_table(
        "narrativa",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("titulo",              sa.String(200), nullable=False),
        sa.Column("descripcion",         sa.Text),
        sa.Column("tipo",                sa.String(50)),
        sa.Column("tono",                sa.String(30)),
        sa.Column("actores_mencionados", JSONB, server_default="[]"),
        sa.Column("hashtags_clave",      JSONB, server_default="[]"),
        sa.Column("riesgo_narrativo",    sa.Float, server_default="0"),
        sa.Column("es_coordinada",       sa.Boolean, server_default="false"),
        sa.Column("n_posts",             sa.Integer, server_default="0"),
        sa.Column("alcance_total",       sa.BigInteger, server_default="0"),
        sa.Column("fecha_deteccion",     sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("actualizado_en",      sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_narrativa_tipo",           "narrativa", ["tipo"])
    op.create_index("ix_narrativa_riesgo",         "narrativa", ["riesgo_narrativo"])
    op.create_index("ix_narrativa_fecha",          "narrativa", ["fecha_deteccion"])
    op.create_index("ix_narrativa_es_coordinada",  "narrativa", ["es_coordinada"])

    # ── propagacion_narrativa ──────────────────────────────────────────
    op.create_table(
        "propagacion_narrativa",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("narrativa_id",        sa.Integer, sa.ForeignKey("narrativa.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("velocidad_por_hora",  sa.Float, server_default="0"),
        sa.Column("super_difusores",     JSONB, server_default="[]"),
        sa.Column("score_coordinacion",  sa.Float, server_default="0"),
        sa.Column("plataformas",         JSONB, server_default="{}"),
        sa.Column("señales_coordinacion", JSONB, server_default="[]"),
        sa.Column("calculado_en",        sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # ── alerta_osint ───────────────────────────────────────────────────
    op.create_table(
        "alerta_osint",
        sa.Column("id",          sa.Integer, primary_key=True),
        sa.Column("tipo",        sa.String(80), nullable=False),
        sa.Column("severidad",   sa.String(20), server_default="'media'"),
        sa.Column("descripcion", sa.Text),
        sa.Column("metadata",    JSONB, server_default="{}"),
        sa.Column("leida",       sa.Boolean, server_default="false"),
        sa.Column("creado_en",   sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_alerta_osint_tipo",      "alerta_osint", ["tipo"])
    op.create_index("ix_alerta_osint_severidad", "alerta_osint", ["severidad"])
    op.create_index("ix_alerta_osint_creado_en", "alerta_osint", ["creado_en"])

    # FK social_post → narrativa (creada después)
    op.execute("""
        ALTER TABLE social_post
        ADD CONSTRAINT fk_social_post_narrativa
        FOREIGN KEY (narrativa_id) REFERENCES narrativa(id) ON DELETE SET NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE social_post DROP CONSTRAINT IF EXISTS fk_social_post_narrativa")
    op.drop_table("alerta_osint")
    op.drop_table("propagacion_narrativa")
    op.drop_table("narrativa")
    op.drop_table("social_post")
