"""
Economic Forecaster — Bloque 5.

Forecasting de indicadores económicos.

Modelos disponibles:
  Fase 1 (siempre disponible):
    naive         — último valor hacia delante
    moving_avg    — media móvil simple
    ols_trend     — OLS lineal sobre tendencia

  Fase 2 (requiere statsmodels):
    arima         — ARIMA(1,1,1) básico

  Fase 3 (future — statsforecast):
    auto          — selección automática
"""
from __future__ import annotations

import logging
import math
from datetime import date, timedelta
from typing import Any

from .schemas import EconomicForecast, MacroIndicator

logger = logging.getLogger(__name__)


def forecast_indicator(
    indicators: list[MacroIndicator],
    horizon: int = 6,
    model: str = "auto",
) -> list[EconomicForecast]:
    """
    Genera forecast para una serie de MacroIndicator.

    Args:
        indicators: Serie histórica de MacroIndicator (ordenada por fecha).
        horizon: Número de períodos a proyectar.
        model: Modelo a usar ('naive', 'moving_avg', 'ols_trend', 'arima', 'auto').

    Returns:
        Lista de EconomicForecast (uno por período futuro).
    """
    if not indicators:
        return []

    sorted_inds = sorted(indicators, key=lambda x: x.date)
    values = [float(ind.value) for ind in sorted_inds]
    last_ind = sorted_inds[-1]
    frequency = last_ind.frequency

    if model == "auto":
        model = _select_model(values)

    try:
        if model == "arima":
            forecasts = _arima_forecast(values, horizon)
        elif model == "ols_trend":
            forecasts = _ols_trend_forecast(values, horizon)
        elif model == "moving_avg":
            forecasts = _moving_avg_forecast(values, horizon)
        else:
            forecasts = _naive_forecast(values, horizon)
    except Exception as exc:
        logger.debug("Forecast model '%s' error, fallback naive: %s", model, exc)
        forecasts = _naive_forecast(values, horizon)

    return _build_forecast_objects(
        forecasts, last_ind, horizon, model, frequency
    )


def backtest_indicator(
    indicators: list[MacroIndicator],
    test_size: int = 4,
    model: str = "naive",
) -> dict[str, float]:
    """
    Backtesta un modelo sobre datos históricos.

    Returns:
        dict con: mae, rmse, mape.
    """
    if len(indicators) < test_size + 2:
        return {"mae": 0.0, "rmse": 0.0, "mape": 0.0, "model": model}

    sorted_inds = sorted(indicators, key=lambda x: x.date)
    values = [float(ind.value) for ind in sorted_inds]
    train = values[:-test_size]
    test = values[-test_size:]

    try:
        preds = forecast_indicator(
            sorted_inds[:-test_size], horizon=test_size, model=model
        )
        pred_vals = [p.yhat for p in preds]
    except Exception:
        pred_vals = [train[-1]] * test_size

    # Calcular métricas
    errors = [abs(p - a) for p, a in zip(pred_vals, test)]
    mae = sum(errors) / len(errors) if errors else 0.0
    rmse = math.sqrt(sum(e**2 for e in errors) / len(errors)) if errors else 0.0
    mape = (
        sum(abs((p - a) / a) * 100 for p, a in zip(pred_vals, test) if a != 0)
        / len(test)
        if test else 0.0
    )

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape": round(mape, 2),
        "model": model,
        "test_size": test_size,
    }


# ── Modelos internos ──────────────────────────────────────────────────────────

def _naive_forecast(values: list[float], horizon: int) -> list[tuple[float, float, float]]:
    """Naive: último valor repetido, con banda ±std."""
    last = values[-1]
    if len(values) >= 4:
        import statistics
        std = statistics.stdev(values[-12:] or values) * 1.5
    else:
        std = abs(last) * 0.10  # 10% uncertainty
    return [(last, last - std, last + std)] * horizon


def _moving_avg_forecast(values: list[float], horizon: int) -> list[tuple[float, float, float]]:
    """Moving average simple de ventana 3 o 6."""
    window = min(6, len(values))
    ma = sum(values[-window:]) / window
    if len(values) >= 4:
        import statistics
        std = statistics.stdev(values[-window:]) * 1.5
    else:
        std = abs(ma) * 0.10
    return [(ma, ma - std * (i + 1)**0.5, ma + std * (i + 1)**0.5) for i in range(horizon)]


def _ols_trend_forecast(values: list[float], horizon: int) -> list[tuple[float, float, float]]:
    """OLS trend lineal simple."""
    n = len(values)
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(values) / n
    ss_xy = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, values))
    ss_xx = sum((xi - x_mean) ** 2 for xi in x)
    slope = ss_xy / ss_xx if ss_xx else 0
    intercept = y_mean - slope * x_mean

    if len(values) >= 4:
        import statistics
        residuals = [v - (intercept + slope * i) for i, v in enumerate(values)]
        rmse = (sum(r**2 for r in residuals) / len(residuals)) ** 0.5
    else:
        rmse = abs(y_mean) * 0.10

    result = []
    for h in range(1, horizon + 1):
        yhat = intercept + slope * (n + h - 1)
        band = rmse * (h**0.5) * 1.5
        result.append((yhat, yhat - band, yhat + band))
    return result


