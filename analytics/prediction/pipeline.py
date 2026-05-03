"""
Bloque 7 — PredictionPipeline.

Orquesta los tres modelos de prediccion:
  1. CoalitionPredictor     — coaliciones de gobierno viables
  2. CrisisEscalationModel  — probabilidad de escalada de crisis
  3. ElectoralShiftDetector — desplazamientos de voto blando

Expone run_prediction_pipeline() como entry point unico.
Compatibilidad con Prefect 2.x; degradacion elegante si no esta instalado.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prefect opcional
# ---------------------------------------------------------------------------
try:
    from prefect import flow, task
    _PREFECT_AVAILABLE = True
except ImportError:
    _PREFECT_AVAILABLE = False

    def flow(fn=None, **kw):          # type: ignore
        return fn if fn is not None else lambda f: f

    def task(fn=None, **kw):          # type: ignore
        return fn if fn is not None else lambda f: f


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@task(name="predict_coalitions", retries=1, retry_delay_seconds=30)
def task_predict_coalitions(conn=None) -> list[dict]:
    from analytics.prediction.coalition_predictor import CoalitionPredictor
    predictor = CoalitionPredictor(conn=conn)
    scenarios = predictor.predict_coalitions()
    return [
        {
            "coalition_id": s.coalition_id,
            "parties": s.parties,
            "probability": s.probability,
            "projected_seats": s.projected_seats,
            "ideological_distance": s.ideological_distance,
            "notes": s.notes,
        }
        for s in scenarios
    ]


@task(name="predict_crisis", retries=1, retry_delay_seconds=30)
def task_predict_crisis(conn=None) -> dict:
    from analytics.prediction.crisis_escalation import CrisisEscalationModel
    model = CrisisEscalationModel(conn=conn)
    pred = model.predict_crisis()
    return {
        "prediction_id": pred.prediction_id,
        "horizons": pred.horizons,
        "confidence_intervals": {str(k): v for k, v in pred.confidence_intervals.items()},
        "dominant_signals": pred.dominant_signals,
        "entities_at_risk": pred.entities_at_risk,
        "scenario_description": pred.scenario_description,
    }


@task(name="detect_electoral_shifts", retries=1, retry_delay_seconds=30)
def task_detect_electoral_shifts(conn=None) -> list[dict]:
    from analytics.prediction.electoral_shift import ElectoralShiftDetector
    detector = ElectoralShiftDetector(conn=conn)
    signals = detector.predict_electoral_shift()
    return [
        {
            "signal_id": s.signal_id,
            "partido_qid": s.partido_qid,
            "partido_siglas": s.partido_siglas,
            "shift_index": s.shift_index,
            "shift_direction": s.shift_direction,
            "correlation_pearson": s.correlation_pearson,
            "predicted_shift_pct": s.predicted_shift_pct,
            "voto_blando_pct": s.voto_blando_pct,
        }
        for s in signals
    ]


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(name="prediction_pipeline", log_prints=False)
def prediction_flow(conn=None) -> dict[str, Any]:
    """
    Ejecuta los tres modelos de prediccion en secuencia.
    Retorna un dict con los resultados de cada modelo.
    """
    started_at = datetime.now(timezone.utc).isoformat()
    log.info("PredictionPipeline: inicio")

    coalitions = task_predict_coalitions(conn=conn)
    crisis = task_predict_crisis(conn=conn)
    shifts = task_detect_electoral_shifts(conn=conn)

    result = {
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "coalitions": coalitions,
        "crisis": crisis,
        "electoral_shifts": shifts,
        "summary": {
            "n_coalitions": len(coalitions),
            "crisis_7d": crisis.get("horizons", {}).get(7, 0.0),
            "n_shift_signals": len(shifts),
            "top_shift": shifts[0]["partido_siglas"] if shifts else None,
        },
    }

    log.info(
        "PredictionPipeline: %d coaliciones, crisis_7d=%.2f, %d senales de shift",
        result["summary"]["n_coalitions"],
        result["summary"]["crisis_7d"],
        result["summary"]["n_shift_signals"],
    )
    return result


# ---------------------------------------------------------------------------
# Entry point sin Prefect
# ---------------------------------------------------------------------------

def run_prediction_pipeline(conn=None) -> dict[str, Any]:
    """
    Entry point para uso directo (sin servidor Prefect).
    Ejecuta el flow de forma sincrona.
    """
    if _PREFECT_AVAILABLE:
        return prediction_flow(conn=conn)
    else:
        # Degradacion elegante: llamadas directas
        log.info("PredictionPipeline: ejecutando sin Prefect")
        return prediction_flow.__wrapped__(conn=conn) if hasattr(prediction_flow, "__wrapped__") else _run_direct(conn)


def _run_direct(conn=None) -> dict[str, Any]:
    """Ejecucion directa cuando Prefect no esta disponible."""
    started_at = datetime.now(timezone.utc).isoformat()
    coalitions: list[dict] = []
    crisis: dict = {}
    shifts: list[dict] = []

    try:
        coalitions = task_predict_coalitions.__wrapped__(conn=conn) if hasattr(task_predict_coalitions, "__wrapped__") else task_predict_coalitions(conn=conn)
    except Exception as exc:
        log.warning("PredictionPipeline: error en coaliciones: %s", exc)

    try:
        crisis = task_predict_crisis.__wrapped__(conn=conn) if hasattr(task_predict_crisis, "__wrapped__") else task_predict_crisis(conn=conn)
    except Exception as exc:
        log.warning("PredictionPipeline: error en crisis: %s", exc)

    try:
        shifts = task_detect_electoral_shifts.__wrapped__(conn=conn) if hasattr(task_detect_electoral_shifts, "__wrapped__") else task_detect_electoral_shifts(conn=conn)
    except Exception as exc:
        log.warning("PredictionPipeline: error en shifts: %s", exc)

    return {
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "coalitions": coalitions,
        "crisis": crisis,
        "electoral_shifts": shifts,
        "summary": {
            "n_coalitions": len(coalitions),
            "crisis_7d": crisis.get("horizons", {}).get(7, 0.0) if crisis else 0.0,
            "n_shift_signals": len(shifts),
            "top_shift": shifts[0]["partido_siglas"] if shifts else None,
        },
    }
