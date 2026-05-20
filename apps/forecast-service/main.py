"""Forecast microservice · FastAPI · Prophet + statsforecast.

Sustituye el stub drift_naive_v1 del endpoint /api/v1/commodities/forecast.
Pensado para correr aislado en su propio container:

  POST /forecast
    body: {
      "closes": [12.3, 12.5, 12.4, ...],
      "horizon": 30,
      "model": "prophet" | "auto_arima" | "naive_drift"
    }
    response: {
      "model": "prophet",
      "horizon": 30,
      "forecast": [{date, value, lower_80, upper_80, lower_95, upper_95}],
      "accuracy_mape_30d": float | null,
      "accuracy_dir_pct": float | null
    }

Modelos:
  - prophet     · default si hay >= 60 obs · Meta Prophet con bandas nativas
  - auto_arima  · statsforecast.AutoARIMA · más rápido en series cortas
  - naive_drift · fallback puro Python · sin deps (paridad con backend stub)

Falla cerrado: si el modelo pedido no tiene su dep instalada, hace fallback
automático a naive_drift y lo señaliza en `model` y `warning`.
"""
from __future__ import annotations

import logging
import math
import os
from datetime import date, timedelta
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Politeia Forecast Service",
    version="1.0.0",
    description="Microservicio dedicado · Prophet / AutoARIMA / drift naive",
)


# ─────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────

ModelKind = Literal["prophet", "auto_arima", "naive_drift", "auto"]


class ForecastRequest(BaseModel):
    closes: list[float] = Field(..., min_length=10, description="Serie de cierres OHLC")
    horizon: int = Field(default=30, ge=1, le=365)
    model: ModelKind = "auto"
    start_date: str | None = Field(
        default=None,
        description="ISO date del último punto histórico. Default = hoy.",
    )
    cv_window: int = Field(
        default=30,
        ge=10,
        le=120,
        description="Días de back-test para reportar MAPE + dirección.",
    )


class ForecastPoint(BaseModel):
    date: str
    value: float
    lower_80: float
    upper_80: float
    lower_95: float
    upper_95: float


class ForecastResponse(BaseModel):
    model: str
    horizon: int
    n_obs: int
    forecast: list[ForecastPoint]
    accuracy_mape_30d: float | None = None
    accuracy_dir_pct: float | None = None
    warning: str | None = None


# ─────────────────────────────────────────────────────────────────
# Deps opcionales (Prophet / statsforecast) detectadas en runtime
# ─────────────────────────────────────────────────────────────────

def _has_prophet() -> bool:
    try:
        import prophet  # type: ignore # noqa: F401
        return True
    except Exception:
        return False


def _has_statsforecast() -> bool:
    try:
        from statsforecast.models import AutoARIMA  # type: ignore # noqa: F401
        return True
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────
# Modelos
# ─────────────────────────────────────────────────────────────────

