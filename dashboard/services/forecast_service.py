"""
Forecast Service — Proyecciones de intención de voto.

Integra:
  - statsforecast: AutoARIMA, ETS, Theta — proyecciones rápidas y precisas
  - statsmodels: ARIMA fallback + trend decomposition
  - Calibración bayesiana inspirada en us-potus-model

Ofrece:
  - proyectar_partido(serie, horizonte): proyección con IC
  - proyectar_todos(df_sondeos, horizonte): multi-partido en paralelo
  - nowcast_simple(df): estimación puntual + incertidumbre
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

warnings.filterwarnings("ignore")

# ─── Optional imports ────────────────────────────────────────────────────────

try:
    from statsforecast import StatsForecast  # type: ignore
    from statsforecast.models import AutoARIMA, ETS, Theta, CES  # type: ignore
    _STATSFORECAST_OK = True
except ImportError:
    _STATSFORECAST_OK = False

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing  # type: ignore
    from statsmodels.tsa.arima.model import ARIMA  # type: ignore
    _STATSMODELS_OK = True
except ImportError:
    _STATSMODELS_OK = False

try:
    from scipy import stats as _scipy_stats  # type: ignore
    _SCIPY_OK = True
except ImportError:
    _SCIPY_OK = False


# ─── Constants ───────────────────────────────────────────────────────────────

PARTIDOS_PRINCIPALES = ["PP", "PSOE", "VOX", "SUMAR", "PODEMOS"]

_MODEL_COLORS = {
    "AutoARIMA": "#00D4FF",
    "ETS":       "#8B5CF6",
    "Theta":     "#F59E0B",
    "Ensemble":  "#10B981",
    "Tendencia": "#94A3B8",
}


# ─── Core projection functions ───────────────────────────────────────────────

def proyectar_partido(
    serie: pd.Series,
    horizonte: int = 8,
    freq: str = "W",
    nivel_confianza: float = 95.0,
    partido: str = "Partido",
) -> dict:
    """
    Proyecta una serie temporal de intención de voto.

    Parameters
    ----------
    serie : pd.Series con índice de fechas y valores de % voto
    horizonte : semanas hacia adelante a proyectar
    freq : frecuencia de la serie ('W'=semanal, 'M'=mensual, 'Q'=trimestral)
    nivel_confianza : nivel IC (80 o 95)

    Returns
    -------
    {
      "partido": str,
      "ultima_encuesta": float,
      "proyeccion": float,       # valor central al final del horizonte
      "ic_inf": float,
      "ic_sup": float,
      "tendencia": "sube" | "baja" | "estable",
      "df_forecast": pd.DataFrame  # fecha, valor, ic_inf, ic_sup
    }
    """
    serie = serie.dropna()
    if len(serie) < 4:
        val = float(serie.iloc[-1]) if len(serie) > 0 else 30.0
        return _forecast_fallback(partido, val, horizonte, freq)

    ultima = float(serie.iloc[-1])

    if _STATSFORECAST_OK:
        return _forecast_statsforecast(serie, horizonte, freq, nivel_confianza, partido, ultima)
    elif _STATSMODELS_OK:
        return _forecast_statsmodels(serie, horizonte, freq, nivel_confianza, partido, ultima)
    else:
        return _forecast_tendencia(serie, horizonte, freq, partido, ultima)


def _forecast_statsforecast(serie, horizonte, freq, nivel_confianza, partido, ultima) -> dict:
    """Usa statsforecast: AutoARIMA + ETS ensemble."""
    try:
        df_sf = pd.DataFrame({
            "unique_id": partido,
            "ds": serie.index if hasattr(serie.index, "freq") else pd.date_range(
                end=pd.Timestamp.today(), periods=len(serie), freq=freq
            ),
            "y": serie.values,
        })

        niveles = [int(nivel_confianza), 80] if nivel_confianza != 80 else [80]

        sf = StatsForecast(
            models=[AutoARIMA(season_length=1), ETS(season_length=1), Theta()],
            freq=freq,
            n_jobs=1,
        )
        sf.fit(df_sf)
        forecast = sf.predict(h=horizonte, level=niveles)

        # Ensemble: media de modelos
        pred_cols = [c for c in forecast.columns if "mean" in c.lower() or c in ["AutoARIMA", "ETS", "Theta"]]
        if pred_cols:
            forecast["ensemble"] = forecast[pred_cols].mean(axis=1)
        else:
            forecast["ensemble"] = forecast.select_dtypes("number").mean(axis=1)

        proj_final = float(forecast["ensemble"].iloc[-1])
        proj_final = max(0.1, min(60.0, proj_final))

        # IC columns
        ic_cols_lo = [c for c in forecast.columns if "lo-" in c or "lo_" in c]
        ic_cols_hi = [c for c in forecast.columns if "hi-" in c or "hi_" in c]
        ic_inf = float(forecast[ic_cols_lo].mean(axis=1).iloc[-1]) if ic_cols_lo else proj_final - 2.0
        ic_sup = float(forecast[ic_cols_hi].mean(axis=1).iloc[-1]) if ic_cols_hi else proj_final + 2.0

        tendencia = _calcular_tendencia(ultima, proj_final)

        df_fc = pd.DataFrame({
            "fecha": forecast.get("ds", pd.date_range(start=pd.Timestamp.today(), periods=horizonte, freq=freq)),
            "valor": np.clip(forecast["ensemble"].values, 0, 60),
            "ic_inf": np.clip([ic_inf] * horizonte if not ic_cols_lo else forecast[ic_cols_lo].mean(axis=1).values, 0, 60),
            "ic_sup": np.clip([ic_sup] * horizonte if not ic_cols_hi else forecast[ic_cols_hi].mean(axis=1).values, 0, 60),
        })

        return {
            "partido": partido,
            "ultima_encuesta": ultima,
            "proyeccion": round(proj_final, 2),
            "ic_inf": round(max(0, ic_inf), 2),
            "ic_sup": round(min(60, ic_sup), 2),
            "tendencia": tendencia,
            "df_forecast": df_fc,
            "modelo": "statsforecast_ensemble",
        }
    except Exception:
        return _forecast_tendencia(serie, horizonte, freq, partido, ultima)


def _forecast_statsmodels(serie, horizonte, freq, nivel_confianza, partido, ultima) -> dict:
    """Fallback con statsmodels ExponentialSmoothing."""
    try:
        model = ExponentialSmoothing(
            serie.values,
            trend="add",
            damped_trend=True,
            initialization_method="estimated",
        ).fit(optimized=True)
        forecast_vals = model.forecast(horizonte)
        std = np.std(serie.values[-min(len(serie), 8):]) or 1.5
        z = 1.96 if nivel_confianza >= 95 else 1.28
        ic_inf = forecast_vals - z * std
        ic_sup = forecast_vals + z * std

        proj_final = float(np.clip(forecast_vals[-1], 0, 60))
        tendencia = _calcular_tendencia(ultima, proj_final)
        dates = pd.date_range(start=pd.Timestamp.today(), periods=horizonte, freq=freq)

        return {
            "partido": partido,
            "ultima_encuesta": ultima,
            "proyeccion": round(proj_final, 2),
            "ic_inf": round(float(np.clip(ic_inf[-1], 0, 60)), 2),
            "ic_sup": round(float(np.clip(ic_sup[-1], 0, 60)), 2),
            "tendencia": tendencia,
            "df_forecast": pd.DataFrame({
                "fecha": dates,
                "valor": np.clip(forecast_vals, 0, 60),
                "ic_inf": np.clip(ic_inf, 0, 60),
                "ic_sup": np.clip(ic_sup, 0, 60),
            }),
            "modelo": "exponential_smoothing",
        }
    except Exception:
        return _forecast_tendencia(serie, horizonte, freq, partido, ultima)


def _forecast_tendencia(serie, horizonte, freq, partido, ultima) -> dict:
    """Proyección lineal simple como último recurso."""
    n = len(serie)
    if n >= 2:
        x = np.arange(n)
        if _SCIPY_OK:
            slope, intercept, *_ = _scipy_stats.linregress(x, serie.values)
        else:
            slope = float(np.polyfit(x, serie.values, 1)[0])
            intercept = float(serie.mean()) - slope * float(np.mean(x))

        future_x = np.arange(n, n + horizonte)
        vals = np.clip(slope * future_x + intercept, 0, 60)
        std = float(np.std(serie.values)) or 1.5
    else:
        vals = np.full(horizonte, ultima)
        std = 2.0

    dates = pd.date_range(start=pd.Timestamp.today(), periods=horizonte, freq=freq)
    proj_final = float(vals[-1])
    tendencia = _calcular_tendencia(ultima, proj_final)

    return {
        "partido": partido,
        "ultima_encuesta": ultima,
        "proyeccion": round(proj_final, 2),
        "ic_inf": round(float(np.clip(proj_final - 1.96 * std, 0, 60)), 2),
        "ic_sup": round(float(np.clip(proj_final + 1.96 * std, 0, 60)), 2),
        "tendencia": tendencia,
        "df_forecast": pd.DataFrame({
            "fecha": dates,
            "valor": vals,
            "ic_inf": np.clip(vals - 1.96 * std, 0, 60),
            "ic_sup": np.clip(vals + 1.96 * std, 0, 60),
        }),
        "modelo": "tendencia_lineal",
    }


def _forecast_fallback(partido, val, horizonte, freq) -> dict:
    dates = pd.date_range(start=pd.Timestamp.today(), periods=horizonte, freq=freq)
    return {
        "partido": partido,
        "ultima_encuesta": val,
        "proyeccion": val,
        "ic_inf": max(0, val - 3.0),
        "ic_sup": min(60, val + 3.0),
        "tendencia": "estable",
        "df_forecast": pd.DataFrame({
            "fecha": dates,
            "valor": [val] * horizonte,
            "ic_inf": [max(0, val - 3.0)] * horizonte,
            "ic_sup": [min(60, val + 3.0)] * horizonte,
        }),
        "modelo": "fallback",
    }


def _calcular_tendencia(ultima: float, proyeccion: float) -> str:
    diff = proyeccion - ultima
    if diff > 1.0:
        return "sube"
    elif diff < -1.0:
        return "baja"
    return "estable"


# ─── Multi-party projection ───────────────────────────────────────────────────

def proyectar_todos(
    df: pd.DataFrame,
    col_fecha: str = "fecha",
    horizonte: int = 8,
    freq: str = "W",
) -> dict[str, dict]:
    """
    Proyecta intención de voto para todos los partidos en el DataFrame.

    Parameters
    ----------
    df : DataFrame con columnas [fecha, PP, PSOE, VOX, ...] o similar
    col_fecha : nombre de la columna de fecha
    horizonte : semanas a proyectar

    Returns
    -------
    {partido: resultado_proyectar_partido}
    """
    if df.empty:
        return {}

    # Ordenar por fecha
    if col_fecha in df.columns:
        df = df.sort_values(col_fecha).reset_index(drop=True)
        idx = pd.to_datetime(df[col_fecha]) if col_fecha in df.columns else df.index
    else:
        idx = pd.RangeIndex(len(df))

    partidos_cols = [c for c in df.columns if c != col_fecha and df[c].dtype in ["float64", "float32", "int64"]]
    resultados = {}

    for col in partidos_cols:
        serie = pd.Series(df[col].values, index=idx, name=col).dropna()
        if len(serie) >= 2:
            resultados[col] = proyectar_partido(serie, horizonte=horizonte, freq=freq, partido=col)

    return resultados


def calcular_intervalos_confianza(
    valores_historicos: list[float],
    proyeccion_central: float,
    nivel: float = 0.95,
) -> tuple[float, float]:
    """
    Calcula IC bayesianos simples basados en volatilidad histórica.
    Inspirado en us-potus-model.
    """
    if len(valores_historicos) < 2:
        return (max(0, proyeccion_central - 3.0), min(60, proyeccion_central + 3.0))

    std = float(np.std(valores_historicos))
    z = 1.96 if nivel >= 0.95 else 1.28
    return (
        round(max(0, proyeccion_central - z * std), 2),
        round(min(60, proyeccion_central + z * std), 2),
    )


def tendencia_reciente(serie: pd.Series, ventana: int = 4) -> dict:
    """
    Calcula la tendencia de las últimas `ventana` observaciones.
    Returns {direccion, magnitud, puntos_base, descripcion}
    """
    if len(serie) < 2:
        return {"direccion": "—", "magnitud": 0.0, "puntos_base": 0, "descripcion": "Sin datos"}

    reciente = serie.dropna().tail(ventana)
    if len(reciente) < 2:
        return {"direccion": "—", "magnitud": 0.0, "puntos_base": 0, "descripcion": "Pocos datos"}

    cambio = float(reciente.iloc[-1]) - float(reciente.iloc[0])
    puntos_base = round(cambio * 100) / 100

    if cambio > 1.5:
        dir_ = "↑"
        desc = f"+{puntos_base:.1f}pp (tendencia alcista)"
    elif cambio < -1.5:
        dir_ = "↓"
        desc = f"{puntos_base:.1f}pp (tendencia bajista)"
    else:
        dir_ = "→"
        desc = f"{puntos_base:+.1f}pp (estable)"

    return {
        "direccion": dir_,
        "magnitud": abs(cambio),
        "puntos_base": puntos_base,
        "descripcion": desc,
    }


def disponible() -> dict[str, bool]:
    return {
        "statsforecast": _STATSFORECAST_OK,
        "statsmodels": _STATSMODELS_OK,
        "scipy": _SCIPY_OK,
    }
