"""
Forecast Layer · capa transversal de pronóstico para todo el dashboard.

Filosofía: cualquier serie temporal del sistema (intención de voto, alcance
mediático, share of voice, sentimiento, riesgos, ratings, KPIs económicos)
puede pasarse aquí y obtener:

  1. Baseline estadístico (regresión lineal robusta + ventanas móviles).
  2. Pronóstico cuantitativo a N días (con bandas de confianza simples).
  3. Lectura razonada por el brain (drivers plausibles, watch list, riesgos).

Sin dependencias pesadas: usa numpy/pandas si están, fallback puro stdlib
si no. NUNCA importa statsmodels/sklearn — para no hinchar el dashboard.

API principal:
  · forecast_serie(df, fecha_col, valor_col, horizonte_dias, eventos)
  · tendencia_corta(df, valor_col, ventana)
  · detectar_outliers(df, valor_col, z=2.5)
  · escenario_para_serie(df, etiqueta, eventos_recientes)
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Resultado estándar
# ─────────────────────────────────────────────────────────────────

@dataclass
class ForecastResult:
    """Pronóstico cuantitativo + lectura razonada."""
    ok: bool = False
    error: str | None = None

    # Cuantitativo
    last_value: float | None = None
    last_date: str | None = None
    trend_slope: float | None = None           # cambio por día (unidades de la serie)
    trend_strength: str = "ninguna"            # ninguna | leve | moderada | fuerte
    trend_direction: str = "lateral"           # ascendente | descendente | lateral
    forecast_horizon_days: int = 0
    forecast_points: list[dict[str, Any]] = field(default_factory=list)   # [{date, value, lo, hi}]
    forecast_endpoint: float | None = None
    forecast_change_pct: float | None = None   # delta % entre último observado y endpoint
    volatility: float | None = None
    outliers: list[dict[str, Any]] = field(default_factory=list)
    last_n: int = 0

    # Cualitativo
    brain_reading: dict[str, Any] | None = None  # output de brain.interpret_nowcasting / similar
    scenarios: dict[str, Any] | None = None      # output de brain.forecast_political_scenario

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "error": self.error,
            "last_value": self.last_value,
            "last_date": self.last_date,
            "trend_slope": self.trend_slope,
            "trend_strength": self.trend_strength,
            "trend_direction": self.trend_direction,
            "forecast_horizon_days": self.forecast_horizon_days,
            "forecast_points": self.forecast_points,
            "forecast_endpoint": self.forecast_endpoint,
            "forecast_change_pct": self.forecast_change_pct,
            "volatility": self.volatility,
            "outliers": self.outliers,
            "last_n": self.last_n,
            "brain_reading": self.brain_reading,
            "scenarios": self.scenarios,
        }


# ─────────────────────────────────────────────────────────────────
# Helpers numéricos (mínima dependencia)
# ─────────────────────────────────────────────────────────────────

def _linear_regression(x: list[float], y: list[float]) -> tuple[float, float, float]:
    """Regresión lineal mínima cuadrados. Devuelve (slope, intercept, r2)."""
    n = len(x)
    if n < 2:
        return 0.0, (y[-1] if y else 0.0), 0.0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den = sum((xi - mean_x) ** 2 for xi in x)
    slope = num / den if den != 0 else 0.0
    intercept = mean_y - slope * mean_x
    # R^2
    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    if ss_tot == 0:
        r2 = 1.0
    else:
        ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
        r2 = 1.0 - (ss_res / ss_tot)
    return slope, intercept, max(0.0, min(1.0, r2))


def _stddev(values: list[float]) -> float:
    if not values:
        return 0.0
    n = len(values)
    if n < 2:
        return 0.0
    m = sum(values) / n
    var = sum((v - m) ** 2 for v in values) / (n - 1)
    return math.sqrt(var)


def _classify_trend(slope: float, recent_value: float, r2: float) -> tuple[str, str]:
    """Etiqueta verbal de la tendencia."""
    if recent_value == 0:
        rel = abs(slope)
    else:
        rel = abs(slope) / abs(recent_value) if recent_value else abs(slope)
    if rel < 0.001 or r2 < 0.05:
        return "lateral", "ninguna"
    direccion = "ascendente" if slope > 0 else "descendente"
    if rel < 0.005:
        fuerza = "leve"
    elif rel < 0.02:
        fuerza = "moderada"
    else:
        fuerza = "fuerte"
    return direccion, fuerza


# ─────────────────────────────────────────────────────────────────
# Forecast principal
# ─────────────────────────────────────────────────────────────────

def forecast_serie(
    df,
    *,
    fecha_col: str,
    valor_col: str,
    horizonte_dias: int = 14,
    etiqueta: str = "serie",
    eventos_recientes: list[str] | None = None,
    pedir_brain: bool = True,
    pedir_escenarios: bool = False,
) -> ForecastResult:
    """Pronóstico cuantitativo + lectura del brain de una serie temporal.

    Soporta cualquier DataFrame pandas con dos columnas (fecha y valor).
    Si el brain no está disponible, devuelve sólo la parte cuantitativa.
    """
    result = ForecastResult(forecast_horizon_days=int(horizonte_dias))
    try:
        import pandas as pd
    except ImportError:
        result.error = "pandas no disponible"
        return result

    if df is None or len(df) == 0:
        result.error = "serie vacía"
        return result

    try:
        d = df[[fecha_col, valor_col]].dropna().copy()
        d[fecha_col] = pd.to_datetime(d[fecha_col], errors="coerce")
        d = d.dropna(subset=[fecha_col]).sort_values(fecha_col)
        d[valor_col] = pd.to_numeric(d[valor_col], errors="coerce")
        d = d.dropna(subset=[valor_col]).reset_index(drop=True)
    except Exception as exc:
        result.error = f"preparación serie falló: {exc}"
        return result

    if len(d) < 3:
        result.error = "serie con menos de 3 puntos"
        return result

    # Convertir fechas a ordinal para regresión
    fechas = d[fecha_col].tolist()
    valores = [float(v) for v in d[valor_col].tolist()]
    x = [(f - fechas[0]).days for f in fechas]

    slope, intercept, r2 = _linear_regression([float(v) for v in x], valores)
    vol = _stddev(valores)
    last_value = valores[-1]
    last_date = fechas[-1]

    direccion, fuerza = _classify_trend(slope, last_value, r2)

    # Pronóstico día a día
    last_x = x[-1]
    horizon = max(1, int(horizonte_dias))
    points: list[dict[str, Any]] = []
    band = max(vol * 0.8, abs(last_value) * 0.05, 0.5)  # banda generosa
    for k in range(1, horizon + 1):
        xi = last_x + k
        yi = slope * xi + intercept
        date_k = last_date + timedelta(days=k)
        points.append({
            "date": date_k.strftime("%Y-%m-%d"),
            "value": round(float(yi), 4),
            "lo": round(float(yi - band), 4),
            "hi": round(float(yi + band), 4),
        })
    endpoint = points[-1]["value"] if points else last_value
    change_pct = None
    if last_value != 0:
        change_pct = round(((endpoint - last_value) / abs(last_value)) * 100.0, 2)

    # Outliers (|z| > 2.5)
    outs: list[dict[str, Any]] = []
    if vol > 0:
        mean_v = sum(valores) / len(valores)
        for f, v in zip(fechas, valores):
            z = (v - mean_v) / vol
            if abs(z) > 2.5:
                outs.append({"date": f.strftime("%Y-%m-%d"), "value": float(v), "z": round(z, 2)})

    result.ok = True
    result.last_value = float(last_value)
    result.last_date = last_date.strftime("%Y-%m-%d")
    result.trend_slope = float(slope)
    result.trend_strength = fuerza
    result.trend_direction = direccion
    result.forecast_points = points
    result.forecast_endpoint = float(endpoint)
    result.forecast_change_pct = change_pct
    result.volatility = float(vol)
    result.outliers = outs[:10]
    result.last_n = len(valores)

    # Lectura del brain
    if pedir_brain:
        try:
            from dashboard.services.brain_enrichment import explicar_serie_temporal
            payload = {
                "etiqueta": etiqueta,
                "ultimo_valor": result.last_value,
                "ultima_fecha": result.last_date,
                "tendencia": {"slope": slope, "direccion": direccion, "fuerza": fuerza, "r2": r2},
                "volatilidad": vol,
                "horizonte_dias": horizon,
                "pronostico_endpoint": endpoint,
                "delta_pct_endpoint": change_pct,
                "outliers": outs[:5],
                "ultimos_puntos": [
                    {"date": f.strftime("%Y-%m-%d"), "value": v}
                    for f, v in list(zip(fechas, valores))[-10:]
                ],
            }
            result.brain_reading = explicar_serie_temporal(
                payload,
                etiqueta=etiqueta,
                ventana=f"{result.last_n} observaciones",
                eventos_recientes=eventos_recientes or [],
            )
        except Exception as exc:
            logger.warning("brain reading falló: %s", exc)

    if pedir_escenarios:
        try:
            from dashboard.services.brain_enrichment import escenario_rapido
            situacion = (
                f"Serie '{etiqueta}' con {result.last_n} obs. Último valor {result.last_value:.3f} "
                f"({result.last_date}). Tendencia {direccion} {fuerza}. "
                f"Proyección a {horizon} días: {endpoint:.3f} ({change_pct}%)."
            )
            result.scenarios = escenario_rapido(
                tema=etiqueta,
                situacion=situacion,
                horizonte=f"{horizon} días",
            )
        except Exception as exc:
            logger.warning("escenarios fallaron: %s", exc)

    return result


# ─────────────────────────────────────────────────────────────────
# Funciones complementarias
# ─────────────────────────────────────────────────────────────────

def tendencia_corta(
    df,
    *,
    valor_col: str,
    ventana: int = 7,
) -> dict[str, Any]:
    """Resumen rápido de la última ventana sin pronóstico."""
    try:
        import pandas as pd  # noqa: F401
    except ImportError:
        return {"ok": False, "error": "pandas no disponible"}
    if df is None or len(df) == 0:
        return {"ok": False, "error": "vacío"}
    try:
        vals = [float(v) for v in df[valor_col].dropna().tail(int(ventana)).tolist()]
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
    if len(vals) < 2:
        return {"ok": False, "error": "menos de 2 puntos"}
    slope, _, r2 = _linear_regression(list(range(len(vals))), vals)
    direccion, fuerza = _classify_trend(slope, vals[-1], r2)
    return {
        "ok": True,
        "ventana": int(ventana),
        "min": min(vals),
        "max": max(vals),
        "mean": sum(vals) / len(vals),
        "last": vals[-1],
        "slope": slope,
        "direccion": direccion,
        "fuerza": fuerza,
        "r2": r2,
    }


def detectar_outliers(
    df,
    *,
    valor_col: str,
    fecha_col: str | None = None,
    z: float = 2.5,
) -> list[dict[str, Any]]:
    """Lista outliers de la serie por z-score."""
    try:
        import pandas as pd  # noqa: F401
    except ImportError:
        return []
    if df is None or len(df) == 0:
        return []
    try:
        vals = [float(v) for v in df[valor_col].dropna().tolist()]
    except Exception:
        return []
    if len(vals) < 5:
        return []
    sd = _stddev(vals)
    if sd <= 0:
        return []
    m = sum(vals) / len(vals)
    out = []
    fechas = (
        df[fecha_col].astype(str).tolist()[:len(vals)]
        if fecha_col and fecha_col in getattr(df, "columns", [])
        else [str(i) for i in range(len(vals))]
    )
    for i, v in enumerate(vals):
        zi = (v - m) / sd
        if abs(zi) > z:
            out.append({"idx": i, "fecha": fechas[i] if i < len(fechas) else "",
                        "valor": v, "z": round(zi, 2)})
    return out[:20]


def escenario_para_serie(
    df,
    *,
    valor_col: str,
    fecha_col: str,
    etiqueta: str,
    eventos_recientes: list[str] | None = None,
) -> dict[str, Any]:
    """Atajo: pronóstico + escenarios para una serie temporal."""
    res = forecast_serie(
        df,
        fecha_col=fecha_col,
        valor_col=valor_col,
        etiqueta=etiqueta,
        eventos_recientes=eventos_recientes,
        pedir_brain=True,
        pedir_escenarios=True,
    )
    return res.to_dict()
