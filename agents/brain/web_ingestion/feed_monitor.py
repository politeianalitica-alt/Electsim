"""
FeedMonitor — Monitor de feeds RSS para el Brain.

Monitoriza feeds RSS de medios españoles y europeos.
Detecta picos de cobertura sobre actores especificos
para disparar analisis proactivos.

Feeds configurados por defecto (medios españoles):
  El Pais, El Mundo, ABC, La Vanguardia, El Confidencial,
  Expansion, El Economista, 20 Minutos, Europa Press, EFE
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_FEEDS = [
    ("elpais", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"),
    ("elmundo", "https://www.elmundo.es/rss/portada.xml"),
    ("abc", "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml"),
    ("lavanguardia", "https://www.lavanguardia.com/rss/home.xml"),
    ("elconfidencial", "https://rss.elconfidencial.com/espana/"),
    ("expansion", "https://e00-expansion.uecdn.es/rss/portada.xml"),
    ("europapress", "https://www.europapress.es/rss/rss.aspx"),
    ("efe", "https://www.efe.com/efe/espana/1/rss"),
]


@dataclass
class FeedItem:
    source: str
    title: str
    url: str
    published_at: datetime
    summary: str = ""
    content_hash: str = ""

    def __post_init__(self) -> None:
        if not self.content_hash:
            self.content_hash = hashlib.sha1(
                (self.title + self.url).encode()
            ).hexdigest()[:12]


@dataclass
class MonitoringResult:
    items: list[FeedItem] = field(default_factory=list)
    actor_mentions: dict[str, list[FeedItem]] = field(default_factory=dict)
    trending_actors: list[str] = field(default_factory=list)
    new_items_count: int = 0
    sources_checked: int = 0
    errors: list[str] = field(default_factory=list)

    def items_for_actor(self, actor: str) -> list[FeedItem]:
        return self.actor_mentions.get(actor, [])

    def has_spike(self, actor: str, threshold: int = 5) -> bool:
        """True si el actor aparece en >= threshold items."""
        return len(self.items_for_actor(actor)) >= threshold


class FeedMonitor:
    """
    Monitor de feeds RSS para el Brain.

    Uso:
        monitor = FeedMonitor(actors=["Pedro Sanchez", "Feijoo"])
        result = await monitor.check()
        if result.has_spike("Pedro Sanchez"):
            # Disparar analisis proactivo
            pass
    """

    def __init__(
        self,
        feeds: list[tuple[str, str]] | None = None,
        actors: list[str] | None = None,
        seen_hashes: set[str] | None = None,
    ) -> None:
        self._feeds = feeds or _DEFAULT_FEEDS
        self._actors = actors or []
        self._seen: set[str] = seen_hashes or set()
        self._session: Any = None

    async def __aenter__(self) -> "FeedMonitor":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={"User-Agent": "PoliteiaBrain/1.0 (RSS Monitor)"},
            )
        except ImportError:
            logger.warning("httpx no disponible — FeedMonitor degradado")
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._session:
            await self._session.aclose()

    async def check(self, max_per_feed: int = 20) -> MonitoringResult:
        """
        Verifica todos los feeds y retorna los items nuevos.

        Args:
            max_per_feed: maximo de items a procesar por feed
        """
        tasks = [
            self._fetch_feed(source, url, max_per_feed)
            for source, url in self._feeds
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_items: list[FeedItem] = []
        errors: list[str] = []
        sources_ok = 0

        for i, r in enumerate(results):
            if isinstance(r, list):
                all_items.extend(r)
                sources_ok += 1
            elif isinstance(r, Exception):
                errors.append(f"{self._feeds[i][0]}: {r}")

        # Filtrar items ya vistos
        new_items = [
            item for item in all_items
            if item.content_hash not in self._seen
        ]
        for item in new_items:
            self._seen.add(item.content_hash)

        # Detectar menciones de actores
        actor_mentions: dict[str, list[FeedItem]] = {}
        for actor in self._actors:
            actor_lower = actor.lower()
            mentions = [
                item for item in new_items
                if actor_lower in item.title.lower()
                or actor_lower in item.summary.lower()
            ]
            if mentions:
                actor_mentions[actor] = mentions

        # Actores con pico de cobertura (>= 3 menciones)
        trending = [
            actor for actor, items in actor_mentions.items()
            if len(items) >= 3
        ]

        return MonitoringResult(
            items=new_items,
            actor_mentions=actor_mentions,
            trending_actors=trending,
            new_items_count=len(new_items),
            sources_checked=sources_ok,
            errors=errors,
        )

    async def _fetch_feed(
        self,
        source: str,
        url: str,
        max_items: int,
    ) -> list[FeedItem]:
        try:
            import feedparser  # type: ignore[import]
        except ImportError:
            # Usar httpx + parsing manual si feedparser no esta
            return await self._fetch_feed_manual(source, url, max_items)

        try:
            if self._session:
                resp = await self._session.get(url)
                content = resp.text
            else:
                import urllib.request
                with urllib.request.urlopen(url, timeout=10) as r:
                    content = r.read().decode("utf-8", errors="replace")

            feed = feedparser.parse(content)
            items = []
            for entry in feed.entries[:max_items]:
                try:
                    published = datetime.now(tz=timezone.utc)
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        import time as _time
                        published = datetime.fromtimestamp(
                            _time.mktime(entry.published_parsed), tz=timezone.utc
                        )

                    summary = ""
                    if hasattr(entry, "summary"):
                        summary = str(entry.summary)[:500]

                    items.append(FeedItem(
                        source=source,
                        title=str(getattr(entry, "title", ""))[:200],
                        url=str(getattr(entry, "link", "")),
                        published_at=published,
                        summary=summary,
                    ))
                except Exception:
                    continue
            return items
        except Exception as exc:
            raise RuntimeError(f"feed {source} error: {exc}") from exc

    async def _fetch_feed_manual(
        self, source: str, url: str, max_items: int
    ) -> list[FeedItem]:
        """Fallback sin feedparser: extraccion simple con regex."""
        if not self._session:
            return []
        try:
            resp = await self._session.get(url)
            content = resp.text
            import re
            titles = re.findall(r"<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>", content)
            links = re.findall(r"<link>(https?://[^<]+)</link>", content)

            items = []
            for i, (cdata, plain) in enumerate(titles[:max_items]):
                title = (cdata or plain).strip()
                link = links[i] if i < len(links) else ""
                if title and title != source:
                    items.append(FeedItem(
                        source=source,
                        title=title[:200],
                        url=link,
                        published_at=datetime.now(tz=timezone.utc),
                    ))
            return items
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc
