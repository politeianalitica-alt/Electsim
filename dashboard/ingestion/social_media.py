"""Ingesta social: X y YouTube."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Generator

import httpx
import pandas as pd

from dashboard.config import settings

logger = logging.getLogger(__name__)


def _parse_iso_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def fetch_social_stub() -> pd.DataFrame:
    """Mantiene compatibilidad con código legacy."""
    if not settings.twitter_bearer_token and not os.getenv("TWITTER_BEARER_TOKEN"):
        logger.info("Sin token de X, devolviendo stub vacio.")
    return pd.DataFrame(columns=["text", "created_at", "source"])


def fetch_x_reciente(query: str, max_results: int = 50, bearer_token: str | None = None) -> Generator[dict, None, None]:
    token = bearer_token or os.getenv("TWITTER_BEARER_TOKEN") or settings.twitter_bearer_token
    if not token:
        logger.warning("TWITTER_BEARER_TOKEN no definido; se omite X.")
        return

    url = "https://api.twitter.com/2/tweets/search/recent"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "query": query,
        "max_results": min(max_results, 100),
        "tweet.fields": "created_at,public_metrics,author_id,lang",
        "expansions": "author_id",
        "user.fields": "username,public_metrics",
    }
    try:
        r = httpx.get(url, headers=headers, params=params, timeout=30)
    except Exception as exc:
        logger.warning("Error X API: %s", exc)
        return

    if r.status_code != 200:
        logger.warning("X API status=%s body=%s", r.status_code, r.text[:300])
        return

    payload = r.json()
    users = {u.get("id"): u for u in payload.get("includes", {}).get("users", [])}

    for tw in payload.get("data", []) or []:
        author = users.get(tw.get("author_id"), {})
        metrics = tw.get("public_metrics", {})
        tw_id = str(tw.get("id", "")).strip()
        if not tw_id:
            continue
        text = str(tw.get("text", "")).strip()
        record = {
            "fuente": "x",
            "tipo": "x",
            "medio": "X / Twitter",
            "autor": author.get("username"),
            "url": f"https://x.com/i/web/status/{tw_id}",
            "titular": text[:500],
            "resumen": text[:500],
            "texto_completo": text,
            "fecha_publicacion": _parse_iso_date(tw.get("created_at")),
            "idioma": tw.get("lang") or "es",
            "alcance_est": int(author.get("public_metrics", {}).get("followers_count", 0) or 0),
            "likes": int(metrics.get("like_count", 0) or 0),
            "shares": int(metrics.get("retweet_count", 0) or 0),
            "comentarios": int(metrics.get("reply_count", 0) or 0),
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


def fetch_youtube(query: str, max_results: int = 20, api_key: str | None = None) -> Generator[dict, None, None]:
    key = api_key or os.getenv("YOUTUBE_API_KEY")
    if not key:
        logger.warning("YOUTUBE_API_KEY no definida; se omite YouTube.")
        return

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "key": key,
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": min(max_results, 50),
        "order": "date",
        "relevanceLanguage": "es",
    }
    try:
        r = httpx.get(url, params=params, timeout=30)
    except Exception as exc:
        logger.warning("Error YouTube API: %s", exc)
        return

    if r.status_code != 200:
        logger.warning("YouTube API status=%s body=%s", r.status_code, r.text[:250])
        return

    for item in r.json().get("items", []) or []:
        snip = item.get("snippet", {})
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        title = str(snip.get("title", "")).strip()
        desc = str(snip.get("description", "")).strip()
        channel = str(snip.get("channelTitle", "")).strip()
        record = {
            "fuente": "youtube",
            "tipo": "youtube",
            "medio": channel,
            "autor": channel,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "titular": title[:500],
            "resumen": desc[:1000],
            "texto_completo": None,
            "fecha_publicacion": _parse_iso_date(snip.get("publishedAt")),
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
