"""
Scraper GDELT 2.0 — Global Database of Events, Language, and Tone
API sin registro: https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

_QUERIES_ESPANA = [
    "Spain OR España geopolitics",
    "theme:ENERGY_CRISIS sourcecountry:SP",
    "Spain NATO OR OTAN",
    "Argelia España gas",
    "Marruecos España migracion",
    "Spain Ukraine war",
    "Spain Mediterranean",
    "IBEX Repsol Iberdrola geopolitics",
]


def _fetch_gdelt_query(query: str, max_records: int = 20) -> list[dict]:
    """Ejecuta una query GDELT Doc API y retorna artículos normalizados."""
    try:
        import httpx
    except ImportError:
        logger.warning("httpx no instalado")
        return []
    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": max_records,
        "format": "json",
        "sort": "DateDesc",
        "timespan": "7d",
    }
    try:
        resp = httpx.get(GDELT_DOC_API, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("articles", [])
    except Exception as exc:
        logger.debug("GDELT query '%s': %s", query[:40], exc)
        return []


def run_gdelt(max_queries: int = 4) -> list[dict]:
    """
    Descarga artículos GDELT sobre España/geopolítica.
    Retorna items en formato osint_items para merge con el store.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import hashlib

    queries = _QUERIES_ESPANA[:max_queries]
    todos: list[dict] = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(_fetch_gdelt_query, q): q for q in queries}
        for future in as_completed(futures, timeout=45):
            try:
                articles = future.result()
                for art in articles:
                    url = art.get("url", "")
                    titulo = art.get("title", "")
                    if not url or not titulo:
                        continue
                    url_hash = hashlib.md5(url.encode()).hexdigest()
                    todos.append({
                        "id": url_hash,
                        "titulo": titulo[:400],
                        "contenido": "",
                        "resumen_ollama": "",
                        "url": url,
                        "fuente": art.get("domain", "gdelt"),
                        "fuente_tipo": "gdelt",
                        "idioma_original": art.get("language", "en"),
                        "relevancia_espana": 0.65,
                        "urgencia": 2,
                        "categoria": "",
                        "subcategoria": "",
                        "paises_mencionados": [],
                        "actores_mencionados": [],
                        "temas": ["gdelt"],
                        "sentimiento": "neutro",
                        "fecha_publicacion": art.get("seendate", datetime.now(timezone.utc).isoformat()),
                        "fecha_scraping": datetime.now(timezone.utc).isoformat(),
                        "procesado_llm": False,
                    })
            except Exception as exc:
                logger.debug("GDELT future error: %s", exc)

    # Deduplicar por url_hash
    seen: set[str] = set()
    unique: list[dict] = []
    for item in todos:
        if item["id"] not in seen:
            seen.add(item["id"])
            unique.append(item)

    return unique
