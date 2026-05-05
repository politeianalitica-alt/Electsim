"""
GDELT Client — Bloque 14.

Global Database of Events, Language, and Tone (GDELT 2.0).
API pública sin clave: https://api.gdeltproject.org/api/v2/doc/doc

Reutiliza etl/sources/geo/scraper_gdelt.py como fallback.
Nunca lanza excepciones — siempre try/except con retorno vacío o None.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any

from etl.sources.geopolitics.schemas import GeoNarrativeSignal, GeoSourceHealth

logger = logging.getLogger(__name__)

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

# Queries por defecto relevantes para España
SPAIN_QUERIES: list[str] = [
    "Spain OR España geopolitics",
    "Spain NATO OR OTAN defense",
    "Argelia España gas energy",
    "Marruecos España migración",
    "Spain Ukraine war",
    "Spain Mediterranean security",
    "Spain Sahel Africa mission",
]

# Keywords por topic para agrupar artículos
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "energy": ["gas", "oil", "energy", "energía", "petróleo"],
    "migration": ["migration", "migración", "refugee", "border"],
    "defense": ["nato", "otan", "military", "defense", "troops"],
    "conflict": ["war", "conflict", "attack", "violence", "batalla"],
    "diplomacy": ["diplomatic", "embassy", "treaty", "acuerdo"],
}


def search_gdelt_articles(
    query: str,
    countries: list[str] | None = None,
    hours: int = 24,
    limit: int = 100,
) -> list[dict]:
    """
    Llama a GDELT Doc API v2 y devuelve artículos normalizados.

    Endpoint: https://api.gdeltproject.org/api/v2/doc/doc
    Parámetros: mode=artlist, maxrecords, format=json, timespan=Xh

    Args:
        query: Consulta de texto libre para GDELT.
        countries: Lista de ISO3; si se provee, añade sourcecountry al filtro.
        hours: Ventana temporal hacia atrás (en horas).
        limit: Máximo de artículos a devolver.

    Returns:
        Lista de dicts con url, title, seendate, tone, domain, sourcecountry.
        Vacía en caso de error.
    """
    try:
        q = query
        if countries:
            country_filter = " OR ".join(f"sourcecountry:{c}" for c in countries)
            q = f"({query}) ({country_filter})"

        params: dict[str, Any] = {
            "query": q,
            "mode": "artlist",
            "maxrecords": min(limit, 250),
            "format": "json",
            "timespan": f"{hours}h",
            "sort": "DateDesc",
        }

        try:
            import requests
            resp = requests.get(GDELT_DOC_API, params=params, timeout=20)
            resp.raise_for_status()
            raw_articles: list[dict] = resp.json().get("articles", [])
        except ImportError:
            raw_articles = _fetch_via_httpx(params)
        except Exception as exc:
            logger.debug("GDELT requests error para '%s': %s", query[:40], exc)
            raw_articles = _fetch_via_httpx(params)

        normalized: list[dict] = []
        for art in raw_articles:
            if not art.get("url") or not art.get("title"):
                continue
            normalized.append({
                "url": art.get("url", ""),
                "title": art.get("title", ""),
                "seendate": art.get("seendate", ""),
                "tone": _safe_float(art.get("tone")),
                "domain": art.get("domain", ""),
                "sourcecountry": art.get("sourcecountry", ""),
                "language": art.get("language", ""),
            })

        logger.debug("GDELT '%s': %d artículos", query[:40], len(normalized))
        return normalized

    except Exception as exc:
        logger.warning("search_gdelt_articles error: %s", exc)
        return []


def extract_geo_narrative_signals(
    articles: list[dict],
    country_iso3: str | None = None,
) -> list[GeoNarrativeSignal]:
    """
    Agrupa artículos por topic y crea GeoNarrativeSignal para cada uno.

    La severidad se basa en volumen y tono:
    - >50 artículos OR tono < -5 → HIGH
    - >20 artículos OR tono < -3 → MEDIUM
    - resto → LOW

    Args:
        articles: Lista de artículos obtenidos con search_gdelt_articles.
        country_iso3: ISO3 del país de contexto (opcional).

    Returns:
        Lista de GeoNarrativeSignal, uno por topic detectado.
    """
    try:
        today = date.today().isoformat()
        topic_articles: dict[str, list[dict]] = defaultdict(list)

        for art in articles:
            text = (art.get("title", "") + " " + art.get("url", "")).lower()
            matched_any = False
            for topic, keywords in TOPIC_KEYWORDS.items():
                if any(kw in text for kw in keywords):
                    topic_articles[topic].append(art)
                    matched_any = True
            if not matched_any:
                topic_articles["general"].append(art)

        signals: list[GeoNarrativeSignal] = []
        for topic, arts in topic_articles.items():
            if not arts:
                continue

            tone_stats = compute_gdelt_tone_signal(arts)
            volume = len(arts)
            avg_tone = tone_stats.get("avg_tone")

            # Severidad
            if volume > 50 or (avg_tone is not None and avg_tone < -5):
                severity: str = "HIGH"
            elif volume > 20 or (avg_tone is not None and avg_tone < -3):
                severity = "MEDIUM"
            else:
                severity = "LOW"

            signal_id = f"gdelt:{country_iso3 or 'global'}:{topic}:{today}"
            dominant_sources = list({art.get("domain", "") for art in arts if art.get("domain")})[:5]

            signals.append(GeoNarrativeSignal(
                signal_id=signal_id,
                country_iso3=country_iso3,
                topic=topic,
                narrative_label=f"GDELT/{topic.title()}",
                volume_24h=volume,
                volume_7d=volume,  # solo disponemos de la ventana actual
                growth_rate=0.0,
                avg_tone=avg_tone,
                dominant_sources=dominant_sources,
                domestic_relevance=_compute_domestic_relevance(topic),
                affected_modules=_affected_modules_for_topic(topic),
                severity=severity,  # type: ignore[arg-type]
                explanation=(
                    f"{volume} artículos sobre '{topic}' en GDELT. "
                    f"Tono promedio: {avg_tone:.2f}" if avg_tone is not None
                    else f"{volume} artículos sobre '{topic}' en GDELT."
                ),
                raw_payload={
                    "tone_stats": tone_stats,
                    "source": "gdelt",
                    "query_country": country_iso3,
                },
            ))

        return signals

    except Exception as exc:
        logger.warning("extract_geo_narrative_signals error: %s", exc)
        return []


def compute_gdelt_tone_signal(articles: list[dict]) -> dict:
    """
    Calcula estadísticas de tono para una lista de artículos GDELT.

    Returns:
        Dict con avg_tone, min_tone, max_tone, n_articles, negative_ratio.
    """
    try:
        tones = [
            a["tone"] for a in articles
            if a.get("tone") is not None and isinstance(a["tone"], (int, float))
        ]
        if not tones:
            return {
                "avg_tone": None,
                "min_tone": None,
                "max_tone": None,
                "n_articles": len(articles),
                "negative_ratio": 0.0,
            }
        n = len(tones)
        avg_tone = sum(tones) / n
        negative_count = sum(1 for t in tones if t < 0)
        return {
            "avg_tone": round(avg_tone, 4),
            "min_tone": round(min(tones), 4),
            "max_tone": round(max(tones), 4),
            "n_articles": len(articles),
            "negative_ratio": round(negative_count / n, 4) if n else 0.0,
        }
    except Exception as exc:
        logger.debug("compute_gdelt_tone_signal error: %s", exc)
        return {
            "avg_tone": None,
            "min_tone": None,
            "max_tone": None,
            "n_articles": len(articles),
            "negative_ratio": 0.0,
        }


def gdelt_health_check() -> GeoSourceHealth:
    """
    Verifica disponibilidad de la API GDELT (ping simple).

    Returns:
        GeoSourceHealth con estado actual.
    """
    try:
        params: dict[str, Any] = {
            "query": "Spain",
            "mode": "artlist",
            "maxrecords": 1,
            "format": "json",
            "timespan": "1h",
        }
        try:
            import requests
            resp = requests.get(GDELT_DOC_API, params=params, timeout=10)
            status_ok = resp.status_code == 200
            error = None if status_ok else f"HTTP {resp.status_code}"
        except ImportError:
            # intenta con httpx
            articles = _fetch_via_httpx(params)
            status_ok = True
            error = None
        except Exception as exc:
            status_ok = False
            error = str(exc)

        return GeoSourceHealth(
            source_name="gdelt",
            available=status_ok,
            last_fetch=datetime.now(timezone.utc) if status_ok else None,
            record_count=1 if status_ok else 0,
            error=error,
            api_key_required=False,
            api_key_present=True,
        )
    except Exception as exc:
        return GeoSourceHealth(
            source_name="gdelt",
            available=False,
            error=str(exc),
            api_key_required=False,
            api_key_present=True,
        )


def fetch_spain_signals(hours: int = 24) -> list[GeoNarrativeSignal]:
    """
    Conveniencia: descarga artículos para todas las SPAIN_QUERIES y
    extrae señales narrativas agrupadas.

    Returns:
        Lista combinada de GeoNarrativeSignal.
    """
    try:
        all_articles: list[dict] = []
        for query in SPAIN_QUERIES:
            articles = search_gdelt_articles(query, hours=hours, limit=50)
            all_articles.extend(articles)

        # Deduplicar por URL
        seen: set[str] = set()
        unique: list[dict] = []
        for art in all_articles:
            url = art.get("url", "")
            if url and url not in seen:
                seen.add(url)
                unique.append(art)

        return extract_geo_narrative_signals(unique, country_iso3="ESP")
    except Exception as exc:
        logger.warning("fetch_spain_signals error: %s", exc)
        return []


# ── Helpers privados ───────────────────────────────────────────────────────────

def _fetch_via_httpx(params: dict[str, Any]) -> list[dict]:
    """Fallback con httpx si requests no está disponible."""
    try:
        import httpx
        resp = httpx.get(GDELT_DOC_API, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("articles", [])
    except Exception as exc:
        logger.debug("GDELT httpx error: %s", exc)
        # Último recurso: scraper legado
        return _fetch_via_legacy_scraper()


def _fetch_via_legacy_scraper() -> list[dict]:
    """Usa scraper_gdelt.py legado como último recurso."""
    try:
        from etl.sources.geo.scraper_gdelt import run_gdelt
        items = run_gdelt(max_queries=3)
        # Convierte formato osint_items → formato gdelt_client
        converted: list[dict] = []
        for item in items:
            converted.append({
                "url": item.get("url", ""),
                "title": item.get("titulo", ""),
                "seendate": item.get("fecha_publicacion", ""),
                "tone": None,
                "domain": item.get("fuente", ""),
                "sourcecountry": "",
                "language": item.get("idioma_original", ""),
            })
        return converted
    except Exception as exc:
        logger.debug("GDELT scraper legado error: %s", exc)
        return []


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _compute_domestic_relevance(topic: str) -> float:
    """Devuelve relevancia doméstica 0-1 por topic."""
    relevance_map: dict[str, float] = {
        "energy": 0.9,
        "migration": 0.85,
        "defense": 0.75,
        "conflict": 0.65,
        "diplomacy": 0.70,
        "general": 0.40,
    }
    return relevance_map.get(topic, 0.40)


def _affected_modules_for_topic(topic: str) -> list[str]:
    """Módulos del dashboard afectados según topic."""
    module_map: dict[str, list[str]] = {
        "energy": ["geopolitics", "economy", "risk"],
        "migration": ["geopolitics", "risk", "interior"],
        "defense": ["geopolitics", "defense", "nato"],
        "conflict": ["geopolitics", "risk", "intelligence"],
        "diplomacy": ["geopolitics", "foreign_affairs"],
        "general": ["geopolitics"],
    }
    return module_map.get(topic, ["geopolitics"])
