"""
ACLED Client — Bloque 14.

Armed Conflict Location & Event Data Project.
API docs: https://apidocs.acleddata.com/

Requiere ACLED_API_KEY y ACLED_EMAIL.
Si no están, devuelve vacío con warning — nunca rompe.

Producción: NO devuelve datos demo salvo que GEOPOLITICS_ALLOW_DEMO_DATA=1.
"""
from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Any

from etl.sources.geopolitics.schemas import GeoEvent, GeoSourceHealth

logger = logging.getLogger(__name__)

ACLED_API_BASE = "https://api.acleddata.com/acled/read"

# Relevancia de países para España (heredada del scraper original)
SPAIN_RELEVANCE: dict[str, float] = {
    "DZA": 0.95, "LBY": 0.85, "NGA": 0.70, "AGO": 0.65,
    "IRQ": 0.65, "IRN": 0.70, "SAU": 0.65, "LBN": 0.72,
    "MAR": 0.90, "PSE": 0.75, "ISR": 0.75, "SYR": 0.72,
    "UKR": 0.88, "RUS": 0.85, "MDA": 0.60, "BLR": 0.55,
    "VEN": 0.80, "MEX": 0.75, "COL": 0.70, "BRA": 0.70,
    "ARG": 0.65, "CUB": 0.62,
    "MLI": 0.78, "NER": 0.72, "TCD": 0.62, "BFA": 0.68,
    "GNB": 0.55, "SEN": 0.55, "MRT": 0.60,
    "TUR": 0.75, "LBY": 0.85, "TUN": 0.75, "EGY": 0.72,
}

# Tipos de evento con severidad por defecto
EVENT_SEVERITY: dict[str, str] = {
    "battles": "HIGH",
    "explosions/remote violence": "HIGH",
    "violence against civilians": "HIGH",
    "riots": "MEDIUM",
    "protests": "LOW",
    "strategic developments": "MEDIUM",
}


def _demo_allowed() -> bool:
    """Dev/demo switch. Production default is false."""
    return os.getenv("GEOPOLITICS_ALLOW_DEMO_DATA", "").strip().lower() in {"1", "true", "yes", "on"}


