"""Cliente HTTP del µservicio forecast · Politeia.

Punto único de entrada para el backend principal. Devuelve forecast con
intervalos 80/95 + métricas back-test cuando están disponibles. Si el
µservicio no responde o no está configurado, hace fallback al algoritmo
naive drift local sin romper el endpoint del backend.

Configuración:
  FORECAST_SERVICE_URL · ej. http://forecast-service:8001 (sin slash final)
  FORECAST_TIMEOUT_SECS · default 10

Falla cerrado: errores → fallback local. Nunca lanza hacia arriba.
"""
from __future__ import annotations

import logging
import math
import os
from datetime import date, timedelta
from typing import Any, Literal

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = float(os.environ.get("FORECAST_TIMEOUT_SECS", "10"))


def _service_url() -> str:
    return os.environ.get("FORECAST_SERVICE_URL", "").rstrip("/")


def is_service_configured() -> bool:
    return bool(_service_url())


def forecast(
    closes: list[float],
    *,
    horizon: int = 30,
    model: Literal["prophet", "auto_arima", "naive_drift", "auto"] = "auto",
    start_date: date | None = None,
    cv_window: int = 30,
    timeout: float | None = None,
) -> dict[str, Any]:
    """Solicita un forecast al µservicio · cae a naive_drift local si falla.

    Returns:
      Dict con la estructura ForecastResponse del µservicio:
      {model, horizon, n_obs, forecast: [...], accuracy_mape_30d,
       accuracy_dir_pct, warning, source ("service" | "local_fallback")}
    """
    sd = start_date or date.today()

    url = _service_url()
    if url:
        try:
            import requests  # type: ignore
            body = {
                "closes": closes,
                "horizon": horizon,
                "model": model,
                "start_date": sd.isoformat(),
                "cv_window": cv_window,
            }
            r = requests.post(
                f"{url}/forecast",
                json=body,
                timeout=timeout or _DEFAULT_TIMEOUT,
                headers={"Accept": "application/json"},
            )
            r.raise_for_status()
            data = r.json()
            data["source"] = "service"
            return data
        except Exception as exc:
            logger.warning("forecast µservice · fallback local · %s", exc)

    # Fallback local · naive drift
    return _local_naive_drift(closes, horizon=horizon, start=sd)


def _local_naive_drift(
    closes: list[float],
    *,
    horizon: int,
    start: date,
) -> dict[str, Any]:
    """Re-implementación local del modelo naive drift. Paridad con µservice."""
    if len(closes) < 10:
        return {
            "model": "naive_drift",
            "horizon": horizon,
            "n_obs": len(closes),
            "forecast": [],
            "accuracy_mape_30d": None,
            "accuracy_dir_pct": None,
            "warning": "closes insuficiente · min 10 obs",
            "source": "local_fallback",
        }

    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    drift = sum(deltas) / len(deltas)
    mean = drift
    var = sum((d - mean) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    sigma = math.sqrt(var)
    last = closes[-1]
    pts = []
    for t in range(1, horizon + 1):
        f = last + drift * t
        sp80 = 1.28 * sigma * math.sqrt(t)
        sp95 = 1.96 * sigma * math.sqrt(t)
        pts.append({
            "date": (start + timedelta(days=t)).isoformat(),
            "value": round(f, 4),
            "lower_80": round(f - sp80, 4),
            "upper_80": round(f + sp80, 4),
            "lower_95": round(f - sp95, 4),
            "upper_95": round(f + sp95, 4),
        })
    return {
        "model": "naive_drift",
        "horizon": horizon,
        "n_obs": len(closes),
        "forecast": pts,
        "accuracy_mape_30d": None,
        "accuracy_dir_pct": None,
        "warning": None,
        "source": "local_fallback",
    }


def health() -> dict[str, Any]:
    """Llama al endpoint /health del µservicio · útil para diagnóstico."""
    url = _service_url()
    if not url:
        return {"status": "not_configured", "configured": False}
    try:
        import requests  # type: ignore
        r = requests.get(f"{url}/health", timeout=5)
        r.raise_for_status()
        data = r.json()
        data["configured"] = True
        return data
    except Exception as exc:
        return {"status": "unreachable", "configured": True, "error": str(exc)}


__all__ = ["forecast", "health", "is_service_configured"]
