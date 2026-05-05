"""
0052 — CRM Core: 8 tablas para el CRM institucional.

crm_contacts, crm_organizations, crm_stakeholder_profiles,
crm_relationships, crm_interactions, crm_outreach_tasks,
crm_segments, crm_mobilization_events.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0052"
down_revision = "0051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # crm_contacts
    op.create_table(
        "crm_contacts",
        sa.Column("contact_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("full_name", sa.String(256), nullable=False),
        sa.Column("email", sa.String(256)),
        sa.Column("phone", sa.String(64)),
        sa.Column("contact_type", sa.String(64), nullable=False, server_default="other"),
        sa.Column("organization_id", sa.String(64)),
        sa.Column("position", sa.String(256)),
        sa.Column("territory", sa.String(128)),
        sa.Column("topics", JSONB, server_default="[]"),
        sa.Column("tags", JSONB, server_default="[]"),
        sa.Column("consent_status", sa.String(64), server_default="unknown"),
        sa.Column("data_classification", sa.String(64), server_default="internal"),
        sa.Column("public_profile_url", sa.String(512)),
        sa.Column("notes", sa.Text()),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_crm_contacts_tenant", "crm_contacts", ["tenant_id"])
    op.create_index("ix_crm_contacts_email", "crm_contacts", ["email"])
    op.create_index("ix_crm_contacts_type", "crm_contacts", ["contact_type"])
    op.create_index("ix_crm_contacts_territory", "crm_contacts", ["territory"])

    # crm_organizations
    op.create_table(
        "crm_organizations",
        sa.Column("org_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("org_type", sa.String(64), nullable=False, server_default="other"),
        sa.Column("sector", sa.String(128)),
        sa.Column("territory", sa.String(128)),
        sa.Column("topics", JSONB, server_default="[]"),
        sa.Column("tags", JSONB, server_default="[]"),
        sa.Column("website", sa.String(512)),
        sa.Column("risk_entity_id", sa.String(64)),
        sa.Column("actor_graph_id", sa.String(64)),
        sa.Column("description", sa.Text()),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_orgs_tenant", "crm_organizations", ["tenant_id"])
    op.create_index("ix_crm_orgs_type", "crm_organizations", ["org_type"])
    op.create_index("ix_crm_orgs_sector", "crm_organizations", ["sector"])

    # crm_stakeholder_profiles
    op.create_table(
        "crm_stakeholder_profiles",
        sa.Column("profile_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("object_type", sa.String(32), nullable=False),
        sa.Column("object_id", sa.String(64), nullable=False),
        sa.Column("influence_score", sa.Float(), server_default="0"),
        sa.Column("proximity_score", sa.Float(), server_default="0"),
        sa.Column("topic_urgency_score", sa.Float(), server_default="0"),
        sa.Column("risk_exposure_score", sa.Float(), server_default="0"),
        sa.Column("responsiveness_score", sa.Float(), server_default="0"),
        sa.Column("territorial_relevance_score", sa.Float(), server_default="0"),
        sa.Column("relationship_freshness", sa.Float(), server_default="0"),
        sa.Column("priority_score", sa.Float(), server_default="0"),
        sa.Column("priority_label", sa.String(32), server_default="BAJA"),
        sa.Column("recommended_actions", JSONB, server_default="[]"),
        sa.Column("scored_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_stakeholders_tenant", "crm_stakeholder_profiles", ["tenant_id"])
    op.create_index("ix_crm_stakeholders_object", "crm_stakeholder_profiles", ["object_type", "object_id"])
    op.create_index("ix_crm_stakeholders_priority", "crm_stakeholder_profiles", ["priority_score"])

    # crm_relationships
    op.create_table(
        "crm_relationships",
        sa.Column("rel_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("source_id", sa.String(64), nullable=False),
        sa.Column("target_type", sa.String(32), nullable=False),
        sa.Column("target_id", sa.String(64), nullable=False),
        sa.Column("relationship_type", sa.String(64), nullable=False),
        sa.Column("strength", sa.Float(), server_default="0.5"),
        sa.Column("direction", sa.String(32), server_default="bidirectional"),
        sa.Column("tags", JSONB, server_default="[]"),
        sa.Column("notes", sa.Text()),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_rels_tenant", "crm_relationships", ["tenant_id"])
    op.create_index("ix_crm_rels_source", "crm_relationships", ["source_type", "source_id"])
    op.create_index("ix_crm_rels_target", "crm_relationships", ["target_type", "target_id"])

    # crm_interactions
    op.create_table(
        "crm_interactions",
        sa.Column("interaction_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("contact_id", sa.String(64)),
        sa.Column("org_id", sa.String(64)),
        sa.Column("interaction_type", sa.String(64), nullable=False),
        sa.Column("channel", sa.String(64)),
        sa.Column("direction", sa.String(32), server_default="outbound"),
        sa.Column("subject", sa.String(512)),
        sa.Column("summary", sa.Text()),
        sa.Column("sentiment", sa.String(32), server_default="neutral"),
        sa.Column("outcome", sa.String(128)),
        sa.Column("follow_up_required", sa.Boolean(), server_default="false"),
        sa.Column("logged_by", sa.String(128)),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_interactions_tenant", "crm_interactions", ["tenant_id"])
    op.create_index("ix_crm_interactions_contact", "crm_interactions", ["contact_id"])
    op.create_index("ix_crm_interactions_org", "crm_interactions", ["org_id"])
    op.create_index("ix_crm_interactions_occurred", "crm_interactions", ["occurred_at"])

    # crm_outreach_tasks
    op.create_table(
        "crm_outreach_tasks",
        sa.Column("task_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("contact_id", sa.String(64)),
        sa.Column("org_id", sa.String(64)),
        sa.Column("task_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("priority", sa.String(32), server_default="NORMAL"),
        sa.Column("status", sa.String(32), server_default="pending"),
        sa.Column("assigned_to", sa.String(128)),
        sa.Column("due_date", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("linked_interaction_id", sa.String(64)),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_tasks_tenant", "crm_outreach_tasks", ["tenant_id"])
    op.create_index("ix_crm_tasks_contact", "crm_outreach_tasks", ["contact_id"])
    op.create_index("ix_crm_tasks_status", "crm_outreach_tasks", ["status"])
    op.create_index("ix_crm_tasks_due", "crm_outreach_tasks", ["due_date"])

    # crm_segments
    op.create_table(
        "crm_segments",
        sa.Column("segment_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("segment_type", sa.String(32), server_default="dynamic"),
        sa.Column("rules", JSONB, server_default="{}"),
        sa.Column("static_members", JSONB, server_default="[]"),
        sa.Column("tags", JSONB, server_default="[]"),
        sa.Column("created_by", sa.String(128)),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_segments_tenant", "crm_segments", ["tenant_id"])

    # crm_mobilization_events
    op.create_table(
        "crm_mobilization_events",
        sa.Column("event_id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, server_default="default"),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False, server_default="meeting"),
        sa.Column("territory", sa.String(128)),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("location", sa.String(512)),
        sa.Column("target_segment_id", sa.String(64)),
        sa.Column("target_count", sa.Integer(), server_default="0"),
        sa.Column("confirmed_count", sa.Integer(), server_default="0"),
        sa.Column("attended_count", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(32), server_default="planned"),
        sa.Column("notes", sa.Text()),
        sa.Column("extra", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crm_events_tenant", "crm_mobilization_events", ["tenant_id"])
    op.create_index("ix_crm_events_scheduled", "crm_mobilization_events", ["scheduled_at"])
    op.create_index("ix_crm_events_territory", "crm_mobilization_events", ["territory"])


def downgrade() -> None:
    for t in [
        "crm_mobilization_events", "crm_segments", "crm_outreach_tasks",
        "crm_interactions", "crm_relationships", "crm_stakeholder_profiles",
        "crm_organizations", "crm_contacts",
    ]:
        op.drop_table(t)
