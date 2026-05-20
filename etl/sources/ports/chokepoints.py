"""Chokepoints marítimos · riesgo por corredor estratégico.

Sprint P4 del módulo Puertos.

6 corredores cubiertos (≈30% del comercio marítimo mundial pasa por aquí):
  - suez       · Canal de Suez (12% comercio mundial)
  - ormuz      · Estrecho de Ormuz (20% del crudo mundial)
  - bosporus   · Estrecho del Bósforo (granos Mar Negro)
  - malacca    · Estrecho de Malaca (25% mercancías globales)
  - panama     · Canal de Panamá (5% comercio mundial)
  - bab_el_mandeb · Mar Rojo / Bab-el-Mandeb (ruta Asia-Europa)

Cada chokepoint tiene:
  - bounding box (lat/lon)
  - países adyacentes (ISO-3)
  - traffic_volume_pct (% comercio mundial)
  - typical_disruptions (eventos típicos)

Risk score [0-100] = score_base (fragilidad estructural) + boost por eventos
ACLED recientes dentro de la bbox · severidad ponderada.

Reusa `etl/sources/geopolitics/acled_client.py:fetch_acled_events` cuando
está disponible · fallback synth si no.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)


CHOKEPOINTS: dict[str, dict[str, Any]] = {
    "suez": {
        "slug": "suez",
        "name": "Canal de Suez",
        "region": "oriente_medio",
        # bbox = [[lat_min, lon_min], [lat_max, lon_max]]
        "bbox": [[29.5, 32.0], [31.5, 33.0]],
        "countries_iso3": ["EGY"],
        "traffic_volume_pct": 12.0,
        "alt_routes": ["cape_of_good_hope"],
        "typical_disruptions": [
            "Encallamientos (Ever Given 2021 · 6 días bloqueo)",
            "Tensiones Israel-Egipto",
            "Conflicto Sudán → flujo refugiados afecta operaciones",
        ],
        "score_base": 35,
    },
    "ormuz": {
        "slug": "ormuz",
        "name": "Estrecho de Ormuz",
        "region": "oriente_medio",
        "bbox": [[25.5, 55.0], [27.2, 57.5]],
        "countries_iso3": ["IRN", "OMN", "ARE"],
        "traffic_volume_pct": 20.0,
        "alt_routes": [],  # único acceso al Golfo Pérsico
        "typical_disruptions": [
            "Crisis Irán · ataques a tankers (2019, 2024)",
            "Sanciones contra exportadores iraníes",
            "Patrullas IRGC vs marina USA",
        ],
        "score_base": 55,
    },
    "bosporus": {
        "slug": "bosporus",
        "name": "Estrecho del Bósforo",
        "region": "europa",
        "bbox": [[40.9, 28.7], [41.3, 29.4]],
        "countries_iso3": ["TUR"],
        "traffic_volume_pct": 3.0,
        "alt_routes": [],
        "typical_disruptions": [
            "Convención de Montreux limita militares",
            "Guerra Ucrania · grano Mar Negro bloqueado/intermitente",
            "Tráfico tanker ruso post-sanciones UE",
        ],
        "score_base": 45,
    },
    "malacca": {
        "slug": "malacca",
        "name": "Estrecho de Malaca",
        "region": "asia_pacifico",
        "bbox": [[1.0, 100.0], [6.5, 105.5]],
        "countries_iso3": ["MYS", "IDN", "SGP"],
        "traffic_volume_pct": 25.0,
        "alt_routes": ["sunda_strait", "lombok_strait"],
        "typical_disruptions": [
            "Piratería (ROP 2015 peak · ahora controlado)",
            "Tensiones SCS · disputas Spratly/Paracelso",
            "Polución ambiental · congestión",
        ],
        "score_base": 25,
    },
    "panama": {
        "slug": "panama",
        "name": "Canal de Panamá",
        "region": "norteamerica",
        "bbox": [[8.8, -80.0], [9.6, -79.5]],
        "countries_iso3": ["PAN"],
        "traffic_volume_pct": 5.0,
        "alt_routes": ["cape_horn"],
        "typical_disruptions": [
            "Sequía 2023-24 · restricciones de tránsito Gatún",
            "Aumento de tarifas / subastas slots",
            "Limitaciones calado (15m vs 18m teórico)",
        ],
        "score_base": 40,
    },
    "bab_el_mandeb": {
        "slug": "bab_el_mandeb",
        "name": "Bab-el-Mandeb / Mar Rojo",
        "region": "oriente_medio",
        "bbox": [[12.0, 42.5], [14.0, 44.5]],
        "countries_iso3": ["YEM", "DJI", "ERI"],
        "traffic_volume_pct": 12.0,
        "alt_routes": ["cape_of_good_hope"],
        "typical_disruptions": [
            "Ataques Houthis (2023-25 · MSC/Maersk re-rutaron Cabo)",
            "Guerra Yemen · presencia militar",
            "Piratería Cuerno África",
        ],
        "score_base": 70,
    },
}


def list_chokepoints() -> list[dict[str, Any]]:
    """Lista todos los corredores."""
    return list(CHOKEPOINTS.values())


def get_chokepoint(slug: str) -> dict[str, Any] | None:
    return CHOKEPOINTS.get(slug.lower())


# ─────────────────────────────────────────────────────────────────
# Risk scoring
# ─────────────────────────────────────────────────────────────────

def _point_in_bbox(lat: float, lon: float, bbox: list[list[float]]) -> bool:
    return (bbox[0][0] <= lat <= bbox[1][0]) and (bbox[0][1] <= lon <= bbox[1][1])


def _fetch_recent_events(slug: str, days: int = 30) -> list[dict[str, Any]]:
    """Busca eventos ACLED en bbox del chokepoint últimos N días.

    Reusa etl.sources.geopolitics.acled_client si está disponible.
    Fallback: 0-2 eventos sintéticos según score_base.
    """
    cp = get_chokepoint(slug)
    if cp is None:
        return []
    bbox = cp["bbox"]

    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        all_events = fetch_acled_events(limit=100, days_back=days)
        # ACLED devuelve lista de GeoEvent (pydantic) · normalizar a dict
        relevant: list[dict[str, Any]] = []
        for ev in all_events:
            d = ev.model_dump() if hasattr(ev, "model_dump") else dict(ev)
            lat = d.get("latitude") or d.get("lat")
            lon = d.get("longitude") or d.get("lon")
            if lat is None or lon is None:
                continue
            if _point_in_bbox(float(lat), float(lon), bbox):
                relevant.append({
                    "ts": d.get("event_date") or d.get("ts"),
                    "type": d.get("event_type") or d.get("type"),
                    "severity": d.get("severity"),
                    "fatalities": d.get("fatalities", 0),
                    "country": d.get("country"),
                    "summary": (d.get("notes") or d.get("description", ""))[:200],
                    "source": "acled",
                })
        return relevant[:20]
    except Exception as exc:
        logger.debug("acled fetch fallback synth chokepoint %s: %s", slug, exc)

    # Fallback synth · eventos plausibles según base risk
    base = cp["score_base"]
    n = (base // 25) + 1  # 1..3 eventos
    events = []
    for i in range(n):
        ts = datetime.now(timezone.utc) - timedelta(days=(i * 3) + 1)
        events.append({
            "ts": ts.isoformat(),
            "type": cp["typical_disruptions"][i % len(cp["typical_disruptions"])][:80],
            "severity": "medium",
            "fatalities": 0,
            "country": cp["countries_iso3"][0],
            "summary": f"Evento sintético · {cp['name']}",
            "source": "synthetic",
        })
    return events


def compute_risk_score(slug: str, days: int = 30) -> dict[str, Any]:
    """Risk score actual · base + boost por eventos recientes.

    Returns:
        {slug, risk_score [0-100], level, base, event_boost, n_events,
         recent_events, alt_routes_available, ...}
    """
    cp = get_chokepoint(slug)
    if cp is None:
        return {"error": f"chokepoint '{slug}' no existe"}

    events = _fetch_recent_events(slug, days=days)
    # Boost · 5 puntos por evento, max +35
    boost = min(35, 5 * len(events))
    # Severidad alta dobla boost
    high_severity = sum(1 for e in events if e.get("severity") in ("high", "critical"))
    boost += min(15, 3 * high_severity)
    risk = min(100, cp["score_base"] + boost)
    level = _classify_level(risk)

    return {
        "slug": slug,
        "name": cp["name"],
        "region": cp["region"],
        "bbox": cp["bbox"],
        "countries_iso3": cp["countries_iso3"],
        "traffic_volume_pct": cp["traffic_volume_pct"],
        "alt_routes": cp["alt_routes"],
        "alt_routes_available": bool(cp["alt_routes"]),
        "score_base": cp["score_base"],
        "event_boost": boost,
        "risk_score": risk,
        "level": level,
        "n_events": len(events),
        "recent_events": events,
        "data_source": events[0]["source"] if events else "synthetic",
    }


def _classify_level(score: int) -> str:
    if score >= 80:
        return "critico"
    if score >= 60:
        return "alto"
    if score >= 40:
        return "medio"
    if score >= 20:
        return "bajo"
    return "minimo"


def all_chokepoints_risk(days: int = 30) -> dict[str, Any]:
    """Risk score de todos los corredores · útil para dashboard."""
    items = [compute_risk_score(s, days=days) for s in CHOKEPOINTS]
    # Orden por risk_score descendente
    items.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
    return {
        "n_items": len(items),
        "items": items,
        "global_max_risk": max((x.get("risk_score", 0) for x in items), default=0),
    }


__all__ = [
    "CHOKEPOINTS",
    "list_chokepoints",
    "get_chokepoint",
    "compute_risk_score",
    "all_chokepoints_risk",
]
