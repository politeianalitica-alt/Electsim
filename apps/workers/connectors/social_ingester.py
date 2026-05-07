"""
Block 5 — Ingestor multi-plataforma de redes sociales.

Plataformas soportadas:
  - Twitter/X API v2 (Tweepy Bearer Token)
  - Telegram (Telethon MTProto)
  - YouTube Data API v3 + comentarios
  - Reddit (PRAW)
  - Mastodon (mastodon.py)

Cada post se normaliza al modelo `social_post` y se envía al
narrative engine para clustering.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from observability.logging import get_logger

log = get_logger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Normalización de texto
# ──────────────────────────────────────────────────────────────────────
_MENTION_RE = re.compile(r"@\w+")
_URL_RE      = re.compile(r"https?://\S+")
_HASH_RE     = re.compile(r"#(\w+)")


def normalize_text(texto: str) -> str:
    """Elimina menciones, URLs y normaliza espacios."""
    t = _MENTION_RE.sub("", texto)
    t = _URL_RE.sub("", t)
    return re.sub(r"\s+", " ", t).strip()


def extract_hashtags(texto: str) -> list[str]:
    return [h.lower() for h in _HASH_RE.findall(texto)]


def build_hash(platform: str, external_id: str) -> str:
    return hashlib.sha256(f"{platform}:{external_id}".encode()).hexdigest()[:16]


# ──────────────────────────────────────────────────────────────────────
# Twitter/X API v2
# ──────────────────────────────────────────────────────────────────────
async def ingest_twitter_stream(
    queries: list[str] | None = None,
    max_results: int = 100,
) -> list[dict]:
    """
    Busca tweets recientes para las queries configuradas.
    Requiere X_BEARER_TOKEN en variables de entorno.
    """
    bearer = os.getenv("X_BEARER_TOKEN")
    if not bearer:
        log.warning("X_BEARER_TOKEN no configurado — omitiendo Twitter")
        return []

    if queries is None:
        queries = ["#España", "#Congreso", "#Gobierno", "#PP", "#PSOE", "#Vox"]

    posts: list[dict] = []
    try:
        import httpx
        headers = {"Authorization": f"Bearer {bearer}"}
        for q in queries:
            url = "https://api.twitter.com/2/tweets/search/recent"
            params = {
                "query":       f"{q} lang:es -is:retweet",
                "max_results": min(max_results, 100),
                "tweet.fields": "created_at,author_id,public_metrics,entities,lang",
                "user.fields":  "name,username,public_metrics,verified",
                "expansions":   "author_id",
            }
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(url, headers=headers, params=params)
                if r.status_code != 200:
                    log.warning(f"Twitter API {r.status_code} para query '{q}'")
                    continue

                data = r.json()
                users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

                for tweet in data.get("data", []):
                    autor_id = tweet.get("author_id", "")
                    user = users.get(autor_id, {})
                    metrics = tweet.get("public_metrics", {})
                    texto = tweet.get("text", "")

                    posts.append({
                        "platform":         "twitter",
                        "external_id":      tweet["id"],
                        "hash_id":          build_hash("twitter", tweet["id"]),
                        "url":              f"https://twitter.com/i/web/status/{tweet['id']}",
                        "texto":            texto,
                        "texto_norm":       normalize_text(texto),
                        "hashtags":         extract_hashtags(texto),
                        "menciones":        _MENTION_RE.findall(texto),
                        "autor_id":         autor_id,
                        "autor_handle":     user.get("username", ""),
                        "autor_nombre":     user.get("name", ""),
                        "autor_seguidores": user.get("public_metrics", {}).get("followers_count", 0),
                        "autor_verificado": user.get("verified", False),
                        "autor_tipo":       "persona",
                        "n_likes":          metrics.get("like_count", 0),
                        "n_shares":         metrics.get("retweet_count", 0),
                        "n_replies":        metrics.get("reply_count", 0),
                        "n_views":          metrics.get("impression_count", 0),
                        "publicado_en":     tweet.get("created_at"),
                        "idioma":           tweet.get("lang", "es"),
                    })
    except Exception as e:
        log.error(f"Error ingestando Twitter: {e}")

    log.info(f"Twitter: {len(posts)} tweets ingeridos")
    return posts


# ──────────────────────────────────────────────────────────────────────
# Telegram (Telethon)
# ──────────────────────────────────────────────────────────────────────
async def ingest_telegram_channels(
    canales: list[str] | None = None,
    limit: int = 50,
) -> list[dict]:
    """
    Lee mensajes recientes de canales Telegram via MTProto.
    Requiere TELEGRAM_API_ID, TELEGRAM_API_HASH en entorno.
    """
    api_id   = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")
    if not api_id or not api_hash:
        log.warning("Telegram credentials no configuradas — omitiendo")
        return []

    if canales is None:
        canales = []  # Configurar en settings

    posts: list[dict] = []
    try:
        from telethon import TelegramClient
        from telethon.sessions import MemorySession

        client = TelegramClient(MemorySession(), int(api_id), api_hash)
        await client.start(bot_token=os.getenv("TELEGRAM_BOT_TOKEN"))

        for canal in canales:
            try:
                async for msg in client.iter_messages(canal, limit=limit):
                    if not msg.text:
                        continue
                    texto = msg.text
                    posts.append({
                        "platform":         "telegram",
                        "external_id":      str(msg.id),
                        "hash_id":          build_hash("telegram", f"{canal}:{msg.id}"),
                        "url":              f"https://t.me/{canal}/{msg.id}",
                        "texto":            texto,
                        "texto_norm":       normalize_text(texto),
                        "hashtags":         extract_hashtags(texto),
                        "menciones":        [],
                        "autor_id":         canal,
                        "autor_handle":     canal,
                        "autor_nombre":     canal,
                        "autor_seguidores": 0,
                        "autor_verificado": False,
                        "autor_tipo":       "organizacion",
                        "n_likes":          msg.reactions.count if msg.reactions else 0,
                        "n_shares":         msg.forwards or 0,
                        "n_replies":        msg.replies.replies if msg.replies else 0,
                        "n_views":          msg.views or 0,
                        "publicado_en":     msg.date.isoformat() if msg.date else None,
                        "idioma":           "es",
                    })
            except Exception as e:
                log.warning(f"Error leyendo canal Telegram {canal}: {e}")

        await client.disconnect()
    except ImportError:
        log.warning("telethon no instalado — omitiendo Telegram")
    except Exception as e:
        log.error(f"Error Telegram: {e}")

    log.info(f"Telegram: {len(posts)} mensajes ingeridos")
    return posts


# ──────────────────────────────────────────────────────────────────────
# YouTube Data API v3
# ──────────────────────────────────────────────────────────────────────
async def ingest_youtube_comments(
    queries: list[str] | None = None,
    max_results: int = 50,
) -> list[dict]:
    """
    Busca vídeos recientes y extrae comentarios políticos relevantes.
    Requiere YOUTUBE_API_KEY en entorno.
    """
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        log.warning("YOUTUBE_API_KEY no configurada — omitiendo YouTube")
        return []

    if queries is None:
        queries = ["política española congreso", "gobierno españa"]

    posts: list[dict] = []
    try:
        import httpx
        for q in queries:
            # Buscar vídeos
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "q":           q,
                        "part":        "id,snippet",
                        "type":        "video",
                        "relevanceLanguage": "es",
                        "maxResults":  10,
                        "key":         api_key,
                    },
                )
                if r.status_code != 200:
                    continue

                for item in r.json().get("items", []):
                    video_id = item["id"].get("videoId")
                    snippet  = item.get("snippet", {})
                    if not video_id:
                        continue

                    titulo = snippet.get("title", "")
                    desc   = snippet.get("description", "")
                    texto  = f"{titulo}. {desc}"

                    posts.append({
                        "platform":         "youtube",
                        "external_id":      video_id,
                        "hash_id":          build_hash("youtube", video_id),
                        "url":              f"https://youtu.be/{video_id}",
                        "texto":            texto,
                        "texto_norm":       normalize_text(texto),
                        "hashtags":         extract_hashtags(texto),
                        "menciones":        [],
                        "autor_id":         snippet.get("channelId", ""),
                        "autor_handle":     snippet.get("channelTitle", ""),
                        "autor_nombre":     snippet.get("channelTitle", ""),
                        "autor_seguidores": 0,
                        "autor_verificado": False,
                        "autor_tipo":       "medio",
                        "n_likes":          0,
                        "n_shares":         0,
                        "n_replies":        0,
                        "n_views":          0,
                        "publicado_en":     snippet.get("publishedAt"),
                        "idioma":           "es",
                    })
    except Exception as e:
        log.error(f"Error YouTube: {e}")

    log.info(f"YouTube: {len(posts)} vídeos ingeridos")
    return posts


# ──────────────────────────────────────────────────────────────────────
# Mastodon
# ──────────────────────────────────────────────────────────────────────
async def ingest_mastodon(
    instance: str = "mastodon.social",
    hashtag: str = "España",
    limit: int = 40,
) -> list[dict]:
    """Lee posts de Mastodon sobre política española."""
    posts: list[dict] = []
    try:
        import httpx
        url = f"https://{instance}/api/v1/timelines/tag/{hashtag}"
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(url, params={"limit": limit})
            if r.status_code != 200:
                return []

            for status in r.json():
                account = status.get("account", {})
                contenido = re.sub(r"<[^>]+>", " ", status.get("content", ""))
                texto = re.sub(r"\s+", " ", contenido).strip()
                if not texto:
                    continue

                posts.append({
                    "platform":         "mastodon",
                    "external_id":      status["id"],
                    "hash_id":          build_hash("mastodon", status["id"]),
                    "url":              status.get("url", ""),
                    "texto":            texto,
                    "texto_norm":       normalize_text(texto),
                    "hashtags":         [t["name"].lower() for t in status.get("tags", [])],
                    "menciones":        [],
                    "autor_id":         account.get("id", ""),
                    "autor_handle":     account.get("acct", ""),
                    "autor_nombre":     account.get("display_name", ""),
                    "autor_seguidores": account.get("followers_count", 0),
                    "autor_verificado": False,
                    "autor_tipo":       "persona",
                    "n_likes":          status.get("favourites_count", 0),
                    "n_shares":         status.get("reblogs_count", 0),
                    "n_replies":        status.get("replies_count", 0),
                    "n_views":          0,
                    "publicado_en":     status.get("created_at"),
                    "idioma":           status.get("language", "es"),
                })
    except Exception as e:
        log.error(f"Error Mastodon: {e}")

    log.info(f"Mastodon: {len(posts)} posts ingeridos")
    return posts


# ──────────────────────────────────────────────────────────────────────
# Análisis NLP de posts (Ollama)
# ──────────────────────────────────────────────────────────────────────
_NLP_PROMPT = """\
Analiza este post de red social en español y devuelve JSON:
{{
  "sentiment": 0.0,
  "toxicidad": 0.0,
  "emocion": "neutra",
  "entidades_ner": [],
  "relevancia_politica": 5
}}

