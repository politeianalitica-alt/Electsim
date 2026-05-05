"""
Schemas — Bloque 11: Simulation & Causal Intelligence Core.

Modelos Pydantic para escenarios, supuestos, intervenciones,
runs, resultados, estimaciones causales y sensibilidad.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


# ── Scenario ───────────────────────────────────────────────────────────────────

class Scenario(BaseModel):
    scenario_id: str = Field(default_factory=_uid)
    name: str
    description: str | None = None

    domain: Literal[
        "electoral", "campaign", "economy", "media",
        "legislative", "risk", "coalition", "territorial", "mixed",
    ] = "mixed"

    baseline_object_type: str | None = None
    baseline_object_id: str | None = None

    assumptions: dict[str, Any] = Field(default_factory=dict)
    interventions: list[dict[str, Any]] = Field(default_factory=list)

    created_by: str | None = None
    status: Literal["draft", "ready", "running", "completed", "archived"] = "draft"

    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── ScenarioAssumption ─────────────────────────────────────────────────────────

class ScenarioAssumption(BaseModel):
    assumption_id: str = Field(default_factory=_uid)
    scenario_id: str

    variable_name: str
    variable_label: str | None = None

    baseline_value: float | str | bool | None = None
    scenario_value: float | str | bool | None = None

    distribution: dict[str, Any] | None = None  # {type: "normal", mean: 0.5, std: 0.1}

    unit: str | None = None
    source: str | None = None

    confidence: float = 0.5
    rationale: str | None = None

    created_at: datetime = Field(default_factory=_now)


# ── Intervention ───────────────────────────────────────────────────────────────

class Intervention(BaseModel):
    intervention_id: str = Field(default_factory=_uid)
    scenario_id: str

    intervention_type: Literal[
        "campaign_message", "economic_shock", "media_spike",
        "legal_change", "turnout_shift", "vote_transfer",
        "coalition_constraint", "risk_event", "territorial_priority",
    ] = "economic_shock"

    target_object_type: str | None = None
    target_object_id: str | None = None

    parameters: dict[str, Any] = Field(default_factory=dict)
    expected_direction: Literal["positive", "negative", "mixed", "unknown"] = "unknown"

    start_date: date | None = None
    end_date: date | None = None

    confidence: float = 0.5
    notes: str | None = None

    created_at: datetime = Field(default_factory=_now)


# ── SimulationRun ──────────────────────────────────────────────────────────────

class SimulationRun(BaseModel):
    run_id: str = Field(default_factory=_uid)
    scenario_id: str

    model_name: str
    model_version: str = "1.0"

    status: Literal["running", "completed", "failed", "partial"] = "running"

    n_iterations: int | None = None
    random_seed: int | None = None

    started_at: datetime = Field(default_factory=_now)
    finished_at: datetime | None = None

    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)

    metrics: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)

    confidence: float | None = None
    duration_seconds: float | None = None


# ── SimulationResult ───────────────────────────────────────────────────────────

class SimulationResult(BaseModel):
    result_id: str = Field(default_factory=_uid)
    run_id: str

    metric_name: str
    metric_label: str | None = None

    baseline_value: float | None = None
    simulated_value: float | None = None

    delta_abs: float | None = None
    delta_pct: float | None = None

    lower_bound: float | None = None
    upper_bound: float | None = None

    probability_positive: float | None = None
    probability_negative: float | None = None

    explanation: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)


# ── CausalEstimate ─────────────────────────────────────────────────────────────

class CausalEstimate(BaseModel):
    estimate_id: str = Field(default_factory=_uid)

    treatment: str
    outcome: str
    population: str | None = None

    method: Literal[
        "difference_in_differences", "synthetic_control",
        "regression_adjustment", "matching",
        "instrumental_variable", "before_after", "bayesian", "custom",
    ] = "before_after"

    effect_estimate: float
    standard_error: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None

    p_value: float | None = None
    assumptions: list[str] = Field(default_factory=list)
    diagnostics: dict[str, Any] = Field(default_factory=dict)

    confidence: float = 0.5
    interpretation: str = ""

    created_at: datetime = Field(default_factory=_now)


# ── SensitivityResult ──────────────────────────────────────────────────────────

class SensitivityResult(BaseModel):
    sensitivity_id: str = Field(default_factory=_uid)
    run_id: str

    variable_name: str
    baseline_value: float
    tested_values: list[float] = Field(default_factory=list)

    output_metric: str
    output_values: list[float] = Field(default_factory=list)

    elasticity: float | None = None
    importance_score: float | None = None

    explanation: str = ""

    created_at: datetime = Field(default_factory=_now)


# ── StressTestConfig ───────────────────────────────────────────────────────────

class StressTestConfig(BaseModel):
    config_id: str = Field(default_factory=_uid)
    name: str

    shock_type: Literal[
        "economic_shock", "media_crisis", "legal_shock",
        "coalition_breakdown", "turnout_collapse", "geopolitical_event",
        "polling_error", "campaign_backfire",
    ] = "economic_shock"

    domain: str = "mixed"
    magnitude: Literal["mild", "moderate", "severe", "extreme"] = "moderate"

    parameters: dict[str, Any] = Field(default_factory=dict)
    description: str | None = None


# ── CounterfactualComparison ───────────────────────────────────────────────────

class CounterfactualComparison(BaseModel):
    comparison_id: str = Field(default_factory=_uid)

    observed_run_id: str | None = None
    counterfactual_run_id: str | None = None

    observed_inputs: dict[str, Any] = Field(default_factory=dict)
    counterfactual_inputs: dict[str, Any] = Field(default_factory=dict)

    observed_outputs: dict[str, Any] = Field(default_factory=dict)
    counterfactual_outputs: dict[str, Any] = Field(default_factory=dict)

    deltas: dict[str, Any] = Field(default_factory=dict)
    narrative: str = ""

    created_at: datetime = Field(default_factory=_now)


# ── ModelEvaluationResult ──────────────────────────────────────────────────────

class ModelEvaluationResult(BaseModel):
    eval_id: str = Field(default_factory=_uid)
    model_name: str
    model_version: str = "1.0"

    metric_name: str
    metric_value: float

    baseline_metric: float | None = None
    improvement: float | None = None

    evaluation_period: str | None = None
    sample_size: int | None = None

    notes: str | None = None
    created_at: datetime = Field(default_factory=_now)
