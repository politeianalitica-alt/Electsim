"""
Simulation Brain Tools — Bloque 11.

7 herramientas para el agente LLM (politeia-brain).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

SIMULATION_TOOLS: list[dict[str, Any]] = [
    {
        "name": "create_scenario",
        "description": (
            "Crea un nuevo escenario de simulación. Útil para definir contextos "
            "hipotéticos (crisis económica, escándalo, elecciones anticipadas, etc.)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nombre del escenario"},
                "domain": {
                    "type": "string",
                    "enum": ["electoral", "campaign", "economy", "media",
                             "legislative", "risk", "coalition", "territorial", "mixed"],
                    "default": "mixed",
                },
                "description": {"type": "string"},
                "assumptions": {
                    "type": "object",
                    "description": "Supuestos iniciales como dict variable→valor",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "run_electoral_simulation",
        "description": (
            "Simula un cambio en la distribución de voto y calcula nuevos escaños "
            "por D'Hondt. Puede incluir cambios en participación."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "current_shares": {
                    "type": "object",
                    "description": "Dict partido→% actual (ej. {PSOE: 28, PP: 33})",
                },
                "shifts": {
                    "type": "object",
                    "description": "Dict partido→delta en pp (ej. {PSOE: -2, PP: +3})",
                },
                "total_seats": {
                    "type": "integer",
                    "description": "Total de escaños (ej. 350 para Congreso)",
                    "default": 350,
                },
                "threshold_pct": {
                    "type": "number",
                    "description": "Umbral electoral (%)",
                    "default": 3.0,
                },
                "turnout_delta": {
                    "type": "number",
                    "description": "Cambio en participación (pp). Opcional.",
                },
            },
            "required": ["current_shares"],
        },
    },
    {
        "name": "run_economic_simulation",
        "description": (
            "Simula el efecto de un escenario económico (recesión, boom, etc.) "
            "sobre la intención de voto del partido en gobierno."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "scenario_type": {
                    "type": "string",
                    "enum": ["recession", "stagnation", "recovery", "boom", "stagflation"],
                    "description": "Tipo de escenario económico predefinido",
                },
                "custom_deltas": {
                    "type": "object",
                    "description": "Deltas personalizados: {gdp_growth, unemployment, inflation, consumer_confidence}",
                },
                "incumbent_vote_share": {
                    "type": "number",
                    "description": "% de voto actual del partido gobernante",
                    "default": 30.0,
                },
                "incumbent_party": {
                    "type": "string",
                    "description": "Nombre del partido gobernante",
                },
            },
            "required": [],
        },
    },
    {
        "name": "run_stress_test",
        "description": (
            "Ejecuta un test de estrés con un choque predefinido o personalizado. "
            "Disponibles: economic_recession, media_scandal, corruption_case, "
            "legal_ban, coalition_collapse, turnout_collapse, polling_error, campaign_backfire, "
            "geopolitical_crisis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "shock_key": {
                    "type": "string",
                    "description": "Clave del choque predefinido",
                },
                "base_inputs": {
                    "type": "object",
                    "description": "Inputs base del escenario actual",
                },
                "n_iterations": {
                    "type": "integer",
                    "default": 500,
                },
            },
            "required": ["shock_key"],
        },
    },
    {
        "name": "estimate_causal_impact",
        "description": (
            "Estima el impacto causal de una intervención usando métodos "
            "before/after o difference-in-differences."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "enum": ["before_after", "difference_in_differences", "regression_adjustment"],
                    "default": "before_after",
                },
                "treatment": {"type": "string", "description": "Descripción del tratamiento"},
                "outcome": {"type": "string", "description": "Variable de resultado"},
                "pre_values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores antes del tratamiento",
                },
                "post_values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores después del tratamiento",
                },
                "control_pre": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores pre del grupo control (para DiD)",
                },
                "control_post": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores post del grupo control (para DiD)",
                },
            },
            "required": ["treatment", "outcome", "pre_values", "post_values"],
        },
    },
    {
        "name": "run_sensitivity_analysis",
        "description": (
            "Analiza qué variables tienen más impacto sobre un resultado clave. "
            "Genera un ranking de importancia y elasticidades."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "base_inputs": {
                    "type": "object",
                    "description": "Inputs base del modelo",
                },
                "variables_to_analyze": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Variables a analizar (subset de base_inputs)",
                },
                "output_metric": {
                    "type": "string",
                    "description": "Métrica de salida a observar",
                },
                "range_factor": {
                    "type": "number",
                    "default": 0.2,
                    "description": "Variación porcentual desde el valor base (±20% default)",
                },
            },
            "required": ["base_inputs", "output_metric"],
        },
    },
    {
        "name": "get_simulation_summary",
        "description": (
            "Obtiene un resumen de los escenarios y runs de simulación disponibles, "
            "incluyendo KPIs globales y últimos resultados."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "description": "Filtrar por dominio (electoral, economy, etc.)",
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
]


# ── Handlers ───────────────────────────────────────────────────────────────────

def _create_scenario(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from models.simulation.scenario_registry import create_scenario
        scenario = create_scenario(
            name=args["name"],
            domain=args.get("domain", "mixed"),
            description=args.get("description"),
            assumptions=args.get("assumptions", {}),
        )
        return {
            "scenario_id": scenario.scenario_id,
            "name": scenario.name,
            "domain": scenario.domain,
            "status": scenario.status,
        }
    except Exception as exc:
        logger.warning("Error en create_scenario tool: %s", exc)
        return {"error": str(exc)}


def _run_electoral_simulation(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from models.simulation.electoral_simulation import (
            simulate_vote_shift, simulate_seat_distribution, simulate_turnout_shift,
        )

        current_shares = args["current_shares"]
        shifts = args.get("shifts", {})
        total_seats = int(args.get("total_seats", 350))
        threshold_pct = float(args.get("threshold_pct", 3.0))
        turnout_delta = args.get("turnout_delta")

        # Cambio de voto
        vote_results = simulate_vote_shift(current_shares, shifts)
        new_shares = {
            r.metric_name.replace("vote_share_", ""): r.simulated_value or 0
            for r in vote_results
        }

        # Escaños
        seat_results = simulate_seat_distribution(new_shares, total_seats, threshold_pct)

        summary = {
            "vote_changes": {
                r.metric_name.replace("vote_share_", ""): {
                    "baseline": r.baseline_value,
                    "simulated": r.simulated_value,
                    "delta": r.delta_abs,
                }
                for r in vote_results
            },
            "seat_distribution": {
                r.metric_name.replace("seats_", ""): int(r.simulated_value or 0)
                for r in seat_results
            },
        }

        if turnout_delta is not None:
            turnout_results = simulate_turnout_shift(
                current_turnout=70.0,  # default
                delta_pp=float(turnout_delta),
            )
            summary["turnout_impact"] = {
                "new_turnout": next(
                    (r.simulated_value for r in turnout_results if r.metric_name == "turnout"),
                    None,
                )
            }

        return summary
    except Exception as exc:
        logger.warning("Error en run_electoral_simulation tool: %s", exc)
        return {"error": str(exc)}


def _run_economic_simulation(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from models.simulation.economic_simulation import (
            simulate_economic_vote_effect, build_economic_scenario, simulate_itpe_change,
        )

        scenario_type = args.get("scenario_type", "stagnation")
        custom_deltas = args.get("custom_deltas", {})
        incumbent_vote = float(args.get("incumbent_vote_share", 30.0))
        party = args.get("incumbent_party", "Incumbente")

        # Construir deltas
        deltas = build_economic_scenario(scenario_type) if scenario_type else {}
        deltas.update(custom_deltas)

        if not deltas:
            return {"error": "No se especificaron deltas económicos"}

        vote_results = simulate_economic_vote_effect(deltas, incumbent_vote, party_label=party)
        itpe_results = simulate_itpe_change(50.0, deltas)

        return {
            "economic_scenario": scenario_type or "custom",
            "economic_deltas": deltas,
            "vote_impact": [
                {
                    "metric": r.metric_name,
                    "baseline": r.baseline_value,
                    "simulated": r.simulated_value,
                    "delta": r.delta_abs,
                }
                for r in vote_results[:3]
            ],
            "itpe_change": itpe_results[0].delta_abs if itpe_results else None,
            "itpe_simulated": itpe_results[0].simulated_value if itpe_results else None,
        }
    except Exception as exc:
        logger.warning("Error en run_economic_simulation tool: %s", exc)
        return {"error": str(exc)}


def _run_stress_test(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from models.simulation.stress_testing import get_predefined_shock

        shock_key = args["shock_key"]
        config = get_predefined_shock(shock_key)
        if config is None:
            return {"error": f"Shock '{shock_key}' no encontrado"}

        return {
            "shock_key": shock_key,
            "shock_name": config.name,
            "shock_type": config.shock_type,
            "magnitude": config.magnitude,
            "parameters": config.parameters,
            "description": config.description,
            "status": "config_loaded_run_required",
            "message": (
                f"Configuración de stress test '{config.name}' cargada. "
                f"Para ejecutar la simulación completa, proporciona los inputs base del modelo."
            ),
        }
    except Exception as exc:
        logger.warning("Error en run_stress_test tool: %s", exc)
        return {"error": str(exc)}


def _estimate_causal_impact(args: dict[str, Any]) -> dict[str, Any]:
    try:
        method = args.get("method", "before_after")
        treatment = args["treatment"]
        outcome = args["outcome"]
        pre_values = [float(v) for v in args["pre_values"]]
        post_values = [float(v) for v in args["post_values"]]

        if method == "before_after":
            from models.simulation.causal_impact import estimate_before_after
            estimate = estimate_before_after(pre_values, post_values, treatment, outcome)
        elif method == "difference_in_differences":
            control_pre = [float(v) for v in args.get("control_pre", [])]
            control_post = [float(v) for v in args.get("control_post", [])]
            from models.simulation.causal_impact import estimate_difference_in_differences
            estimate = estimate_difference_in_differences(
                pre_values, post_values, control_pre, control_post, treatment, outcome
            )
        else:
            from models.simulation.causal_impact import estimate_regression_adjustment
            outcomes = post_values
            treatment_indicator = [1.0] * len(post_values) + [0.0] * len(pre_values)
            all_outcomes = post_values + pre_values
            estimate = estimate_regression_adjustment(
                all_outcomes, treatment_indicator, treatment=treatment, outcome=outcome
            )

        return {
            "method": estimate.method,
            "effect_estimate": estimate.effect_estimate,
            "standard_error": estimate.standard_error,
            "lower_bound": estimate.lower_bound,
            "upper_bound": estimate.upper_bound,
            "p_value": estimate.p_value,
            "interpretation": estimate.interpretation,
            "confidence": estimate.confidence,
        }
    except Exception as exc:
        logger.warning("Error en estimate_causal_impact tool: %s", exc)
        return {"error": str(exc)}


def _run_sensitivity_analysis(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from models.simulation.sensitivity import auto_sensitivity_ranges, rank_variable_importance
        from models.simulation.sensitivity import multi_variable_sensitivity

        base_inputs = args["base_inputs"]
        output_metric = args["output_metric"]
        variables = args.get("variables_to_analyze", list(base_inputs.keys()))
        range_factor = float(args.get("range_factor", 0.2))

        # Modelo dummy: retorna output_metric como promedio de los inputs
        def dummy_model(inputs: dict[str, Any]) -> dict[str, float]:
            numeric = [float(v) for v in inputs.values() if isinstance(v, (int, float))]
            return {output_metric: sum(numeric) / len(numeric) if numeric else 0.0}

        ranges = auto_sensitivity_ranges(base_inputs, variables, range_factor=range_factor)
        if not ranges:
            return {"error": "No se encontraron variables numéricas para analizar"}

        sensitivity_results = multi_variable_sensitivity(
            model_fn=dummy_model,
            base_inputs=base_inputs,
            variables=ranges,
            output_metric=output_metric,
        )

        ranking = rank_variable_importance(sensitivity_results)

        return {
            "output_metric": output_metric,
            "n_variables_analyzed": len(sensitivity_results),
            "ranking": ranking[:10],
            "message": (
                "Análisis realizado con modelo lineal dummy. "
                "Para resultados precisos, conectar con el modelo de dominio específico."
            ),
        }
    except Exception as exc:
        logger.warning("Error en run_sensitivity_analysis tool: %s", exc)
        return {"error": str(exc)}


def _get_simulation_summary(args: dict[str, Any]) -> dict[str, Any]:
    try:
        from dashboard.services.simulation_core import cargar_kpis_simulacion, cargar_escenarios

        kpis = cargar_kpis_simulacion()
        domain = args.get("domain")
        limit = int(args.get("limit", 10))
        scenarios = cargar_escenarios(domain=domain, limit=limit)

        return {
            "kpis": kpis,
            "recent_scenarios": [
                {
                    "scenario_id": s.get("scenario_id"),
                    "name": s.get("name"),
                    "domain": s.get("domain"),
                    "status": s.get("status"),
                }
                for s in scenarios
            ],
        }
    except Exception as exc:
        logger.warning("Error en get_simulation_summary tool: %s", exc)
        return {"error": str(exc)}


# ── Dispatcher ─────────────────────────────────────────────────────────────────

_TOOL_HANDLERS = {
    "create_scenario": _create_scenario,
    "run_electoral_simulation": _run_electoral_simulation,
    "run_economic_simulation": _run_economic_simulation,
    "run_stress_test": _run_stress_test,
    "estimate_causal_impact": _estimate_causal_impact,
    "run_sensitivity_analysis": _run_sensitivity_analysis,
    "get_simulation_summary": _get_simulation_summary,
}


def dispatch_simulation_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """
    Despacha una herramienta de simulación por nombre.

    Returns:
        Resultado de la herramienta o dict con error.
    """
    handler = _TOOL_HANDLERS.get(tool_name)
    if handler is None:
        return {"error": f"Herramienta de simulación no encontrada: '{tool_name}'"}
    return handler(args)
