"""
0042 — Economy Core: economic_series, macro_indicators, economic_signals,
                      economic_forecasts, budget_items

Revision: 0042
Down revision: 0041
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── economic_series ───────────────────────────────────────────────────────
    op.create_table(
        "economic_series",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("provider", sa.String(120), nullable=False),
        sa.Column("indicator_id", sa.String(200), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("geography", sa.String(120), nullable=False, server_default="ES"),
        sa.Column("geography_type", sa.String(80), nullable=True, server_default="country"),
        sa.Column("frequency", sa.String(50), nullable=True),
        sa.Column("unit", sa.String(80), nullable=True),
        sa.Column("category", sa.String(120), nullable=True),
        sa.Column("sector", sa.String(120), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("last_value", sa.Numeric(), nullable=True),
        sa.Column("last_date", sa.Date(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("TRUE"), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "indicator_id", "geography", name="uq_economic_series"),
    )
    op.create_index("idx_economic_series_provider", "economic_series", ["provider"])
    op.create_index("idx_economic_series_indicator", "economic_series", ["indicator_id"])
    op.create_index("idx_economic_series_category", "economic_series", ["category"])
    op.create_index("idx_economic_series_geography", "economic_series", ["geography"])

    op.execute("ALTER TABLE economic_series ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_economic_series ON economic_series USING (TRUE)"
    )

    # ── macro_indicators ──────────────────────────────────────────────────────
    op.create_table(
        "macro_indicators",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("provider", sa.String(120), nullable=False),
        sa.Column("indicator_id", sa.String(200), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("geography", sa.String(120), nullable=False, server_default="ES"),
        sa.Column("geography_type", sa.String(80), nullable=True, server_default="country"),
        sa.Column("frequency", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(), nullable=False),
        sa.Column("unit", sa.String(80), nullable=True),
        sa.Column("seasonally_adjusted", sa.Boolean(), nullable=True),
        sa.Column("category", sa.String(120), nullable=True),
        sa.Column("sector", sa.String(120), nullable=True),
        sa.Column("vintage_date", sa.Date(), nullable=True),
        sa.Column("release_date", sa.Date(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("fetched_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider", "indicator_id", "geography", "date", "vintage_date",
            name="uq_macro_indicator",
        ),
    )
    op.create_index(
        "idx_macro_indicators_indicator_date",
        "macro_indicators", ["indicator_id", "date"],
    )
    op.create_index("idx_macro_indicators_geography", "macro_indicators", ["geography"])
    op.create_index("idx_macro_indicators_category", "macro_indicators", ["category"])
    op.create_index("idx_macro_indicators_provider", "macro_indicators", ["provider"])
    op.execute(
        "CREATE INDEX idx_macro_indicators_raw ON macro_indicators USING GIN(raw_payload)"
    )

    op.execute("ALTER TABLE macro_indicators ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_macro_indicators ON macro_indicators USING (TRUE)"
    )

    # ── economic_signals ──────────────────────────────────────────────────────
    op.create_table(
        "economic_signals",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("signal_type", sa.String(120), nullable=False),
        sa.Column("indicator_id", sa.String(200), nullable=False),
        sa.Column("geography", sa.String(120), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("current_value", sa.Numeric(), nullable=False),
        sa.Column("previous_value", sa.Numeric(), nullable=True),
        sa.Column("change_abs", sa.Numeric(), nullable=True),
        sa.Column("change_pct", sa.Numeric(), nullable=True),
        sa.Column("z_score", sa.Numeric(), nullable=True),
        sa.Column("severity", sa.String(30), nullable=False),
        sa.Column("confidence", sa.Numeric(6, 4), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("related_sectors", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("related_parties", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("related_narratives", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_economic_signals_date", "economic_signals", ["date"])
    op.create_index("idx_economic_signals_type", "economic_signals", ["signal_type"])
    op.create_index("idx_economic_signals_severity", "economic_signals", ["severity"])
    op.create_index("idx_economic_signals_geography", "economic_signals", ["geography"])

    op.execute("ALTER TABLE economic_signals ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_economic_signals ON economic_signals USING (TRUE)"
    )

    # ── economic_forecasts ────────────────────────────────────────────────────
    op.create_table(
        "economic_forecasts",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("provider", sa.String(120), nullable=False),
        sa.Column("indicator_id", sa.String(200), nullable=False),
        sa.Column("geography", sa.String(120), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("horizon", sa.Integer(), nullable=False),
        sa.Column("yhat", sa.Numeric(), nullable=False),
        sa.Column("yhat_lower", sa.Numeric(), nullable=True),
        sa.Column("yhat_upper", sa.Numeric(), nullable=True),
        sa.Column("model_name", sa.String(120), nullable=True),
        sa.Column("model_version", sa.String(120), nullable=True),
        sa.Column("metrics", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider", "indicator_id", "geography", "forecast_date", "target_date", "model_name",
            name="uq_economic_forecast",
        ),
    )
    op.create_index(
        "idx_economic_forecasts_indicator",
        "economic_forecasts", ["indicator_id", "geography", "forecast_date"],
    )
    op.create_index("idx_economic_forecasts_target", "economic_forecasts", ["target_date"])

    op.execute("ALTER TABLE economic_forecasts ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_economic_forecasts ON economic_forecasts USING (TRUE)"
    )

    # ── budget_items ──────────────────────────────────────────────────────────
    op.create_table(
        "budget_items",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("budget_year", sa.Integer(), nullable=False),
        sa.Column("administration", sa.String(120), nullable=True),
        sa.Column("programme_code", sa.String(120), nullable=True),
        sa.Column("programme_name", sa.Text(), nullable=True),
        sa.Column("chapter", sa.String(120), nullable=True),
        sa.Column("ministry", sa.String(200), nullable=True),
        sa.Column("geography", sa.String(120), nullable=True),
        sa.Column("sector", sa.String(120), nullable=True),
        sa.Column("initial_credit", sa.Numeric(), nullable=True),
        sa.Column("final_credit", sa.Numeric(), nullable=True),
        sa.Column("executed_amount", sa.Numeric(), nullable=True),
        sa.Column("execution_rate", sa.Numeric(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(), server_default="{}", nullable=True),
        sa.Column("fetched_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_budget_items_year", "budget_items", ["budget_year"])
    op.create_index("idx_budget_items_ministry", "budget_items", ["ministry"])
    op.create_index("idx_budget_items_sector", "budget_items", ["sector"])
    op.create_index("idx_budget_items_geography", "budget_items", ["geography"])

    op.execute("ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation_budget_items ON budget_items USING (TRUE)"
    )


def downgrade() -> None:
    op.drop_table("budget_items")
    op.drop_table("economic_forecasts")
    op.drop_table("economic_signals")
    op.drop_table("macro_indicators")
    op.drop_table("economic_series")
