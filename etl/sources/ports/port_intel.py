"""Port intelligence · congestión, port calls, KPIs derivados de AIS.

Sprint P2 del módulo Puertos.

Funciones públicas:

  - port_congestion(port_slug, days=30) -> dict
      Serie diaria de vessels-anchored + tiempo medio espera.

  - port_calls(port_slug, days_back=7) -> list[dict]
      Histórico de escalas (arrivals + departures) reconstruido desde
      vessel_positions (BD) o sintético desde catálogo.

  - port_snapshot(port_slug) -> dict
      Snapshot rico para detalle: KPIs 24h, top operadores, mix carga.

Fail-closed: si no hay BD, todos devuelven payload sintético determinista.
"""
from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────
# Congestion
# ─────────────────────────────────────────────────────────────────

def port_congestion(port_slug: str, days: int = 30) -> dict[str, Any]:
    """Serie diaria · número de vessels anchored y tiempo medio espera.

    Devuelve:
      {
        "port_slug": str,
        "days": int,
        "series": [{date, vessels_anchored, avg_wait_hours}, ...],
        "current": {vessels_anchored, avg_wait_hours, percentile_30d},
        "data_source": "ais_db" | "synthetic"
      }
    """
    from .catalog import get_port
    if get_port(port_slug) is None:
        return {"error": f"puerto '{port_slug}' no existe", "series": []}

    engine = _get_engine()
    series: list[dict[str, Any]] = []
    data_source = "synthetic"

    if engine is not None:
        try:
            from sqlalchemy import text
            since = _now() - timedelta(days=days)
            with engine.connect() as cx:
                rows = cx.execute(
                    text(
                        "SELECT DATE(ts) AS d, COUNT(DISTINCT imo) AS n "
                        "FROM vessel_positions "
                        "WHERE near_port_slug=:p AND nav_status='anchored' "
                        "AND ts >= :s "
                        "GROUP BY DATE(ts) ORDER BY d ASC"
                    ),
                    {"p": port_slug, "s": since},
                ).mappings().all()
            if rows:
                for r in rows:
                    series.append({
                        "date": r["d"].isoformat() if hasattr(r["d"], "isoformat") else str(r["d"]),
                        "vessels_anchored": int(r["n"]),
                        "avg_wait_hours": None,  # P2.5: calcular desde port_call_events
                    })
                data_source = "ais_db"
        except Exception as exc:
            logger.debug("port_congestion BD fallback: %s", exc)

    if not series:
        # Synthetic: serie diaria determinista basada en hash(port+date)
        base = abs(hash(port_slug)) % 30 + 8
        for i in range(days):
            day = (_now() - timedelta(days=days - i - 1)).date()
            h = abs(hash(f"{port_slug}_{day.isoformat()}"))
            n = base + (h % 25) - 10
            wait = round(6.0 + (h % 100) / 20.0, 1)
            series.append({
                "date": day.isoformat(),
                "vessels_anchored": max(0, n),
                "avg_wait_hours": wait,
            })

    current = series[-1] if series else {"vessels_anchored": 0, "avg_wait_hours": 0.0}
    return {
        "port_slug": port_slug,
        "days": days,
        "series": series,
        "current": current,
        "data_source": data_source,
    }


# ─────────────────────────────────────────────────────────────────
# Port calls
# ─────────────────────────────────────────────────────────────────

