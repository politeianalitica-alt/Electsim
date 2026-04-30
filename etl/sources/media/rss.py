"""
Conector RSS de medios de comunicacion para el pipeline event-driven.

Lee feeds RSS/Atom via feedparser con reintentos httpx.
Configurable por mercado (lista de outlets en spain.yaml).

Params disponibles (en IngestionSourceConfig.params):
    outlets_slugs:  Lista de slugs de medios (deben existir en market.media_outlets)
    max_per_outlet: Maximo de items a fetchear por outlet (default: 50)
    user_agent:     User-Agent para las peticiones (default: ElectSim/1.0)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, AsyncIterator, Optional

from etl.sources.base_connector import DataSourceConnector, NormalizedItem, RawItem

logger = logging.getLogger(__name__)

# Feeds de respaldo cuando no se pasa market config (stand-alone)
_FALLBACK_FEEDS: dict[str, str] = {
    "elpais":     "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "elmundo":    "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    "abc":        "https://www.abc.es/rss/feeds/abc_ultima.xml",
    "eldiario":   "https://www.eldiario.es/rss/",
    "lavanguardia": "https://www.lavanguardia.com/rss/home.xml",
    "europapress": "https://www.europapress.es/rss/rss.aspx",
    "20minutos":  "https://www.20minutos.es/rss/",
    "expansion":  "https://e00-expansion.uecdn.es/rss/portada.xml",
    "rtve":       "https://www.rtve.es/api/noticias.rss",
    "elconfidencial": "https://www.elconfidencial.com/rss/espana/",
}


class RSSMediaConnector(DataSourceConnector):
    """
    Conector RSS para medios de comunicacion.
    """

    def __init__(self, source_id: str, params: dict[str, Any]) -> None:
        super().__init__(source_id, params)
        self._outlets_slugs: list[str] = params.get("outlets_slugs") or list(_FALLBACK_FEEDS.keys())
        self._max_per_outlet: int = int(params.get("max_per_outlet", 50))
        self._user_agent: str = params.get("user_agent", "ElectSim/1.0 (+https://politeria.ai)")
        # market_context opcional para obtener URLs reales del YAML
        self._market_feeds: dict[str, str] = self._resolve_feeds_from_params(params)

    def _resolve_feeds_from_params(self, params: dict) -> dict[str, str]:
        """
        Intenta construir el mapa slug->feed_url desde los params inyectados por la factory.
        Si no, usa el diccionario de fallback.
        """
        feeds: dict[str, str] = {}
        # La factory puede inyectar _media_outlets como lista de dicts
        outlets_config = params.get("_media_outlets", [])
        if outlets_config:
            for outlet in outlets_config:
                slug = outlet.get("slug", "")
                feed_url = outlet.get("feed_url", "")
                if slug and feed_url:
                    feeds[slug] = feed_url

        # Para slugs sin URL en config, usar fallback
        for slug in self._outlets_slugs:
            if slug not in feeds and slug in _FALLBACK_FEEDS:
                feeds[slug] = _FALLBACK_FEEDS[slug]

        # Si no hay nada, usar todos los fallbacks
        if not feeds:
            feeds = dict(_FALLBACK_FEEDS)

        return feeds

    async def fetch_items(self, since: Optional[datetime] = None) -> AsyncIterator[RawItem]:
        """
        Fetchea feeds RSS de los outlets configurados.
        Filtra por `since` si se proporciona.
        """
        import httpx
        import feedparser

        headers = {"User-Agent": self._user_agent}

        for slug in self._outlets_slugs:
            feed_url = self._market_feeds.get(slug)
            if not feed_url:
                logger.debug("Sin feed URL para outlet '%s'", slug)
                continue

            try:
                async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                    resp = await client.get(feed_url, headers=headers)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)

                count = 0
                for entry in feed.entries:
                    if count >= self._max_per_outlet:
                        break

                    pub_dt = self._parse_date(entry)
                    if since and pub_dt and pub_dt < since:
                        continue

                    yield RawItem({
                        "id": entry.get("id") or entry.get("link", ""),
                        "title": entry.get("title", ""),
                        "url": entry.get("link", ""),
                        "content": self._extract_content(entry),
                        "published_at": pub_dt.isoformat() if pub_dt else None,
                        "outlet_slug": slug,
                        "outlet_feed": feed_url,
                        "author": entry.get("author", ""),
                        "tags": [t.get("term", "") for t in entry.get("tags", [])],
                        "market_code": self.params.get("_market_code", ""),
                        "source_type": "media_rss",
                    })
                    count += 1

            except Exception as exc:
                logger.warning("RSS fetch error [%s / %s]: %s", slug, feed_url, exc)

    def _parse_date(self, entry: Any) -> Optional[datetime]:
        """Extrae y parsea la fecha de publicacion de una entrada RSS."""
        for field in ("published", "updated", "created"):
            raw = entry.get(field)
            if raw:
                try:
                    dt = parsedate_to_datetime(raw)
                    return dt.astimezone(timezone.utc).replace(tzinfo=timezone.utc)
                except Exception:
                    pass
        # Intenta parsed_tuple si feedparser lo tiene
        for field in ("published_parsed", "updated_parsed"):
            parsed = entry.get(field)
            if parsed:
                try:
                    import time as _time
                    ts = _time.mktime(parsed)
                    return datetime.fromtimestamp(ts, tz=timezone.utc)
                except Exception:
                    pass
        return None

    def _extract_content(self, entry: Any) -> str:
        """Extrae el contenido de texto de una entrada RSS."""
        # Intenta content (articulo completo) primero
        content = entry.get("content", [])
        if content and isinstance(content, list):
            return content[0].get("value", "")
        # Fallback a summary/description
        return entry.get("summary") or entry.get("description") or ""

    async def normalize(self, item: RawItem) -> NormalizedItem:
        return NormalizedItem({
            "source_id": self.source_id,
            "source_type": "media_rss",
            "external_id": item.get("id") or item.get("url", ""),
            "title": item.get("title", ""),
            "content": item.get("content", ""),
            "url": item.get("url", ""),
            "published_at": item.get("published_at"),
            "metadata": {
                "outlet_slug": item.get("outlet_slug"),
                "author": item.get("author"),
                "tags": item.get("tags", []),
                "market_code": item.get("market_code"),
            },
        })

    async def healthcheck(self) -> bool:
        import httpx
        for slug in self._outlets_slugs[:2]:  # Comprueba solo los primeros 2
            feed_url = self._market_feeds.get(slug)
            if not feed_url:
                continue
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.head(feed_url, headers={"User-Agent": self._user_agent})
                    if resp.status_code < 400:
                        return True
            except Exception:
                pass
        return False
