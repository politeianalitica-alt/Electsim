"""
UCDP Client — Bloque 14.

Uppsala Conflict Data Program — API pública.
Docs: https://ucdpapi.pcr.uu.se/api/

Sin clave API. Nunca lanza excepciones — siempre try/except con retorno vacío.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from etl.sources.geopolitics.schemas import GeoEvent, GeoSourceHealth

logger = logging.getLogger(__name__)

UCDP_API_BASE = "https://ucdpapi.pcr.uu.se/api"
UCDP_EVENTS_ENDPOINT = f"{UCDP_API_BASE}/gedevents/22.1"


def fetch_ucdp_events(
    country_iso3: str | None = None,
    start_year: int | None = None,
    end_year: int | None = None,
    limit: int = 200,
) -> list[GeoEvent]:
    """
    Obtiene eventos del UCDP GED (Georeferenced Event Dataset).

    Endpoint: GET https://ucdpapi.pcr.uu.se/api/gedevents/22.1
    Parámetros: pagesize, page, country (ID numérico), StartDate, EndDate

    Args:
        country_iso3: ISO3 del país (se convierte internamente a ID UCDP).
        start_year: Año de inicio. None = año en curso.
        end_year: Año de fin. None = año en curso.
        limit: Máximo de eventos a retornar.

    Returns:
        Lista de GeoEvent normalizados. Vacía en caso de error.
    """
    try:
        if start_year is None:
            start_year = date.today().year
        if end_year is None:
            end_year = date.today().year

        page = 1
        page_size = min(limit, 100)
        all_events: list[GeoEvent] = []

        while len(all_events) < limit:
            params: dict[str, Any] = {
                "pagesize": page_size,
                "page": page,
                "StartDate": f"{start_year}-01-01",
                "EndDate": f"{end_year}-12-31",
            }

            # UCDP usa IDs numéricos de país, no ISO3; incluimos como filtro de texto si disponible
            country_id = _iso3_to_ucdp_country_id(country_iso3) if country_iso3 else None
            if country_id is not None:
                params["country"] = country_id

            batch = _fetch_page(params)
            if not batch:
                break

            for raw in batch:
                ev = normalize_ucdp_event(raw)
                if ev:
                    all_events.append(ev)

            if len(batch) < page_size:
                break  # última página
            page += 1

        events_trimmed = all_events[:limit]
        logger.info("UCDP: %d eventos obtenidos (country=%s, %d-%d)", len(events_trimmed), country_iso3, start_year, end_year)
        return events_trimmed

    except Exception as exc:
        logger.warning("fetch_ucdp_events error: %s", exc)
        return []


def normalize_ucdp_event(raw: dict[str, Any]) -> GeoEvent | None:
    """
    Normaliza un evento UCDP GED crudo a GeoEvent.

    Mapping UCDP → GeoEvent:
    - event_id = "ucdp:{id}"
    - source = "ucdp"
    - event_type = type_of_violence_name
    - country = country
    - country_iso3 = primeros 3 chars de country_id (aproximación)
    - event_date = date_start[:10]
    - fatalities = best (estimación central)
    - severity basada en fatalities
    - actor_1 = side_a, actor_2 = side_b

    Returns:
        GeoEvent o None si faltan campos críticos o error.
    """
    try:
        raw_id = raw.get("id", "") or raw.get("event_id", "")
        event_id = f"ucdp:{raw_id}"
        if not raw_id:
            return None

        event_date_raw: str = (raw.get("date_start") or str(date.today()))[:10]
        event_type: str = raw.get("type_of_violence_name") or raw.get("type_of_violence", "armed conflict")
        country: str = raw.get("country", "") or ""
        fatalities: int = _safe_int(raw.get("best", 0)) or 0

        # ISO3 aproximado: UCDP usa IDs numéricos; intentamos mapear desde country name
        country_iso3_raw = raw.get("country_id", "")
        country_iso3 = _ucdp_country_name_to_iso3(country) or (
            str(country_iso3_raw)[:3] if country_iso3_raw else None
        )

        severity = _severity_from_fatalities(fatalities)

        lat = _safe_float(raw.get("latitude"))
        lon = _safe_float(raw.get("longitude"))

        return GeoEvent(
            event_id=event_id,
            source="ucdp",
            event_type=event_type.lower(),
            event_subtype=raw.get("conflict_name"),
            country=country,
            country_iso3=country_iso3,
            region=raw.get("region"),
            location_name=raw.get("geom_name") or raw.get("admin1") or raw.get("admin2"),
            lat=lat,
            lon=lon,
            event_date=event_date_raw,
            actor_1=raw.get("side_a"),
            actor_2=raw.get("side_b"),
            fatalities=fatalities,
            severity=severity,  # type: ignore[arg-type]
            source_url=raw.get("source_article"),
            raw_payload=raw,
        )

    except Exception as exc:
        logger.debug("normalize_ucdp_event error (id=%s): %s", raw.get("id"), exc)
        return None


def ucdp_health_check() -> GeoSourceHealth:
    """
    Verifica disponibilidad de la API UCDP (ping con 1 registro).

    Returns:
        GeoSourceHealth con estado actual.
    """
    try:
        params: dict[str, Any] = {
            "pagesize": 1,
            "page": 1,
        }
        try:
            import requests
            resp = requests.get(UCDP_EVENTS_ENDPOINT, params=params, timeout=10)
            ok = resp.status_code == 200
            error = None if ok else f"HTTP {resp.status_code}"
            count = 0
            if ok:
                data = resp.json()
                count = data.get("TotalCount", 0) or len(data.get("Result", []))
        except ImportError:
            ok, error, count = _httpx_health_ping(params)
        except Exception as exc:
            ok = False
            error = str(exc)
            count = 0

        return GeoSourceHealth(
            source_name="ucdp",
            available=ok,
            last_fetch=datetime.now(timezone.utc) if ok else None,
            record_count=count,
            error=error,
            api_key_required=False,
            api_key_present=True,
        )

    except Exception as exc:
        return GeoSourceHealth(
            source_name="ucdp",
            available=False,
            error=str(exc),
            api_key_required=False,
            api_key_present=True,
        )


def fetch_ucdp_for_spain_relevant_countries(limit_per_country: int = 50) -> list[GeoEvent]:
    """
    Conveniencia: obtiene eventos para los países más relevantes para España.

    Returns:
        Lista combinada y deduplicada de GeoEvent.
    """
    try:
        from etl.sources.geopolitics.acled_client import SPAIN_RELEVANCE

        # Top 15 países por relevancia
        top_countries = sorted(SPAIN_RELEVANCE.items(), key=lambda x: x[1], reverse=True)[:15]
        all_events: list[GeoEvent] = []
        seen_ids: set[str] = set()

        current_year = date.today().year
        for iso3, _ in top_countries:
            events = fetch_ucdp_events(
                country_iso3=iso3,
                start_year=current_year - 1,
                end_year=current_year,
                limit=limit_per_country,
            )
            for ev in events:
                if ev.event_id not in seen_ids:
                    seen_ids.add(ev.event_id)
                    all_events.append(ev)

        return all_events
    except Exception as exc:
        logger.warning("fetch_ucdp_for_spain_relevant_countries error: %s", exc)
        return []


# ── Helpers privados ───────────────────────────────────────────────────────────

def _fetch_page(params: dict[str, Any]) -> list[dict]:
    """Descarga una página de la API UCDP."""
    try:
        import requests
        resp = requests.get(UCDP_EVENTS_ENDPOINT, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("Result", []) or []
    except ImportError:
        return _fetch_page_httpx(params)
    except Exception as exc:
        logger.debug("UCDP _fetch_page error: %s", exc)
        return []


def _fetch_page_httpx(params: dict[str, Any]) -> list[dict]:
    """Fallback con httpx."""
    try:
        import httpx
        resp = httpx.get(UCDP_EVENTS_ENDPOINT, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("Result", []) or []
    except Exception as exc:
        logger.debug("UCDP httpx error: %s", exc)
        return []


def _httpx_health_ping(params: dict[str, Any]) -> tuple[bool, str | None, int]:
    """Ping via httpx, devuelve (ok, error, count)."""
    try:
        import httpx
        resp = httpx.get(UCDP_EVENTS_ENDPOINT, params=params, timeout=10)
        ok = resp.status_code == 200
        error = None if ok else f"HTTP {resp.status_code}"
        count = 0
        if ok:
            data = resp.json()
            count = data.get("TotalCount", 0)
        return ok, error, count
    except Exception as exc:
        return False, str(exc), 0


def _severity_from_fatalities(fatalities: int) -> str:
    """Calcula severidad UCDP basada en número de víctimas."""
    if fatalities >= 100:
        return "CRITICAL"
    if fatalities >= 20:
        return "HIGH"
    if fatalities >= 5:
        return "MEDIUM"
    return "LOW"


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


def _ucdp_country_name_to_iso3(country_name: str) -> str | None:
    """Mapea nombre de país (inglés UCDP) a ISO3."""
    UCDP_ISO3_MAP: dict[str, str] = {
        "ukraine": "UKR", "russia": "RUS", "russian federation": "RUS",
        "morocco": "MAR", "algeria": "DZA", "mali": "MLI",
        "niger": "NER", "nigeria": "NGA", "sudan": "SDN",
        "south sudan": "SSD", "ethiopia": "ETH", "somalia": "SOM",
        "israel": "ISR", "palestine": "PSE", "syria": "SYR",
        "iraq": "IRQ", "iran": "IRN", "iran (islamic republic of)": "IRN",
        "venezuela": "VEN", "colombia": "COL", "mexico": "MEX",
        "brazil": "BRA", "argentina": "ARG", "turkey": "TUR",
        "libya": "LBY", "egypt": "EGY", "chad": "TCD",
        "senegal": "SEN", "cuba": "CUB", "angola": "AGO",
        "saudi arabia": "SAU", "burkina faso": "BFA", "mauritania": "MRT",
        "mozambique": "MOZ", "myanmar": "MMR", "afghanistan": "AFG",
        "pakistan": "PAK", "india": "IND", "china": "CHN",
        "united states": "USA", "france": "FRA", "germany": "DEU",
        "united kingdom": "GBR", "spain": "ESP", "italy": "ITA",
        "central african republic": "CAF", "democratic republic of the congo": "COD",
        "congo": "COG", "guinea-bissau": "GNB", "cameroon": "CMR",
        "tanzania": "TZA", "kenya": "KEN", "uganda": "UGA",
        "rwanda": "RWA", "burundi": "BDI", "zimbabwe": "ZWE",
        "guinea": "GIN", "guinea bissau": "GNB",
        "saudi": "SAU", "eritrea": "ERI", "djibouti": "DJI",
        "azerbaijan": "AZE", "armenia": "ARM", "georgia": "GEO",
        "belarus": "BLR", "moldova": "MDA", "libya": "LBY",
        "tunisia": "TUN", "lebanon": "LBN", "jordan": "JOR",
        "yemen": "YEM", "haiti": "HTI", "peru": "PER",
        "ecuador": "ECU", "bolivia": "BOL", "paraguay": "PRY",
        "uruguay": "URY", "chile": "CHL", "indonesia": "IDN",
        "philippines": "PHL", "thailand": "THA", "cambodia": "KHM",
    }
    return UCDP_ISO3_MAP.get(country_name.lower().strip())


def _iso3_to_ucdp_country_id(iso3: str) -> int | None:
    """
    Convierte ISO3 a ID numérico UCDP (subset relevante para España).

    UCDP usa IDs numéricos propios basados en COW (Correlates of War).
    """
    ISO3_TO_COW: dict[str, int] = {
        "UKR": 369, "RUS": 365, "MAR": 600, "DZA": 615,
        "MLI": 432, "NER": 436, "NGA": 475, "SDN": 625,
        "SSD": 626, "ETH": 530, "SOM": 520, "ISR": 666,
        "PSE": 669, "SYR": 652, "IRQ": 645, "IRN": 630,
        "VEN": 101, "COL": 100, "MEX": 70, "BRA": 140,
        "ARG": 160, "TUR": 640, "LBY": 620, "EGY": 651,
        "TCD": 483, "SEN": 433, "CUB": 40, "AGO": 540,
        "SAU": 670, "BFA": 439, "MRT": 435, "MOZ": 541,
        "MMR": 775, "AFG": 700, "PAK": 770, "CAF": 482,
        "COD": 490, "CMR": 471, "TZA": 510, "KEN": 501,
        "UGA": 500, "RWA": 517, "BDI": 516, "ZWE": 552,
        "AZE": 373, "ARM": 371, "GEO": 372, "BLR": 370,
        "MDA": 359, "TUN": 616, "LBN": 660, "JOR": 663,
        "YEM": 678, "HTI": 41,
    }
    return ISO3_TO_COW.get(iso3.upper())