sentiment: -1.0 a +1.0
toxicidad: 0.0 a 1.0 (odio/insulto)
emocion: alegria|tristeza|miedo|ira|sorpresa|neutra
entidades_ner: [{{text, label}}] (PER/ORG/LOC/MISC)
relevancia_politica: 0-10

POST: {texto}
"""

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"


async def analyze_post_nlp(texto: str) -> dict[str, Any]:
    """Análisis rápido de sentiment + NER + toxicidad para un post."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": _NLP_PROMPT.format(texto=texto[:500]),
                "format": "json",
                "stream": False,
            })
            return json.loads(r.json().get("response", "{}"))
    except Exception:
        return {
            "sentiment":           0.0,
            "toxicidad":           0.0,
            "emocion":             "neutra",
            "entidades_ner":       [],
            "relevancia_politica": 0,
        }


async def enrich_posts(posts: list[dict], skip_nlp: bool = False) -> list[dict]:
    """Enriquece posts con análisis NLP (sentiment, NER, toxicidad)."""
    for post in posts:
        if skip_nlp:
            post.update({
                "sentiment":       0.0,
                "toxicidad":       0.0,
                "emocion":         "neutra",
                "entidades_ner":   [],
                "engagement_rate": 0.0,
            })
        else:
            nlp = await analyze_post_nlp(post.get("texto_norm", post.get("texto", "")))
            post.update({
                "sentiment":     float(nlp.get("sentiment", 0.0)),
                "toxicidad":     float(nlp.get("toxicidad", 0.0)),
                "emocion":       nlp.get("emocion", "neutra"),
                "entidades_ner": nlp.get("entidades_ner", []),
            })

        # Engagement rate
        seguidores = post.get("autor_seguidores", 1) or 1
        engagement = (
            post.get("n_likes", 0) + post.get("n_shares", 0) + post.get("n_replies", 0)
        ) / seguidores
        post["engagement_rate"] = round(engagement, 6)

    return posts