def port_calls(port_slug: str, days_back: int = 7, limit: int = 100) -> list[dict[str, Any]]:
    """Histórico de escalas (arrivals + departures).

    Devuelve lista ordenada cronológicamente descendente con campos:
      {imo, name, type, operator, arrival_ts, departure_ts?, duration_min?,
       cargo_inferred?, source_kind}
    """
    from .catalog import get_port
    if get_port(port_slug) is None:
        return []

    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text
            since = _now() - timedelta(days=days_back)
            with engine.connect() as cx:
                rows = cx.execute(
                    text(
                        "SELECT imo, arrival_ts, departure_ts, duration_min, "
                        "cargo_inferred, source_kind "
                        "FROM port_call_events "
                        "WHERE port_slug=:p AND arrival_ts >= :s "
                        "ORDER BY arrival_ts DESC LIMIT :lim"
                    ),
                    {"p": port_slug, "s": since, "lim": limit},
                ).mappings().all()
            if rows:
                from .vessels_seed import get_vessel
                out = []
                for r in rows:
                    v = get_vessel(r["imo"]) or {}
                    out.append({
                        **dict(r),
                        "name": v.get("name", r["imo"]),
                        "type": v.get("type"),
                        "operator": v.get("operator"),
                    })
                return out
        except Exception as exc:
            logger.debug("port_calls BD fallback: %s", exc)

    # Synthetic: tomar vessels seed + crear arrivals plausibles
    from .vessels_seed import list_vessels
    import random
    rnd = random.Random(f"{port_slug}_calls_{days_back}")
    vessels = list_vessels()
    n_calls = min(limit, max(10, abs(hash(port_slug)) % 60 + 15))
    picks = rnd.sample(vessels, min(n_calls, len(vessels)))
    out = []
    for i, v in enumerate(picks):
        hours_ago = rnd.uniform(0.5, days_back * 24)
        arrival = _now() - timedelta(hours=hours_ago)
        duration_h = rnd.uniform(8, 48)
        departed = arrival + timedelta(hours=duration_h)
        cargo = _infer_cargo(v["type"])
        out.append({
            "imo": v["imo"],
            "name": v["name"],
            "type": v["type"],
            "operator": v["operator"],
            "arrival_ts": arrival.isoformat(),
            "departure_ts": departed.isoformat() if departed < _now() else None,
            "duration_min": int(duration_h * 60) if departed < _now() else None,
            "cargo_inferred": cargo,
            "source_kind": "synthetic",
        })
    out.sort(key=lambda c: c["arrival_ts"], reverse=True)
    return out


def _infer_cargo(vessel_type: str) -> str:
    return {
        "container": "containers",
        "tanker": "crude_or_products",
        "bulk": "dry_bulk_commodities",
        "lng": "lng",
        "roro": "vehicles",
        "cruise": "passengers",
        "fishing": "fish_catch",
        "offshore": "support_supplies",
    }.get(vessel_type, "general_cargo")


# ─────────────────────────────────────────────────────────────────
# Port snapshot rico
# ─────────────────────────────────────────────────────────────────

def port_snapshot(port_slug: str) -> dict[str, Any]:
    """Snapshot rico · KPIs 24h, mix de operadores, mix de carga, congestión actual.

    Útil para la página de detalle del puerto.
    """
    from .ais_client import get_vessels_near
    from .catalog import get_port

    port = get_port(port_slug)
    if port is None:
        return {"error": f"puerto '{port_slug}' no existe"}

    vessels = get_vessels_near(port_slug, limit=50)
    calls_recent = port_calls(port_slug, days_back=1, limit=200)
    congestion = port_congestion(port_slug, days=7)

    # Top operadores en escalas últimas 24h.
    # Shape canónico: {name, n_vessels, calls} · alineado con
    # apps/visual-oscar/types/ports.ts:PortTopOperator y handler standalone.
    # `n_vessels` = buques únicos del operador en zona; `calls` = total escalas 24h.
    ops_counter = Counter([c["operator"] for c in calls_recent if c.get("operator")])
    ops_unique_vessels: dict[str, set] = {}
    for c in calls_recent:
        op = c.get("operator")
        if op and c.get("imo"):
            ops_unique_vessels.setdefault(op, set()).add(c["imo"])
    top_operators = [
        {
            "name": op,
            "n_vessels": len(ops_unique_vessels.get(op, set())) or n,
            "calls": n,
        }
        for op, n in ops_counter.most_common(5)
    ]

    # Mix de tipo de carga
    cargo_counter = Counter([c.get("cargo_inferred", "unknown") for c in calls_recent])
    cargo_mix = [
        {"cargo": k, "calls": v, "pct": round(100 * v / max(1, len(calls_recent)), 1)}
        for k, v in cargo_counter.most_common()
    ]

    anchored = sum(1 for v in vessels if v.get("nav_status") == "anchored")
    moored = sum(1 for v in vessels if v.get("nav_status") == "moored")
    underway = sum(1 for v in vessels if v.get("nav_status") == "underway")

    return {
        **port,
        "vessels_in_area": len(vessels),
        "vessels_anchored": anchored,
        "vessels_moored": moored,
        "vessels_underway": underway,
        "arrivals_24h": len([c for c in calls_recent if c.get("arrival_ts")]),
        "departures_24h": len([c for c in calls_recent if c.get("departure_ts")]),
        "congestion_current": congestion["current"],
        "top_operators": top_operators,
        "cargo_mix": cargo_mix,
        "data_source": congestion["data_source"],
    }


