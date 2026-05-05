"""
Assumption Store — Bloque 11.

Validación, resumen y conversión de supuestos a inputs de modelos.
"""
from __future__ import annotations

import logging
from typing import Any

from models.simulation.schemas import ScenarioAssumption

logger = logging.getLogger(__name__)


# ── Validación ─────────────────────────────────────────────────────────────────

def validate_assumptions(
    assumptions: list[ScenarioAssumption],
) -> dict[str, list[str]]:
    """
    Valida una lista de supuestos y retorna errores y advertencias.

    Returns:
        Dict con keys "errors" y "warnings"; listas de strings.
    """
    errors: list[str] = []
    warnings: list[str] = []
    seen: set[str] = set()

    for a in assumptions:
        # Duplicados
        if a.variable_name in seen:
            warnings.append(f"Variable duplicada: '{a.variable_name}'")
        seen.add(a.variable_name)

        # Confianza fuera de rango
        if not (0.0 <= a.confidence <= 1.0):
            errors.append(
                f"'{a.variable_name}': confidence={a.confidence} fuera de [0,1]"
            )

        # Sin valor de escenario
        if a.scenario_value is None and a.distribution is None:
            warnings.append(
                f"'{a.variable_name}': sin scenario_value ni distribution definidos"
            )

        # Distribución malformada
        if a.distribution is not None:
            dist_type = a.distribution.get("type", "")
            if dist_type == "normal":
                if "mean" not in a.distribution or "std" not in a.distribution:
                    errors.append(
                        f"'{a.variable_name}': distribución normal requiere mean y std"
                    )
            elif dist_type == "uniform":
                if "low" not in a.distribution or "high" not in a.distribution:
                    errors.append(
                        f"'{a.variable_name}': distribución uniform requiere low y high"
                    )
            elif dist_type == "triangular":
                if not all(k in a.distribution for k in ("low", "high", "mode")):
                    errors.append(
                        f"'{a.variable_name}': distribución triangular requiere low, high y mode"
                    )
            elif dist_type == "discrete":
                if "values" not in a.distribution or "weights" not in a.distribution:
                    errors.append(
                        f"'{a.variable_name}': distribución discrete requiere values y weights"
                    )
            elif dist_type:
                warnings.append(
                    f"'{a.variable_name}': tipo de distribución desconocido '{dist_type}'"
                )

        # Confianza baja
        if a.confidence < 0.3:
            warnings.append(
                f"'{a.variable_name}': confianza muy baja ({a.confidence:.1%})"
            )

    return {"errors": errors, "warnings": warnings}


# ── Resumen ────────────────────────────────────────────────────────────────────

def summarize_assumptions(
    assumptions: list[ScenarioAssumption],
) -> dict[str, Any]:
    """
    Genera un resumen estadístico de los supuestos de un escenario.

    Returns:
        Dict con métricas agregadas.
    """
    if not assumptions:
        return {
            "n_assumptions": 0,
            "avg_confidence": None,
            "n_with_distribution": 0,
            "n_with_baseline": 0,
            "low_confidence_vars": [],
        }

    confidences = [a.confidence for a in assumptions]
    avg_confidence = sum(confidences) / len(confidences)

    n_with_distribution = sum(1 for a in assumptions if a.distribution is not None)
    n_with_baseline = sum(1 for a in assumptions if a.baseline_value is not None)
    low_confidence_vars = [
        a.variable_name for a in assumptions if a.confidence < 0.4
    ]

    deltas: list[float] = []
    for a in assumptions:
        if isinstance(a.baseline_value, (int, float)) and isinstance(
            a.scenario_value, (int, float)
        ):
            deltas.append(float(a.scenario_value) - float(a.baseline_value))

    return {
        "n_assumptions": len(assumptions),
        "avg_confidence": round(avg_confidence, 3),
        "min_confidence": round(min(confidences), 3),
        "max_confidence": round(max(confidences), 3),
        "n_with_distribution": n_with_distribution,
        "n_with_baseline": n_with_baseline,
        "low_confidence_vars": low_confidence_vars,
        "n_numeric_deltas": len(deltas),
        "avg_numeric_delta": round(sum(deltas) / len(deltas), 4) if deltas else None,
        "variables": [a.variable_name for a in assumptions],
    }


# ── Conversión a inputs de modelos ─────────────────────────────────────────────

def assumptions_to_model_inputs(
    assumptions: list[ScenarioAssumption],
    use_scenario_value: bool = True,
) -> dict[str, Any]:
    """
    Convierte supuestos a un dict plano usado como inputs por los modelos.

    Para variables con distribution, usa el valor central (mean / mode).
    Para variables booleanas/string, las pasa tal cual.

    Args:
        assumptions: Lista de ScenarioAssumption.
        use_scenario_value: Si True usa scenario_value; si False usa baseline_value.

    Returns:
        Dict variable_name → valor resuelto.
    """
    inputs: dict[str, Any] = {}

    for a in assumptions:
        # Resolución prioritaria: distribution → punto central
        if a.distribution is not None:
            dist_type = a.distribution.get("type", "")
            if dist_type == "normal":
                inputs[a.variable_name] = a.distribution.get("mean")
            elif dist_type == "uniform":
                low = a.distribution.get("low", 0)
                high = a.distribution.get("high", 1)
                inputs[a.variable_name] = (low + high) / 2
            elif dist_type == "triangular":
                inputs[a.variable_name] = a.distribution.get("mode")
            elif dist_type == "discrete":
                values = a.distribution.get("values", [])
                weights = a.distribution.get("weights", [])
                if values and weights:
                    # Valor con mayor peso
                    max_idx = weights.index(max(weights))
                    inputs[a.variable_name] = values[max_idx]
                elif values:
                    inputs[a.variable_name] = values[0]
            else:
                inputs[a.variable_name] = None
            continue

        # Sin distribución: usar scenario_value o baseline_value
        val = a.scenario_value if use_scenario_value else a.baseline_value
        inputs[a.variable_name] = val

    return inputs


def get_uncertainty_bounds(
    assumptions: list[ScenarioAssumption],
) -> dict[str, dict[str, float | None]]:
    """
    Extrae los límites de incertidumbre de los supuestos con distribución.

    Returns:
        Dict variable_name → {"low": ..., "high": ...}
    """
    bounds: dict[str, dict[str, float | None]] = {}

    for a in assumptions:
        if a.distribution is None:
            continue

        dist_type = a.distribution.get("type", "")
        low: float | None = None
        high: float | None = None

        if dist_type == "normal":
            mean = a.distribution.get("mean", 0)
            std = a.distribution.get("std", 0)
            low = mean - 2 * std
            high = mean + 2 * std
        elif dist_type in ("uniform", "triangular"):
            low = a.distribution.get("low")
            high = a.distribution.get("high")
        elif dist_type == "discrete":
            values = a.distribution.get("values", [])
            if values:
                numeric = [v for v in values if isinstance(v, (int, float))]
                if numeric:
                    low = min(numeric)
                    high = max(numeric)

        bounds[a.variable_name] = {"low": low, "high": high}

    return bounds


def merge_assumptions(
    base: list[ScenarioAssumption],
    override: list[ScenarioAssumption],
) -> list[ScenarioAssumption]:
    """
    Fusiona dos listas de supuestos. Los de override reemplazan a los de base
    para la misma variable_name.

    Returns:
        Lista fusionada.
    """
    base_map = {a.variable_name: a for a in base}
    for a in override:
        base_map[a.variable_name] = a
    return list(base_map.values())