def _arima_forecast(values: list[float], horizon: int) -> list[tuple[float, float, float]]:
    """ARIMA(1,1,1) con statsmodels si está disponible."""
    try:
        from statsmodels.tsa.arima.model import ARIMA
        import numpy as np
        model = ARIMA(values, order=(1, 1, 1))
        fit = model.fit()
        forecast_result = fit.get_forecast(steps=horizon)
        yhat = forecast_result.predicted_mean.tolist()
        ci = forecast_result.conf_int(alpha=0.20)
        result = []
        for h in range(horizon):
            result.append((
                float(yhat[h]),
                float(ci.iloc[h, 0]),
                float(ci.iloc[h, 1]),
            ))
        return result
    except ImportError:
        logger.debug("statsmodels no disponible, usando ols_trend.")
        return _ols_trend_forecast(values, horizon)


def _select_model(values: list[float]) -> str:
    """Selecciona el mejor modelo según disponibilidad y tamaño de la serie."""
    if len(values) < 4:
        return "naive"
    if len(values) < 8:
        return "moving_avg"
    try:
        import statsmodels  # noqa: F401
        return "arima"
    except ImportError:
        return "ols_trend"


def _build_forecast_objects(
    forecasts: list[tuple[float, float, float]],
    base_ind: MacroIndicator,
    horizon: int,
    model: str,
    frequency: str,
) -> list[EconomicForecast]:
    """Convierte tuplas de forecast en EconomicForecast objects."""
    today = date.today()
    freq_delta = {
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": timedelta(days=31),
        "quarterly": timedelta(days=91),
        "annual": timedelta(days=365),
    }
    delta = freq_delta.get(frequency, timedelta(days=31))

    result = []
    last_date = base_ind.date
    for h, (yhat, lower, upper) in enumerate(forecasts):
        target_date = last_date + delta * (h + 1)
        result.append(EconomicForecast(
            provider=base_ind.provider,
            indicator_id=base_ind.indicator_id,
            geography=base_ind.geography,
            forecast_date=today,
            target_date=target_date,
            horizon=h + 1,
            yhat=round(float(yhat), 4),
            yhat_lower=round(float(lower), 4),
            yhat_upper=round(float(upper), 4),
            model_name=model,
            model_version="1.0",
        ))
    return result


def compute_itpe_economic(indicators_dict: dict[str, float]) -> "EconomicRiskScore":
    """
    Calcula el ITPE Económico (Índice de Tensión Político-Económica).

    Args:
        indicators_dict: Valores actuales de indicadores por indicator_id.
            Ejemplo: {"ipc": 3.4, "paro_epa": 11.2, "pib_yoy": 2.1, ...}

    Returns:
        EconomicRiskScore con score total y breakdown por dimensión.
    """
    from .schemas import EconomicRiskScore

    # Pesos del ITPE
    WEIGHTS = {
        "inflation":    0.20,
        "unemployment": 0.20,
        "growth":       0.15,
        "fiscal":       0.15,
        "housing":      0.10,
        "energy":       0.10,
        "market":       0.05,
        "confidence":   0.05,
    }

    def _normalize(val: float, low: float, high: float) -> float:
        """Normaliza un valor al rango [0, 100]."""
        if high == low:
            return 0.0
        return max(0.0, min(100.0, (val - low) / (high - low) * 100))

    # Cálculo de componentes (0–100 por dimensión, luego ponderado)
    ipc = indicators_dict.get("ipc", 2.0)
    paro = indicators_dict.get("paro_epa", 10.0)
    pib = indicators_dict.get("pib_yoy", 2.0)
    deuda = indicators_dict.get("deuda_pib", 80.0)
    deficit = indicators_dict.get("deficit_pib", 3.0)
    vivienda_yoy = indicators_dict.get("precio_vivienda_yoy", 3.0)
    electricidad = indicators_dict.get("precio_electricidad", 100.0)
    prima = indicators_dict.get("prima_riesgo", 80.0)
    icc = indicators_dict.get("confianza_consumidor", 0.0)

    components = {
        "inflation":    _normalize(ipc, 0, 8),        # 0% = ok, 8% = crítico
        "unemployment": _normalize(paro, 5, 25),       # 5% = ok, 25% = crítico
        "growth":       _normalize(-pib, -5, 5),       # crecimiento negativo → riesgo
        "fiscal":       _normalize(max(deuda / 100 * 40 + deficit * 4, 0), 0, 100),
        "housing":      _normalize(vivienda_yoy, 0, 15),  # 0% = ok, 15% = crítico
        "energy":       _normalize(max(electricidad - 100, 0), 0, 200),
        "market":       _normalize(prima, 0, 500),
        "confidence":   _normalize(-icc, -30, 30),     # ICC negativo → riesgo
    }

    # Score ponderado
    total = sum(WEIGHTS[k] * v for k, v in components.items())

    return EconomicRiskScore(
        geography=indicators_dict.get("geography", "ES"),
        score_date=date.today(),
        inflation_risk=round(components["inflation"], 1),
        unemployment_risk=round(components["unemployment"], 1),
        growth_risk=round(components["growth"], 1),
        fiscal_risk=round(components["fiscal"], 1),
        housing_risk=round(components["housing"], 1),
        energy_risk=round(components["energy"], 1),
        market_risk=round(components["market"], 1),
        confidence_risk=round(components["confidence"], 1),
        total_score=round(total, 1),
        components=components,
        explanation=(
            f"ITPE Económico {round(total, 1)}/100. "
            f"Inflación: {components['inflation']:.0f}pt | "
            f"Paro: {components['unemployment']:.0f}pt | "
            f"Crecimiento: {components['growth']:.0f}pt | "
            f"Fiscal: {components['fiscal']:.0f}pt"
        ),
    )
