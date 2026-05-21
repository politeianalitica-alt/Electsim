"""AIS client · posiciones de buques en tiempo real con AISstream WebSocket.

Sprint P2 del módulo Puertos.

Modos de operación (degradación clara):

  1. **Real** · si `AISSTREAM_API_KEY` está en env y `websockets` instalado,
     el módulo puede arrancar una conexión WebSocket persistente que persiste
     posiciones en `vessel_positions` (no se implementa el daemon aquí, sólo
     el método `_aisstream_connect()` reutilizable por un worker). Las
     funciones lectoras leen de BD.

  2. **Demo/synth** · si no hay key o no hay BD, genera posiciones
     sintéticas deterministas desde el catálogo de puertos+vessels seed.
     Cada (imo, port_slug) produce posiciones consistentes con haversine
     ruidoso alrededor del puerto target. Útil para dev/tests/UI inicial.

Funciones públicas:

  - is_realtime_available() -> bool
  - get_vessels_near(port_slug, radius_nm=20, limit=50) -> list[dict]
  - get_vessel_position(imo) -> dict | None
  - get_vessel_track(imo, hours=24) -> list[dict]
  - synth_positions_around(port_slug, n=20, ts=None) -> list[dict]

Falla cerrado: errores de BD o red devuelven lista/None vacíos, nunca rompen.
"""
from __future__ import annotations

import logging
import math
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

EARTH_R_KM = 6371.0
NM_PER_KM = 0.539957


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_realtime_available() -> bool:
    """¿Hay AISSTREAM_API_KEY + lib websockets disponibles?"""
    if not os.environ.get("AISSTREAM_API_KEY"):
        return False
    try:
        import websockets  # type: ignore  # noqa: F401
        return True
    except ImportError:
        return False


# ─────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────

def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────
# Sintéticos · deterministas por (port, imo)
# ─────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia gran círculo entre dos puntos."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R_KM * math.asin(math.sqrt(a))


def _offset_latlon(lat: float, lon: float, dlat_km: float, dlon_km: float) -> tuple[float, float]:
    """Aproximación lineal · suficiente para offsets <100km."""
    dlat = dlat_km / 110.574
    dlon = dlon_km / (111.320 * max(math.cos(math.radians(lat)), 0.01))
    return lat + dlat, lon + dlon


def synth_positions_around(
    port_slug: str,
    n: int = 20,
    ts: datetime | None = None,
    radius_nm: float = 15.0,
) -> list[dict[str, Any]]:
    """Posiciones sintéticas determinadas por hash · útil para demo."""
    from .catalog import get_port
    from .vessels_seed import list_vessels

    port = get_port(port_slug)
    if port is None:
        return []
    ts = ts or _now()

    vessels = list_vessels()
    # Sample determinista por slug+ts (rotación diaria)
    seed_str = f"{port_slug}_{ts.strftime('%Y%m%d')}"
    rnd = random.Random(seed_str)
    picks = rnd.sample(vessels, min(n, len(vessels)))

    radius_km = radius_nm / NM_PER_KM
    out: list[dict[str, Any]] = []
    for v in picks:
        # offset random dentro del radio
        r_km = rnd.uniform(0.2, radius_km)
        angle = rnd.uniform(0, 2 * math.pi)
        dlat_km = r_km * math.cos(angle)
        dlon_km = r_km * math.sin(angle)
        lat, lon = _offset_latlon(port["lat"], port["lon"], dlat_km, dlon_km)
        # SoG · 0 si dentro de 3km (anchored), random si más lejos
        sog = 0.0 if r_km < 3 else round(rnd.uniform(6.0, 14.0), 1)
        nav_status = "moored" if r_km < 1 else ("anchored" if sog == 0 else "underway")
        out.append({
            "imo": v["imo"],
            "mmsi": v["mmsi"],
            "name": v["name"],
            "type": v["type"],
            "flag_iso": v["flag_iso"],
            "operator": v["operator"],
            "ts": ts.isoformat(),
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "sog": sog,
            "cog": round(rnd.uniform(0, 360), 1) if sog > 0 else None,
            "heading": round(rnd.uniform(0, 360), 1),
            "nav_status": nav_status,
            "draught": round(rnd.uniform(8, 16), 1),
            "near_port_slug": port_slug,
            "distance_nm": round(r_km * NM_PER_KM, 2),
            "source": "synthetic",
        })
    # Orden por distancia
    out.sort(key=lambda p: p["distance_nm"])
    return out


# ─────────────────────────────────────────────────────────────────
# API pública · lectores
# ─────────────────────────────────────────────────────────────────

