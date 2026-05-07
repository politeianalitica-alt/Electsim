"""Fuente adicional NewsAPI para monitorización de prensa."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import Generator

import httpx

_NEWSAPI_TRUNCATION = re.compile(r"\s*\[[\+\d]+ chars\]$")

logger = logging.getLogger(__name__)


def _parse_iso_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def fetch_newsapi(
    query: str = "politica España OR gobierno España OR elecciones España",
    page_size: int = 30,
    api_key: str | None = None,
) -> Generator[dict, None, None]:
    key = api_key or os.getenv("NEWSAPI_KEY")
    if not key:
        logger.info("NEWSAPI_KEY no definida; se omite NewsAPI.")
        return

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "es",
        "sortBy": "publishedAt",
        "pageSize": min(page_size, 100),
        "apiKey": key,
    }
    try:
        resp = httpx.get(url, params=params, timeout=20)
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        logger.warning("NewsAPI error: %s", exc)
        return

    for art in payload.get("articles", []) or []:
        source_name = (art.get("source") or {}).get("name")
        title = str(art.get("title") or "").strip()
        desc = str(art.get("description") or "").strip()
        body = _NEWSAPI_TRUNCATION.sub("", str(art.get("content") or "")).strip()
        article_url = str(art.get("url") or "").strip()
        if not article_url:
            continue
        record = {
            "fuente": "newsapi",
            "tipo": "newsapi",
            "medio": source_name or "NewsAPI",
            "autor": art.get("author"),
            "url": article_url,
            "titular": title[:2000],
            "resumen": desc[:4000],
            "texto_completo": body[:8000] if body else None,
            "fecha_publicacion": _parse_iso_date(art.get("publishedAt")),
            "idioma": "es",
            "alcance_est": 0,
            "likes": 0,
            "shares": 0,
            "comentarios": 0,
            "sentimiento_score": None,
            "sentimiento_label": None,
            "tono": None,
            "categoria": None,
            "categorias_json": [],
            "partidos_mencionados": None,
            "personas_mencionadas": None,
            "embedding_vector": None,
            "procesado": False,
            "cliente_id": None,
        }
        try:
            from agents.scraper_ai import enrich_article

            record = enrich_article(record)
        except Exception:
            pass
        yield record
