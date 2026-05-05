"""
0047 — Open Data Core

Tablas de catálogo dinámico de datos abiertos e institucionales.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0047"
down_revision = "0046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── open_data_portals ────────────────────────────────────────────────────
    op.create_table(
        "open_data_portals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("portal_id", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("portal_url", sa.String(500), nullable=True),
        sa.Column("api_url", sa.String(500), nullable=True),
        sa.Column("country", sa.String(10), nullable=False, server_default="ES"),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("municipality", sa.String(100), nullable=True),
        sa.Column("administration_level", sa.String(30), nullable=False, server_default="national"),
        sa.Column("portal_type", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("dataset_count", sa.Integer(), nullable=True),
        sa.Column("last_harvested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("harvest_frequency_hours", sa.Integer(), nullable=True, server_default="24"),
        sa.Column("themes", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("license_default", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_open_data_portals_portal_id", "open_data_portals", ["portal_id"])
    op.create_index("ix_open_data_portals_country", "open_data_portals", ["country"])
    op.create_index("ix_open_data_portals_admin_level", "open_data_portals", ["administration_level"])

    # ── open_data_datasets ───────────────────────────────────────────────────
    op.create_table(
        "open_data_datasets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("dataset_id", sa.String(255), nullable=False, unique=True),
        sa.Column("portal_id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("publisher", sa.String(255), nullable=True),
        sa.Column("publisher_email", sa.String(255), nullable=True),
        sa.Column("themes", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("keywords", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("license_id", sa.String(100), nullable=True),
        sa.Column("license_title", sa.String(255), nullable=True),
        sa.Column("license_url", sa.String(500), nullable=True),
        sa.Column("applicable_modules", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("applicable_sectors", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("applicable_markets", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("update_frequency", sa.String(50), nullable=True),
        sa.Column("temporal_coverage_start", sa.Date(), nullable=True),
        sa.Column("temporal_coverage_end", sa.Date(), nullable=True),
        sa.Column("issued", sa.Date(), nullable=True),
        sa.Column("modified", sa.DateTime(timezone=True), nullable=True),
        sa.Column("spatial_coverage", sa.String(100), nullable=True),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("usability_score", sa.Float(), nullable=True),
        sa.Column("resource_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["portal_id"], ["open_data_portals.portal_id"], ondelete="CASCADE"),
    )
    op.create_index("ix_open_data_datasets_portal_id", "open_data_datasets", ["portal_id"])
    op.create_index("ix_open_data_datasets_last_seen", "open_data_datasets", ["last_seen_at"])
    op.execute(
        "CREATE INDEX ix_open_data_datasets_fts ON open_data_datasets "
        "USING gin(to_tsvector('spanish', COALESCE(title, '') || ' ' || COALESCE(description, '')))"
    )

    # ── open_data_resources ──────────────────────────────────────────────────
    op.create_table(
        "open_data_resources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("resource_id", sa.String(255), nullable=False, unique=True),
        sa.Column("dataset_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("download_url", sa.String(1000), nullable=True),
        sa.Column("format", sa.String(50), nullable=True),
        sa.Column("media_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("is_machine_readable", sa.Boolean(), nullable=True),
        sa.Column("is_geospatial", sa.Boolean(), nullable=True),
        sa.Column("is_tabular", sa.Boolean(), nullable=True),
        sa.Column("is_document", sa.Boolean(), nullable=True),
        sa.Column("is_accessible", sa.Boolean(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("modified", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["open_data_datasets.dataset_id"], ondelete="CASCADE"),
    )
    op.create_index("ix_open_data_resources_dataset_id", "open_data_resources", ["dataset_id"])
    op.create_index("ix_open_data_resources_format", "open_data_resources", ["format"])

    # ── institutional_api_endpoints ──────────────────────────────────────────
    op.create_table(
        "institutional_api_endpoints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("endpoint_id", sa.String(255), nullable=False, unique=True),
        sa.Column("source_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url_template", sa.String(1000), nullable=False),
        sa.Column("protocol", sa.String(30), nullable=False),
        sa.Column("applicable_modules", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("parameters_schema", postgresql.JSONB(), nullable=True),
        sa.Column("auth_required", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_institutional_endpoints_source", "institutional_api_endpoints", ["source_id"])

    # ── dataset_ingestion_plans ──────────────────────────────────────────────
    op.create_table(
        "dataset_ingestion_plans",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("dataset_id", sa.String(255), nullable=False, unique=True),
        sa.Column("portal_id", sa.String(100), nullable=False),
        sa.Column("target_domain", sa.String(50), nullable=False),
        sa.Column("applicable_modules", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("applicable_sectors", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("transform_strategy", sa.String(50), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("review_status", sa.String(20), nullable=False, server_default="candidate"),
        sa.Column("reviewed_by", sa.String(100), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("justification", sa.Text(), nullable=True),
        sa.Column("suggested_by", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_ingestion_plans_portal_id", "dataset_ingestion_plans", ["portal_id"])
    op.create_index("ix_ingestion_plans_review_status", "dataset_ingestion_plans", ["review_status"])
    op.create_index("ix_ingestion_plans_target_domain", "dataset_ingestion_plans", ["target_domain"])
    op.create_index("ix_ingestion_plans_priority", "dataset_ingestion_plans", ["priority"])

    # ── dataset_profiles ─────────────────────────────────────────────────────
    op.create_table(
        "dataset_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("dataset_id", sa.String(255), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("column_count", sa.Integer(), nullable=True),
        sa.Column("null_ratio", sa.Float(), nullable=True),
        sa.Column("detected_geographies", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("detected_dates", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("detected_topics", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("detected_sectors", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("geographic_columns", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("date_columns", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("topic_columns", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("sample_rows", postgresql.JSONB(), nullable=True),
        sa.Column("profiled_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_dataset_profiles_resource_id", "dataset_profiles", ["resource_id"])
    op.create_index("ix_dataset_profiles_dataset_id", "dataset_profiles", ["dataset_id"])

    # ── RLS (open_data_portals no tiene tenant → sin RLS) ────────────────────
    # dataset_ingestion_plans podría tener tenant en el futuro;
    # por ahora sin RLS para simplificar.


def downgrade() -> None:
    op.drop_table("dataset_profiles")
    op.drop_table("dataset_ingestion_plans")
    op.drop_table("institutional_api_endpoints")
    op.drop_table("open_data_resources")
    op.drop_table("open_data_datasets")
    op.drop_table("open_data_portals")