def _naive_drift(
    closes: list[float],
    horizon: int,
    start: date,
) -> list[ForecastPoint]:
    """Modelo naive con drift + intervalos por stdev de los deltas.

    Idéntico al stub del backend principal · garantiza siempre devolver algo.
    """
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    drift = sum(deltas) / len(deltas)
    mean = drift
    var = sum((d - mean) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    sigma = math.sqrt(var)
    last = closes[-1]
    out: list[ForecastPoint] = []
    for t in range(1, horizon + 1):
        f = last + drift * t
        sp80 = 1.28 * sigma * math.sqrt(t)
        sp95 = 1.96 * sigma * math.sqrt(t)
        out.append(
            ForecastPoint(
                date=(start + timedelta(days=t)).isoformat(),
                value=round(f, 4),
                lower_80=round(f - sp80, 4),
                upper_80=round(f + sp80, 4),
                lower_95=round(f - sp95, 4),
                upper_95=round(f + sp95, 4),
            )
        )
    return out


def _prophet_forecast(
    closes: list[float],
    horizon: int,
    start: date,
) -> list[ForecastPoint]:
    import pandas as pd  # type: ignore
    from prophet import Prophet  # type: ignore

    # Construir DataFrame · daily index sintético hacia atrás desde `start`
    dates = [start - timedelta(days=(len(closes) - 1 - i)) for i in range(len(closes))]
    df = pd.DataFrame({"ds": dates, "y": closes})
    m = Prophet(
        interval_width=0.95,
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        changepoint_prior_scale=0.05,
    )
    m.fit(df)
    future = m.make_future_dataframe(periods=horizon, freq="D")
    fc = m.predict(future).tail(horizon)

    # Prophet expone yhat_lower/yhat_upper sólo al 95% por defecto · derivamos 80%
    z80_z95 = 1.28 / 1.96
    out: list[ForecastPoint] = []
    for _, row in fc.iterrows():
        y = float(row["yhat"])
        lo95 = float(row["yhat_lower"])
        up95 = float(row["yhat_upper"])
        spread95 = (up95 - lo95) / 2
        spread80 = spread95 * z80_z95
        out.append(
            ForecastPoint(
                date=row["ds"].date().isoformat(),
                value=round(y, 4),
                lower_80=round(y - spread80, 4),
                upper_80=round(y + spread80, 4),
                lower_95=round(lo95, 4),
                upper_95=round(up95, 4),
            )
        )
    return out


def _auto_arima_forecast(
    closes: list[float],
    horizon: int,
    start: date,
) -> list[ForecastPoint]:
    """statsforecast.AutoARIMA con intervalos 80% + 95%."""
    import numpy as np  # type: ignore
    import pandas as pd  # type: ignore
    from statsforecast import StatsForecast  # type: ignore
    from statsforecast.models import AutoARIMA  # type: ignore

    dates = [start - timedelta(days=(len(closes) - 1 - i)) for i in range(len(closes))]
    df = pd.DataFrame({"unique_id": "series", "ds": dates, "y": closes})

    sf = StatsForecast(models=[AutoARIMA()], freq="D", n_jobs=1)
    sf.fit(df)
    fc = sf.predict(h=horizon, level=[80, 95])

    out: list[ForecastPoint] = []
    for _, row in fc.iterrows():
        y = float(row["AutoARIMA"])
        out.append(
            ForecastPoint(
                date=row["ds"].date().isoformat() if hasattr(row["ds"], "date") else str(row["ds"])[:10],
                value=round(y, 4),
                lower_80=round(float(row["AutoARIMA-lo-80"]), 4),
                upper_80=round(float(row["AutoARIMA-hi-80"]), 4),
                lower_95=round(float(row["AutoARIMA-lo-95"]), 4),
                upper_95=round(float(row["AutoARIMA-hi-95"]), 4),
            )
        )
    return out


# ─────────────────────────────────────────────────────────────────
# Back-test ligero · MAPE + direccional %
# ─────────────────────────────────────────────────────────────────

def _backtest(
    closes: list[float],
    cv_window: int,
    model_fn,
    start: date,
) -> tuple[float | None, float | None]:
    """Ajusta sobre closes[:-cv_window] y compara con closes[-cv_window:]."""
    if len(closes) < cv_window + 10:
        return None, None
    train = closes[:-cv_window]
    test = closes[-cv_window:]
    try:
        train_start = start - timedelta(days=cv_window)
        pred = model_fn(train, cv_window, train_start)
    except Exception as exc:
        logger.debug("backtest model_fn falló · %s", exc)
        return None, None
    if not pred:
        return None, None
    # Alinear primeras cv_window predicciones con test real
    preds = [p.value for p in pred[:cv_window]]
    abs_pct = [abs(test[i] - preds[i]) / abs(test[i]) for i in range(cv_window) if test[i] != 0]
    mape = (sum(abs_pct) / len(abs_pct)) * 100 if abs_pct else None

    # Direccional: comparar signo de delta
    correct = 0
    total = 0
    for i in range(1, cv_window):
        actual_dir = test[i] - test[i - 1]
        pred_dir = preds[i] - preds[i - 1]
        if actual_dir == 0:
            continue
        total += 1
        if (actual_dir > 0) == (pred_dir > 0):
            correct += 1
    dir_pct = (correct / total) * 100 if total else None

    return (
        round(mape, 2) if mape is not None else None,
        round(dir_pct, 2) if dir_pct is not None else None,
    )


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": "1.0.0",
        "models": {
            "naive_drift": True,
            "prophet": _has_prophet(),
            "auto_arima": _has_statsforecast(),
        },
    }


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    if not req.closes or len(req.closes) < 10:
        raise HTTPException(status_code=400, detail="closes insuficiente · min 10 obs")

    start = date.fromisoformat(req.start_date) if req.start_date else date.today()
    chosen = req.model
    warning: str | None = None

    # Auto · prefiere prophet si está + suficientes obs · fallback auto_arima · luego naive
    if chosen == "auto":
        if _has_prophet() and len(req.closes) >= 60:
            chosen = "prophet"
        elif _has_statsforecast():
            chosen = "auto_arima"
        else:
            chosen = "naive_drift"

    if chosen == "prophet" and not _has_prophet():
        warning = "prophet no instalado · fallback naive_drift"
        chosen = "naive_drift"
    if chosen == "auto_arima" and not _has_statsforecast():
        warning = "statsforecast no instalado · fallback naive_drift"
        chosen = "naive_drift"

    if chosen == "prophet":
        model_fn = _prophet_forecast
    elif chosen == "auto_arima":
        model_fn = _auto_arima_forecast
    else:
        model_fn = _naive_drift

    try:
        out = model_fn(req.closes, req.horizon, start)
    except Exception as exc:
        logger.exception("model %s falló · fallback naive · %s", chosen, exc)
        warning = (warning or "") + f" · {chosen} runtime falló: {exc}"
        chosen = "naive_drift"
        out = _naive_drift(req.closes, req.horizon, start)

    # Back-test sobre el mismo modelo elegido (excepto para naive · ahorra tiempo)
    mape, dir_pct = (None, None)
    if chosen != "naive_drift":
        mape, dir_pct = _backtest(req.closes, req.cv_window, model_fn, start)

    return ForecastResponse(
        model=chosen,
        horizon=req.horizon,
        n_obs=len(req.closes),
        forecast=out,
        accuracy_mape_30d=mape,
        accuracy_dir_pct=dir_pct,
        warning=warning,
    )


# ─────────────────────────────────────────────────────────────────
# Ejecución local
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("FORECAST_PORT", "8001"))
    uvicorn.run("apps.forecast_service.main:app", host="0.0.0.0", port=port, reload=False)
