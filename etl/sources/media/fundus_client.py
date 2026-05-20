"""
Cliente Fundus para extracción de texto completo de artículos.

> **Sprint 2 · S2.4** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 2`)

Politeia ya tenia este cliente con `enrich_article_with_fundus(url)`. Sprint 2
añade:
  - list_es_publishers()  → lista los 7 publishers ES nativos de fundus
  - crawl_es_news(max)    → crawl masivo de medios ES con NormalizedItem
  - ELECTSIM_MEDIA_USE_FUNDUS=auto por defecto (activa si instalado)

Publishers ES nativos en fundus (a 2026-05):
  - El País (es.elpais.com) · RSS + Sitemap + News-Map
  - El Mundo
  - ABC
  - La Vanguardia
  - El Diario
  - Público
  - Mallorca (×2 · diaspora alemana en Mallorca)

Fundus: https://github.com/flairNLP/fundus (mantenido por Humboldt-U Berlin)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# 'auto' = activado si fundus está instalado · default Sprint 2
_FUNDUS_MODE = os.getenv("ELECTSIM_MEDIA_USE_FUNDUS", "auto").lower()
_USE_FUNDUS = _FUNDUS_MODE in {"true", "1", "yes", "auto"}
_FUNDUS_TIMEOUT = int(os.getenv("ELECTSIM_FUNDUS_TIMEOUT", "10"))

# ── Lazy loader de Fundus ─────────────────────────────────────────────────────

_fundus_available: bool | None = None


def _check_fundus() -> bool:
    """Verifica si Fundus está disponible (resultado cacheado)."""
    global _fundus_available
    if _fundus_available is not None:
        return _fundus_available
    try:
        import fundus  # noqa: F401
        _fundus_available = True
        logger.info("Fundus disponible para extracción de texto completo")
    except ImportError:
        _fundus_available = False
        logger.debug("Fundus no instalado — usar ELECTSIM_MEDIA_USE_FUNDUS=true + pip install fundus")
    return _fundus_available


# ── API pública ───────────────────────────────────────────────────────────────

def enrich_article_with_fundus(
    url: str,
    source_name: str = "",
) -> dict[str, Any]:
    """
    Extrae el texto completo de un artículo con Fundus.

    Args:
        url: URL del artículo.
        source_name: nombre de la fuente (para logging).

    Returns:
        dict con keys: text (str|None), title (str|None), authors (list[str]),
                       publishing_date (datetime|None), summary (str|None).
        Si Fundus no está disponible o falla, devuelve dict con todos None.
    """
    empty: dict[str, Any] = {
        "text": None,
        "title": None,
        "authors": [],
        "publishing_date": None,
        "summary": None,
    }

    if not _USE_FUNDUS or not url:
        return empty

    if not _check_fundus():
        return empty

    try:
        from fundus import Crawler, PublisherCollection
        import threading

        result: dict[str, Any] = dict(empty)

        def _crawl() -> None:
            try:
                crawler = Crawler(PublisherCollection.us, PublisherCollection.eu)
                articles = list(crawler.crawl(urls=[url], max_articles=1, timeout=_FUNDUS_TIMEOUT))
                if articles:
                    art = articles[0]
                    result["text"] = getattr(art, "plaintext", None)
                    result["title"] = getattr(art, "title", None)
                    result["authors"] = list(getattr(art, "authors", []) or [])
                    result["publishing_date"] = getattr(art, "publishing_date", None)
                    result["summary"] = getattr(art, "summary", None)
            except Exception as exc:
                logger.debug("Fundus crawl error for %s: %s", url, exc)

        # Ejecutar en hilo con timeout para no bloquear el pipeline
        t = threading.Thread(target=_crawl, daemon=True)
        t.start()
        t.join(timeout=_FUNDUS_TIMEOUT + 2)

        return result

    except Exception as exc:
        logger.debug("enrich_article_with_fundus error (%s): %s", source_name, exc)
        return empty


# ────────────────────────────────────────────────────────────────────
# Sprint 2 · S2.4 · crawl de medios ES + NormalizedItem
# ────────────────────────────────────────────────────────────────────

# Publishers ES nativos de fundus · sincronizado con
# gits amigos/fundus-master/src/fundus/publishers/es/__init__.py
ES_PUBLISHERS: tuple[str, ...] = (
    "ElPais",
    "ElMundo",
    "ABC",
    "LaVanguardia",
    "ElDiario",
    "Publico",
)


def list_es_publishers() -> list[dict[str, str]]:
    """Lista los publishers españoles que Fundus puede crawlear.

    Returns:
      [{"name": "ElPais", "host": "elpais.com", "available": True}, ...]
    """
    if not _USE_FUNDUS or not _check_fundus():
        return [
            {"name": name, "host": "", "available": False}
            for name in ES_PUBLISHERS
        ]
    try:
        from fundus import PublisherCollection
        es = getattr(PublisherCollection, "es", None)
        if es is None:
            return [
                {"name": name, "host": "", "available": False}
                for name in ES_PUBLISHERS
            ]
        out: list[dict[str, str]] = []
        # PublisherCollection.es es un PublisherGroup con publishers como atributos
        for name in ES_PUBLISHERS:
            pub = getattr(es, name, None)
            if pub is None:
                out.append({"name": name, "host": "", "available": False})
                continue
            # fundus expone domain via .source_info.domain o .domain dependiendo de version
            host = ""
            for attr_chain in [("source_info", "domain"), ("domain",)]:
                obj: Any = pub
                try:
                    for a in attr_chain:
                        obj = getattr(obj, a)
                    if obj:
                        host = str(obj)
                        break
                except AttributeError:
                    continue
            out.append({
                "name": name,
                "host": host,
                "available": True,
            })
        return out
    except Exception as exc:
        logger.debug("list_es_publishers · %s", exc)
        return [
            {"name": name, "host": "", "available": False}
            for name in ES_PUBLISHERS
        ]


def crawl_es_news(
    max_articles: int = 50,
    publishers: list[str] | None = None,
    timeout_s: int | None = None,
) -> list[dict[str, Any]]:
    """Crawl masivo de medios ES via Fundus.

    Args:
      max_articles: límite total
      publishers: lista de nombres (ej. ['ElPais', 'ElMundo']) o None=todos
      timeout_s: timeout total

    Returns:
      Lista de dicts compatibles con NormalizedItem:
      [{
        "source": "rss",  # o el host concreto
        "item_id": "<hash o URL>",
        "title": "...",
        "body": "<plaintext extraído>",
        "summary": "...",
        "url": "https://www.elpais.com/...",
        "published_at": datetime,
        "author": "...",
        "raw_hash": "...",
      }, ...]

      Lista vacía si Fundus no disponible.
    """
    if not _USE_FUNDUS or not _check_fundus():
        return []

    try:
        from fundus import Crawler, PublisherCollection
        es = getattr(PublisherCollection, "es", None)
        if es is None:
            return []

        # Filtrar publishers si se especificaron
        if publishers:
            wanted = set(p.lower() for p in publishers)
            pubs = [p for p in es if p.publisher_name.lower() in wanted]
            if not pubs:
                logger.warning("crawl_es_news: ningún publisher coincide con %s", publishers)
                return []
            crawler = Crawler(*pubs)
        else:
            crawler = Crawler(es)

        results: list[dict[str, Any]] = []
        for art in crawler.crawl(max_articles=max_articles):
            url = str(getattr(art, "html", None).requested_url) if getattr(art, "html", None) else ""
            title = getattr(art, "title", None) or ""
            body = getattr(art, "plaintext", None) or ""
            summary = getattr(art, "summary", None) or ""
            pub_date = getattr(art, "publishing_date", None) or datetime.now(timezone.utc)
            authors = list(getattr(art, "authors", []) or [])

            # raw_hash determinista para dedup
            import hashlib
            raw_hash = hashlib.sha256(f"{url}|{title}".encode("utf-8")).hexdigest()

            results.append({
                "source": "rss",  # SourceKind válido
                "item_id": url or raw_hash,
                "title": title.strip(),
                "body": body.strip(),
                "summary": summary.strip(),
                "url": url,
                "published_at": pub_date if isinstance(pub_date, datetime) else datetime.now(timezone.utc),
                "author": ", ".join(authors)[:240],
                "raw_hash": raw_hash,
                "language": "es",
                "payload": {
                    "fundus_publisher": art.publisher_name if hasattr(art, "publisher_name") else "",
                },
            })

        logger.info("crawl_es_news: %d articulos crawlados", len(results))
        return results

    except Exception as exc:
        logger.warning("crawl_es_news · %s", exc)
        return []


def enrich_many(
    urls_and_names: list[tuple[str, str]],
    max_workers: int = 5,
) -> dict[str, dict[str, Any]]:
    """
    Enriquece múltiples URLs con Fundus en paralelo.

    Args:
        urls_and_names: lista de (url, source_name).
        max_workers: paralelismo máximo.

    Returns:
        dict {url: resultado_fundus}
    """
    if not _USE_FUNDUS or not urls_and_names:
        return {}

    from concurrent.futures import ThreadPoolExecutor, as_completed

    results: dict[str, dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(enrich_article_with_fundus, url, name): url
            for url, name in urls_and_names
        }
        for fut in as_completed(futures, timeout=_FUNDUS_TIMEOUT * 2):
            url = futures[fut]
            try:
                results[url] = fut.result()
            except Exception:
                results[url] = {"text": None, "title": None, "authors": [], "publishing_date": None, "summary": None}

    return results
