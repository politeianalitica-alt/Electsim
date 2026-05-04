"""
Cliente Fundus para extracción de texto completo de artículos.

Opcional — activado con ELECTSIM_MEDIA_USE_FUNDUS=true.
Si Fundus no está disponible, devuelve el artículo sin enriquecer.

Fundus: https://github.com/flairNLP/fundus
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_USE_FUNDUS = os.getenv("ELECTSIM_MEDIA_USE_FUNDUS", "false").lower() == "true"
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