def get_vessels_near(
    port_slug: str,
    radius_nm: float = 20.0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista buques en/cerca del puerto.

    Estrategia:
      1. Si hay BD con datos AIS recientes (<6h), preferir.
      2. Si no, devolver sintéticos.
    """
    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text
            since = _now() - timedelta(hours=6)
            with engine.connect() as cx:
                rows = cx.execute(
                    text(
                        "SELECT imo, mmsi, ts, lat, lon, sog, cog, nav_status, "
                        "draught, near_port_slug, source FROM vessel_positions "
                        "WHERE near_port_slug=:p AND ts >= :since "
                        "ORDER BY ts DESC LIMIT :lim"
                    ),
                    {"p": port_slug, "since": since, "lim": limit},
                ).mappings().all()
            if rows:
                # Enriquecer con metadata vessels_seed
                from .vessels_seed import get_vessel
                enriched = []
                for r in rows:
                    v = get_vessel(r["imo"]) or {}
                    enriched.append({
                        **dict(r),
                        "name": v.get("name", r["imo"]),
                        "type": v.get("type"),
                        "flag_iso": v.get("flag_iso"),
                        "operator": v.get("operator"),
                    })
                return enriched
        except Exception as exc:
            logger.debug("get_vessels_near BD fallback synth: %s", exc)

    # Fallback synth
    return synth_positions_around(port_slug, n=limit, radius_nm=radius_nm)


def get_vessel_position(imo: str) -> dict[str, Any] | None:
    """Última posición conocida del buque."""
    from .vessels_seed import get_vessel
    v = get_vessel(imo)
    if v is None:
        return None
    imo_norm = v["imo"]

    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as cx:
                row = cx.execute(
                    text(
                        "SELECT imo, mmsi, ts, lat, lon, sog, cog, nav_status, "
                        "draught, near_port_slug, source FROM vessel_positions "
                        "WHERE imo=:i ORDER BY ts DESC LIMIT 1"
                    ),
                    {"i": imo_norm},
                ).mappings().first()
            if row:
                return {**dict(row), **{k: v[k] for k in ("name", "type", "flag_iso", "operator")}}
        except Exception as exc:
            logger.debug("get_vessel_position BD fallback: %s", exc)

    # Synth · ubicar al buque en el primer puerto que lo "contiene" hoy
    from .catalog import PORTS
    port_slug = sorted(PORTS.keys())[abs(hash(imo_norm)) % len(PORTS)]
    near = synth_positions_around(port_slug, n=50)
    for pos in near:
        if pos["imo"] == imo_norm:
            return pos
    # Si no aparece, devolver el buque sin ubicación
    return {
        **{k: v[k] for k in ("imo", "mmsi", "name", "type", "flag_iso", "operator")},
        "ts": _now().isoformat(),
        "lat": None,
        "lon": None,
        "near_port_slug": None,
        "source": "synthetic_fallback",
    }


def get_vessel_track(
    imo: str,
    hours: int = 24,
    max_points: int = 200,
) -> list[dict[str, Any]]:
    """Track AIS · puntos cronológicos en las últimas N horas.

    Sin BD: genera 24 puntos sintéticos describiendo una trayectoria
    plausible (curva sinusoidal en torno a la última posición).
    """
    from .vessels_seed import get_vessel
    v = get_vessel(imo)
    if v is None:
        return []
    imo_norm = v["imo"]

    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text
            since = _now() - timedelta(hours=hours)
            with engine.connect() as cx:
                rows = cx.execute(
                    text(
                        "SELECT ts, lat, lon, sog, cog, nav_status, source "
                        "FROM vessel_positions WHERE imo=:i AND ts >= :since "
                        "ORDER BY ts ASC LIMIT :lim"
                    ),
                    {"i": imo_norm, "since": since, "lim": max_points},
                ).mappings().all()
            if rows:
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.debug("get_vessel_track BD fallback synth: %s", exc)

    # Synth · trayectoria desde la última posición sintética hacia atrás
    last = get_vessel_position(imo)
    if not last or last.get("lat") is None:
        return []
    lat0, lon0 = float(last["lat"]), float(last["lon"])
    points = []
    n_points = min(max_points, max(6, hours))
    for i in range(n_points):
        progress = i / max(1, n_points - 1)
        # offset sinusoidal en lat/lon
        dlat = math.sin(progress * math.pi * 2) * 0.15
        dlon = (1.0 - progress) * 0.25
        ts = _now() - timedelta(hours=hours * (1.0 - progress))
        points.append({
            "ts": ts.isoformat(),
            "lat": round(lat0 + dlat, 5),
            "lon": round(lon0 + dlon, 5),
            "sog": round(8.5 + math.sin(progress * 6) * 2.0, 1),
            "cog": round(((progress * 360) + abs(hash(imo_norm)) % 60) % 360, 1),
            "nav_status": "underway" if progress < 0.95 else "moored",
            "source": "synthetic",
        })
    return points


# ─────────────────────────────────────────────────────────────────
# AISstream WebSocket (esqueleto · daemon en worker aparte)
# ─────────────────────────────────────────────────────────────────

async def aisstream_subscribe_demo(
    port_slugs: list[str],
    on_message,  # noqa: ANN001  · callable
    max_messages: int = 100,
) -> int:
    """Suscribe a AISstream para BoundingBoxes de los puertos dados.

    Sólo opera si is_realtime_available() · útil para un worker daemon.
    Devuelve nº de mensajes procesados antes de cerrar (max_messages).
    """
    if not is_realtime_available():
        return 0
    import json

    import websockets  # type: ignore
    from .catalog import get_port

    bbox = []
    for slug in port_slugs:
        p = get_port(slug)
        if not p:
            continue
        dlat = 0.5
        dlon = 0.5
        bbox.append(
            [[p["lat"] - dlat, p["lon"] - dlon], [p["lat"] + dlat, p["lon"] + dlon]]
        )
    if not bbox:
        return 0

    sub_msg = {
        "APIKey": os.environ["AISSTREAM_API_KEY"],
        "BoundingBoxes": bbox,
        "FilterMessageTypes": ["PositionReport"],
    }

    processed = 0
    async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
        await ws.send(json.dumps(sub_msg))
        async for raw in ws:
            try:
                msg = json.loads(raw)
                on_message(msg)
                processed += 1
                if processed >= max_messages:
                    break
            except Exception as exc:
                logger.debug("aisstream parse error: %s", exc)
    return processed


def persist_position(msg: dict[str, Any]) -> bool:
    """Inserta una posición AIS en `vessel_positions` desde un mensaje AISStream.

    Shape esperado del mensaje AISStream (PositionReport):
      {
        "MetaData": {"MMSI": ..., "ShipName": ..., "time_utc": "...", ...},
        "Message": {"PositionReport": {"UserID": int, "Latitude": float,
                    "Longitude": float, "Sog": float, "Cog": float,
                    "TrueHeading": int, "NavigationalStatus": int,
                    "Timestamp": int, ...}}
      }

    El `UserID` es el MMSI; el IMO no viaja en cada PositionReport sino en
    ShipStaticData. Para Sprint 2 guardamos por MMSI y resolvemos IMO via
    `vessels_master` cuando exista. Si no, el campo `imo` queda con prefijo
    `MMSI:<n>` para reconciliar posteriormente.

    Devuelve True si insertó, False si falló (sin lanzar · falla cerrado).
    """
    try:
        meta = msg.get("MetaData") or {}
        body = (msg.get("Message") or {}).get("PositionReport") or {}
        if not body:
            return False

        mmsi = str(meta.get("MMSI") or body.get("UserID") or "")
        if not mmsi:
            return False

        lat = body.get("Latitude")
        lon = body.get("Longitude")
        if lat is None or lon is None:
            return False

        # Timestamp · preferir MetaData.time_utc (ISO) sobre PositionReport.Timestamp
        ts_iso = meta.get("time_utc")
        if ts_iso:
            try:
                ts = datetime.fromisoformat(ts_iso.replace("Z", "+00:00"))
            except Exception:
                ts = _now()
        else:
            ts = _now()

        # IMO · resolver desde vessels_master por MMSI, sino placeholder
        engine = _get_engine()
        if engine is None:
            return False

        imo_resolved: str | None = None
        try:
            from sqlalchemy import text
            with engine.connect() as cx:
                row = cx.execute(
                    text("SELECT imo FROM vessels_master WHERE mmsi=:m LIMIT 1"),
                    {"m": mmsi},
                ).first()
                if row:
                    imo_resolved = row[0]
        except Exception:
            pass

        imo = imo_resolved or f"MMSI:{mmsi}"

        # near_port_slug · best-effort vía catálogo (radio 30nm fijo)
        from .catalog import list_ports
        near_port_slug: str | None = None
        for p in list_ports():
            if _haversine_km(lat, lon, p["lat"], p["lon"]) < 55:  # ~30nm
                near_port_slug = p["slug"]
                break

        from sqlalchemy import text as _text
        with engine.begin() as cx:
            cx.execute(
                _text(
                    "INSERT INTO vessel_positions "
                    "(imo, mmsi, ts, lat, lon, sog, cog, nav_status, "
                    " draught, near_port_slug, source) "
                    "VALUES (:imo, :mmsi, :ts, :lat, :lon, :sog, :cog, :nav, "
                    " :draught, :port, 'aisstream') "
                    "ON CONFLICT (imo, ts) DO NOTHING"
                ),
                {
                    "imo": imo,
                    "mmsi": mmsi,
                    "ts": ts,
                    "lat": float(lat),
                    "lon": float(lon),
                    "sog": body.get("Sog"),
                    "cog": body.get("Cog"),
                    "nav": str(body.get("NavigationalStatus") or ""),
                    "draught": None,
                    "port": near_port_slug,
                },
            )
        return True
    except Exception as exc:
        logger.debug("persist_position failed: %s", exc)
        return False


__all__ = [
    "is_realtime_available",
    "get_vessels_near",
    "get_vessel_position",
    "get_vessel_track",
    "synth_positions_around",
    "aisstream_subscribe_demo",
    "persist_position",
]
