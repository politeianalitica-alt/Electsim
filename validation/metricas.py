"""
Métricas de evaluación para modelos de predicción electoral.

Incluye: Brier Score, RMSE, MAE, CRPS, cobertura de intervalos
de confianza y curvas de calibración.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np
import numpy.typing as npt

log = logging.getLogger(__name__)


@dataclass
class ResultadoMetricas:
    brier_score: float
    rmse: float
    mae: float
    crps: float
    cobertura_95ci: float
    calibracion: list[dict]  # [{bin_centro, fraccion_real, fraccion_pred, n}]
    n_obs: int
    notas: list[str] = field(default_factory=list)


def brier_score(probas: npt.ArrayLike, outcomes: npt.ArrayLike) -> float:
    """Brier Score multiclase (regla de puntuación propia).

    Args:
        probas: array (n_elecciones, n_partidos) con probabilidades predichas de voto share.
        outcomes: array (n_elecciones, n_partidos) con fracciones reales de voto.

    Returns:
        BS en [0, 2]; menor es mejor.
    """
    p = np.asarray(probas, dtype=float)
    o = np.asarray(outcomes, dtype=float)
    # Normalizar por si no suman 1
    p = p / p.sum(axis=-1, keepdims=True).clip(min=1e-9)
    o = o / o.sum(axis=-1, keepdims=True).clip(min=1e-9)
    return float(np.mean(np.sum((p - o) ** 2, axis=-1)))


def rmse(predicho: npt.ArrayLike, real: npt.ArrayLike) -> float:
    p = np.asarray(predicho, dtype=float).ravel()
    r = np.asarray(real, dtype=float).ravel()
    return float(np.sqrt(np.mean((p - r) ** 2)))


def mae(predicho: npt.ArrayLike, real: npt.ArrayLike) -> float:
    p = np.asarray(predicho, dtype=float).ravel()
    r = np.asarray(real, dtype=float).ravel()
    return float(np.mean(np.abs(p - r)))


def crps_gaussiano(media: npt.ArrayLike, sigma: npt.ArrayLike, real: npt.ArrayLike) -> float:
    """CRPS asumiendo distribución predictiva gaussiana.

    CRPS(N(μ,σ), y) = σ·[z·(2Φ(z)−1) + 2φ(z) − 1/√π]  donde z=(y−μ)/σ
    """
    from scipy.stats import norm

    mu = np.asarray(media, dtype=float).ravel()
    s = np.asarray(sigma, dtype=float).ravel().clip(min=1e-9)
    y = np.asarray(real, dtype=float).ravel()
    z = (y - mu) / s
    score = s * (z * (2 * norm.cdf(z) - 1) + 2 * norm.pdf(z) - 1 / np.sqrt(np.pi))
    return float(np.mean(score))


def cobertura_intervalo(
    inferior: npt.ArrayLike,
    superior: npt.ArrayLike,
    real: npt.ArrayLike,
) -> float:
    """Fracción de valores reales dentro del intervalo predicho (debería ser ≈nivel del IC)."""
    lo = np.asarray(inferior, dtype=float).ravel()
    hi = np.asarray(superior, dtype=float).ravel()
    y = np.asarray(real, dtype=float).ravel()
    return float(np.mean((y >= lo) & (y <= hi)))


def curva_calibracion(
    probas: npt.ArrayLike,
    outcomes: npt.ArrayLike,
    n_bins: int = 10,
) -> list[dict]:
    """Reliability diagram: bins de probabilidad vs fracción real.

    Para variables continuas (voto share) se binea la predicción y se mide la media real.
    """
    p = np.asarray(probas, dtype=float).ravel()
    o = np.asarray(outcomes, dtype=float).ravel()
    bins = np.linspace(0, 1, n_bins + 1)
    resultado = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (p >= lo) & (p < hi)
        n = int(mask.sum())
        if n == 0:
            continue
        resultado.append(
            {
                "bin_centro": round(float((lo + hi) / 2), 3),
                "fraccion_pred": round(float(p[mask].mean()), 4),
                "fraccion_real": round(float(o[mask].mean()), 4),
                "n": n,
            }
        )
    return resultado


def calcular_metricas_completas(
    probas_predichas: npt.ArrayLike,
    fracciones_reales: npt.ArrayLike,
    sigma: npt.ArrayLike | None = None,
    inferior_95: npt.ArrayLike | None = None,
    superior_95: npt.ArrayLike | None = None,
) -> ResultadoMetricas:
    """Calcula el conjunto completo de métricas para un modelo.

    Args:
        probas_predichas: (n, k) fracciones de voto predichas por partido.
        fracciones_reales: (n, k) fracciones reales de voto.
        sigma: (n, k) desviaciones estándar de la predicción (para CRPS).
        inferior_95 / superior_95: límites del IC 95% (para cobertura).
    """
    p = np.asarray(probas_predichas, dtype=float)
    r = np.asarray(fracciones_reales, dtype=float)

    bs = brier_score(p, r)
    err_rmse = rmse(p, r)
    err_mae = mae(p, r)

    if sigma is not None:
        crps_val = crps_gaussiano(p.ravel(), np.asarray(sigma).ravel(), r.ravel())
    else:
        # Aproximación con RMSE como proxy de sigma
        crps_val = err_rmse * np.sqrt(2 / np.pi)

    cobertura = 0.0
    if inferior_95 is not None and superior_95 is not None:
        cobertura = cobertura_intervalo(inferior_95, superior_95, r)

    calib = curva_calibracion(p.ravel(), r.ravel())

    notas: list[str] = []
    if bs > 0.15:
        notas.append("Brier Score elevado: modelo con poca discriminación")
    if cobertura < 0.85:
        notas.append("Cobertura del IC 95% por debajo de 85%: intervalos demasiado estrechos")
    if abs(err_rmse - err_mae) / max(err_mae, 1e-9) > 0.5:
        notas.append("Diferencia RMSE-MAE elevada: posibles outliers en predicciones")

    return ResultadoMetricas(
        brier_score=round(bs, 6),
        rmse=round(err_rmse, 4),
        mae=round(err_mae, 4),
        crps=round(crps_val, 6),
        cobertura_95ci=round(cobertura, 3),
        calibracion=calib,
        n_obs=int(r.shape[0]),
        notas=notas,
    )


def comparar_modelos(modelos: dict[str, ResultadoMetricas]) -> list[dict]:
    """Tabla comparativa de modelos ordenada por Brier Score."""
    filas = []
    for nombre, m in modelos.items():
        filas.append(
            {
                "modelo": nombre,
                "brier_score": m.brier_score,
                "rmse": m.rmse,
                "mae": m.mae,
                "crps": m.crps,
                "cobertura_95ci": m.cobertura_95ci,
                "n_obs": m.n_obs,
            }
        )
    return sorted(filas, key=lambda x: x["brier_score"])
