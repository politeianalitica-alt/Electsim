"""
Cliente RSS/Atom para el módulo de Medios & Narrativa.

Extrae y refactoriza la lógica de NewsAggregator de data_aggregator.py
en un cliente ETL limpio que devuelve list[RawMediaItem].

Soporta:
  - RSS 2.0 y Atom 1.0
  - Fetch paralelo con ThreadPoolExecutor
  - Metadatos geográficos desde MediaSource
  - Fallback elegante por fuente (una fuente que falla no mata el resto)
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

from .schemas import MediaSource, RawMediaItem

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

_USER_AGENT = "ElectSim-MediaBot/2.0 (electsim.ai)"
_FETCH_TIMEOUT = 8          # segundos por fuente
_MAX_WORKERS = 30           # máximo paralelo
_DEFAULT_MAX_ITEMS = 20     # artículos por fuente


# ── Parser RSS/Atom ───────────────────────────────────────────────────────────

_ATOM_NS = "http://www.w3.org/2005/Atom"


def _parse_rss_xml(
    xml_text: str,
    source_name: str,
    max_items: int = _DEFAULT_MAX_ITEMS,
) -> list[dict[str, Any]]:
    """
    Parsea XML de feed RSS 2.0 o Atom 1.0.
    Devuelve lista de dicts con campos crudos (no RawMediaItem todavía).
    """
    items: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.debug("XML parse error en %s: %s", source_name, exc)
        return items

    # Detectar entradas RSS o Atom
    rss_items = root.findall(".//item")
    if not rss_items:
        rss_items = root.findall(f".//{{{_ATOM_NS}}}entry")

    for elem in rss_items[:max_items]:
        def _text(tag: str, default: str = "") -> str:
            node = elem.find(tag)
            if node is None:
                node = elem.find(f"{{{_ATOM_NS}}}{tag}")
            if node is not None and node.text:
                return node.text.strip()
            return default

        titulo = _text("title")
        if not titulo:
            continue

        # URL — puede estar en texto del <link> o en atributo href (Atom)
        url = ""
        url_node = elem.find("link")
        if url_node is None:
            url_node = elem.find(f"{{{_ATOM_NS}}}link")
        if url_node is not None:
            url = (url_node.text or url_node.get("href") or "").strip()

        resumen = _text("description") or _text("summary") or _text("content")
        fecha_str = _text("pubDate") or _text("published") or _text("updated") or ""
        autor = _text("author") or _text("dc:creator") or ""

        items.append({
            "title": titulo,
            "url": url,
            "published_raw": fecha_str,
            "author": autor or None,
            "summary": resumen[:500] if resumen else None,
        })

    return items


# ── RSSMediaClient ────────────────────────────────────────────────────────────

class RSSMediaClient:
    """
    Cliente de feeds RSS/Atom para el pipeline de Medios & Narrativa.

    Carga las fuentes desde el catálogo MEDIA_FEEDS (dashboard.services.media_sources)
    o acepta una lista externa de MediaSource.

    Uso::

        client = RSSMediaClient()
        items = client.fetch_all(max_per_source=15)  # → list[RawMediaItem]
    """

    def __init__(
        self,
        sources: list[MediaSource] | None = None,
        max_workers: int = _MAX_WORKERS,
        timeout: int = _FETCH_TIMEOUT,
    ) -> None:
        self.sources = sources or _load_default_sources()
        self.max_workers = max_workers
        self.timeout = timeout

    # ── Fetch público ─────────────────────────────────────────────────────────

    def fetch_all(
        self,
        max_per_source: int = _DEFAULT_MAX_ITEMS,
        region_filter: str | None = None,
        language_filter: str | None = None,
    ) -> list[RawMediaItem]:
        """
        Descarga todos los feeds en paralelo.

        Args:
            max_per_source: artículos máximos por fuente.
            region_filter: filtra por fuente.region (p.ej. 'local_spain').
            language_filter: filtra por fuente.language (p.ej. 'es').

        Returns:
            list[RawMediaItem] — todos los artículos, sin duplicados de URL.
        """
        fuentes = self.sources
        if region_filter:
            fuentes = [s for s in fuentes if s.region == region_filter]
        if language_filter:
            fuentes = [s for s in fuentes if s.language == language_filter]

        fuentes_activas = [s for s in fuentes if s.active and s.rss]
        if not fuentes_activas:
            logger.warning("RSSMediaClient: no hay fuentes activas para el filtro dado")
            return []

        results: list[RawMediaItem] = []
        seen_urls: set[str] = set()

        n_workers = min(self.max_workers, len(fuentes_activas))
        with ThreadPoolExecutor(max_workers=n_workers) as pool:
            futures = {
                pool.submit(self._fetch_one, src, max_per_source): src.name
                for src in fuentes_activas
            }
            for fut in as_completed(futures, timeout=30):
                src_name = futures[fut]
                try:
                    batch = fut.result()
                    for item in batch:
                        if item.url and item.url in seen_urls:
                            continue
                        if item.url:
                            seen_urls.add(item.url)
                        results.append(item)
                except Exception as exc:
                    logger.debug("fetch_all error fuente %s: %s", src_name, exc)

        logger.info(
            "RSSMediaClient.fetch_all: %d artículos desde %d fuentes",
            len(results), len(fuentes_activas),
        )
        return results

    def fetch_one(self, source: MediaSource, max_items: int = _DEFAULT_MAX_ITEMS) -> list[RawMediaItem]:
        """Descarga una fuente concreta. Útil para tests y reintentos."""
        return self._fetch_one(source, max_items)

    # ── Fetch interno ─────────────────────────────────────────────────────────

    def _fetch_one(
        self, source: MediaSource, max_items: int
    ) -> list[RawMediaItem]:
        """Descarga y parsea un feed, devuelve RawMediaItem enriquecidos."""
        if not source.rss:
            return []
        try:
            import requests  # lazy import — no forzar dependencia en módulo
            resp = requests.get(
                source.rss,
                timeout=self.timeout,
                headers={"User-Agent": _USER_AGENT},
            )
            resp.raise_for_status()
            raw_dicts = _parse_rss_xml(resp.text, source.name, max_items)
        except Exception as exc:
            logger.debug("RSS fetch failed %s (%s): %s", source.name, source.rss, exc)
            return []

        items: list[RawMediaItem] = []
        fetched_ts = datetime.now(timezone.utc).isoformat()
        for d in raw_dicts:
            items.append(
                RawMediaItem(
                    source=source.name,
                    source_url=source.url or source.rss,
                    source_region=source.region,
                    source_country=source.country,
                    source_lat=source.lat,
                    source_lon=source.lon,
                    title=d["title"],
                    url=d.get("url", ""),
                    published_raw=d.get("published_raw"),
                    author=d.get("author"),
                    summary=d.get("summary"),
                    language=source.language,
                    raw_payload={
                        "fetched_at": fetched_ts,
                        "ideology_score": source.ideology_score,
                        "media_type": source.media_type,
                        "ccaa": source.ccaa,
                        "provincia": source.provincia,
                    },
                )
            )
        return items


# ── Carga de fuentes por defecto ──────────────────────────────────────────────

def _load_default_sources() -> list[MediaSource]:
    """
    Carga las fuentes desde el catálogo MEDIA_FEEDS de media_sources.py.
    Si no está disponible, usa las fuentes embebidas de data_aggregator.py.
    """
    raw_feeds: list[dict] = []

    # 1. Catálogo completo (350 fuentes)
    try:
        from dashboard.services.media_sources import MEDIA_FEEDS
        raw_feeds = MEDIA_FEEDS
    except Exception:
        try:
            from services.media_sources import MEDIA_FEEDS  # type: ignore
            raw_feeds = MEDIA_FEEDS
        except Exception:
            pass

    # 2. Fallback — fuentes embebidas de data_aggregator
    if not raw_feeds:
        try:
            from dashboard.services.data_aggregator import RSS_FEEDS_GEO
            raw_feeds = RSS_FEEDS_GEO
        except Exception:
            pass

    # 3. Fallback mínimo
    if not raw_feeds:
        raw_feeds = [
            {"name": "El País", "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
             "country": "Spain", "region": "local_spain", "lat": 40.42, "lon": -3.70, "lang": "es"},
            {"name": "El Mundo", "rss": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
             "country": "Spain", "region": "local_spain", "lat": 40.42, "lon": -3.70, "lang": "es"},
            {"name": "BBC News", "rss": "http://feeds.bbci.co.uk/news/rss.xml",
             "country": "UK", "region": "europe", "lat": 51.51, "lon": -0.13, "lang": "en"},
        ]

    sources = [MediaSource.from_feed_dict(d) for d in raw_feeds]
    logger.debug("_load_default_sources: %d fuentes cargadas", len(sources))
    return sources
