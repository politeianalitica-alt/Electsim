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

    # Top operadores en escalas últimas 24h
    ops_counter = Counter([c["operator"] for c in calls_recent if c.get("operator")])
    top_operators = [
        {"operator": op, "calls": n}
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


__all__ = ["port_congestion", "port_calls", "port_snapshot"]
