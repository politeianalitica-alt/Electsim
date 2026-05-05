"""
Geo Event Adapter — Bloque 14.

Normaliza y deduplica eventos geopolíticos procedentes de múltiples fuentes
(ACLED, UCDP, GDELT, manual). Punto de entrada único para el pipeline.

Nunca lanza excepciones — siempre try/except con retorno vacío o None.
"""
from __future__ import annotations

import logging
from typing import Any, Literal

from etl.sources.geopolitics.schemas import GeoEvent

logger = logging.getLogger(__name__)

# ── ISO3 lookup — 50 países más relevantes para la geopolítica española ────────

ISO3_MAP: dict[str, str] = {
    # Europa Oriental / Conflicto Rusia-Ucrania
    "ukraine": "UKR",
    "russia": "RUS",
    "russian federation": "RUS",
    "belarus": "BLR",
    "moldova": "MDA",
    "georgia": "GEO",
    "armenia": "ARM",
    "azerbaijan": "AZE",
    # Oriente Medio / Mediterráneo Oriental
    "israel": "ISR",
    "palestine": "PSE",
    "palestina": "PSE",
    "syria": "SYR",
    "siria": "SYR",
    "iraq": "IRQ",
    "irak": "IRQ",
    "iran": "IRN",
    "irán": "IRN",
    "iran (islamic republic of)": "IRN",
    "lebanon": "LBN",
    "líbano": "LBN",
    "jordan": "JOR",
    "jordania": "JOR",
    "turkey": "TUR",
    "turquía": "TUR",
    "saudi arabia": "SAU",
    "arabia saudí": "SAU",
    "arabia saudita": "SAU",
    "yemen": "YEM",
    # África del Norte (vecindad España)
    "morocco": "MAR",
    "marruecos": "MAR",
    "algeria": "DZA",
    "argelia": "DZA",
    "libya": "LBY",
    "libia": "LBY",
    "egypt": "EGY",
    "egipto": "EGY",
    "tunisia": "TUN",
    "túnez": "TUN",
    "mauritania": "MRT",
    # África Subsahariana (Sahel / Guinea / Angola)
    "mali": "MLI",
    "malí": "MLI",
    "niger": "NER",
    "níger": "NER",
    "nigeria": "NGA",
    "chad": "TCD",
    "burkina faso": "BFA",
    "senegal": "SEN",
    "guinea-bissau": "GNB",
    "guinea bissau": "GNB",
    "guinea": "GIN",
    "angola": "AGO",
    "ethiopia": "ETH",
    "etiopía": "ETH",
    "somalia": "SOM",
    "sudan": "SDN",
    "sudán": "SDN",
    "south sudan": "SSD",
    "sudán del sur": "SSD",
    "mozambique": "MOZ",
    "cameroon": "CMR",
    "camerún": "CMR",
    "central african republic": "CAF",
    "república centroafricana": "CAF",
    "democratic republic of the congo": "COD",
    "república democrática del congo": "COD",
    "congo": "COG",
    # América Latina (diáspora / intereses económicos)
    "venezuela": "VEN",
    "colombia": "COL",
    "mexico": "MEX",
    "méxico": "MEX",
    "brazil": "BRA",
    "brasil": "BRA",
    "argentina": "ARG",
    "cuba": "CUB",
    "haiti": "HTI",
    "haití": "HTI",
    "peru": "PER",
    "perú": "PER",
    "ecuador": "ECU",
    "bolivia": "BOL",
    # Asia (impacto indirecto / suministros)
    "afghanistan": "AFG",
    "afganistán": "AFG",
    "pakistan": "PAK",
    "pakistán": "PAK",
    "myanmar": "MMR",
    "china": "CHN",
    "india": "IND",
    # Países OTAN/UE (referencia)
    "spain": "ESP",
    "españa": "ESP",
    "france": "FRA",
    "francia": "FRA",
    "germany": "DEU",
    "alemania": "DEU",
    "italy": "ITA",
    "italia": "ITA",
    "united kingdom": "GBR",
    "reino unido": "GBR",
    "united states": "USA",
    "estados unidos": "USA",
    "portugal": "PRT",
    "greece": "GRC",
    "grecia": "GRC",
}


def normalize_events(raw_events: list[dict], source: str) -> list[GeoEvent]:
    """
    Normaliza eventos crudos al modelo GeoEvent según la fuente.

    Dispatch:
    - "acled" → normalize_acled_event
    - "ucdp"  → normalize_ucdp_event
    - "gdelt" → _normalize_gdelt_event
    - "manual" → _normalize_manual_event
    - otro    → _normalize_generic_event

    Args:
        raw_events: Lista de dicts crudos de la fuente.
        source: Identificador de fuente ("acled", "ucdp", "gdelt", "manual").

    Returns:
        Lista de GeoEvent válidos (None descartados).
    """
    try:
        events: list[GeoEvent] = []
        for raw in raw_events:
            ev: GeoEvent | None = None
            try:
                if source == "acled":
                    from etl.sources.geopolitics.acled_client import normalize_acled_event
                    ev = normalize_acled_event(raw)
                elif source == "ucdp":
                    from etl.sources.geopolitics.ucdp_client import normalize_ucdp_event
                    ev = normalize_ucdp_event(raw)
                elif source == "gdelt":
                    ev = _normalize_gdelt_event(raw)
                elif source == "manual":
                    ev = _normalize_manual_event(raw)
                else:
                    ev = _normalize_generic_event(raw, source)
            except Exception as exc:
                logger.debug("normalize_events dispatch error (source=%s): %s", source, exc)
            if ev is not None:
                events.append(ev)
        return events
    except Exception as exc:
        logger.warning("normalize_events error: %s", exc)
        return []


