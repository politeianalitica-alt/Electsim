"""GPSJam · interferencia GNSS diaria, GeoJSON público sin auth.

https://gpsjam.org/data/YYYY/MM/DD.geojson

Devuelve celdas H3 con porcentaje de aviones que reportan corrupción
de posición GNSS. Útil para detectar jamming en chokepoints (Estrecho de
Ormuz, Mar Negro, etc.) y correlacionar con incidentes en buques.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

GPSJAM_BASE = "https://gpsjam.org/data"


def _http_get(url: str, timeout: float = 25.0) -> Any | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url)
                resp.raise_for_status()
                return resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("gpsjam fetch failed %s: %s", url, exc)
        return None


def fetch_day(year: int, month: int, day: int) -> dict[str, Any] | None:
    url = f"{GPSJAM_BASE}/{year:04d}/{month:02d}/{day:02d}.geojson"
    return _http_get(url)


def fetch_latest_available() -> dict[str, Any] | None:
    """GPSJam publica con 1-3 días de retraso · prueba D-1 .. D-5."""
    today = datetime.now(timezone.utc).date()
    for back in range(1, 6):
        d = today - timedelta(days=back)
        data = fetch_day(d.year, d.month, d.day)
        if data and data.get("features"):
            return {"date": d.isoformat(), **data}
    return None


def filter_by_bbox(geojson: dict[str, Any], bbox: tuple[float, float, float, float]) -> list[dict[str, Any]]:
    """Filtra features dentro del bbox (lat_min, lon_min, lat_max, lon_max).

    GPSJam usa H3 cells · cada feature tiene properties.bad_pos_pct.
    """
    lat_min, lon_min, lat_max, lon_max = bbox
    out: list[dict[str, Any]] = []
    for feat in geojson.get("features") or []:
        geom = feat.get("geometry") or {}
        if geom.get("type") != "Polygon":
            continue
        coords = geom.get("coordinates") or []
        if not coords or not coords[0]:
            continue
        # Centroide aproximado
        ring = coords[0]
        if not ring:
            continue
        lat_c = sum(p[1] for p in ring) / len(ring)
        lon_c = sum(p[0] for p in ring) / len(ring)
        if lat_min <= lat_c <= lat_max and lon_min <= lon_c <= lon_max:
            props = feat.get("properties") or {}
            out.append({
                "lat": lat_c,
                "lon": lon_c,
                "bad_pos_pct": props.get("bad_pos_pct"),
                "aircraft_n": props.get("aircraft_n"),
                "h3_index": props.get("h3"),
            })
    return out


def is_available() -> bool:
    return bool(fetch_latest_available())


__all__ = ["fetch_day", "fetch_latest_available", "filter_by_bbox", "is_available", "GPSJAM_BASE"]
