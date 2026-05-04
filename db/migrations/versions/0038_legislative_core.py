"""Bloque 1 Core Legislativo — tablas legal_items + parliamentary_initiatives + parliamentary_bodies.

Revision ID: 0038
Revises: 0037_narratives_tables
Create Date: 2026-05-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0038"
down_revision = "0037"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── legal_items ────────────────────────────────────────────────────────────
    op.create_table(
        "legal_items",
        sa.Column("id",               sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source",           sa.String(50),  nullable=False),
        sa.Column("source_id",        sa.String(120), nullable=False),
        sa.Column("title",            sa.Text(),      nullable=False),
        sa.Column("legal_rank",       sa.String(120), nullable=True),
        sa.Column("department",       sa.String(200), nullable=True),
        sa.Column("section",          sa.String(50),  nullable=True),
        sa.Column("publication_date", sa.Date(),      nullable=True),
        sa.Column("effective_date",   sa.Date(),      nullable=True),
        sa.Column("status",           sa.String(50),  nullable=True),
        sa.Column("impact_level",     sa.String(30),  nullable=True),
        sa.Column("sectors",          postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("actors",           postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("subjects",         postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("summary",          sa.Text(),      nullable=True),
        sa.Column("url_html",         sa.Text(),      nullable=True),
        sa.Column("url_pdf",          sa.Text(),      nullable=True),
        sa.Column("raw_payload",      postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("text_hash",        sa.String(128), nullable=True),
        sa.Column("fetched_at",       sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at",       sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("source", "source_id", name="uq_legal_items_source_id"),
    )

    # Índices legal_items
    op.create_index("idx_legal_items_date",      "legal_items", ["publication_date"],         postgresql_using="btree")
    op.create_index("idx_legal_items_impact",    "legal_items", ["impact_level"],             postgresql_using="btree")
    op.create_index("idx_legal_items_source",    "legal_items", ["source", "source_id"],      postgresql_using="btree")
    op.create_index("idx_legal_items_source_id_only", "legal_items", ["source_id"],           postgresql_using="btree")
    # GIN sobre JSONB para búsqueda en raw_payload
    op.execute("CREATE INDEX IF NOT EXISTS idx_legal_items_raw_gin ON legal_items USING gin(raw_payload);")
    # GIN sobre sectores[]
    op.execute("CREATE INDEX IF NOT EXISTS idx_legal_items_sectors_gin ON legal_items USING gin(sectors);")

    # ── parliamentary_initiatives ──────────────────────────────────────────────
    op.create_table(
        "parliamentary_initiatives",
        sa.Column("id",                    sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source",                sa.String(50),   nullable=False),
        sa.Column("source_id",             sa.String(120),  nullable=False),
        sa.Column("legislature",           sa.String(50),   nullable=True),
        sa.Column("initiative_type",       sa.String(100),  nullable=True),
        sa.Column("title",                 sa.Text(),       nullable=False),
        sa.Column("presented_date",        sa.Date(),       nullable=True),
        sa.Column("qualified_date",        sa.Date(),       nullable=True),
        sa.Column("status",                sa.String(150),  nullable=True),
        sa.Column("result",                sa.String(150),  nullable=True),
        sa.Column("tramitation_type",      sa.String(150),  nullable=True),
        sa.Column("authors",               postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("competent_commissions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("rapporteurs",           postgresql.ARRAY(sa.Text()),             nullable=True),
        sa.Column("bulletins",             postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("diaries",               postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("boe_refs",              postgresql.ARRAY(sa.Text()),             nullable=True),
        sa.Column("related_legal_items",   postgresql.ARRAY(sa.Text()),             nullable=True),
        sa.Column("impact_level",          sa.String(30),   nullable=True),
        sa.Column("sectors",               postgresql.ARRAY(sa.Text()),             nullable=True),
        sa.Column("raw_url",               sa.Text(),       nullable=True),
        sa.Column("raw_payload",           postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("fetched_at",            sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("created_at",            sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at",            sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("source", "source_id", name="uq_parl_init_source_id"),
    )

    op.create_index("idx_parl_init_date",      "parliamentary_initiatives", ["presented_date"],   postgresql_using="btree")
    op.create_index("idx_parl_init_impact",    "parliamentary_initiatives", ["impact_level"],      postgresql_using="btree")
    op.create_index("idx_parl_init_type",      "parliamentary_initiatives", ["initiative_type"],   postgresql_using="btree")
    op.create_index("idx_parl_init_legis",     "parliamentary_initiatives", ["legislature"],        postgresql_using="btree")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parl_init_sectors_gin ON parliamentary_initiatives USING gin(sectors);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parl_init_authors_gin ON parliamentary_initiatives USING gin(authors);")

    # ── parliamentary_bodies ───────────────────────────────────────────────────
    op.create_table(
        "parliamentary_bodies",
        sa.Column("id",              sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source",          sa.String(50),   nullable=False),
        sa.Column("source_id",       sa.String(120),  nullable=False),
        sa.Column("legislature",     sa.String(50),   nullable=True),
        sa.Column("name",            sa.Text(),       nullable=False),
        sa.Column("body_type",       sa.String(80),   nullable=True),
        sa.Column("parent_body_id",  sa.String(120),  nullable=True),
        sa.Column("members",         postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_payload",     postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("fetched_at",      sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("source", "source_id", "legislature", name="uq_parl_bodies_source_legis"),
    )


def downgrade() -> None:
    op.drop_table("parliamentary_bodies")
    op.drop_table("parliamentary_initiatives")
    op.drop_table("legal_items")
