"""
0054 — Fix CRM schema alignment.

Renombra columnas de crm_contacts, crm_organizations, crm_relationships,
crm_interactions y crm_outreach_tasks para que coincidan con crm/schemas.py.

Esta migración NO modifica datos, solo renombra columnas y añade las faltantes.

Cambios por tabla:
  crm_contacts:
    - position → role_title
    - territory → territory_id
    - tags → sectors
    - extra → raw_payload
    - ADD: display_name, source, source_url, workspace_id

  crm_organizations:
    - org_id → organization_id  (PK)
    - org_type → organization_type
    - sector (TEXT) → DROP + ADD sectors (JSONB)
    - territory → territory_id
    - tags → topics
    - extra → raw_payload
    - ADD: country

  crm_relationships:
    - rel_id → relationship_id  (PK)
    - source_type → source_object_type
    - source_id → source_object_id
    - target_type → target_object_type
    - target_id → target_object_id
    - strength → confidence
    - extra → raw_payload

  crm_interactions:
    - org_id → organization_id
    - subject → title
    - occurred_at → interaction_date
    - extra → raw_payload

  crm_outreach_tasks:
    - org_id → organization_id
    - extra → raw_payload
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0054"
down_revision = "0053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── crm_contacts ──────────────────────────────────────────────────────────
    op.alter_column("crm_contacts", "position", new_column_name="role_title")
    op.alter_column("crm_contacts", "territory", new_column_name="territory_id")
    op.alter_column("crm_contacts", "tags", new_column_name="sectors")
    op.alter_column("crm_contacts", "extra", new_column_name="raw_payload")
    op.add_column("crm_contacts", sa.Column("display_name", sa.String(256), nullable=True))
    op.add_column("crm_contacts", sa.Column("source", sa.String(64), server_default="manual"))
    op.add_column("crm_contacts", sa.Column("source_url", sa.String(512), nullable=True))
    op.add_column("crm_contacts", sa.Column("workspace_id", sa.String(64), nullable=True))

    # ── crm_organizations ─────────────────────────────────────────────────────
    op.alter_column("crm_organizations", "org_id", new_column_name="organization_id")
    op.alter_column("crm_organizations", "org_type", new_column_name="organization_type")
    op.alter_column("crm_organizations", "territory", new_column_name="territory_id")
    op.alter_column("crm_organizations", "extra", new_column_name="raw_payload")
    # sector (TEXT) → sectors (JSONB): drop old, add new
    op.drop_column("crm_organizations", "sector")
    op.add_column("crm_organizations", sa.Column("sectors", JSONB, server_default="[]"))
    # tags → topics (org-level topic tagging)
    op.alter_column("crm_organizations", "tags", new_column_name="topics")
    # Add missing columns
    op.add_column("crm_organizations", sa.Column("country", sa.String(8), server_default="ES"))

    # ── crm_relationships ─────────────────────────────────────────────────────
    op.alter_column("crm_relationships", "rel_id", new_column_name="relationship_id")
    op.alter_column("crm_relationships", "source_type", new_column_name="source_object_type")
    op.alter_column("crm_relationships", "source_id", new_column_name="source_object_id")
    op.alter_column("crm_relationships", "target_type", new_column_name="target_object_type")
    op.alter_column("crm_relationships", "target_id", new_column_name="target_object_id")
    op.alter_column("crm_relationships", "strength", new_column_name="confidence")
    op.alter_column("crm_relationships", "extra", new_column_name="raw_payload")

    # ── crm_interactions ──────────────────────────────────────────────────────
    op.alter_column("crm_interactions", "org_id", new_column_name="organization_id")
    op.alter_column("crm_interactions", "subject", new_column_name="title")
    op.alter_column("crm_interactions", "occurred_at", new_column_name="interaction_date")
    op.alter_column("crm_interactions", "extra", new_column_name="raw_payload")

    # ── crm_outreach_tasks ────────────────────────────────────────────────────
    op.alter_column("crm_outreach_tasks", "org_id", new_column_name="organization_id")
    op.alter_column("crm_outreach_tasks", "extra", new_column_name="raw_payload")

    # ── Fix index names to match new column names ─────────────────────────────
    try:
        op.drop_index("ix_crm_contacts_territory", table_name="crm_contacts")
        op.create_index("ix_crm_contacts_territory_id", "crm_contacts", ["territory_id"])
    except Exception:
        pass

    try:
        op.drop_index("ix_crm_orgs_sector", table_name="crm_organizations")
        op.create_index(
            "ix_crm_orgs_sectors", "crm_organizations", ["sectors"],
            postgresql_using="gin",
        )
    except Exception:
        pass

    try:
        op.drop_index("ix_crm_rels_source", table_name="crm_relationships")
        op.create_index(
            "ix_crm_rels_source_obj", "crm_relationships",
            ["source_object_type", "source_object_id"],
        )
    except Exception:
        pass

    try:
        op.drop_index("ix_crm_rels_target", table_name="crm_relationships")
        op.create_index(
            "ix_crm_rels_target_obj", "crm_relationships",
            ["target_object_type", "target_object_id"],
        )
    except Exception:
        pass

    try:
        op.drop_index("ix_crm_interactions_org", table_name="crm_interactions")
        op.create_index(
            "ix_crm_interactions_org_id", "crm_interactions", ["organization_id"]
        )
    except Exception:
        pass


def downgrade() -> None:
    # ── crm_outreach_tasks ────────────────────────────────────────────────────
    op.alter_column("crm_outreach_tasks", "raw_payload", new_column_name="extra")
    op.alter_column("crm_outreach_tasks", "organization_id", new_column_name="org_id")

    # ── crm_interactions ──────────────────────────────────────────────────────
    op.alter_column("crm_interactions", "raw_payload", new_column_name="extra")
    op.alter_column("crm_interactions", "interaction_date", new_column_name="occurred_at")
    op.alter_column("crm_interactions", "title", new_column_name="subject")
    op.alter_column("crm_interactions", "organization_id", new_column_name="org_id")

    # ── crm_relationships ─────────────────────────────────────────────────────
    op.alter_column("crm_relationships", "raw_payload", new_column_name="extra")
    op.alter_column("crm_relationships", "confidence", new_column_name="strength")
    op.alter_column("crm_relationships", "target_object_id", new_column_name="target_id")
    op.alter_column("crm_relationships", "target_object_type", new_column_name="target_type")
    op.alter_column("crm_relationships", "source_object_id", new_column_name="source_id")
    op.alter_column("crm_relationships", "source_object_type", new_column_name="source_type")
    op.alter_column("crm_relationships", "relationship_id", new_column_name="rel_id")

    # ── crm_organizations ─────────────────────────────────────────────────────
    op.drop_column("crm_organizations", "country")
    op.drop_column("crm_organizations", "sectors")
    op.add_column("crm_organizations", sa.Column("sector", sa.String(128), nullable=True))
    op.alter_column("crm_organizations", "topics", new_column_name="tags")
    op.alter_column("crm_organizations", "raw_payload", new_column_name="extra")
    op.alter_column("crm_organizations", "territory_id", new_column_name="territory")
    op.alter_column("crm_organizations", "organization_type", new_column_name="org_type")
    op.alter_column("crm_organizations", "organization_id", new_column_name="org_id")

    # ── crm_contacts ──────────────────────────────────────────────────────────
    op.drop_column("crm_contacts", "workspace_id")
    op.drop_column("crm_contacts", "source_url")
    op.drop_column("crm_contacts", "source")
    op.drop_column("crm_contacts", "display_name")
    op.alter_column("crm_contacts", "raw_payload", new_column_name="extra")
    op.alter_column("crm_contacts", "sectors", new_column_name="tags")
    op.alter_column("crm_contacts", "territory_id", new_column_name="territory")
    op.alter_column("crm_contacts", "role_title", new_column_name="position")