def deduplicate_events(events: list[GeoEvent]) -> list[GeoEvent]:
    """
    Elimina duplicados por event_id, conservando la primera ocurrencia.

    Args:
        events: Lista de GeoEvent (puede contener duplicados).

    Returns:
        Lista de GeoEvent con event_id únicos.
    """
    try:
        seen: set[str] = set()
        unique: list[GeoEvent] = []
        for ev in events:
            if ev.event_id not in seen:
                seen.add(ev.event_id)
                unique.append(ev)
        return unique
    except Exception as exc:
        logger.warning("deduplicate_events error: %s", exc)
        return events


def map_country_to_iso3(country_name: str) -> str | None:
    """
    Convierte nombre de país (en cualquier capitalización) a ISO3.

    Args:
        country_name: Nombre del país en inglés o español.

    Returns:
        Código ISO3 (3 letras mayúsculas) o None si no se encuentra.
    """
    try:
        if not country_name:
            return None
        return ISO3_MAP.get(country_name.lower().strip())
    except Exception as exc:
        logger.debug("map_country_to_iso3 error: %s", exc)
        return None


def compute_event_severity(
    event_type: str,
    fatalities: int | None,
) -> Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
    """
    Calcula la severidad de un evento geopolítico.

    Lógica:
    - battle/violence + fatalities ≥ 50 → CRITICAL
    - battle/violence + fatalities ≥ 10 → HIGH
    - explosion/riot + cualquier fatalities → MEDIUM
    - protest/diplomatic → LOW
    - fallback basado en fatalities si no hay tipo reconocido

    Args:
        event_type: Tipo de evento (texto libre, se compara en minúsculas).
        fatalities: Número de víctimas (puede ser None).

    Returns:
        Literal "LOW", "MEDIUM", "HIGH" o "CRITICAL".
    """
    try:
        et = (event_type or "").lower()
        fat = fatalities or 0

        is_battle = any(kw in et for kw in ("battle", "violence", "armed", "conflict"))
        is_explosion = any(kw in et for kw in ("explosion", "bomb", "remote violence", "attack"))
        is_riot = any(kw in et for kw in ("riot", "unrest", "civil disorder"))
        is_protest = any(kw in et for kw in ("protest", "demonstration", "march"))
        is_diplomatic = any(kw in et for kw in ("diplomatic", "strategic", "development", "acuerdo", "treaty"))

        if is_battle:
            if fat >= 50:
                return "CRITICAL"
            if fat >= 10:
                return "HIGH"
            return "MEDIUM"

        if is_explosion:
            if fat >= 50:
                return "CRITICAL"
            return "MEDIUM"

        if is_riot:
            return "MEDIUM"

        if is_protest or is_diplomatic:
            return "LOW"

        # Fallback por fatalities
        if fat >= 100:
            return "CRITICAL"
        if fat >= 20:
            return "HIGH"
        if fat >= 5:
            return "MEDIUM"
        return "LOW"

    except Exception as exc:
        logger.debug("compute_event_severity error: %s", exc)
        return "LOW"


