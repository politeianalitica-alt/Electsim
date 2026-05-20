"""Backoff adaptativo de cooldown según volatilidad histórica.

Problema: un cooldown fijo de 60min no se adapta bien:
  - Commodity tranquila (oro, bonos) · 60min sobra · podríamos darle 240min
  - Commodity volátil (gas TTF, cocoa) · 60min es lento · 20min es razonable

Solución: ajustar cooldown_minutes según stdev de returns 30d del commodity.

Algoritmo:
  1. Calcular σ_returns = stdev de returns diarios últimos 30d
  2. Categorizar:
     - σ ≤ 0.5%  → very_low    × 4.0  (commodities muy estables)
     - σ ≤ 1.5%  → low         × 2.0
     - σ ≤ 3.0%  → medium      × 1.0  (sin ajuste)
     - σ ≤ 5.0%  → high        × 0.5
     - σ >  5.0% → very_high   × 0.33 (gas TTF en crisis, cocoa en supply shock)
  3. min cooldown = 5 min · max cooldown = 24h (clamp final)
  4. Cache por slug (5 min TTL) para evitar recálculo en cada eval

Para alertas multi-slug (regla compuesta), tomamos la volatilidad del slug
con MAYOR sigma (más conservador, evita spam del componente volátil).

Falla cerrado: si no hay histórico, devuelve cooldown_base sin ajustar.
"""
from __future__ import annotations

import logging
import math
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


# Tabla de multiplicadores · σ% diaria → factor de ajuste sobre base
VOLATILITY_BUCKETS: list[tuple[float, float, str]] = [
    (0.5, 4.0, "very_low"),
    (1.5, 2.0, "low"),
    (3.0, 1.0, "medium"),
    (5.0, 0.5, "high"),
    (float("inf"), 0.33, "very_high"),
]

MIN_COOLDOWN_MIN = 5
MAX_COOLDOWN_MIN = 24 * 60  # 24h

_VOL_CACHE: dict[str, tuple[float, float]] = {}  # slug → (sigma_pct, expires_unix)
_VOL_TTL_SECS = 300  # 5 min
_VOL_LOCK = threading.RLock()


def _now() -> float:
    return time.time()


def compute_volatility(slug: str) -> float | None:
    """Calcula σ% diaria de returns sobre 30d históricos. Cacheado 5min.

    Returns:
      sigma porcentual (ej. 2.5 = 2.5%) o None si no hay histórico suficiente.
    """
    if not slug:
        return None
    key = slug.lower()
    now = _now()
    with _VOL_LOCK:
        entry = _VOL_CACHE.get(key)
    if entry and entry[1] > now:
        return entry[0]

    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
    except Exception:
        return None

    c = get_commodity(key)
    if not c or not c.get("yahoo_ticker"):
        return None

    try:
        data = get_yahoo_client().chart(c["yahoo_ticker"], range="3mo", interval="1d")
        closes = [
            p["close"] for p in (data.get("ohlc") or [])
            if p.get("close") is not None
        ]
        if len(closes) < 21:
            return None
        # Últimos 30 returns diarios (closes[-31:] da 30 deltas)
        recent = closes[-31:]
        returns = [
            (recent[i] - recent[i - 1]) / recent[i - 1] * 100
            for i in range(1, len(recent))
            if recent[i - 1] > 0
        ]
        if len(returns) < 10:
            return None
        mean_r = sum(returns) / len(returns)
        var = sum((r - mean_r) ** 2 for r in returns) / (len(returns) - 1)
        sigma = math.sqrt(var)
    except Exception as exc:
        logger.debug("compute_volatility · %s · %s", key, exc)
        return None

    with _VOL_LOCK:
        _VOL_CACHE[key] = (sigma, now + _VOL_TTL_SECS)
    return sigma


def bucket_for_sigma(sigma_pct: float) -> tuple[float, str]:
    """Devuelve (multiplicador, etiqueta) para un sigma % dado."""
    for upper, mult, label in VOLATILITY_BUCKETS:
        if sigma_pct <= upper:
            return mult, label
    return 0.33, "very_high"


def compute_adaptive_cooldown(
    slugs: list[str] | str,
    *,
    base_minutes: int = 60,
) -> dict[str, Any]:
    """Calcula cooldown ajustado por volatilidad.

    Args:
      slugs: un slug str o lista (para reglas multi-slug usa el MÁS volátil).
      base_minutes: cooldown configurado por el usuario.

    Returns:
      {
        "base_minutes": int,
        "adjusted_minutes": int,
        "multiplier": float,
        "bucket": str,
        "sigma_pct": float | None,
        "slug_used": str | None,
        "fell_back": bool,  # True si no hubo histórico y se usó base
      }
    """
    if isinstance(slugs, str):
        slugs = [slugs]
    if not slugs:
        return {
            "base_minutes": base_minutes,
            "adjusted_minutes": base_minutes,
            "multiplier": 1.0,
            "bucket": "no_slug",
            "sigma_pct": None,
            "slug_used": None,
            "fell_back": True,
        }

    # Calcular vol por slug · tomar el de mayor σ (más conservador para spam)
    pairs: list[tuple[str, float]] = []
    for s in slugs:
        sigma = compute_volatility(s)
        if sigma is not None:
            pairs.append((s, sigma))

    if not pairs:
        return {
            "base_minutes": base_minutes,
            "adjusted_minutes": base_minutes,
            "multiplier": 1.0,
            "bucket": "unknown",
            "sigma_pct": None,
            "slug_used": None,
            "fell_back": True,
        }

    slug_used, sigma = max(pairs, key=lambda p: p[1])
    multiplier, bucket = bucket_for_sigma(sigma)
    adjusted = max(MIN_COOLDOWN_MIN, min(MAX_COOLDOWN_MIN, int(base_minutes * multiplier)))

    return {
        "base_minutes": base_minutes,
        "adjusted_minutes": adjusted,
        "multiplier": multiplier,
        "bucket": bucket,
        "sigma_pct": round(sigma, 3),
        "slug_used": slug_used,
        "fell_back": False,
    }


def clear_volatility_cache() -> None:
    """Útil para tests."""
    with _VOL_LOCK:
        _VOL_CACHE.clear()


__all__ = [
    "compute_volatility",
    "compute_adaptive_cooldown",
    "bucket_for_sigma",
    "clear_volatility_cache",
    "VOLATILITY_BUCKETS",
    "MIN_COOLDOWN_MIN",
    "MAX_COOLDOWN_MIN",
]
