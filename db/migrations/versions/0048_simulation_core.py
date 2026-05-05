"""
Migration 0048 — Simulation & Causal Intelligence Core (Bloque 11).

Crea 7 tablas:
  - simulation_scenarios
  - simulation_assumptions
  - simulation_interventions
  - simulation_runs
  - simulation_results
  - simulation_causal_estimates
  - simulation_sensitivity_results
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── simulation_scenarios ───────────────────────────────────────────────────
    op.create_table(
        "simulation_scenarios",
        sa.Column("scenario_id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("domain", sa.Text, nullable=False, server_default="mixed"),
        sa.Column("status", sa.Text, nullable=False, server_default="draft"),
        sa.Column("baseline_object_type", sa.Text),
        sa.Column("baseline_object_id", sa.Text),
        sa.Column("assumptions", JSONB, nullable=False, server_default="{}"),
        sa.Column("interventions", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_by", sa.Text),
        sa.Column("tags", JSONB, nullable=False, server_default="[]"),
        sa.Column("metadata", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_simulation_scenarios_domain", "simulation_scenarios", ["domain"])
    op.create_index("ix_simulation_scenarios_status", "simulation_scenarios", ["status"])
    op.create_index("ix_simulation_scenarios_created_by", "simulation_scenarios", ["created_by"])

    # Enable RLS
    op.execute("ALTER TABLE simulation_scenarios ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_simulation_scenarios
        ON simulation_scenarios
        USING (true)
    """)

    # ── simulation_assumptions ─────────────────────────────────────────────────
    op.create_table(
        "simulation_assumptions",
        sa.Column("assumption_id", sa.Text, primary_key=True),
        sa.Column("scenario_id", sa.Text, nullable=False),
        sa.Column("variable_name", sa.Text, nullable=False),
        sa.Column("variable_label", sa.Text),
        sa.Column("baseline_value", sa.Text),
        sa.Column("scenario_value", sa.Text),
        sa.Column("distribution", JSONB),
        sa.Column("unit", sa.Text),
        sa.Column("source", sa.Text),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("rationale", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["scenario_id"], ["simulation_scenarios.scenario_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_simulation_assumptions_scenario", "simulation_assumptions", ["scenario_id"])

    # ── simulation_interventions ───────────────────────────────────────────────
    op.create_table(
        "simulation_interventions",
        sa.Column("intervention_id", sa.Text, primary_key=True),
        sa.Column("scenario_id", sa.Text, nullable=False),
        sa.Column("intervention_type", sa.Text, nullable=False),
        sa.Column("target_object_type", sa.Text),
        sa.Column("target_object_id", sa.Text),
        sa.Column("parameters", JSONB, nullable=False, server_default="{}"),
        sa.Column("expected_direction", sa.Text, server_default="unknown"),
        sa.Column("start_date", sa.Date),
        sa.Column("end_date", sa.Date),
        sa.Column("confidence", sa.Float, server_default="0.5"),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["scenario_id"], ["simulation_scenarios.scenario_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_simulation_interventions_scenario", "simulation_interventions", ["scenario_id"])
    op.create_index("ix_simulation_interventions_type", "simulation_interventions", ["intervention_type"])

    # ── simulation_runs ────────────────────────────────────────────────────────
    op.create_table(
        "simulation_runs",
        sa.Column("run_id", sa.Text, primary_key=True),
        sa.Column("scenario_id", sa.Text, nullable=False),
        sa.Column("model_name", sa.Text, nullable=False),
        sa.Column("model_version", sa.Text, nullable=False, server_default="1.0"),
        sa.Column("status", sa.Text, nullable=False, server_default="running"),
        sa.Column("n_iterations", sa.Integer),
        sa.Column("random_seed", sa.Integer),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("inputs", JSONB, nullable=False, server_default="{}"),
        sa.Column("outputs", JSONB, nullable=False, server_default="{}"),
        sa.Column("metrics", JSONB, nullable=False, server_default="{}"),
        sa.Column("warnings", JSONB, nullable=False, server_default="[]"),
        sa.Column("confidence", sa.Float),
        sa.Column("duration_seconds", sa.Float),
        sa.ForeignKeyConstraint(
            ["scenario_id"], ["simulation_scenarios.scenario_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_simulation_runs_scenario", "simulation_runs", ["scenario_id"])
    op.create_index("ix_simulation_runs_model", "simulation_runs", ["model_name"])
    op.create_index("ix_simulation_runs_status", "simulation_runs", ["status"])

    # ── simulation_results ─────────────────────────────────────────────────────
    op.create_table(
        "simulation_results",
        sa.Column("result_id", sa.Text, primary_key=True),
        sa.Column("run_id", sa.Text, nullable=False),
        sa.Column("metric_name", sa.Text, nullable=False),
        sa.Column("metric_label", sa.Text),
        sa.Column("baseline_value", sa.Float),
        sa.Column("simulated_value", sa.Float),
        sa.Column("delta_abs", sa.Float),
        sa.Column("delta_pct", sa.Float),
        sa.Column("lower_bound", sa.Float),
        sa.Column("upper_bound", sa.Float),
        sa.Column("probability_positive", sa.Float),
        sa.Column("probability_negative", sa.Float),
        sa.Column("explanation", sa.Text, nullable=False, server_default=""),
        sa.Column("metadata", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["run_id"], ["simulation_runs.run_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_simulation_results_run", "simulation_results", ["run_id"])
    op.create_index("ix_simulation_results_metric", "simulation_results", ["metric_name"])

    # ── simulation_causal_estimates ────────────────────────────────────────────
    op.create_table(
        "simulation_causal_estimates",
        sa.Column("estimate_id", sa.Text, primary_key=True),
        sa.Column("treatment", sa.Text, nullable=False),
        sa.Column("outcome", sa.Text, nullable=False),
        sa.Column("population", sa.Text),
        sa.Column("method", sa.Text, nullable=False, server_default="before_after"),
        sa.Column("effect_estimate", sa.Float, nullable=False),
        sa.Column("standard_error", sa.Float),
        sa.Column("lower_bound", sa.Float),
        sa.Column("upper_bound", sa.Float),
        sa.Column("p_value", sa.Float),
        sa.Column("assumptions", JSONB, nullable=False, server_default="[]"),
        sa.Column("diagnostics", JSONB, nullable=False, server_default="{}"),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("interpretation", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_simulation_causal_method", "simulation_causal_estimates", ["method"])
    op.create_index("ix_simulation_causal_treatment", "simulation_causal_estimates", ["treatment"])

    # ── simulation_sensitivity_results ────────────────────────────────────────
    op.create_table(
        "simulation_sensitivity_results",
        sa.Column("sensitivity_id", sa.Text, primary_key=True),
        sa.Column("run_id", sa.Text, nullable=False),
        sa.Column("variable_name", sa.Text, nullable=False),
        sa.Column("baseline_value", sa.Float, nullable=False),
        sa.Column("tested_values", JSONB, nullable=False, server_default="[]"),
        sa.Column("output_metric", sa.Text, nullable=False),
        sa.Column("output_values", JSONB, nullable=False, server_default="[]"),
        sa.Column("elasticity", sa.Float),
        sa.Column("importance_score", sa.Float),
        sa.Column("explanation", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(
            ["run_id"], ["simulation_runs.run_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_simulation_sensitivity_run", "simulation_sensitivity_results", ["run_id"])
    op.create_index("ix_simulation_sensitivity_variable", "simulation_sensitivity_results", ["variable_name"])


def downgrade() -> None:
    op.drop_table("simulation_sensitivity_results")
    op.drop_table("simulation_causal_estimates")
    op.drop_table("simulation_results")
    op.drop_table("simulation_runs")
    op.drop_table("simulation_interventions")
    op.drop_table("simulation_assumptions")
    op.drop_table("simulation_scenarios")
