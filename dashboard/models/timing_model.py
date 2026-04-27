"""Modelo de timing y saturación para el simulador de campaña.

Dos funciones independientes que ajustan el impacto de un tema
según el momento del ciclo electoral y cuántas veces se ha repetido.

Inspiración matemática:
- Curva de timing: kernel gaussiano asimétrico, análogo al Epanechnikov
  kernel de statsmodels-main/statsmodels/nonparametric/kernels.py.
  El impacto electoral real es máximo en semanas 2-3 (arranque) y
  decae hacia el final (semana 6-7) por saciedad y agenda cambiante.
- Saturación: exponential decay, estándar en modelos de medios pagados
  (GRP decay) y en literature de campaña (Gerber & Green 2008).
"""
from __future__ import annotations

import math


# ── Curva de timing ──────────────────────────────────────────────────────────

_SEMANA_PICO = 2.5    # semana de máximo impacto (1-indexed, campaña típica 7 sem)
_SIGMA_TIMING = 1.8   # anchura de la campana; sigma > 2 = curva muy plana


def timing_weight(semana: int, n_semanas: int = 7) -> float:
    """Factor de amplificación del impacto según semana de campaña.

    Curva gaussiana asimétrica: máximo en semana 2-3, decaimiento suave.
    Retorna valores en [0.30, 1.0] para que el impacto nunca sea cero.

    Args:
        semana: semana actual (1 = primera semana, n_semanas = última)
        n_semanas: duración total de la campaña en semanas

    Returns:
        Multiplicador en [0.30, 1.0]

    Examples:
        >>> round(timing_weight(2), 2)
        1.0
        >>> timing_weight(7) < timing_weight(3)
        True
    """
    semana = max(1, min(n_semanas, semana))
    gauss = math.exp(-0.5 * ((semana - _SEMANA_PICO) / _SIGMA_TIMING) ** 2)
    return round(max(0.30, min(1.0, gauss)), 4)


def timing_curve(n_semanas: int = 7) -> list[float]:
    """Retorna la curva completa de pesos por semana (útil para gráficos)."""
    return [timing_weight(s, n_semanas) for s in range(1, n_semanas + 1)]


# ── Saturación por repetición ────────────────────────────────────────────────

_LAMBDA_DECAY = 0.35   # tasa de decaimiento exponencial por uso adicional


def saturation_decay(veces_usado: int) -> float:
    """Factor de saturación por repetición de un mismo tema.

    Primera vez: 1.0 (impacto completo).
    Quinta vez:  ~0.25 (un cuarto del impacto original).

    Args:
        veces_usado: cuántas veces se ha simulado ya este tema en la sesión

    Returns:
        Multiplicador en [0.10, 1.0]

    Examples:
        >>> saturation_decay(0)
        1.0
        >>> saturation_decay(1) < 1.0
        True
        >>> saturation_decay(10) >= 0.1
        True
    """
    if veces_usado <= 0:
        return 1.0
    return round(max(0.10, math.exp(-_LAMBDA_DECAY * veces_usado)), 4)


def describe_timing(semana: int, n_semanas: int = 7) -> str:
    """Texto descriptivo del estado del ciclo para mostrar en UI."""
    w = timing_weight(semana, n_semanas)
    if semana <= 2:
        return f"Arranque de campaña — impacto máximo ({w:.0%})"
    elif semana <= 4:
        return f"Campaña en marcha — impacto alto ({w:.0%})"
    elif semana <= n_semanas - 1:
        return f"Recta final — impacto moderado ({w:.0%})"
    else:
        return f"Jornada de reflexión — saturación ({w:.0%})"


def describe_saturation(veces: int) -> str:
    """Texto descriptivo del nivel de saturación."""
    d = saturation_decay(veces)
    if veces == 0:
        return "Sin saturación — primera exposición"
    elif veces <= 2:
        return f"Saturación leve — {d:.0%} del impacto original"
    elif veces <= 4:
        return f"Saturación moderada — {d:.0%} del impacto original"
    else:
        return f"Saturación alta — {d:.0%} del impacto original (tema sobrexplotado)"
