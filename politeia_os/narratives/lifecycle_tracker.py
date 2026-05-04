"""
Seguimiento del ciclo vital de narrativas mediante series temporales.

Usa scipy.signal.find_peaks sobre menciones diarias para detectar el pico.
Estados: emergente | creciente | plateau | declinante | zombie.

Criterios de transicion:
  - emergente:   < 48h activa Y < 5 fuentes unicas
  - creciente:   serie creciente (pendiente positiva en los ultimos 3 dias)
  - plateau:     pico detectado, variacion < 15% respecto al pico
  - declinante:  > 7 dias sin nuevo pico Y < 2 menciones/dia promedio reciente
  - zombie:      estaba declinante y aparecen > 5 menciones en un dia
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

log = logging.getLogger(__name__)

_ZOMBIE_REVIVAL_THRESHOLD   = 5    # menciones/dia para revival
_DECLINING_DAYS_THRESHOLD   = 7    # dias sin pico para marcar declinante
_DECLINING_RATE_THRESHOLD   = 2.0  # menciones/dia promedio en ventana reciente
_PLATEAU_VARIATION_PCT      = 0.15 # variacion maxima vs pico para ser plateau


def _try_import_scipy():
    """Importa scipy.signal.find_peaks de forma lazy; retorna None si no disponible."""
    try:
        from scipy.signal import find_peaks  # type: ignore
        return find_peaks
    except ImportError:
        log.warning("scipy no disponible; se usara deteccion de pico simple")
        return None


def _build_daily_series(
    articles: list[dict],
    primera_deteccion: datetime,
    n_days: int = 30,
) -> list[int]:
    """
    Construye la serie temporal de menciones diarias.

    Args:
        articles:           Articulos del cluster con campo published_at.
        primera_deteccion:  Fecha de inicio de la ventana.
        n_days:             Numero de dias a cubrir.

    Returns:
        Lista de n_days enteros con menciones por dia.
    """
    counts = [0] * n_days
    if primera_deteccion.tzinfo is None:
        primera_deteccion = primera_deteccion.replace(tzinfo=timezone.utc)

    for art in articles:
        pub = art.get("published_at")
        if pub is None:
            continue
        try:
            if not isinstance(pub, datetime):
                pub = datetime.fromisoformat(str(pub))
            if pub.tzinfo is None:
                pub = pub.replace(tzinfo=timezone.utc)
            delta_days = (pub - primera_deteccion).days
            if 0 <= delta_days < n_days:
                counts[delta_days] += 1
        except Exception as exc:
            log.debug("Error procesando fecha de articulo: %s", exc)

    return counts


def _find_peak_simple(series: list[int]) -> Optional[int]:
    """Fallback: retorna el indice del maximo en la serie."""
    if not series or max(series) == 0:
        return None
    return series.index(max(series))


def _find_peak_scipy(series: list[int]) -> Optional[int]:
    """Detecta el pico principal usando scipy.signal.find_peaks."""
    find_peaks = _try_import_scipy()
    if find_peaks is None:
        return _find_peak_simple(series)
    if not series or max(series) == 0:
        return None
    try:
        peaks, _ = find_peaks(series, height=1, prominence=1)
        if len(peaks) == 0:
            return _find_peak_simple(series)
        # Retornar el pico con mayor valor
        return int(max(peaks, key=lambda i: series[i]))
    except Exception as exc:
        log.debug("scipy find_peaks error: %s", exc)
        return _find_peak_simple(series)


def _normalize_series(series: list[int]) -> list[float]:
    """Normaliza la serie temporal a [0.0, 1.0]."""
    if not series:
        return []
    max_val = max(series)
    if max_val == 0:
        return [0.0] * len(series)
    return [round(v / max_val, 4) for v in series]


def _infer_trend(series: list[int], window: int = 3) -> str:
    """Retorna 'creciente', 'declinante' o 'estable' para los ultimos `window` dias."""
    if len(series) < window + 1:
        return "estable"
    recent = series[-window:]
    earlier = series[-(window * 2):-(window)]
    avg_recent  = sum(recent)  / max(len(recent), 1)
    avg_earlier = sum(earlier) / max(len(earlier), 1)
    if avg_recent > avg_earlier * 1.15:
        return "creciente"
    if avg_recent < avg_earlier * 0.85:
        return "declinante"
    return "estable"


def compute_lifecycle(
    articles: list[dict],
    primera_deteccion: datetime,
    ciclo_actual: str = "emergente",
    dias_activa: int = 0,
) -> dict:
    """
    Calcula el estado del ciclo vital de una narrativa y la serie temporal.

    Args:
        articles:           Todos los articulos del cluster (historico completo).
        primera_deteccion:  Cuando se detecto la narrativa por primera vez.
        ciclo_actual:       Estado actual en BD (para evaluar zombie).
        dias_activa:        Dias que lleva activa segun BD.

    Returns:
        Dict con claves:
          - ciclo_vital: str
          - pico_menciones_at: datetime | None
          - menciones_acumuladas: int
          - fuentes_unicas: int
          - dias_activa: int
          - serie_temporal: list[float]   (normalizada 0-1)
    """
    now = datetime.now(timezone.utc)
    if primera_deteccion.tzinfo is None:
        primera_deteccion = primera_deteccion.replace(tzinfo=timezone.utc)

    n_days = max(dias_activa + 1, 7, min(60, (now - primera_deteccion).days + 1))
    daily  = _build_daily_series(articles, primera_deteccion, n_days)
    total  = sum(daily)

    fuentes = len({art.get("source_name", "") for art in articles if art.get("source_name")})
    dias    = max(dias_activa, (now - primera_deteccion).days)

    # Detectar pico
    peak_idx = _find_peak_scipy(daily)
    pico_at: Optional[datetime] = None
    if peak_idx is not None:
        pico_at = primera_deteccion + timedelta(days=peak_idx)

    # Tasa reciente (ultimos 3 dias)
    recent_rate = sum(daily[-3:]) / 3.0 if len(daily) >= 3 else total / max(dias, 1)

    # Evaluar estado
    ciclo = _classify_state(
        dias=dias,
        fuentes=fuentes,
        daily=daily,
        recent_rate=recent_rate,
        peak_idx=peak_idx,
        ciclo_actual=ciclo_actual,
    )

    return {
        "ciclo_vital":           ciclo,
        "pico_menciones_at":     pico_at,
        "menciones_acumuladas":  total,
        "fuentes_unicas":        fuentes,
        "dias_activa":           dias,
        "serie_temporal":        _normalize_series(daily),
    }


def _classify_state(
    dias: int,
    fuentes: int,
    daily: list[int],
    recent_rate: float,
    peak_idx: Optional[int],
    ciclo_actual: str,
) -> str:
    """Aplica las reglas de transicion de estado del ciclo vital."""
    n_days = len(daily)
    today_count = daily[-1] if daily else 0

    # Zombie: estaba declinante y hoy revive con > 5 menciones
    if ciclo_actual == "declinante" and today_count >= _ZOMBIE_REVIVAL_THRESHOLD:
        return "zombie"

    # Emergente: muy reciente y pocas fuentes
    if dias <= 2 and fuentes < 5:
        return "emergente"

    # Declinante: lleva > 7 dias sin nuevo pico Y tasa < 2/dia
    if dias > _DECLINING_DAYS_THRESHOLD and recent_rate < _DECLINING_RATE_THRESHOLD:
        # Verificar que el pico no es reciente (ultimos 3 dias)
        if peak_idx is None or (n_days - peak_idx) > 3:
            return "declinante"

    # Plateau: el pico existe y la variacion reciente es < 15% del maximo
    if peak_idx is not None:
        peak_val = daily[peak_idx]
        if peak_val > 0 and abs(recent_rate - peak_val) / peak_val <= _PLATEAU_VARIATION_PCT:
            return "plateau"

    # Creciente: tendencia al alza en los ultimos 3 dias
    if _infer_trend(daily) == "creciente":
        return "creciente"

    return "plateau"
