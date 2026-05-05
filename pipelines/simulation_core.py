"""
Simulation Core CLI — Bloque 11.

Comandos: --list-scenarios, --run-scenario, --stress-test, --causal-impact,
          --sensitivity, --status.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Any

logger = logging.getLogger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="simulation_core",
        description="ElectSim — Simulation & Causal Intelligence CLI (Bloque 11)",
    )
    group = parser.add_mutually_exclusive_group(required=True)

    group.add_argument(
        "--list-scenarios",
        action="store_true",
        help="Lista todos los escenarios de simulación disponibles",
    )
    group.add_argument(
        "--run-scenario",
        metavar="SCENARIO_ID",
        help="Ejecuta un escenario de simulación por ID",
    )
    group.add_argument(
        "--stress-test",
        metavar="SHOCK_KEY",
        help=(
            "Ejecuta un stress test con el choque especificado. "
            "Claves: economic_recession, media_scandal, corruption_case, "
            "legal_ban, coalition_collapse, turnout_collapse, polling_error, "
            "campaign_backfire, geopolitical_crisis"
        ),
    )
    group.add_argument(
        "--causal-impact",
        nargs=2,
        metavar=("TREATMENT", "OUTCOME"),
        help="Estima el impacto causal de un tratamiento sobre un outcome",
    )
    group.add_argument(
        "--sensitivity",
        metavar="OUTPUT_METRIC",
        help="Análisis de sensibilidad sobre una métrica de salida",
    )
    group.add_argument(
        "--status",
        action="store_true",
        help="Muestra el estado del módulo de simulación",
    )

    # Opciones comunes
    parser.add_argument(
        "--domain",
        default=None,
        help="Filtrar por dominio (electoral, economy, media, risk, ...)",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=500,
        help="Iteraciones Monte Carlo (default: 500)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Semilla aleatoria para reproducibilidad",
    )
    parser.add_argument(
        "--output-json",
        action="store_true",
        help="Salida en formato JSON",
    )
    parser.add_argument(
        "--inputs",
        type=str,
        default=None,
        help="JSON con inputs base del modelo (para stress-test y sensitivity)",
    )

    return parser


def cmd_list_scenarios(args: argparse.Namespace) -> int:
    """Lista escenarios disponibles."""
    try:
        from models.simulation.scenario_registry import list_scenarios
        scenarios = list_scenarios(domain=args.domain)

        if not scenarios:
            print("No hay escenarios registrados.")
            return 0

        if args.output_json:
            print(json.dumps([s.model_dump(mode="json") for s in scenarios], indent=2, ensure_ascii=False))
        else:
            print(f"\n{'ID':<38} {'Nombre':<30} {'Dominio':<15} {'Estado'}")
            print("-" * 95)
            for s in scenarios:
                print(f"{s.scenario_id:<38} {s.name:<30} {s.domain:<15} {s.status}")
            print(f"\nTotal: {len(scenarios)} escenarios")

        return 0
    except Exception as exc:
        print(f"Error listando escenarios: {exc}", file=sys.stderr)
        return 1


def cmd_run_scenario(args: argparse.Namespace, scenario_id: str) -> int:
    """Ejecuta un escenario de simulación."""
    try:
        from models.simulation.scenario_registry import get_scenario, get_scenario_assumptions
        from models.simulation.simulation_runner import SimulationRunner
        from models.simulation.experiment_registry import register_run

        scenario = get_scenario(scenario_id)
        if scenario is None:
            print(f"Escenario no encontrado: {scenario_id}", file=sys.stderr)
            return 1

        assumptions = get_scenario_assumptions(scenario_id)
        if not assumptions:
            print(f"Escenario '{scenario.name}' sin supuestos definidos. Run omitido.")
            return 0

        print(f"Ejecutando escenario '{scenario.name}' ({len(assumptions)} supuestos)...")

        # Modelo dummy si no hay modelo registrado
        def passthrough_model(inputs: dict[str, Any]) -> dict[str, float]:
            return {k: float(v) for k, v in inputs.items() if isinstance(v, (int, float))}

        runner = SimulationRunner(model_name=scenario.domain or "generic")
        runner.register_model(scenario.domain or "generic", passthrough_model)

        run, results = runner.run_scenario(
            scenario_id=scenario_id,
            assumptions=assumptions,
            n_iterations=args.iterations,
            seed=args.seed,
        )

        register_run(run, results)

        if args.output_json:
            print(json.dumps({
                "run": run.model_dump(mode="json"),
                "results": [r.model_dump(mode="json") for r in results],
            }, indent=2, ensure_ascii=False))
        else:
            print(f"\nRun completado: {run.run_id}")
            print(f"Estado: {run.status} | Duración: {run.duration_seconds:.2f}s")
            print(f"Métricas calculadas: {len(results)}")
            for r in results[:10]:
                delta_str = f"{r.delta_abs:+.3f}" if r.delta_abs is not None else "N/A"
                print(f"  {r.metric_name:<40} {r.simulated_value:.3f}  (Δ={delta_str})")
            if len(results) > 10:
                print(f"  ... y {len(results) - 10} más")

        return 0 if run.status in ("completed", "partial") else 1

    except Exception as exc:
        print(f"Error ejecutando escenario: {exc}", file=sys.stderr)
        return 1


def cmd_stress_test(args: argparse.Namespace, shock_key: str) -> int:
    """Ejecuta un stress test."""
    try:
        from models.simulation.stress_testing import get_predefined_shock

        config = get_predefined_shock(shock_key)
        if config is None:
            available = [
                "economic_recession", "economic_boom", "media_scandal", "corruption_case",
                "legal_ban", "coalition_collapse", "turnout_collapse", "polling_error",
                "campaign_backfire", "geopolitical_crisis",
            ]
            print(f"Shock '{shock_key}' no encontrado.", file=sys.stderr)
            print(f"Disponibles: {', '.join(available)}", file=sys.stderr)
            return 1

        print(f"\nStress Test: {config.name}")
        print(f"Tipo: {config.shock_type} | Magnitud: {config.magnitude}")
        print(f"Descripción: {config.description or 'N/A'}")
        print(f"\nParámetros del choque:")
        for k, v in config.parameters.items():
            print(f"  {k}: {v}")

        # Cargar inputs base si se proporcionan
        base_inputs: dict[str, Any] = {}
        if args.inputs:
            try:
                base_inputs = json.loads(args.inputs)
            except json.JSONDecodeError:
                print("Error parseando --inputs como JSON", file=sys.stderr)
                return 1

        if base_inputs:
            from models.simulation.stress_testing import run_stress_test

            def passthrough(inputs: dict[str, Any]) -> dict[str, float]:
                return {k: float(v) for k, v in inputs.items() if isinstance(v, (int, float))}

            result = run_stress_test(
                model_fn=passthrough,
                base_inputs=base_inputs,
                stress_config=config,
                n_iterations=args.iterations,
                seed=args.seed,
            )

            if args.output_json:
                print(json.dumps(result["summary"], indent=2, ensure_ascii=False))
            else:
                summary = result["summary"]
                print(f"\nResultados del stress test:")
                print(f"  Métricas afectadas: {summary['n_metrics_affected']}")
                print(f"  Impacto máximo: {summary['max_impact']:.4f}")
                print(f"  Severidad: {summary['severity']}")
        else:
            print("\n(Proporciona --inputs JSON para ejecutar la simulación completa)")

        return 0
    except Exception as exc:
        print(f"Error en stress test: {exc}", file=sys.stderr)
        return 1


def cmd_causal_impact(args: argparse.Namespace, treatment: str, outcome: str) -> int:
    """Estima impacto causal."""
    try:
        from models.simulation.causal_impact import estimate_before_after

        print(f"\nEstimación causal: '{treatment}' → '{outcome}'")
        print("(Proporciona datos pre/post para análisis completo)")

        # Demo con datos sintéticos
        import random
        rng = random.Random(args.seed or 42)
        pre = [rng.gauss(30, 2) for _ in range(20)]
        post = [rng.gauss(32, 2) for _ in range(20)]

        estimate = estimate_before_after(pre, post, treatment, outcome)

        if args.output_json:
            print(json.dumps(estimate.model_dump(mode="json"), indent=2, ensure_ascii=False))
        else:
            print(f"\nMétodo: {estimate.method}")
            print(f"Efecto estimado: {estimate.effect_estimate:+.4f}")
            if estimate.standard_error:
                print(f"Error estándar: {estimate.standard_error:.4f}")
            if estimate.p_value:
                print(f"p-value: {estimate.p_value:.4f}")
            if estimate.lower_bound and estimate.upper_bound:
                print(f"IC 95%: [{estimate.lower_bound:.4f}, {estimate.upper_bound:.4f}]")
            print(f"\nInterpretación: {estimate.interpretation}")

        return 0
    except Exception as exc:
        print(f"Error en causal impact: {exc}", file=sys.stderr)
        return 1


def cmd_sensitivity(args: argparse.Namespace, output_metric: str) -> int:
    """Análisis de sensibilidad."""
    try:
        base_inputs: dict[str, Any] = {}
        if args.inputs:
            try:
                base_inputs = json.loads(args.inputs)
            except json.JSONDecodeError:
                print("Error parseando --inputs como JSON", file=sys.stderr)
                return 1

        if not base_inputs:
            print("Se requiere --inputs JSON para el análisis de sensibilidad")
            return 1

        from models.simulation.sensitivity import (
            auto_sensitivity_ranges, multi_variable_sensitivity, rank_variable_importance,
        )

        def dummy_model(inputs: dict[str, Any]) -> dict[str, float]:
            numeric = [float(v) for v in inputs.values() if isinstance(v, (int, float))]
            return {output_metric: sum(numeric) / len(numeric) if numeric else 0.0}

        variables = list(base_inputs.keys())
        ranges = auto_sensitivity_ranges(base_inputs, variables)
        results = multi_variable_sensitivity(dummy_model, base_inputs, ranges, output_metric)
        ranking = rank_variable_importance(results)

        if args.output_json:
            print(json.dumps(ranking, indent=2, ensure_ascii=False))
        else:
            print(f"\nAnálisis de sensibilidad para '{output_metric}':")
            print(f"{'Rank':<6} {'Variable':<35} {'Importancia':<15} {'Elasticidad'}")
            print("-" * 70)
            for item in ranking[:15]:
                elas = f"{item['elasticity']:.3f}" if item.get("elasticity") else "N/A"
                print(
                    f"{item['rank']:<6} {item['variable_name']:<35} "
                    f"{item['importance_score']:<15.4f} {elas}"
                )

        return 0
    except Exception as exc:
        print(f"Error en sensibilidad: {exc}", file=sys.stderr)
        return 1


def cmd_status(args: argparse.Namespace) -> int:
    """Muestra el estado del módulo."""
    try:
        from dashboard.services.simulation_core import cargar_kpis_simulacion
        kpis = cargar_kpis_simulacion()

        if args.output_json:
            print(json.dumps(kpis, indent=2, ensure_ascii=False))
        else:
            print("\n=== Simulation Core — Estado ===")
            print(f"  Escenarios registrados:  {kpis.get('n_scenarios', 0)}")
            print(f"  Runs totales:            {kpis.get('n_runs_total', 0)}")
            print(f"  Runs completados:        {kpis.get('n_runs_completed', 0)}")
            print(f"  Runs fallidos:           {kpis.get('n_runs_failed', 0)}")
            print(f"  Dominios activos:        {kpis.get('n_domains', 0)}")
            domains = kpis.get("domains", {})
            if domains:
                print(f"  Por dominio: " + ", ".join(f"{k}={v}" for k, v in domains.items()))

        return 0
    except Exception as exc:
        print(f"Error obteniendo estado: {exc}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s %(name)s — %(message)s",
    )

    if args.list_scenarios:
        return cmd_list_scenarios(args)
    elif args.run_scenario:
        return cmd_run_scenario(args, args.run_scenario)
    elif args.stress_test:
        return cmd_stress_test(args, args.stress_test)
    elif args.causal_impact:
        return cmd_causal_impact(args, args.causal_impact[0], args.causal_impact[1])
    elif args.sensitivity:
        return cmd_sensitivity(args, args.sensitivity)
    elif args.status:
        return cmd_status(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
