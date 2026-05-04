"""
0041 — OSINT & Risk Graph: risk_entities, risk_relations, risk_flags, social_identity_candidates

Revision: 0041
Down revision: 0040
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── risk_entities ─────────────────────────────────────────────────────────
    op.create_table(
        "risk_entities",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("aliases", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("countries", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("identifiers", postgresql.JSONB(), server_default="[]", nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("incorporation_date", sa.Date(), nullable=True),
        sa.Column("pep_status", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("sanctions_status", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("risk_flags", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("risk_score", sa.Numeric(6, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("confidence", sa.Numeric(6, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("first_seen", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("last_seen", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "source_id", name="uq_risk_entity"),
    )
    # Full-text search en nombre
    op.execute(
        "CREATE INDEX idx_risk_entities_name_fts ON risk_entities "
        "USING gin(to_tsvector('simple', name))"
    )
    op.create_index("idx_risk_entities_type", "risk_entities", ["entity_type"])
    op.create_index("idx_risk_entities_score", "risk_entities", ["risk_score"])
    op.create_index("idx_risk_entities_pep", "risk_entities", ["pep_status"])
    op.create_index("idx_risk_entities_sanctions", "risk_entities", ["sanctions_status"])
    op.create_index("idx_risk_entities_updated", "risk_entities", ["updated_at"])
    op.execute(
        "CREATE INDEX idx_risk_entities_flags ON risk_entities USING GIN(risk_flags)"
    )
    op.execute(
        "CREATE INDEX idx_risk_entities_countries ON risk_entities USING GIN(countries)"
    )
    op.execute(
        "CREATE INDEX idx_risk_entities_raw ON risk_entities USING GIN(raw_payload)"
    )

    # RLS
    op.execute("ALTER TABLE risk_entities ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_risk_entities ON risk_entities "
        "USING (TRUE)"
    )

    # ── risk_relations ────────────────────────────────────────────────────────
    op.create_table(
        "risk_relations",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("subject_entity_id", sa.BigInteger(), nullable=True),
        sa.Column("object_entity_id", sa.BigInteger(), nullable=True),
        sa.Column("relation_type", sa.String(120), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("confidence", sa.Numeric(6, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("evidence", postgresql.JSONB(), server_default="[]", nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "source_id", name="uq_risk_relation"),
        sa.ForeignKeyConstraint(
            ["subject_entity_id"], ["risk_entities.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["object_entity_id"], ["risk_entities.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("idx_risk_relations_subject", "risk_relations", ["subject_entity_id"])
    op.create_index("idx_risk_relations_object", "risk_relations", ["object_entity_id"])
    op.create_index("idx_risk_relations_type", "risk_relations", ["relation_type"])
    op.create_index("idx_risk_relations_confidence", "risk_relations", ["confidence"])

    op.execute("ALTER TABLE risk_relations ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_risk_relations ON risk_relations USING (TRUE)"
    )

    # ── risk_flags ────────────────────────────────────────────────────────────
    op.create_table(
        "risk_flags",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=True),
        sa.Column("flag_type", sa.String(120), nullable=False),
        sa.Column("severity", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(120), nullable=True),
        sa.Column("evidence_url", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Numeric(6, 4), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["entity_id"], ["risk_entities.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_risk_flags_entity", "risk_flags", ["entity_id"])
    op.create_index("idx_risk_flags_severity", "risk_flags", ["severity"])
    op.create_index("idx_risk_flags_type", "risk_flags", ["flag_type"])

    op.execute("ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_risk_flags ON risk_flags USING (TRUE)"
    )

    # ── social_identity_candidates ────────────────────────────────────────────
    op.create_table(
        "social_identity_candidates",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("actor_id", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.BigInteger(), nullable=True),
        sa.Column("platform", sa.String(120), nullable=False),
        sa.Column("handle", sa.Text(), nullable=False),
        sa.Column("profile_url", sa.Text(), nullable=True),
        sa.Column("discovery_method", sa.String(120), nullable=True),
        sa.Column("confidence", sa.Numeric(6, 4), nullable=True),
        sa.Column("verified", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("verified_by", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("risk_notes", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "platform", "handle", "discovery_method",
            name="uq_social_identity_candidate",
        ),
        sa.ForeignKeyConstraint(
            ["entity_id"], ["risk_entities.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("idx_social_identity_handle", "social_identity_candidates", ["handle"])
    op.create_index("idx_social_identity_platform", "social_identity_candidates", ["platform"])
    op.create_index("idx_social_identity_verified", "social_identity_candidates", ["verified"])
    op.create_index("idx_social_identity_actor", "social_identity_candidates", ["actor_id"])

    op.execute("ALTER TABLE social_identity_candidates ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_social_identity ON social_identity_candidates USING (TRUE)"
    )


def downgrade() -> None:
    op.drop_table("social_identity_candidates")
    op.drop_table("risk_flags")
    op.drop_table("risk_relations")
    op.drop_table("risk_entities")
