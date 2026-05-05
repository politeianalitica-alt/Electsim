"""
Migración 0055 — media_source_health + llm_jobs

Tablas:
- media_source_health: salud de fuentes mediáticas
- llm_jobs: jobs del router LLM
"""
from alembic import op
import sqlalchemy as sa

revision = "0055"
down_revision = "0054"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_source_health",
        sa.Column("source_id", sa.String(32), primary_key=True),
        sa.Column("source_name", sa.String(200), nullable=False),
        sa.Column("rss_url", sa.Text, nullable=True),
        sa.Column("status", sa.String(30), server_default="unknown"),
        sa.Column("last_success_at", sa.Text, nullable=True),
        sa.Column("last_failure_at", sa.Text, nullable=True),
        sa.Column("http_status", sa.Integer, nullable=True),
        sa.Column("error_type", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("articles_last_24h", sa.Integer, server_default="0"),
        sa.Column("parser_used", sa.String(30), nullable=True),
        sa.Column("needs_html_scraper", sa.Boolean, server_default="false"),
        sa.Column("quality_score", sa.Float, server_default="0.5"),
        sa.Column("updated_at", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=True),
    )
    op.create_table(
        "llm_jobs",
        sa.Column("job_id", sa.String(36), primary_key=True),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("prompt_hash", sa.String(64), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("started_at", sa.Text, nullable=True),
        sa.Column("finished_at", sa.Text, nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("input_tokens_est", sa.Integer, nullable=True),
        sa.Column("output_tokens_est", sa.Integer, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("result_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=True),
        sa.Column("tenant_id", sa.String(64), server_default="default"),
    )


def downgrade() -> None:
    op.drop_table("llm_jobs")
    op.drop_table("media_source_health")
