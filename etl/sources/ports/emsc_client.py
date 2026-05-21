"""EMSC · eventos sísmicos · API pública FDSN sin auth.

https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minmag=4.0

Útil para correlación con riesgo de chokepoints (Ormuz/Marmaris/Bósforo
están en zonas sísmicas activas).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

EMSC_BASE = "https://www.seismicportal.eu/fdsnws/event/1/query"


def _http_get(url: str, params: dict[str, Any] | None = None, timeout: float = 20.0) -> Any | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url, params=params or {})
                resp.raise_for_status()
                return resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, params=params or {}, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("emsc fetch failed: %s", exc)
        return None


def recent_events(min_mag: float = 4.0, days: int = 30, limit: int = 200) -> list[dict[str, Any]]:
    """Eventos sísmicos recientes globales con magnitud ≥ min_mag."""
    starttime = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    data = _http_get(EMSC_BASE, params={
        "format": "json",
        "limit": limit,
        "minmag": min_mag,
        "starttime": starttime,
    })
    if not isinstance(data, dict):
        return []
    out: list[dict[str, Any]] = []
    for feat in data.get("features") or []:
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            continue
        out.append({
            "ts": props.get("time"),
            "magnitude": props.get("mag"),
            "depth_km": props.get("depth"),
            "region": props.get("flynn_region"),
            "lat": coords[1],
            "lon": coords[0],
            "url": props.get("url"),
            "id": feat.get("id"),
        })
    return out


def events_in_bbox(bbox: tuple[float, float, float, float], min_mag: float = 4.0, days: int = 30) -> list[dict[str, Any]]:
    """Filtra eventos por bounding box (lat_min, lon_min, lat_max, lon_max)."""
    evs = recent_events(min_mag=min_mag, days=days, limit=500)
    lat_min, lon_min, lat_max, lon_max = bbox
    return [
        e for e in evs
        if lat_min <= (e["lat"] or 0) <= lat_max
        and lon_min <= (e["lon"] or 0) <= lon_max
    ]


def is_available() -> bool:
    return bool(recent_events(min_mag=4.0, days=7, limit=10))


__all__ = ["recent_events", "events_in_bbox", "is_available", "EMSC_BASE"]
