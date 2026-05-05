"""Adquisición de artículos desde fuentes mediáticas."""
from __future__ import annotations
import hashlib
import logging
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from media_intelligence.schemas import MediaArticle, MediaSourceHealth
from media_intelligence.source_health import record_source_success, record_source_failure

log = logging.getLogger(__name__)
_MAX_WORKERS = 10
_TIMEOUT = 10


def _source_id(name: str) -> str:
    return hashlib.md5(name.encode()).hexdigest()[:12]


def fetch_source(source: dict, max_items: int = 15) -> tuple[list[MediaArticle], MediaSourceHealth]:
    """Descarga artículos de una fuente. Registra health."""
    name = source.get("name", "unknown")
    rss = source.get("rss") or source.get("url", "")
    lang = source.get("lang", "es")
    src_id = _source_id(name)

    if not rss:
        health = record_source_failure(src_id, name, None, "no_rss", "Fuente sin RSS configurado")
        return [], health

    try:
        import requests
        resp = requests.get(rss, timeout=_TIMEOUT, headers={"User-Agent": "ElectSim/1.0"})
        http_status = resp.status_code

        if resp.status_code == 404:
            h = record_source_failure(src_id, name, rss, "404", "HTTP 404", http_status)
            return [], h
        if resp.status_code == 403:
            h = record_source_failure(src_id, name, rss, "403", "HTTP 403 Forbidden", http_status)
            return [], h
        if resp.status_code >= 400:
            h = record_source_failure(src_id, name, rss, str(http_status), f"HTTP {http_status}", http_status)
            return [], h

        try:
            root = ET.fromstring(resp.content)
        except ET.ParseError as pe:
            if "<html" in resp.text[:300].lower():
                h = record_source_failure(src_id, name, rss, "non_xml", "Devuelve HTML", http_status)
            else:
                h = record_source_failure(src_id, name, rss, "parse_error", str(pe)[:200], http_status)
            return [], h

        items = root.findall(".//item")
        if not items:
            atom_ns = "http://www.w3.org/2005/Atom"
            items = root.findall(f"{{{atom_ns}}}entry")

        articles = []
        for item in items[:max_items]:
            title = _text(item, "title") or _text_ns(item, "title")
            link = _text(item, "link") or _text_ns(item, "link")
            summary = (
                _text(item, "description")
                or _text(item, "summary")
                or _text_ns(item, "summary")
            )
            pub = (
                _text(item, "pubDate")
                or _text(item, "published")
                or _text_ns(item, "published")
            )

            if not title and not link:
                continue

            art_id = hashlib.sha256((link or title or "").encode()).hexdigest()[:16]
            articles.append(
                MediaArticle(
                    article_id=art_id,
                    source_id=src_id,
                    source_name=name,
                    title=title or "",
                    original_title=title or "",
                    summary=summary[:1000] if summary else None,
                    original_summary=summary[:1000] if summary else None,
                    url=link or "",
                    published_at=pub,
                    lang=lang,
                    source_type=source.get("source_type", "general"),
                    source_priority=source.get("source_priority", 3),
                    political_relevance=source.get("political_relevance", 50) / 100,
                    parser_used="rss",
                )
            )

        h = record_source_success(src_id, name, rss, len(articles), "rss")
        return articles, h

    except Exception as e:
        err = str(e).lower()
        if "timeout" in err:
            h = record_source_failure(src_id, name, rss, "timeout", str(e)[:200])
        elif "ssl" in err:
            h = record_source_failure(src_id, name, rss, "ssl_error", str(e)[:200])
        else:
            h = record_source_failure(src_id, name, rss, "unknown", str(e)[:200])
        return [], h


def _text(el, tag: str) -> str | None:
    child = el.find(tag)
    return child.text.strip() if child is not None and child.text else None


def _text_ns(el, tag: str) -> str | None:
    for ns in ("http://www.w3.org/2005/Atom", "http://purl.org/dc/elements/1.1/"):
        child = el.find(f"{{{ns}}}{tag}")
        if child is not None and child.text:
            return child.text.strip()
    return None


def fetch_priority_sources(
    sources: list[dict],
    max_priority: int = 2,
    max_items: int = 20,
) -> list[MediaArticle]:
    """Descarga solo fuentes de alta prioridad."""
    priority_sources = [s for s in sources if s.get("source_priority", 3) <= max_priority]
    return fetch_all_sources(priority_sources, max_items=max_items)


def fetch_all_sources(
    sources: list[dict],
    max_items: int = 15,
    max_workers: int = _MAX_WORKERS,
) -> list[MediaArticle]:
    """Descarga todas las fuentes en paralelo."""
    all_articles: list[MediaArticle] = []
    with ThreadPoolExecutor(max_workers=max_workers) as exc:
        futures = {exc.submit(fetch_source, src, max_items): src for src in sources}
        for fut in as_completed(futures, timeout=60):
            try:
                articles, _ = fut.result()
                all_articles.extend(articles)
            except Exception as e:
                log.debug("fetch_all_sources error: %s", e)
    log.info("fetch_all_sources: %d artículos de %d fuentes", len(all_articles), len(sources))
    return all_articles