def enrich_events_with_spain_relevance(
    events: list[GeoEvent],
) -> list[tuple[GeoEvent, float]]:
    """
    Añade score de relevancia para España a cada evento y ordena desc.

    Usa SPAIN_RELEVANCE de acled_client como fuente de verdad.
    Países no mapeados reciben relevancia por defecto 0.3.

    Args:
        events: Lista de GeoEvent a enriquecer.

    Returns:
        Lista de tuplas (GeoEvent, relevance_score) ordenada por relevancia desc.
    """
    try:
        spain_relevance: dict[str, float] = {}
        try:
            from etl.sources.geopolitics.acled_client import SPAIN_RELEVANCE
            spain_relevance = SPAIN_RELEVANCE
        except Exception as exc:
            logger.debug("No se pudo importar SPAIN_RELEVANCE: %s", exc)

        DEFAULT_RELEVANCE = 0.3
        scored: list[tuple[GeoEvent, float]] = []

        for ev in events:
            iso3 = ev.country_iso3 or ""
            score = spain_relevance.get(iso3, DEFAULT_RELEVANCE)
            scored.append((ev, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    except Exception as exc:
        logger.warning("enrich_events_with_spain_relevance error: %s", exc)
        return [(ev, 0.3) for ev in events]


def merge_events_from_all_sources(
    acled_events: list[GeoEvent] | None = None,
    ucdp_events: list[GeoEvent] | None = None,
    gdelt_events: list[GeoEvent] | None = None,
    manual_events: list[GeoEvent] | None = None,
) -> list[GeoEvent]:
    """
    Fusiona eventos de todas las fuentes y deduplica.

    Args:
        acled_events: Eventos ACLED ya normalizados.
        ucdp_events: Eventos UCDP ya normalizados.
        gdelt_events: Eventos GDELT ya normalizados.
        manual_events: Eventos introducidos manualmente.

    Returns:
        Lista deduplicada y ordenada por fecha desc.
    """
    try:
        all_events: list[GeoEvent] = []
        for source_events in (acled_events, ucdp_events, gdelt_events, manual_events):
            if source_events:
                all_events.extend(source_events)

        deduped = deduplicate_events(all_events)

        # Ordenar por fecha desc
        try:
            deduped.sort(key=lambda ev: ev.event_date, reverse=True)
        except Exception:
            pass

        return deduped
    except Exception as exc:
        logger.warning("merge_events_from_all_sources error: %s", exc)
        return []


# ── Normalizadores internos ────────────────────────────────────────────────────

def _normalize_gdelt_event(raw: dict[str, Any]) -> GeoEvent | None:
    """Normaliza un artículo GDELT a GeoEvent (aproximación)."""
    try:
        from datetime import date as date_cls
        url = raw.get("url", "") or raw.get("source_url", "")
        title = raw.get("title", "") or raw.get("titulo", "")
        if not url and not title:
            return None

        import hashlib
        event_id = f"gdelt:{hashlib.md5(url.encode()).hexdigest()[:12]}"

        country_raw = raw.get("sourcecountry", "") or raw.get("country", "")
        country_iso3 = map_country_to_iso3(country_raw) if country_raw else None

        date_raw = raw.get("seendate", "") or raw.get("fecha_publicacion", "") or str(date_cls.today())
        date_str = str(date_raw)[:10].replace("/", "-")

        tone = raw.get("tone")
        if tone is not None:
            fat = 0
            ev_type = "media_signal"
        else:
            fat = 0
            ev_type = "gdelt_article"

        return GeoEvent(
            event_id=event_id,
            source="gdelt",
            event_type=ev_type,
            country=country_raw or "unknown",
            country_iso3=country_iso3,
            event_date=date_str,
            fatalities=fat,
            severity="LOW",
            source_url=url,
            raw_payload=raw,
        )
    except Exception as exc:
        logger.debug("_normalize_gdelt_event error: %s", exc)
        return None


def _normalize_manual_event(raw: dict[str, Any]) -> GeoEvent | None:
    """Normaliza un evento introducido manualmente."""
    try:
        from datetime import date as date_cls
        event_id = str(raw.get("event_id") or raw.get("id") or "")
        if not event_id:
            return None

        country = raw.get("country", "") or ""
        country_iso3 = raw.get("country_iso3") or map_country_to_iso3(country)
        event_date = str(raw.get("event_date", str(date_cls.today())))[:10]
        fatalities = _safe_int(raw.get("fatalities"))
        event_type = raw.get("event_type", "manual")

        severity_raw = raw.get("severity") or compute_event_severity(event_type, fatalities)

        return GeoEvent(
            event_id=f"manual:{event_id}",
            source="manual",
            event_type=event_type,
            event_subtype=raw.get("event_subtype"),
            country=country,
            country_iso3=country_iso3,
            region=raw.get("region"),
            location_name=raw.get("location_name"),
            lat=_safe_float(raw.get("lat")),
            lon=_safe_float(raw.get("lon")),
            event_date=event_date,
            actor_1=raw.get("actor_1"),
            actor_2=raw.get("actor_2"),
            fatalities=fatalities,
            severity=severity_raw,  # type: ignore[arg-type]
            source_url=raw.get("source_url"),
            raw_payload=raw,
        )
    except Exception as exc:
        logger.debug("_normalize_manual_event error: %s", exc)
        return None


def _normalize_generic_event(raw: dict[str, Any], source: str) -> GeoEvent | None:
    """Normalizador genérico de último recurso."""
    try:
        from datetime import date as date_cls
        event_id = str(raw.get("event_id") or raw.get("id") or "")
        if not event_id:
            return None

        country = raw.get("country", "") or ""
        country_iso3 = raw.get("country_iso3") or map_country_to_iso3(country)
        event_date = str(raw.get("event_date", str(date_cls.today())))[:10]
        fatalities = _safe_int(raw.get("fatalities"))
        event_type = raw.get("event_type", "unknown")

        return GeoEvent(
            event_id=f"{source}:{event_id}",
            source=source,
            event_type=event_type,
            country=country,
            country_iso3=country_iso3,
            event_date=event_date,
            fatalities=fatalities,
            severity=compute_event_severity(event_type, fatalities),  # type: ignore[arg-type]
            raw_payload=raw,
        )
    except Exception as exc:
        logger.debug("_normalize_generic_event error: %s", exc)
        return None


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
