"""
0053 — Communications Core: 8 tablas para comunicación estratégica.

comms_channels, message_frames, content_assets, editorial_calendar,
distribution_lists, publication_jobs, content_approvals, content_performance.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0053"
down_revision = "0052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comms_channels",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("channel_id", sa.String(150), unique=True, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("channel_type", sa.String(80), nullable=False),
        sa.Column("owner", sa.Text()),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("requires_approval", sa.Boolean(), server_default="true"),
        sa.Column("supports_direct_publish", sa.Boolean(), server_default="false"),
        sa.Column("character_limit", sa.Integer()),
        sa.Column("metadata", JSONB),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_comms_channels_type", "comms_channels", ["channel_type"])
    op.create_index("ix_comms_channels_tenant", "comms_channels", ["tenant_id"])

    op.create_table(
        "message_frames",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("frame_id", sa.String(150), unique=True, nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("frame_type", sa.String(80)),
        sa.Column("core_claim", sa.Text(), nullable=False),
        sa.Column("supporting_points", JSONB),
        sa.Column("evidence_ids", sa.ARRAY(sa.Text())),
        sa.Column("target_audience", sa.Text()),
        sa.Column("tone", sa.String(80)),
        sa.Column("risk_flags", sa.ARRAY(sa.Text())),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_message_frames_type", "message_frames", ["frame_type"])
    op.create_index("ix_message_frames_tenant", "message_frames", ["tenant_id"])

    op.create_table(
        "content_assets",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("asset_id", sa.String(150), unique=True, nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("asset_type", sa.String(80), nullable=False),
        sa.Column("body_markdown", sa.Text(), nullable=False),
        sa.Column("short_copy", sa.Text()),
        sa.Column("channel_id", sa.String(150)),
        sa.Column("message_frame_id", sa.String(150)),
        sa.Column("source_objects", JSONB),
        sa.Column("evidence_ids", sa.ARRAY(sa.Text())),
        sa.Column("status", sa.String(40), server_default="draft"),
        sa.Column("language", sa.String(20), server_default="es"),
        sa.Column("tone", sa.String(80)),
        sa.Column("created_by", sa.String(150)),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("workspace_id", sa.String(150)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_content_assets_type", "content_assets", ["asset_type"])
    op.create_index("ix_content_assets_status", "content_assets", ["status"])
    op.create_index("ix_content_assets_tenant", "content_assets", ["tenant_id"])
    op.create_index("ix_content_assets_frame", "content_assets", ["message_frame_id"])

    op.create_table(
        "editorial_calendar",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("calendar_item_id", sa.String(150), unique=True, nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content_asset_id", sa.String(150)),
        sa.Column("channel_id", sa.String(150)),
        sa.Column("planned_at", sa.DateTime(), nullable=False),
        sa.Column("deadline_at", sa.DateTime()),
        sa.Column("status", sa.String(40), server_default="idea"),
        sa.Column("campaign_id", sa.String(150)),
        sa.Column("related_alert_id", sa.String(150)),
        sa.Column("related_scenario_id", sa.String(150)),
        sa.Column("owner_user_id", sa.String(150)),
        sa.Column("approver_user_id", sa.String(150)),
        sa.Column("priority", sa.String(40), server_default="MEDIUM"),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_editorial_calendar_planned", "editorial_calendar", ["planned_at"])
    op.create_index("ix_editorial_calendar_status", "editorial_calendar", ["status"])
    op.create_index("ix_editorial_calendar_tenant", "editorial_calendar", ["tenant_id"])

    op.create_table(
        "distribution_lists",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("list_id", sa.String(150), unique=True, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("list_type", sa.String(80)),
        sa.Column("crm_segment_id", sa.String(150)),
        sa.Column("static_members", JSONB),
        sa.Column("allowed_use", sa.String(80)),
        sa.Column("consent_required", sa.Boolean(), server_default="true"),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_distribution_lists_type", "distribution_lists", ["list_type"])
    op.create_index("ix_distribution_lists_tenant", "distribution_lists", ["tenant_id"])

    op.create_table(
        "publication_jobs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("publication_id", sa.String(150), unique=True, nullable=False),
        sa.Column("content_asset_id", sa.String(150), nullable=False),
        sa.Column("channel_id", sa.String(150), nullable=False),
        sa.Column("scheduled_at", sa.DateTime()),
        sa.Column("published_at", sa.DateTime()),
        sa.Column("status", sa.String(60), server_default="queued"),
        sa.Column("external_post_id", sa.Text()),
        sa.Column("external_url", sa.Text()),
        sa.Column("requires_manual_publish", sa.Boolean(), server_default="true"),
        sa.Column("error_message", sa.Text()),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_publication_jobs_asset", "publication_jobs", ["content_asset_id"])
    op.create_index("ix_publication_jobs_channel", "publication_jobs", ["channel_id"])
    op.create_index("ix_publication_jobs_status", "publication_jobs", ["status"])

    op.create_table(
        "content_approvals",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("approval_id", sa.String(150), unique=True, nullable=False),
        sa.Column("content_asset_id", sa.String(150), nullable=False),
        sa.Column("requested_by", sa.String(150)),
        sa.Column("approver_user_id", sa.String(150)),
        sa.Column("approval_status", sa.String(60), server_default="pending"),
        sa.Column("comments", sa.Text()),
        sa.Column("risk_review_required", sa.Boolean(), server_default="false"),
        sa.Column("legal_review_required", sa.Boolean(), server_default="false"),
        sa.Column("tenant_id", sa.String(150), server_default="default"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("decided_at", sa.DateTime()),
    )
    op.create_index("ix_content_approvals_asset", "content_approvals", ["content_asset_id"])
    op.create_index("ix_content_approvals_status", "content_approvals", ["approval_status"])

    op.create_table(
        "content_performance",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("performance_id", sa.String(150), unique=True, nullable=False),
        sa.Column("content_asset_id", sa.String(150), nullable=False),
        sa.Column("channel_id", sa.String(150), nullable=False),
        sa.Column("measured_at", sa.DateTime(), nullable=False),
        sa.Column("impressions", sa.Integer()),
        sa.Column("engagements", sa.Integer()),
        sa.Column("clicks", sa.Integer()),
        sa.Column("shares", sa.Integer()),
        sa.Column("comments", sa.Integer()),
        sa.Column("opens", sa.Integer()),
        sa.Column("replies", sa.Integer()),
        sa.Column("engagement_rate", sa.Numeric(8, 4)),
        sa.Column("click_rate", sa.Numeric(8, 4)),
        sa.Column("sentiment_score", sa.Numeric(8, 4)),
        sa.Column("narrative_shift_score", sa.Numeric(8, 4)),
        sa.Column("raw_payload", JSONB),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_content_performance_asset", "content_performance", ["content_asset_id"])
    op.create_index("ix_content_performance_measured", "content_performance", ["measured_at"])


def downgrade() -> None:
    for t in [
        "content_performance", "content_approvals", "publication_jobs",
        "distribution_lists", "editorial_calendar", "content_assets",
        "message_frames", "comms_channels",
    ]:
        op.drop_table(t)
