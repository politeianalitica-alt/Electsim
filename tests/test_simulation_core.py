"""
Tests — Bloque 11: Simulation & Causal Intelligence Core.

Suite: 10 clases, ~80 tests.
"""
from __future__ import annotations

import math
import random
from typing import Any

import pytest

# ── Helpers ────────────────────────────────────────────────────────────────────

def _simple_model(inputs: dict[str, Any]) -> dict[str, float]:
    """Modelo de prueba: suma ponderada de inputs numéricos."""
    vote = float(inputs.get("vote_share", 30.0))
    econ = float(inputs.get("gdp_growth", 0.0))
    return {
        "vote_intention": vote + econ * 0.4,
        "approval": min(100.0, vote * 1.1),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 1. Schemas
# ══════════════════════════════════════════════════════════════════════════════

class TestSchemas:
    def test_scenario_defaults(self):
        from models.simulation.schemas import Scenario
        s = Scenario(name="Test")
        assert s.domain == "mixed"
        assert s.status == "draft"
        assert isinstance(s.scenario_id, str)
        assert len(s.scenario_id) == 36

    def test_scenario_domain_literal(self):
        from models.simulation.schemas import Scenario
        for domain in ["electoral", "campaign", "economy", "media", "mixed"]:
            s = Scenario(name="x", domain=domain)
            assert s.domain == domain

    def test_assumption_defaults(self):
        from models.simulation.schemas import ScenarioAssumption
        a = ScenarioAssumption(scenario_id="s1", variable_name="gdp_growth")
        assert a.confidence == 0.5
        assert a.baseline_value is None

    def test_intervention_defaults(self):
        from models.simulation.schemas import Intervention
        i = Intervention(scenario_id="s1")
        assert i.intervention_type == "economic_shock"
        assert i.expected_direction == "unknown"

    def test_simulation_run_defaults(self):
        from models.simulation.schemas import SimulationRun
        r = SimulationRun(scenario_id="s1", model_name="test_model")
        assert r.status == "running"
        assert r.inputs == {}
        assert r.warnings == []

    def test_simulation_result_defaults(self):
        from models.simulation.schemas import SimulationResult
        r = SimulationResult(run_id="r1", metric_name="vote")
        assert r.explanation == ""
        assert r.metadata == {}

    def test_causal_estimate_before_after(self):
        from models.simulation.schemas import CausalEstimate
        e = CausalEstimate(
            treatment="TVad",
            outcome="vote_share",
            method="before_after",
            effect_estimate=2.5,
        )
        assert e.effect_estimate == 2.5
        assert e.method == "before_after"

    def test_stress_test_config(self):
        from models.simulation.schemas import StressTestConfig
        c = StressTestConfig(name="Recession", shock_type="economic_shock", magnitude="severe")
        assert c.magnitude == "severe"
        assert c.shock_type == "economic_shock"

    def test_counterfactual_comparison(self):
        from models.simulation.schemas import CounterfactualComparison
        cc = CounterfactualComparison()
        assert cc.deltas == {}
        assert cc.narrative == ""

    def test_model_evaluation_result(self):
        from models.simulation.schemas import ModelEvaluationResult
        r = ModelEvaluationResult(model_name="m1", metric_name="mae", metric_value=0.05)
        assert r.metric_value == 0.05
        assert r.model_version == "1.0"


# ══════════════════════════════════════════════════════════════════════════════
# 2. Scenario Registry
# ══════════════════════════════════════════════════════════════════════════════

class TestScenarioRegistry:
    def setup_method(self):
        from models.simulation.scenario_registry import clear_cache
        clear_cache()

    def test_create_scenario(self):
        from models.simulation.scenario_registry import create_scenario
        s = create_scenario(name="Test Electoral", domain="electoral")
        assert s.name == "Test Electoral"
        assert s.domain == "electoral"
        assert s.status == "draft"

    def test_get_scenario(self):
        from models.simulation.scenario_registry import create_scenario, get_scenario
        s = create_scenario(name="Foo")
        retrieved = get_scenario(s.scenario_id)
        assert retrieved is not None
        assert retrieved.scenario_id == s.scenario_id

    def test_get_nonexistent_scenario(self):
        from models.simulation.scenario_registry import get_scenario
        assert get_scenario("nonexistent-id") is None

    def test_list_scenarios_empty(self):
        from models.simulation.scenario_registry import list_scenarios
        assert list_scenarios() == []

    def test_list_scenarios_with_domain_filter(self):
        from models.simulation.scenario_registry import create_scenario, list_scenarios
        create_scenario(name="A", domain="electoral")
        create_scenario(name="B", domain="economy")
        electoral = list_scenarios(domain="electoral")
        assert len(electoral) == 1
        assert electoral[0].name == "A"

    def test_add_assumption(self):
        from models.simulation.scenario_registry import create_scenario, add_assumption, get_scenario_assumptions
        s = create_scenario(name="Assumptions Test")
        a = add_assumption(
            scenario_id=s.scenario_id,
            variable_name="gdp_growth",
            scenario_value=-2.0,
            baseline_value=1.5,
        )
        assert a is not None
        assert a.variable_name == "gdp_growth"
        assumptions = get_scenario_assumptions(s.scenario_id)
        assert len(assumptions) == 1

    def test_add_assumption_unknown_scenario(self):
        from models.simulation.scenario_registry import add_assumption
        result = add_assumption(scenario_id="nonexistent", variable_name="x")
        assert result is None

    def test_add_intervention(self):
        from models.simulation.scenario_registry import create_scenario, add_intervention, get_scenario_interventions
        s = create_scenario(name="Intervention Test")
        i = add_intervention(
            scenario_id=s.scenario_id,
            intervention_type="economic_shock",
            parameters={"magnitude": "severe"},
        )
        assert i is not None
        interventions = get_scenario_interventions(s.scenario_id)
        assert len(interventions) == 1

    def test_update_scenario_status(self):
        from models.simulation.scenario_registry import create_scenario, update_scenario_status, get_scenario
        s = create_scenario(name="Status Test")
        updated = update_scenario_status(s.scenario_id, "running")
        assert updated is not None
        assert updated.status == "running"
        retrieved = get_scenario(s.scenario_id)
        assert retrieved.status == "running"

    def test_clone_scenario(self):
        from models.simulation.scenario_registry import (
            create_scenario, add_assumption, clone_scenario,
            get_scenario_assumptions,
        )
        s = create_scenario(name="Original")
        add_assumption(s.scenario_id, "x", scenario_value=1.0)
        cloned = clone_scenario(s.scenario_id, "Copia")
        assert cloned is not None
        assert cloned.name == "Copia"
        assert cloned.scenario_id != s.scenario_id
        cloned_assumptions = get_scenario_assumptions(cloned.scenario_id)
        assert len(cloned_assumptions) == 1


# ══════════════════════════════════════════════════════════════════════════════
# 3. Assumption Store
# ══════════════════════════════════════════════════════════════════════════════

class TestAssumptionStore:
    def _make_assumption(self, name: str, val: float, dist: dict | None = None, confidence: float = 0.5):
        from models.simulation.schemas import ScenarioAssumption
        return ScenarioAssumption(
            scenario_id="s1",
            variable_name=name,
            scenario_value=val,
            distribution=dist,
            confidence=confidence,
        )

    def test_validate_assumptions_ok(self):
        from models.simulation.assumption_store import validate_assumptions
        assumptions = [self._make_assumption("x", 1.0), self._make_assumption("y", 2.0)]
        result = validate_assumptions(assumptions)
        assert result["errors"] == []

    def test_validate_confidence_out_of_range(self):
        from models.simulation.assumption_store import validate_assumptions
        from models.simulation.schemas import ScenarioAssumption
        a = ScenarioAssumption(
            scenario_id="s1",
            variable_name="z",
            confidence=1.5,  # invalid
        )
        result = validate_assumptions([a])
        assert len(result["errors"]) > 0

    def test_validate_duplicate_variable(self):
        from models.simulation.assumption_store import validate_assumptions
        assumptions = [
            self._make_assumption("x", 1.0),
            self._make_assumption("x", 2.0),
        ]
        result = validate_assumptions(assumptions)
        assert any("duplicada" in w.lower() for w in result["warnings"])

    def test_summarize_assumptions(self):
        from models.simulation.assumption_store import summarize_assumptions
        assumptions = [
            self._make_assumption("x", 1.0, confidence=0.8),
            self._make_assumption("y", 2.0, confidence=0.6),
        ]
        summary = summarize_assumptions(assumptions)
        assert summary["n_assumptions"] == 2
        assert abs(summary["avg_confidence"] - 0.7) < 0.01

    def test_assumptions_to_model_inputs(self):
        from models.simulation.assumption_store import assumptions_to_model_inputs
        assumptions = [
            self._make_assumption("vote_share", 30.0),
            self._make_assumption("gdp_growth", -2.0),
        ]
        inputs = assumptions_to_model_inputs(assumptions)
        assert inputs["vote_share"] == 30.0
        assert inputs["gdp_growth"] == -2.0

    def test_assumptions_with_distribution(self):
        from models.simulation.assumption_store import assumptions_to_model_inputs
        from models.simulation.schemas import ScenarioAssumption
        a = ScenarioAssumption(
            scenario_id="s1",
            variable_name="x",
            distribution={"type": "normal", "mean": 5.0, "std": 1.0},
        )
        inputs = assumptions_to_model_inputs([a])
        assert inputs["x"] == 5.0  # Central value (mean)

    def test_get_uncertainty_bounds(self):
        from models.simulation.assumption_store import get_uncertainty_bounds
        from models.simulation.schemas import ScenarioAssumption
        a = ScenarioAssumption(
            scenario_id="s1",
            variable_name="x",
            distribution={"type": "uniform", "low": 1.0, "high": 3.0},
        )
        bounds = get_uncertainty_bounds([a])
        assert "x" in bounds
        assert bounds["x"]["low"] == 1.0
        assert bounds["x"]["high"] == 3.0


# ══════════════════════════════════════════════════════════════════════════════
# 4. Monte Carlo
# ══════════════════════════════════════════════════════════════════════════════

class TestMonteCarlo:
    def test_sample_normal(self):
        from models.simulation.monte_carlo import _sample_normal
        rng = random.Random(42)
        samples = [_sample_normal(0.0, 1.0, rng) for _ in range(1000)]
        assert abs(sum(samples) / 1000) < 0.1  # mean ≈ 0

    def test_sample_uniform(self):
        from models.simulation.monte_carlo import _sample_uniform
        rng = random.Random(42)
        samples = [_sample_uniform(0.0, 10.0, rng) for _ in range(1000)]
        assert all(0.0 <= s <= 10.0 for s in samples)

    def test_sample_triangular(self):
        from models.simulation.monte_carlo import _sample_triangular
        rng = random.Random(42)
        samples = [_sample_triangular(0.0, 10.0, 5.0, rng) for _ in range(100)]
        assert all(0.0 <= s <= 10.0 for s in samples)

    def test_sample_discrete(self):
        from models.simulation.monte_carlo import _sample_discrete
        rng = random.Random(42)
        samples = [_sample_discrete([1, 2, 3], [0.5, 0.3, 0.2], rng) for _ in range(100)]
        assert all(s in [1, 2, 3] for s in samples)

    def test_run_monte_carlo_basic(self):
        from models.simulation.monte_carlo import run_monte_carlo
        from models.simulation.schemas import ScenarioAssumption
        assumptions = [
            ScenarioAssumption(
                scenario_id="s1",
                variable_name="vote_share",
                distribution={"type": "normal", "mean": 30.0, "std": 2.0},
            )
        ]
        results = run_monte_carlo(
            model_fn=_simple_model,
            assumptions=assumptions,
            n_iterations=200,
            seed=42,
        )
        assert "vote_intention" in results
        assert len(results["vote_intention"]) == 200

    def test_summarize_monte_carlo_results(self):
        from models.simulation.monte_carlo import run_monte_carlo, summarize_monte_carlo_results
        from models.simulation.schemas import ScenarioAssumption
        assumptions = [
            ScenarioAssumption(
                scenario_id="s1",
                variable_name="vote_share",
                distribution={"type": "uniform", "low": 25.0, "high": 35.0},
            )
        ]
        mc = run_monte_carlo(_simple_model, assumptions, n_iterations=100, seed=42)
        results = summarize_monte_carlo_results(mc, run_id="test", baseline_values={"vote_intention": 30.0})
        assert len(results) > 0
        r = next(r for r in results if r.metric_name == "vote_intention")
        assert r.lower_bound is not None
        assert r.upper_bound is not None
        assert r.lower_bound <= r.simulated_value <= r.upper_bound

    def test_compute_probability_metric(self):
        from models.simulation.monte_carlo import compute_probability_metric
        values = list(range(100))
        p = compute_probability_metric(values, threshold=50, direction="above")
        assert abs(p - 0.49) < 0.05

    def test_compute_percentiles(self):
        from models.simulation.monte_carlo import compute_percentiles
        values = list(range(100))
        percs = compute_percentiles(values, [0, 50, 100])
        assert percs["p0"] <= percs["p50"] <= percs["p100"]


# ══════════════════════════════════════════════════════════════════════════════
# 5. Stress Testing
# ══════════════════════════════════════════════════════════════════════════════

class TestStressTesting:
    def test_predefined_stress_scenarios(self):
        from models.simulation.stress_testing import predefined_stress_scenarios
        configs = predefined_stress_scenarios()
        assert len(configs) >= 5
        for c in configs:
            assert c.name
            assert c.shock_type
            assert c.magnitude in ("mild", "moderate", "severe", "extreme")

    def test_get_predefined_shock(self):
        from models.simulation.stress_testing import get_predefined_shock
        config = get_predefined_shock("economic_recession")
        assert config is not None
        assert config.shock_type == "economic_shock"
        assert "gdp_growth_delta" in config.parameters

    def test_get_unknown_shock_returns_none(self):
        from models.simulation.stress_testing import get_predefined_shock
        assert get_predefined_shock("nonexistent_shock") is None

    def test_run_stress_test_returns_results(self):
        from models.simulation.stress_testing import run_stress_test, get_predefined_shock
        config = get_predefined_shock("economic_recession")
        base_inputs = {"vote_share": 35.0, "gdp_growth": 1.0}
        result = run_stress_test(
            model_fn=_simple_model,
            base_inputs=base_inputs,
            stress_config=config,
            n_iterations=100,
            seed=42,
        )
        assert "results" in result
        assert "summary" in result
        assert result["summary"]["shock_type"] == "economic_shock"

    def test_run_stress_test_summary(self):
        from models.simulation.stress_testing import run_stress_test, get_predefined_shock
        config = get_predefined_shock("media_scandal")
        result = run_stress_test(
            model_fn=_simple_model,
            base_inputs={"vote_share": 30.0},
            stress_config=config,
            n_iterations=50,
            seed=1,
        )
        summary = result["summary"]
        assert "severity" in summary
        assert summary["severity"] in ("critical", "high", "medium", "low")


# ══════════════════════════════════════════════════════════════════════════════
# 6. Sensitivity Analysis
# ══════════════════════════════════════════════════════════════════════════════

class TestSensitivity:
    def test_one_way_sensitivity(self):
        from models.simulation.sensitivity import one_way_sensitivity
        result = one_way_sensitivity(
            model_fn=_simple_model,
            base_inputs={"vote_share": 30.0, "gdp_growth": 0.0},
            variable_name="vote_share",
            tested_values=[25.0, 27.5, 30.0, 32.5, 35.0],
            output_metric="vote_intention",
        )
        assert result.variable_name == "vote_share"
        assert len(result.output_values) == 5
        assert result.elasticity is not None

    def test_rank_variable_importance(self):
        from models.simulation.sensitivity import one_way_sensitivity, rank_variable_importance
        r1 = one_way_sensitivity(_simple_model, {"vote_share": 30.0, "gdp_growth": 0.0},
                                  "vote_share", [25.0, 30.0, 35.0], "vote_intention")
        r2 = one_way_sensitivity(_simple_model, {"vote_share": 30.0, "gdp_growth": 0.0},
                                  "gdp_growth", [-2.0, 0.0, 2.0], "vote_intention")
        ranked = rank_variable_importance([r1, r2])
        assert len(ranked) == 2
        assert ranked[0]["rank"] == 1
        # vote_share tiene más impacto en vote_intention (coef 1.0 vs 0.4)
        assert ranked[0]["variable_name"] == "vote_share"

    def test_auto_sensitivity_ranges(self):
        from models.simulation.sensitivity import auto_sensitivity_ranges
        base_inputs = {"vote_share": 30.0, "gdp_growth": 1.0}
        ranges = auto_sensitivity_ranges(base_inputs, ["vote_share", "gdp_growth"], n_points=5)
        assert len(ranges) == 2
        assert len(ranges["vote_share"]) == 5

    def test_tornado_chart_data(self):
        from models.simulation.sensitivity import tornado_chart_data
        data = tornado_chart_data(
            model_fn=_simple_model,
            base_inputs={"vote_share": 30.0, "gdp_growth": 0.0},
            variables={"vote_share": (25.0, 35.0), "gdp_growth": (-2.0, 2.0)},
            output_metric="vote_intention",
        )
        assert len(data) == 2
        assert data[0]["swing"] >= data[1]["swing"]  # ordenado desc


# ══════════════════════════════════════════════════════════════════════════════
# 7. Causal Impact
# ══════════════════════════════════════════════════════════════════════════════

class TestCausalImpact:
    def test_estimate_before_after_basic(self):
        from models.simulation.causal_impact import estimate_before_after
        pre = [28.0, 29.0, 30.0, 28.5, 29.5]
        post = [32.0, 33.0, 31.5, 32.5, 33.5]
        estimate = estimate_before_after(pre, post, "Campaña TV", "intención de voto")
        assert estimate.effect_estimate > 0
        assert estimate.method == "before_after"
        assert estimate.lower_bound is not None
        assert estimate.upper_bound is not None

    def test_estimate_before_after_empty(self):
        from models.simulation.causal_impact import estimate_before_after
        estimate = estimate_before_after([], [], "x", "y")
        assert estimate.confidence < 0.3

    def test_estimate_did(self):
        from models.simulation.causal_impact import estimate_difference_in_differences
        treated_pre = [30.0, 31.0, 29.0]
        treated_post = [35.0, 36.0, 34.0]
        control_pre = [20.0, 21.0, 20.5]
        control_post = [22.0, 22.5, 21.5]  # control sube 1.5pp
        estimate = estimate_difference_in_differences(
            treated_pre, treated_post, control_pre, control_post,
            "Intervención", "voto"
        )
        # DiD ≈ (35-30) - (22-20.5) ≈ 5 - 1.5 = 3.5
        assert abs(estimate.effect_estimate - 3.5) < 0.5
        assert estimate.method == "difference_in_differences"

    def test_regression_adjustment(self):
        from models.simulation.causal_impact import estimate_regression_adjustment
        # 10 tratados con outcome ~32, 10 control con outcome ~28
        outcome = [32.0] * 10 + [28.0] * 10
        treatment = [1.0] * 10 + [0.0] * 10
        estimate = estimate_regression_adjustment(outcome, treatment, treatment="T", outcome="y")
        assert estimate.method == "regression_adjustment"
        assert abs(estimate.effect_estimate - 4.0) < 1.0


# ══════════════════════════════════════════════════════════════════════════════
# 8. Electoral Simulation
# ══════════════════════════════════════════════════════════════════════════════

class TestElectoralSimulation:
    def test_simulate_vote_shift(self):
        from models.simulation.electoral_simulation import simulate_vote_shift
        current = {"PSOE": 28.0, "PP": 33.0, "VOX": 15.0, "SUMAR": 12.0, "OTROS": 12.0}
        shifts = {"PSOE": -3.0, "PP": +2.0}
        results = simulate_vote_shift(current, shifts)
        psoe_result = next(r for r in results if "PSOE" in r.metric_name)
        pp_result = next(r for r in results if "PP" in r.metric_name)
        assert psoe_result.delta_abs is not None and psoe_result.delta_abs < 0
        assert pp_result.delta_abs is not None and pp_result.delta_abs > 0

    def test_simulate_seat_distribution(self):
        from models.simulation.electoral_simulation import simulate_seat_distribution, _dhondt
        shares = {"PSOE": 30.0, "PP": 35.0, "VOX": 15.0, "SUMAR": 12.0}
        results = simulate_seat_distribution(shares, total_seats=100)
        total_seats = sum(int(r.simulated_value or 0) for r in results)
        assert total_seats == 100

    def test_dhondt_basic(self):
        from models.simulation.electoral_simulation import _dhondt
        shares = {"A": 50.0, "B": 30.0, "C": 20.0}
        seats = _dhondt(shares, total_seats=10)
        assert sum(seats.values()) == 10
        assert seats["A"] > seats["B"] > seats["C"]

    def test_simulate_turnout_shift(self):
        from models.simulation.electoral_simulation import simulate_turnout_shift
        results = simulate_turnout_shift(70.0, -10.0)
        turnout_result = next(r for r in results if r.metric_name == "turnout")
        assert turnout_result.simulated_value == pytest.approx(60.0)

    def test_coalition_majority(self):
        from models.simulation.electoral_simulation import simulate_seat_distribution, estimate_coalition_majority
        shares = {"PSOE": 30.0, "SUMAR": 15.0, "PP": 35.0, "VOX": 15.0, "OTROS": 5.0}
        seat_results = simulate_seat_distribution(shares, 100)
        result = estimate_coalition_majority(seat_results, ["PSOE", "SUMAR"], 100)
        assert "has_majority" in result
        assert isinstance(result["has_majority"], bool)


# ══════════════════════════════════════════════════════════════════════════════
# 9. Economic Simulation
# ══════════════════════════════════════════════════════════════════════════════

class TestEconomicSimulation:
    def test_simulate_economic_shock(self):
        from models.simulation.economic_simulation import simulate_economic_shock
        current = {"gdp_growth": 2.0, "unemployment": 12.0, "inflation": 3.5}
        deltas = {"gdp_growth": -3.0, "unemployment": +2.0}
        results = simulate_economic_shock(current, deltas)
        assert len(results) == 2
        gdp_result = next(r for r in results if "gdp_growth" in r.metric_name)
        assert gdp_result.simulated_value == pytest.approx(-1.0)

    def test_simulate_economic_vote_effect(self):
        from models.simulation.economic_simulation import simulate_economic_vote_effect
        results = simulate_economic_vote_effect(
            {"gdp_growth": -3.0, "unemployment": 2.0},
            incumbent_baseline_vote=30.0,
        )
        total = results[0]
        assert total.delta_abs < 0  # Recesión → voto cae

    def test_simulate_itpe_change(self):
        from models.simulation.economic_simulation import simulate_itpe_change
        results = simulate_itpe_change(50.0, {"gdp_growth": -3.0})
        assert results[0].simulated_value < 50.0

    def test_build_economic_scenario_recession(self):
        from models.simulation.economic_simulation import build_economic_scenario
        deltas = build_economic_scenario("recession")
        assert deltas["gdp_growth"] < 0
        assert deltas["unemployment"] > 0

    def test_build_economic_scenario_boom(self):
        from models.simulation.economic_simulation import build_economic_scenario
        deltas = build_economic_scenario("boom")
        assert deltas["gdp_growth"] > 0


# ══════════════════════════════════════════════════════════════════════════════
# 10. Explainers & Infrastructure
# ══════════════════════════════════════════════════════════════════════════════

class TestExplainersAndInfrastructure:
    def test_explain_simulation_run(self):
        from models.simulation.explainers import explain_simulation_run
        from models.simulation.schemas import SimulationRun, SimulationResult
        run = SimulationRun(scenario_id="s1", model_name="test", status="completed")
        results = [
            SimulationResult(
                run_id=run.run_id,
                metric_name="vote_intention",
                baseline_value=30.0,
                simulated_value=32.5,
                delta_abs=2.5,
            ),
        ]
        explanation = explain_simulation_run(run, results)
        assert "summary" in explanation
        assert "key_findings" in explanation
        assert len(explanation["key_findings"]) > 0

    def test_explain_scenario_difference(self):
        from models.simulation.explainers import explain_scenario_difference
        from models.simulation.schemas import SimulationResult
        results_a = [SimulationResult(run_id="r1", metric_name="vote", simulated_value=30.0)]
        results_b = [SimulationResult(run_id="r2", metric_name="vote", simulated_value=35.0)]
        diff = explain_scenario_difference(results_a, results_b, "Base", "Optimista")
        assert diff["n_metrics_compared"] == 1
        assert diff["differentials"][0]["delta"] == pytest.approx(5.0)

    def test_simulation_runner_basic(self):
        from models.simulation.simulation_runner import SimulationRunner
        from models.simulation.schemas import ScenarioAssumption
        runner = SimulationRunner("test_runner")
        runner.register_model("test_runner", _simple_model)
        assumptions = [
            ScenarioAssumption(scenario_id="s1", variable_name="vote_share", scenario_value=30.0),
        ]
        run, results = runner.run_scenario("s1", assumptions, use_monte_carlo=False)
        assert run.status == "completed"
        assert len(results) > 0

    def test_simulation_runner_monte_carlo(self):
        from models.simulation.simulation_runner import SimulationRunner
        from models.simulation.schemas import ScenarioAssumption
        runner = SimulationRunner("mc_runner")
        runner.register_model("mc_runner", _simple_model)
        assumptions = [
            ScenarioAssumption(
                scenario_id="s1",
                variable_name="vote_share",
                distribution={"type": "normal", "mean": 30.0, "std": 2.0},
            ),
        ]
        run, results = runner.run_scenario("s1", assumptions, n_iterations=100, seed=42)
        assert run.status == "completed"
        assert run.n_iterations == 100

    def test_experiment_registry(self):
        from models.simulation.experiment_registry import (
            register_run, get_run, get_results, clear_registry,
        )
        from models.simulation.schemas import SimulationRun, SimulationResult
        clear_registry()
        run = SimulationRun(scenario_id="s1", model_name="test", status="completed")
        results = [SimulationResult(run_id=run.run_id, metric_name="vote", simulated_value=32.0)]
        register_run(run, results, experiment_name="test_exp")
        assert get_run(run.run_id) is not None
        assert len(get_results(run.run_id)) == 1

    def test_counterfactuals(self):
        from models.simulation.counterfactuals import build_counterfactual_baseline, compare_observed_vs_counterfactual
        observed = {"vote_share": 30.0, "gdp_growth": 1.0}
        overrides = {"gdp_growth": -2.0}
        cf_data = build_counterfactual_baseline(observed, overrides, model_fn=_simple_model)
        assert cf_data["counterfactual_inputs"]["gdp_growth"] == -2.0
        comparison = compare_observed_vs_counterfactual(
            observed_inputs=observed,
            counterfactual_inputs=cf_data["counterfactual_inputs"],
            observed_outputs=_simple_model(observed),
            counterfactual_outputs=cf_data.get("counterfactual_outputs", {}),
        )
        assert "vote_intention" in comparison.deltas

    def test_model_evaluation(self):
        from models.simulation.model_evaluation import evaluate_model_accuracy
        predicted = [30.0, 32.0, 28.0, 31.0]
        actual = [29.0, 31.0, 29.0, 30.0]
        results = evaluate_model_accuracy("test_model", predicted, actual, "vote")
        mae_result = next(r for r in results if "mae" in r.metric_name)
        assert mae_result.metric_value > 0
        assert mae_result.sample_size == 4

    def test_migration_0048_structure(self):
        """Verifica que la migración tiene la estructura correcta."""
        import importlib.util, pathlib
        migration_path = (
            pathlib.Path(__file__).parent.parent
            / "db/migrations/versions/0048_simulation_core.py"
        )
        spec = importlib.util.spec_from_file_location("migration_0048", migration_path)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        assert m.revision == "0048"
        assert m.down_revision == "0047"
        assert callable(m.upgrade)
        assert callable(m.downgrade)

    def test_simulation_tools_list(self):
        from agents.tools.simulation_tools import SIMULATION_TOOLS
        assert len(SIMULATION_TOOLS) == 7
        tool_names = [t["name"] for t in SIMULATION_TOOLS]
        assert "create_scenario" in tool_names
        assert "run_electoral_simulation" in tool_names
        assert "estimate_causal_impact" in tool_names

    def test_simulation_tools_dispatch(self):
        from agents.tools.simulation_tools import dispatch_simulation_tool
        result = dispatch_simulation_tool("get_simulation_summary", {})
        assert "kpis" in result

    def test_cli_status(self):
        from pipelines.simulation_core import main
        code = main(["--status"])
        assert code == 0

    def test_cli_list_scenarios(self):
        from pipelines.simulation_core import main
        code = main(["--list-scenarios"])
        assert code == 0

    def test_cli_stress_test_unknown(self):
        from pipelines.simulation_core import main
        code = main(["--stress-test", "nonexistent_shock"])
        assert code == 1

    def test_campaign_simulation(self):
        from models.simulation.campaign_simulation import simulate_campaign_intervention
        results = simulate_campaign_intervention(
            party_id="PSOE",
            intervention_type="message_broadcast",
            parameters={"budget_multiplier": 1.5, "targeting_quality": 0.8, "message_resonance": 0.7},
            baseline_vote_share=28.0,
        )
        assert len(results) > 0
        vote_result = next((r for r in results if "vote_share" in r.metric_name), None)
        assert vote_result is not None

    def test_risk_simulation(self):
        from models.simulation.risk_simulation import simulate_risk_event, list_risk_event_types
        results = simulate_risk_event(
            actor_id="actor1",
            risk_type="corruption_scandal",
            severity=1.0,
            current_vote_share=30.0,
        )
        vote_result = next(r for r in results if "vote_share" in r.metric_name)
        assert vote_result.delta_abs < 0  # Escándalo → voto cae

        types = list_risk_event_types()
        assert len(types) >= 5

    def test_media_simulation(self):
        from models.simulation.media_simulation import simulate_narrative_spike
        results = simulate_narrative_spike(
            actor_id="p1",
            current_sentiment=0.3,
            spike_intensity=-0.5,
            spike_duration_days=14,
        )
        # Verificar que hay resultados para diferentes días
        days = [r.metric_name.split("_d")[-1] for r in results]
        assert "0" in days
        assert "30" in days

    def test_scenario_comparison(self):
        from models.simulation.scenario_comparison import compare_scenarios
        from models.simulation.schemas import SimulationResult
        scenarios = [
            {
                "name": "Optimista",
                "results": [SimulationResult(run_id="r1", metric_name="vote", simulated_value=35.0)],
            },
            {
                "name": "Pesimista",
                "results": [SimulationResult(run_id="r2", metric_name="vote", simulated_value=25.0)],
            },
        ]
        comparison = compare_scenarios(scenarios)
        assert comparison["n_scenarios"] == 2
        assert comparison["winner"] == "Optimista"
