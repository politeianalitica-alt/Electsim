"""Trend Detection — Detección de tendencias, momentum y rupturas."""

from __future__ import annotations

from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict


class TrendSignal(BaseModel):
    """Señal de tendencia detectada."""

    model_config = ConfigDict(extra="forbid")

    variable: str
    direction: str
    strength: float
    period_days: int
    start_value: float
    current_value: float
    change_pct: float
    description: str


def detect_trend(
    values: list[float], dates: list[str] | None = None, variable: str = "serie"
) -> TrendSignal:
    """Análisis de pendiente por regresión lineal."""

    n = len(values)
    if n < 2:
        return TrendSignal(
            variable=variable,
            direction="flat",
            strength=0.0,
            period_days=n,
            start_value=float(values[0]) if values else 0.0,
            current_value=float(values[-1]) if values else 0.0,
            change_pct=0.0,
            description="Datos insuficientes para detectar tendencia.",
        )

    arr = np.asarray(values, dtype=float)
    x = np.arange(n)
    slope, intercept = np.polyfit(x, arr, 1)
    fitted = slope * x + intercept
    ss_res = float(np.sum((arr - fitted) ** 2))
    ss_tot = float(np.sum((arr - np.mean(arr)) ** 2)) or 1e-9
    r2 = max(0.0, min(1.0, 1 - ss_res / ss_tot))

    start = float(arr[0])
    current = float(arr[-1])
    if start != 0:
        change_pct = (current - start) / abs(start) * 100
    elif current != 0:
        change_pct = 100.0 if current > 0 else -100.0
    else:
        change_pct = 0.0

    # Detectar dirección: comparar slope con magnitud típica
    std_global = float(np.std(arr))
    direction = "flat"
    flat_threshold = max(1e-9, std_global * 0.05)
    if abs(slope) < flat_threshold:
        direction = "flat"
    elif slope > 0:
        direction = "up"
    else:
        direction = "down"

    # Reversal: si los últimos 25% van en sentido opuesto al global
    if n >= 8:
        tail = arr[-max(2, n // 4) :]
        tail_slope = np.polyfit(np.arange(len(tail)), tail, 1)[0]
        if slope * tail_slope < 0 and abs(tail_slope) > abs(slope) * 0.5:
            direction = "reversal"

    desc = (
        f"Tendencia {direction} en {variable}: cambio de {start:.2f} a {current:.2f} "
        f"({change_pct:+.2f}%). R²={r2:.3f}."
    )

    return TrendSignal(
        variable=variable,
        direction=direction,
        strength=round(r2, 4),
        period_days=n,
        start_value=round(start, 4),
        current_value=round(current, 4),
        change_pct=round(change_pct, 4),
        description=desc,
    )


def detect_reversals(values: list[float], window: int = 7) -> list[int]:
    """Índices donde la pendiente cambia de signo."""

    if len(values) < window * 2:
        return []
    arr = np.asarray(values, dtype=float)
    reversals: list[int] = []
    for i in range(window, len(arr) - window):
        before = arr[i - window : i]
        after = arr[i : i + window]
        s_before = np.polyfit(np.arange(window), before, 1)[0]
        s_after = np.polyfit(np.arange(window), after, 1)[0]
        if s_before * s_after < 0 and abs(s_before - s_after) > np.std(arr) * 0.1:
            reversals.append(i)
    return reversals


def rank_emerging_topics(
    topic_counts_over_time: dict[str, list[int]], min_growth: float = 0.5
) -> list[dict[str, Any]]:
    """Topics con crecimiento por encima de min_growth (última semana vs anterior)."""

    emerging: list[dict[str, Any]] = []
    for topic, counts in topic_counts_over_time.items():
        if len(counts) < 14:
            continue
        last_week = sum(counts[-7:])
        prev_week = sum(counts[-14:-7])
        if prev_week == 0:
            growth = float(last_week) if last_week > 0 else 0.0
        else:
            growth = (last_week - prev_week) / prev_week
        if growth >= min_growth:
            emerging.append(
                {
                    "topic": topic,
                    "growth_rate": round(growth, 4),
                    "last_week_count": last_week,
                    "prev_week_count": prev_week,
                }
            )
    emerging.sort(key=lambda x: x["growth_rate"], reverse=True)
    return emerging


def find_breakouts(
    values: list[float], lookback: int = 30, threshold_std: float = 2.0
) -> list[int]:
    """Índices donde el valor excede media ± threshold_std."""

    if len(values) < lookback:
        return []
    arr = np.asarray(values, dtype=float)
    breakouts: list[int] = []
    for i in range(lookback, len(arr)):
        window = arr[i - lookback : i]
        mean = float(np.mean(window))
        std = float(np.std(window))
        if std == 0:
            # Sin variación previa: cualquier desviación es un breakout
            if arr[i] != mean:
                breakouts.append(i)
            continue
        if abs(arr[i] - mean) > threshold_std * std:
            breakouts.append(i)
    return breakouts


def compute_acceleration(values: list[float]) -> float:
    """Promedio de la segunda derivada."""

    if len(values) < 3:
        return 0.0
    arr = np.asarray(values, dtype=float)
    second_diff = np.diff(arr, n=2)
    return float(round(np.mean(second_diff), 6))
