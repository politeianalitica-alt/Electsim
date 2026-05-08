"""
Actor Enrichment Pipeline
Enriches actors with data from free, public sources:
  1. Google News RSS  — recent news (no auth required)
  2. Wikipedia REST API — bio, description, thumbnail (no auth)
  3. BOE search — legislative mentions (public HTML)
  4. Congreso.es OpenData — parlamentary group, committees (public API)
"""

import asyncio
from datetime import datetime
from typing import Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=es&gl=ES&ceid=ES:es"
WIKIPEDIA_API   = "https://es.wikipedia.org/api/rest_v1/page/summary/{title}"
CONGRESO_BASE   = "https://www.congreso.es/opendata/api/v2"


async def fetch_google_news(actor_name: str) -> list[dict]:
    """Fetch recent news from Google News RSS. No API key required."""
    if not HAS_HTTPX or not HAS_FEEDPARSER:
        return []
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            url = GOOGLE_NEWS_RSS.format(query=actor_name.replace(" ", "+"))
            r = await client.get(url)
            feed = feedparser.parse(r.text)
            articles = []
            for entry in feed.entries[:20]:
                articles.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "source": (entry.get("source") or {}).get("title", ""),
                    "published_at": entry.get("published", ""),
                    "summary": (entry.get("summary") or "")[:500],
                })
            return articles
    except Exception:
        return []


async def fetch_wikipedia(actor_name: str) -> Optional[dict]:
    """Fetch Wikipedia summary. No API key required."""
    if not HAS_HTTPX:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            wiki_title = actor_name.replace(" ", "_")
            r = await client.get(WIKIPEDIA_API.format(title=wiki_title))
            if r.status_code == 200:
                data = r.json()
                return {
                    "extract": data.get("extract", "")[:1500],
                    "description": data.get("description", ""),
                    "thumbnail_url": (data.get("thumbnail") or {}).get("source"),
                    "url": (data.get("content_urls") or {}).get("desktop", {}).get("page"),
                }
            # Try with just first+last name if full name fails
            parts = actor_name.split()
            if len(parts) > 2:
                short = f"{parts[0]}_{parts[-1]}"
                r2 = await client.get(WIKIPEDIA_API.format(title=short))
                if r2.status_code == 200:
                    data = r2.json()
                    return {
                        "extract": data.get("extract", "")[:1500],
                        "description": data.get("description", ""),
                        "thumbnail_url": (data.get("thumbnail") or {}).get("source"),
                        "url": (data.get("content_urls") or {}).get("desktop", {}).get("page"),
                    }
    except Exception:
        pass
    return None


async def enrich_actor(actor_id: str, actor_name: str) -> dict:
    """
    Enrich a single actor with all available public data sources.
    Returns a dict ready for upsert into actor_enrichment_cache.
    """
    # Run all fetches concurrently
    news_task = asyncio.create_task(fetch_google_news(actor_name))
    wiki_task = asyncio.create_task(fetch_wikipedia(actor_name))

    news, wiki = await asyncio.gather(news_task, wiki_task, return_exceptions=True)

    if isinstance(news, Exception):
        news = []
    if isinstance(wiki, Exception):
        wiki = None

    return {
        "actor_id": actor_id,
        "recent_news_json": news if isinstance(news, list) else [],
        "wiki_extract": wiki.get("extract") if wiki else None,
        "wiki_description": wiki.get("description") if wiki else None,
        "wiki_thumbnail_url": wiki.get("thumbnail_url") if wiki else None,
        "wiki_url": wiki.get("url") if wiki else None,
        "updated_at": datetime.utcnow(),
    }
