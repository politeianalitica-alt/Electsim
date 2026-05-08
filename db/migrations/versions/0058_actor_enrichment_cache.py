"""Add actor_enrichment_cache table

Revision ID: 0058_actor_enrichment_cache
Revises: 0057
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS actor_enrichment_cache (
            actor_id VARCHAR PRIMARY KEY,

            -- Wikipedia
            wiki_extract       TEXT,
            wiki_description   VARCHAR(500),
            wiki_thumbnail_url TEXT,
            wiki_url           TEXT,

            -- Recent news from Google News RSS (JSON array of up to 20 articles)
            recent_news_json   JSONB DEFAULT '[]',

            -- BOE / Congreso
            boe_mentions_count  INTEGER DEFAULT 0,
            congreso_group      VARCHAR(200),
            congreso_comisiones JSONB DEFAULT '[]',
            congreso_votaciones_json JSONB DEFAULT '[]',

            -- Twitter/X (optional)
            twitter_handle     VARCHAR(100),
            twitter_followers  INTEGER,
            tweet_count_7d     INTEGER DEFAULT 0,
            top_tweets_json    JSONB DEFAULT '[]',

            -- Computed
            top_keywords_json  JSONB DEFAULT '[]',
            sentiment_sources_json JSONB DEFAULT '[]',
            co_mentions_json   JSONB DEFAULT '[]',

            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_enrichment_updated
            ON actor_enrichment_cache(updated_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS actor_enrichment_cache;")
