"""
Model Evaluation — Bloque 11.

Evaluación y calibración de modelos de simulación.
"""
from __future__ import annotations

import logging
import math
from typing import Any

from models.simulation.schemas import ModelEvaluationResult

logger = logging.getLogger(__name__)


def evaluate_model_accuracy(
    model_name: str,
    predicted_values: list[float],
    actual_values: list[float],
    metric_name: str = "generic",
    model_version: str = "1.0",
    evaluation_period: str | None = None,
) -> list[ModelEvaluationResult]:
    """
    Evalúa la precisión de un modelo comparando predicciones con valores reales.

    Calcula: MAE, RMSE, MAPE, R².

    Returns:
        Lista de ModelEvaluationResult (uno por métrica de evaluación).
    """
    n = len(predicted_values)
    if n == 0 or len(actual_values) != n:
        logger.warning("Datos insuficientes para evaluación del modelo '%s'", model_name)
        return []

    errors = [p - a for p, a in zip(predicted_values, actual_values)]
    abs_errors = [abs(e) for e in errors]
    sq_errors = [e**2 for e in errors]

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)

    # MAPE (evitar división por cero)
    mape_terms = [
        abs(errors[i]) / abs(actual_values[i])
        for i in range(n) if actual_values[i] != 0
    ]
    mape = sum(mape_terms) / len(mape_terms) * 100 if mape_terms else None

    # R²
    actual_mean = sum(actual_values) / n
    ss_res = sum((a - p) ** 2 for a, p in zip(actual_values, predicted_values))
    ss_tot = sum((a - actual_mean) ** 2 for a in actual_values)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else None

    results = [
        ModelEvaluationResult(
            model_name=model_name,
            model_version=model_version,
            metric_name=f"{metric_name}_mae",
            metric_value=round(mae, 4),
            evaluation_period=evaluation_period,
            sample_size=n,
            notes="Mean Absolute Error",
        ),
        ModelEvaluationResult(
            model_name=model_name,
            model_version=model_version,
            metric_name=f"{metric_name}_rmse",
            metric_value=round(rmse, 4),
            evaluation_period=evaluation_period,
            sample_size=n,
            notes="Root Mean Square Error",
        ),
    ]

    if mape is not None:
        results.append(
            ModelEvaluationResult(
                model_name=model_name,
                model_version=model_version,
                metric_name=f"{metric_name}_mape",
                metric_value=round(mape, 2),
                evaluation_period=evaluation_period,
                sample_size=n,
                notes="Mean Absolute Percentage Error (%)",
            )
        )

    if r2 is not None:
        results.append(
            ModelEvaluationResult(
                model_name=model_name,
                model_version=model_version,
                metric_name=f"{metric_name}_r2",
                metric_value=round(r2, 4),
                evaluation_period=evaluation_period,
                sample_size=n,
                notes="Coeficiente de determinación R²",
            )
        )

    return results


def evaluate_polling_model(
    model_name: str,
    poll_predictions: dict[str, float],
    election_results: dict[str, float],
    model_version: str = "1.0",
    election_date: str | None = None,
) -> list[ModelEvaluationResult]:
    """
    Evaluación especializada para modelos de predicción electoral.

    Calcula error por partido y error global.

    Args:
        poll_predictions: Dict partido → % predicho.
        election_results: Dict partido → % real.
        election_date: Fecha de la elección (para evaluation_period).

    Returns:
        Lista de ModelEvaluationResult.
    """
    results = []
    parties = set(poll_predictions) & set(election_results)

    if not parties:
        return []

    total_abs_error = 0.0
    max_error = 0.0
    max_error_party = ""

    for party in parties:
        pred = poll_predictions[party]
        actual = election_results[party]
        abs_err = abs(pred - actual)
        total_abs_error += abs_err
        if abs_err > max_error:
            max_error = abs_err
            max_error_party = party

        results.append(
            ModelEvaluationResult(
                model_name=model_name,
                model_version=model_version,
                metric_name=f"poll_error_{party}",
                metric_value=round(pred - actual, 3),
                baseline_metric=actual,
                improvement=None,
                evaluation_period=election_date,
                sample_size=len(parties),
                notes=f"Error de predicción para {party}: predicho={pred:.1f}%, real={actual:.1f}%",
            )
        )

    # Error global
    mean_abs_error = total_abs_error / len(parties)
    results.insert(
        0,
        ModelEvaluationResult(
            model_name=model_name,
            model_version=model_version,
            metric_name="mean_absolute_poll_error",
            metric_value=round(mean_abs_error, 3),
            evaluation_period=election_date,
            sample_size=len(parties),
            notes=(
                f"Error absoluto medio de encuesta: {mean_abs_error:.2f}pp. "
                f"Mayor error: {max_error_party} ({max_error:.2f}pp)."
            ),
        ),
    )

    return results


def compute_calibration_score(
    predicted_probabilities: list[float],
    outcomes: list[int],
    n_bins: int = 10,
) -> dict[str, Any]:
    """
    Calcula la calibración de un modelo probabilístico (Brier score + ECE).

    Args:
        predicted_probabilities: Lista de probabilidades predichas (0-1).
        outcomes: Lista de outcomes reales (0 o 1).
        n_bins: Número de bins para la curva de calibración.

    Returns:
        Dict con brier_score, expected_calibration_error, calibration_curve.
    """
    n = len(predicted_probabilities)
    if n == 0 or len(outcomes) != n:
        return {"error": "Datos insuficientes"}

    # Brier Score
    brier = sum(
        (p - o) ** 2 for p, o in zip(predicted_probabilities, outcomes)
    ) / n

    # ECE (Expected Calibration Error)
    bins = [[] for _ in range(n_bins)]
    for p, o in zip(predicted_probabilities, outcomes):
        bin_idx = min(n_bins - 1, int(p * n_bins))
        bins[bin_idx].append((p, o))

    ece = 0.0
    calibration_curve = []
    for i, b in enumerate(bins):
        if b:
            mean_p = sum(x[0] for x in b) / len(b)
            mean_o = sum(x[1] for x in b) / len(b)
            ece += abs(mean_p - mean_o) * len(b) / n
            calibration_curve.append({
                "bin": i,
                "mean_predicted": round(mean_p, 3),
                "mean_actual": round(mean_o, 3),
                "n_samples": len(b),
            })

    return {
        "brier_score": round(brier, 4),
        "expected_calibration_error": round(ece, 4),
        "n_samples": n,
        "calibration_quality": (
            "excellent" if ece < 0.05
            else "good" if ece < 0.10
            else "fair" if ece < 0.20
            else "poor"
        ),
        "calibration_curve": calibration_curve,
    }
