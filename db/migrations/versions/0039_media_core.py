"""
0039 — Media Core: media_items, media_actor_mentions, narrative_clusters, narrative_cluster_items

Revision: 0039
Down revision: 0038
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0039"
down_revision = "0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── media_items ───────────────────────────────────────────────────────────
    op.create_table(
        "media_items",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_region", sa.Text(), nullable=True),
        sa.Column("source_country", sa.Text(), nullable=True),
        sa.Column("source_lat", sa.Double(), nullable=True),
        sa.Column("source_lon", sa.Double(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), server_default="", nullable=False),
        sa.Column("canonical_url", sa.Text(), nullable=True),
        sa.Column("published_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("author", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("language", sa.Text(), server_default="es", nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("title_hash", sa.Text(), nullable=True),
        # Arrays
        sa.Column("actors", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("parties", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("institutions", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("sectors", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("topics", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        # Sentimiento
        sa.Column("sentiment_label", sa.Text(), nullable=True),
        sa.Column("sentiment_score", sa.Double(), nullable=True),
        sa.Column("emotion_label", sa.Text(), nullable=True),
        sa.Column("toxicity_score", sa.Double(), nullable=True),
        # Cluster
        sa.Column("narrative_cluster_id", sa.Text(), nullable=True),
        sa.Column("impact_level", sa.Text(), server_default="INFORMATIVO", nullable=False),
        # JSON
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("fetched_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_hash", name="uq_media_items_content_hash"),
    )
    # Índices
    op.create_index("ix_media_items_source", "media_items", ["source"])
    op.create_index("ix_media_items_published_at", "media_items", ["published_at"])
    op.create_index("ix_media_items_narrative_cluster_id", "media_items", ["narrative_cluster_id"])
    op.create_index("ix_media_items_source_country", "media_items", ["source_country"])
    op.create_index(
        "ix_media_items_topics_gin", "media_items", ["topics"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_media_items_actors_gin", "media_items", ["actors"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_media_items_raw_payload_gin", "media_items", ["raw_payload"],
        postgresql_using="gin",
    )
    # RLS
    op.execute("ALTER TABLE media_items ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_media_items ON media_items
        USING (true)
    """)

    # ── media_actor_mentions ──────────────────────────────────────────────────
    op.create_table(
        "media_actor_mentions",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("media_item_id", sa.BigInteger(), nullable=True),
        sa.Column("actor_name", sa.Text(), nullable=False),
        sa.Column("actor_type", sa.Text(), nullable=True),
        sa.Column("mention_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("confidence", sa.Double(), server_default="1.0", nullable=False),
        sa.Column("matched_aliases", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_hash", "actor_name", name="uq_media_actor_mention"),
    )
    op.create_index("ix_media_actor_mentions_actor_name", "media_actor_mentions", ["actor_name"])
    op.create_index("ix_media_actor_mentions_content_hash", "media_actor_mentions", ["content_hash"])
    op.create_index("ix_media_actor_mentions_actor_type", "media_actor_mentions", ["actor_type"])

    # ── narrative_clusters ────────────────────────────────────────────────────
    op.create_table(
        "narrative_clusters",
        sa.Column("id", sa.Text(), nullable=False),          # slug estable
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("frame", sa.Text(), nullable=True),
        sa.Column("tension", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("ideology_hint", sa.Text(), nullable=True),
        sa.Column("top_terms", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("representative_titles", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("representative_media_item_ids", postgresql.ARRAY(sa.BigInteger()), server_default="{}", nullable=False),
        sa.Column("volume_24h", sa.Integer(), server_default="0", nullable=False),
        sa.Column("volume_7d", sa.Integer(), server_default="0", nullable=False),
        sa.Column("growth_rate", sa.Double(), server_default="0.0", nullable=False),
        sa.Column("sentiment_avg", sa.Double(), server_default="0.0", nullable=False),
        sa.Column("risk_level", sa.Text(), server_default="BAJO", nullable=False),
        sa.Column("actors", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("sectors", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("sources", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("first_seen", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_seen", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_narrative_clusters_risk_level", "narrative_clusters", ["risk_level"])
    op.create_index("ix_narrative_clusters_last_seen", "narrative_clusters", ["last_seen"])

    # ── narrative_cluster_items ───────────────────────────────────────────────
    op.create_table(
        "narrative_cluster_items",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("cluster_id", sa.Text(), nullable=False),
        sa.Column("media_item_id", sa.BigInteger(), nullable=True),
        sa.Column("content_hash", sa.Text(), server_default="", nullable=False),
        sa.Column("score", sa.Double(), server_default="0.0", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cluster_id", "content_hash", name="uq_narrative_cluster_item"),
    )
    op.create_index("ix_narrative_cluster_items_cluster_id", "narrative_cluster_items", ["cluster_id"])
    op.create_index("ix_narrative_cluster_items_content_hash", "narrative_cluster_items", ["content_hash"])


def downgrade() -> None:
    op.drop_table("narrative_cluster_items")
    op.drop_table("narrative_clusters")
    op.drop_table("media_actor_mentions")
    op.drop_table("media_items")