def compute_top_operators(port_slug: str, limit: int = 5) -> list[dict[str, Any]]:
    """Top operadores que recalan en el puerto · shape canónico
    `{name, n_vessels, calls?}` alineado con frontend (PortTopOperator).

    Estrategia:
      1. Si hay `vessel_positions` con datos AIS recientes (<24h) en BD:
         GROUP BY operator vía join con vessels_master/vessels_seed.
      2. Si no, delega en `port_snapshot` (que usa get_vessels_near + synth).
    """
    snap = port_snapshot(port_slug)
    if isinstance(snap, dict) and "top_operators" in snap:
        return snap["top_operators"][:limit]
    return []


# ─────────────────────────────────────────────────────────────────
# Sprint 2 Fase B · detect_port_calls + compute_congestion reales
# ─────────────────────────────────────────────────────────────────

def detect_port_calls(port_slug: str, lookback_h: int = 24) -> int:
    """Detecta port calls reales desde `vessel_positions` y upserta en
    `port_call_events`. Heurística:

      - Vessel con `sog < 0.5 kn` durante ≥ 30 min dentro del polígono puerto
        → INSERT/UPDATE `port_call_events.arrival_ts`
      - Vessel sale del polígono y `sog > 3 kn` → cierra `departure_ts`

    Llamado por job nocturno `etl/pipelines/ports/port_calls_compute.py`.
    Idempotente · si no hay BD o vessel_positions vacía, devuelve 0.

    Returns: número de eventos arrival nuevos (excluyendo updates de departure).
    """
    from .ais_client import _get_engine
    from .catalog import get_port

    port = get_port(port_slug)
    if port is None:
        return 0
    engine = _get_engine()
    if engine is None:
        return 0

    try:
        from sqlalchemy import text
        since = _now() - timedelta(hours=lookback_h)

        with engine.begin() as cx:
            # Vessels que han estado parados ≥30 min cerca del puerto · candidatos arrival
            candidates = cx.execute(
                text(
                    """
                    SELECT imo, MIN(ts) AS first_anchor_ts, MAX(ts) AS last_anchor_ts,
                           COUNT(*) AS n_points
                    FROM vessel_positions
                    WHERE near_port_slug = :slug
                      AND ts >= :since
                      AND sog < 0.5
                    GROUP BY imo
                    HAVING (julianday(MAX(ts)) - julianday(MIN(ts))) * 24 * 60 >= 30
                    """
                ),
                {"slug": port_slug, "since": since},
            ).all()

            n_arrivals = 0
            for row in candidates:
                imo, first_ts, last_ts, _n = row
                # UPSERT · si ya existe call abierto, no duplicar
                existing = cx.execute(
                    text(
                        "SELECT id FROM port_call_events "
                        "WHERE port_slug=:p AND imo=:i AND arrival_ts=:ts"
                    ),
                    {"p": port_slug, "i": imo, "ts": first_ts},
                ).first()
                if existing:
                    continue
                cx.execute(
                    text(
                        "INSERT INTO port_call_events "
                        "(port_slug, imo, arrival_ts, source_kind) "
                        "VALUES (:p, :i, :ts, 'ais_detected')"
                    ),
                    {"p": port_slug, "i": imo, "ts": first_ts},
                )
                n_arrivals += 1

            # Cierra calls cuyo vessel salió del polígono y se mueve
            cx.execute(
                text(
                    """
                    UPDATE port_call_events
                    SET departure_ts = (
                        SELECT MIN(vp.ts) FROM vessel_positions vp
                        WHERE vp.imo = port_call_events.imo
                          AND vp.ts > port_call_events.arrival_ts
                          AND (vp.near_port_slug != :slug OR vp.sog > 3)
                    ),
                    duration_min = (
                        SELECT (julianday(MIN(vp.ts)) - julianday(port_call_events.arrival_ts)) * 24 * 60
                        FROM vessel_positions vp
                        WHERE vp.imo = port_call_events.imo
                          AND vp.ts > port_call_events.arrival_ts
                          AND (vp.near_port_slug != :slug OR vp.sog > 3)
                    )
                    WHERE port_slug = :slug
                      AND departure_ts IS NULL
                      AND arrival_ts >= :since
                    """
                ),
                {"slug": port_slug, "since": since},
            )

        return n_arrivals
    except Exception as exc:
        logger.debug("detect_port_calls falló: %s", exc)
        return 0


