"""
Social Post Builder — Bloque 16.

Construye posts, hilos y copy para LinkedIn, X/Twitter e infografías.
Respeta límites de caracteres y principios éticos: no inventar datos.
"""
from __future__ import annotations

import logging
from typing import Any

from communications.schemas import ContentAsset, MessageFrame

logger = logging.getLogger(__name__)

LINKEDIN_LIMIT = 3000
TWEET_LIMIT = 280
THREAD_TWEET_LIMIT = 270  # con margen para (n/N)


def build_linkedin_post(frame: MessageFrame, max_chars: int = LINKEDIN_LIMIT) -> ContentAsset:
    points = "\n".join(f"✅ {p}" for p in frame.supporting_points[:5]) if frame.supporting_points else ""
    audience = f"\n\n👥 Para: {frame.target_audience}" if frame.target_audience else ""
    evidence = f"\n\n📎 Evidencias: {len(frame.evidence_ids)} fuentes." if frame.evidence_ids else ""
    hashtags = _hashtags_for_frame(frame)

    body = (
        f"**{frame.title}**\n\n"
        f"{frame.core_claim}\n\n"
        f"{points}"
        f"{audience}"
        f"{evidence}\n\n"
        f"{hashtags}"
    ).strip()

    if len(body) > max_chars:
        body = body[:max_chars - 3] + "…"

    return ContentAsset(
        title=f"LinkedIn: {frame.title[:60]}",
        asset_type="linkedin_post",
        body_markdown=body,
        short_copy=frame.core_claim[:150],
        message_frame_id=frame.frame_id,
        tone=frame.tone,
        evidence_ids=frame.evidence_ids,
        tenant_id=frame.tenant_id,
    )


def build_tweet(frame: MessageFrame, max_chars: int = TWEET_LIMIT) -> ContentAsset:
    core = frame.core_claim
    if len(core) > max_chars - 10:
        core = core[:max_chars - 13] + "…"
    tag = _primary_hashtag(frame)
    body = f"{core} {tag}".strip()
    if len(body) > max_chars:
        body = body[:max_chars - 1] + "…"

    return ContentAsset(
        title=f"Tweet: {frame.title[:50]}",
        asset_type="tweet",
        body_markdown=body,
        short_copy=body,
        message_frame_id=frame.frame_id,
        tone=frame.tone,
        evidence_ids=frame.evidence_ids,
        tenant_id=frame.tenant_id,
    )


def build_thread(frame: MessageFrame, max_tweets: int = 8) -> list[ContentAsset]:
    """Construye un hilo de X a partir de un marco de mensaje."""
    tweets = []
    points = frame.supporting_points or []

    # Tweet 1: gancho
    hook = f"🧵 {frame.title}\n\n{frame.core_claim[:200]}"
    if len(hook) > THREAD_TWEET_LIMIT:
        hook = hook[:THREAD_TWEET_LIMIT - 1] + "…"
    tweets.append(hook)

    # Tweets intermedios: puntos de apoyo
    for p in points[: max_tweets - 2]:
        t = f"📌 {p}"
        if len(t) > THREAD_TWEET_LIMIT:
            t = t[:THREAD_TWEET_LIMIT - 1] + "…"
        tweets.append(t)

    # Tweet final: cierre
    closing = f"💡 {frame.target_audience or 'Si te interesa'}, esto cambia el análisis. {_primary_hashtag(frame)}"
    if len(closing) > TWEET_LIMIT:
        closing = closing[:TWEET_LIMIT - 1] + "…"
    tweets.append(closing)

    # Añadir numeración
    n = len(tweets)
    assets = []
    for i, t in enumerate(tweets):
        num = f" ({i+1}/{n})" if n > 1 else ""
        body = t + num if len(t + num) <= TWEET_LIMIT else t[:TWEET_LIMIT - len(num) - 1] + "…" + num
        assets.append(ContentAsset(
            title=f"Thread ({i+1}/{n}): {frame.title[:40]}",
            asset_type="thread",
            body_markdown=body,
            short_copy=body,
            message_frame_id=frame.frame_id,
            tone=frame.tone,
            evidence_ids=frame.evidence_ids if i == 0 else [],
            tenant_id=frame.tenant_id,
        ))
    return assets


def build_infographic_caption(frame: MessageFrame, platform: str = "linkedin") -> ContentAsset:
    """Copy para acompañar una infografía."""
    body = (
        f"📊 {frame.title}\n\n"
        f"{frame.core_claim}\n\n"
        f"Fuente: {', '.join(frame.evidence_ids[:3]) if frame.evidence_ids else 'elaboración propia'}"
    )
    if platform == "twitter_x" and len(body) > TWEET_LIMIT:
        body = body[:TWEET_LIMIT - 1] + "…"

    return ContentAsset(
        title=f"Caption infografía: {frame.title[:50]}",
        asset_type="infographic_copy",
        body_markdown=body,
        short_copy=body[:150],
        message_frame_id=frame.frame_id,
        tone=frame.tone,
        tenant_id=frame.tenant_id,
    )


def _hashtags_for_frame(frame: MessageFrame) -> str:
    base = {"analytical": "#análisis #inteligencia", "campaign": "#campaña",
            "institutional": "#política", "urgent": "#urgente"}
    return base.get(frame.tone, "#análisis")


def _primary_hashtag(frame: MessageFrame) -> str:
    tags = _hashtags_for_frame(frame).split()
    return tags[0] if tags else ""