def fetch_acled_events(
    countries: list[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 500,
    event_types: list[str] | None = None,
) -> list[GeoEvent]:
    """
    Obtiene eventos ACLED recientes.

    Si no hay credenciales o ACLED falla, devuelve [] por defecto.
    Solo devuelve demo data si GEOPOLITICS_ALLOW_DEMO_DATA=1.
    """
    api_key = os.getenv("ACLED_API_KEY", "")
    email = os.getenv("ACLED_EMAIL", "")

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    if api_key and email:
        events = _fetch_from_api(
            api_key=api_key,
            email=email,
            countries=countries,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            event_types=event_types,
        )
        if events:
            return events

    # Fallback: scraper legado. Este también debe respetar no-demo en producción.
    events = _fetch_from_legacy_scraper(
        countries=countries, start_date=start_date, end_date=end_date, limit=limit
    )
    if events:
        return events

    if _demo_allowed():
        logger.warning("ACLED: usando datos demo porque GEOPOLITICS_ALLOW_DEMO_DATA=1")
        return _generate_demo_events(limit=min(limit, 20))

    logger.warning("ACLED no disponible: sin credenciales/aprobación o sin respuesta. Devolviendo [] (sin demo).")
    return []


def normalize_acled_event(raw: dict[str, Any]) -> GeoEvent | None:
    """
    Normaliza un evento ACLED crudo a GeoEvent.

    Returns None si faltan campos críticos.
    """
    try:
        event_id = str(raw.get("data_id") or raw.get("event_id") or raw.get("id", ""))
        if not event_id:
            return None

        country = raw.get("country", "")
        event_date_raw = raw.get("event_date", str(date.today()))
        event_type = raw.get("event_type", "Unknown").lower()

        country_iso3 = raw.get("iso3") or _acled_country_to_iso3(country)
        severity = _compute_acled_severity(raw)

        return GeoEvent(
            event_id=f"acled:{event_id}",
            source="acled",
            event_type=event_type,
            event_subtype=raw.get("sub_event_type"),
            country=country,
            country_iso3=country_iso3,
            region=raw.get("region"),
            location_name=raw.get("location"),
            lat=_safe_float(raw.get("latitude")),
            lon=_safe_float(raw.get("longitude")),
            event_date=event_date_raw,
            actor_1=raw.get("actor1"),
            actor_2=raw.get("actor2"),
            fatalities=_safe_int(raw.get("fatalities")),
            severity=severity,
            source_url=raw.get("source_url") or raw.get("source"),
            raw_payload=raw,
        )
    except Exception as exc:
        logger.debug("normalize_acled_event error: %s", exc)
        return None


def acled_health_check() -> GeoSourceHealth:
    """
    Verifica la disponibilidad de ACLED.

    Returns GeoSourceHealth con estado actual.
    """
    api_key = os.getenv("ACLED_API_KEY", "")
    email = os.getenv("ACLED_EMAIL", "")
    api_key_present = bool(api_key and email)

    if not api_key_present:
        return GeoSourceHealth(
            source_name="acled",
            available=False,
            api_key_required=True,
            api_key_present=False,
            error="ACLED_API_KEY o ACLED_EMAIL no configurados / acceso ACLED no aprobado",
        )

    try:
        import requests
        resp = requests.get(
            ACLED_API_BASE,
            params={
                "key": api_key,
                "email": email,
                "limit": 1,
                "fields": "event_id|event_date|country",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            count = data.get("count", 0)
            return GeoSourceHealth(
                source_name="acled",
                available=True,
                record_count=count,
                api_key_required=True,
                api_key_present=True,
            )
        return GeoSourceHealth(
            source_name="acled",
            available=False,
            api_key_required=True,
            api_key_present=True,
            error=f"HTTP {resp.status_code}",
        )
    except Exception as exc:
        return GeoSourceHealth(
            source_name="acled",
            available=False,
            api_key_required=True,
            api_key_present=api_key_present,
            error=str(exc),
        )


# ── Helpers privados ───────────────────────────────────────────────────────────

def _fetch_from_api(
    api_key: str,
    email: str,
    countries: list[str] | None,
    start_date: date,
    end_date: date,
    limit: int,
    event_types: list[str] | None,
) -> list[GeoEvent]:
    """Llama a la API ACLED real."""
    try:
        import requests
        params: dict[str, Any] = {
            "key": api_key,
            "email": email,
            "limit": limit,
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "fields": (
                "data_id|event_date|event_type|sub_event_type|"
                "country|region|location|latitude|longitude|iso3|"
                "actor1|actor2|fatalities|source|source_url|"
                "notes"
            ),
        }

        if countries:
            params["iso3"] = "|".join(countries)
        else:
            relevant = list(SPAIN_RELEVANCE.keys())[:30]
            params["iso3"] = "|".join(relevant)

        if event_types:
            params["event_type"] = "|".join(event_types)

        resp = requests.get(ACLED_API_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        events = []
        for raw in data.get("data", []):
            ev = normalize_acled_event(raw)
            if ev:
                events.append(ev)

        logger.info("ACLED API: %d eventos obtenidos", len(events))
        return events
    except Exception as exc:
        logger.warning("ACLED API error: %s", exc)
        return []


def _fetch_from_legacy_scraper(
    countries: list[str] | None,
    start_date: date,
    end_date: date,
    limit: int,
) -> list[GeoEvent]:
    """Intenta usar el scraper legado etl/sources/geo/scraper_acled.py."""
    try:
        import pandas as pd
        from etl.sources.geo.scraper_acled import ACLEDScraper

        scraper = ACLEDScraper()
        # El scraper legado devuelve DataFrame
        df = scraper.fetch(days_back=(date.today() - start_date).days)

        if df is None or df.empty:
            return []

        events = []
        for _, row in df.head(limit).iterrows():
            raw = row.to_dict()
            ev = normalize_acled_event(raw)
            if ev:
                events.append(ev)

        logger.info("ACLED legado: %d eventos", len(events))
        return events
    except Exception as exc:
        logger.debug("ACLED scraper legado no disponible: %s", exc)
        return []


def _generate_demo_events(limit: int = 10) -> list[GeoEvent]:
    """Datos demo solo para desarrollo explícito."""
    from datetime import date
    demo = [
        {"country": "Ukraine", "iso3": "UKR", "type": "battles", "fat": 45, "actor1": "Russian Forces", "actor2": "AFU"},
        {"country": "Sudan", "iso3": "SDN", "type": "violence against civilians", "fat": 12, "actor1": "RSF", "actor2": "Civilians"},
        {"country": "Mali", "iso3": "MLI", "type": "explosions/remote violence", "fat": 8, "actor1": "JNIM", "actor2": "FAMA"},
        {"country": "Morocco", "iso3": "MAR", "type": "protests", "fat": 0, "actor1": "Protesters", "actor2": "Police"},
        {"country": "Venezuela", "iso3": "VEN", "type": "riots", "fat": 2, "actor1": "Opposition", "actor2": "Police"},
        {"country": "Algeria", "iso3": "DZA", "type": "strategic developments", "fat": 0, "actor1": "Government", "actor2": ""},
        {"country": "Niger", "iso3": "NER", "type": "battles", "fat": 15, "actor1": "JNIM", "actor2": "Niger Army"},
        {"country": "Syria", "iso3": "SYR", "type": "explosions/remote violence", "fat": 5, "actor1": "SDF", "actor2": "IS"},
        {"country": "Israel", "iso3": "ISR", "type": "battles", "fat": 30, "actor1": "IDF", "actor2": "Hamas"},
        {"country": "Colombia", "iso3": "COL", "type": "violence against civilians", "fat": 3, "actor1": "ELN", "actor2": "Civilians"},
    ]
    events = []
    for i, d in enumerate(demo[:limit]):
        events.append(GeoEvent(
            event_id=f"demo:acled:{i}",
            source="acled_demo",
            event_type=d["type"],
            country=d["country"],
            country_iso3=d["iso3"],
            event_date=date.today() - timedelta(days=i),
            actor_1=d["actor1"],
            actor_2=d.get("actor2"),
            fatalities=d["fat"],
            severity=_compute_demo_severity(d["type"], d["fat"]),
        ))
    return events


def _compute_acled_severity(raw: dict[str, Any]) -> str:
    """Calcula severidad de un evento ACLED."""
    fatalities = _safe_int(raw.get("fatalities", 0)) or 0
    event_type = str(raw.get("event_type", "")).lower()

    base = EVENT_SEVERITY.get(event_type, "LOW")

    if fatalities >= 50:
        return "CRITICAL"
    if fatalities >= 20:
        return "HIGH" if base in ("LOW", "MEDIUM") else base
    if fatalities >= 5:
        return "MEDIUM" if base == "LOW" else base
    return base


def _compute_demo_severity(event_type: str, fatalities: int) -> str:
    if fatalities >= 30:
        return "CRITICAL"
    if fatalities >= 10:
        return "HIGH"
    if fatalities >= 3:
        return "MEDIUM"
    return "LOW"


def _acled_country_to_iso3(country: str) -> str | None:
    """Mapea nombre de país a ISO3 (simplificado)."""
    COUNTRY_MAP: dict[str, str] = {
        "ukraine": "UKR", "russia": "RUS", "morocco": "MAR",
        "algeria": "DZA", "mali": "MLI", "niger": "NER",
        "nigeria": "NGA", "sudan": "SDN", "ethiopia": "ETH",
        "israel": "ISR", "palestine": "PSE", "syria": "SYR",
        "iraq": "IRQ", "iran": "IRN", "venezuela": "VEN",
        "colombia": "COL", "mexico": "MEX", "brazil": "BRA",
        "argentina": "ARG", "turkey": "TUR", "libya": "LBY",
        "egypt": "EGY", "chad": "TCD", "senegal": "SEN",
        "cuba": "CUB", "angola": "AGO", "saudi arabia": "SAU",
        "burkina faso": "BFA", "mauritania": "MRT",
    }
    return COUNTRY_MAP.get(country.lower().strip())


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _safe_int(v: Any) -> int | None:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None