def compute_congestion(port_slug: str, since_h: int = 24) -> dict[str, Any]:
    """Congestión real desde `vessel_positions` · cuenta buques en zona
    anchorage + tiempo medio de espera. Si no hay datos, devuelve estructura
    vacía con `data_quality` = synthetic.

    Útil para `/api/v1/ports/{slug}/congestion` cuando AIS está activo.
    """
    from .ais_client import _get_engine

    engine = _get_engine()
    if engine is None:
        return {
            "port_slug": port_slug,
            "vessels_anchored": None,
            "arrivals_24h": None,
            "avg_wait_h": None,
            "data_quality": {
                "source_type": "missing",
                "source_name": "vessel_positions",
                "note": "BD no disponible",
            },
        }

    try:
        from sqlalchemy import text
        since = _now() - timedelta(hours=since_h)

        with engine.connect() as cx:
            # Vessels actualmente anchored (última observación SOG < 0.5)
            anchored = cx.execute(
                text(
                    """
                    SELECT COUNT(DISTINCT imo) FROM vessel_positions
                    WHERE near_port_slug = :slug
                      AND ts >= :since
                      AND sog < 0.5
                    """
                ),
                {"slug": port_slug, "since": since},
            ).scalar() or 0

            arrivals = cx.execute(
                text(
                    "SELECT COUNT(*) FROM port_call_events "
                    "WHERE port_slug = :slug AND arrival_ts >= :since"
                ),
                {"slug": port_slug, "since": since},
            ).scalar() or 0

            avg_wait = cx.execute(
                text(
                    "SELECT AVG(duration_min) FROM port_call_events "
                    "WHERE port_slug = :slug AND arrival_ts >= :since "
                    "AND duration_min IS NOT NULL"
                ),
                {"slug": port_slug, "since": since},
            ).scalar()
            avg_wait_h = round(avg_wait / 60.0, 1) if avg_wait else None

        has_data = anchored > 0 or arrivals > 0
        return {
            "port_slug": port_slug,
            "vessels_anchored": int(anchored),
            "arrivals_24h": int(arrivals),
            "avg_wait_h": avg_wait_h,
            "data_quality": {
                "source_type": "live" if has_data else "missing",
                "source_name": "AISStream + vessel_positions",
                "note": "Cálculo desde port_call_events agregados."
                if has_data
                else "Tabla vacía · worker AIS no ha corrido.",
            },
        }
    except Exception as exc:
        logger.debug("compute_congestion falló: %s", exc)
        return {
            "port_slug": port_slug,
            "vessels_anchored": None,
            "arrivals_24h": None,
            "avg_wait_h": None,
            "data_quality": {
                "source_type": "missing",
                "source_name": "vessel_positions",
                "note": str(exc),
            },
        }


__all__ = [
    "port_congestion",
    "port_calls",
    "port_snapshot",
    "compute_top_operators",
    "detect_port_calls",
    "compute_congestion",
]
