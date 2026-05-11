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
    # Schema already correct from 0052 — this migration is a no-op in fresh deployments.
    # All column renames and additions were incorporated into 0052 directly.
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
