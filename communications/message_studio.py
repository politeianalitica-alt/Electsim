"""
Message Studio — Bloque 16.

Convierte señales en marcos de mensaje y activos de contenido.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from communications.schemas import ContentAsset, MessageFrame

logger = logging.getLogger(__name__)

_FRAMES: dict[str, MessageFrame] = {}
_ASSETS: dict[str, ContentAsset] = {}


def create_message_frame(
    title: str,
    core_claim: str,
    supporting_points: list[str] | None = None,
    evidence_ids: list[str] | None = None,
    target_audience: str | None = None,
    tone: str = "analytical",
    frame_type: str = "data_insight",
    tenant_id: str = "default",
) -> MessageFrame:
    frame = MessageFrame(
        title=title,
        core_claim=core_claim,
        supporting_points=supporting_points or [],
        evidence_ids=evidence_ids or [],
        target_audience=target_audience,
        tone=tone,
        frame_type=frame_type,
        tenant_id=tenant_id,
    )
    _FRAMES[frame.frame_id] = frame
    _persist_frame(frame)
    return frame


def generate_content_asset(
    frame_id: str,
    asset_type: str,
    channel_id: str | None = None,
    language: str = "es",
    created_by: str | None = None,
    tenant_id: str = "default",
) -> ContentAsset:
    """Genera un ContentAsset desde un MessageFrame."""
    frame = _FRAMES.get(frame_id)
    body = _build_body_from_frame(frame, asset_type) if frame else f"[Marco {frame_id} no encontrado]"
    asset = ContentAsset(
        title=frame.title if frame else f"Contenido {asset_type}",
        asset_type=asset_type,
        body_markdown=body,
        channel_id=channel_id,
        message_frame_id=frame_id,
        language=language,
        tone=frame.tone if frame else "analytical",
        created_by=created_by,
        tenant_id=tenant_id,
        evidence_ids=frame.evidence_ids if frame else [],
    )
    _ASSETS[asset.asset_id] = asset
    _persist_asset(asset)
    return asset


def save_asset(asset: ContentAsset) -> ContentAsset:
    _ASSETS[asset.asset_id] = asset
    _persist_asset(asset)
    return asset


def get_asset(asset_id: str) -> ContentAsset | None:
    if asset_id in _ASSETS:
        return _ASSETS[asset_id]
    return _load_asset_db(asset_id)


def list_assets(tenant_id: str = "default", status: str | None = None, limit: int = 100) -> list[ContentAsset]:
    results = [a for a in _ASSETS.values() if a.tenant_id == tenant_id]
    if status:
        results = [a for a in results if a.status == status]
    return sorted(results, key=lambda a: a.created_at, reverse=True)[:limit]


def adapt_message_to_channel(
    content: str,
    channel_type: str,
    tone: str | None = None,
) -> str:
    """Adapta un mensaje al formato y límites del canal."""
    LIMITS = {"twitter_x": 280, "linkedin": 3000, "email": None, "newsletter": None}
    limit = LIMITS.get(channel_type)
    if channel_type == "twitter_x":
        if len(content) > 280:
            content = content[:277] + "…"
    elif channel_type == "linkedin":
        if len(content) > 3000:
            content = content[:2997] + "…"
    return content


def generate_variants(
    frame_id: str,
    asset_type: str,
    n: int = 3,
    tenant_id: str = "default",
) -> list[ContentAsset]:
    """Genera N variantes de un tipo de contenido a partir de un marco."""
    variants = []
    tones = ["analytical", "accessible", "institutional"]
    for i in range(min(n, len(tones))):
        frame = _FRAMES.get(frame_id)
        if frame:
            body = _build_body_from_frame(frame, asset_type, variant=i + 1)
            asset = ContentAsset(
                title=f"{frame.title} — variante {i + 1}",
                asset_type=asset_type,
                body_markdown=body,
                message_frame_id=frame_id,
                tone=tones[i],
                tenant_id=tenant_id,
                evidence_ids=frame.evidence_ids,
            )
        else:
            asset = ContentAsset(
                title=f"Variante {i + 1}",
                asset_type=asset_type,
                body_markdown=f"[Variante {i + 1} — frame {frame_id} no disponible]",
                message_frame_id=frame_id,
                tenant_id=tenant_id,
            )
        _ASSETS[asset.asset_id] = asset
        variants.append(asset)
    return variants


def _build_body_from_frame(frame: MessageFrame, asset_type: str, variant: int = 1) -> str:
    """Construye el cuerpo del contenido a partir de un marco de mensaje."""
    points = "\n".join(f"• {p}" for p in frame.supporting_points) if frame.supporting_points else ""
    evidence_note = f"\n\n*Evidencias: {', '.join(frame.evidence_ids)}*" if frame.evidence_ids else ""
    audience = f"\n\nAudiencia objetivo: {frame.target_audience}" if frame.target_audience else ""

    if asset_type == "linkedin_post":
        return (
            f"**{frame.title}**\n\n"
            f"{frame.core_claim}\n\n"
            f"{points}\n"
            f"{audience}"
            f"{evidence_note}"
        ).strip()
    elif asset_type == "tweet":
        short = frame.core_claim[:240] if len(frame.core_claim) > 240 else frame.core_claim
        return short
    elif asset_type in ("newsletter", "briefing"):
        return (
            f"# {frame.title}\n\n"
            f"**Mensaje central:** {frame.core_claim}\n\n"
            f"## Puntos de apoyo\n{points}\n"
            f"{audience}{evidence_note}"
        ).strip()
    elif asset_type in ("talking_points", "qa"):
        return (
            f"**Tema:** {frame.title}\n\n"
            f"**Mensaje central:**\n{frame.core_claim}\n\n"
            f"**Argumentos:**\n{points}"
            f"{evidence_note}"
        ).strip()
    elif asset_type == "press_note":
        return (
            f"**NOTA DE PRENSA**\n\n"
            f"**{frame.title}**\n\n"
            f"{frame.core_claim}\n\n"
            f"{points}"
            f"{evidence_note}"
        ).strip()
    else:
        return f"**{frame.title}**\n\n{frame.core_claim}\n\n{points}".strip()


def _persist_frame(frame: MessageFrame) -> None:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO message_frames
                   (frame_id, title, description, frame_type, core_claim,
                    supporting_points, evidence_ids, target_audience, tone,
                    risk_flags, tenant_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (frame_id) DO UPDATE SET
                   title=EXCLUDED.title, core_claim=EXCLUDED.core_claim,
                   supporting_points=EXCLUDED.supporting_points, updated_at=NOW()""",
                (frame.frame_id, frame.title, frame.description, frame.frame_type,
                 frame.core_claim, json.dumps(frame.supporting_points),
                 frame.evidence_ids, frame.target_audience, frame.tone,
                 frame.risk_flags, frame.tenant_id),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_frame: %s", exc)


def _persist_asset(asset: ContentAsset) -> None:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO content_assets
                   (asset_id, title, asset_type, body_markdown, short_copy,
                    channel_id, message_frame_id, source_objects, evidence_ids,
                    status, language, tone, created_by, tenant_id, workspace_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (asset_id) DO UPDATE SET
                   body_markdown=EXCLUDED.body_markdown, status=EXCLUDED.status,
                   tone=EXCLUDED.tone, updated_at=NOW()""",
                (asset.asset_id, asset.title, asset.asset_type, asset.body_markdown,
                 asset.short_copy, asset.channel_id, asset.message_frame_id,
                 json.dumps(asset.source_objects), asset.evidence_ids,
                 asset.status, asset.language, asset.tone, asset.created_by,
                 asset.tenant_id, asset.workspace_id),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_asset: %s", exc)


def _load_asset_db(asset_id: str) -> ContentAsset | None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM content_assets WHERE asset_id=%s", (asset_id,))
            row = cur.fetchone()
            if row and cur.description:
                d = {col.name: val for col, val in zip(cur.description, row)}
                return ContentAsset(**{k: v for k, v in d.items() if k in ContentAsset.model_fields})
    except Exception as exc:
        logger.debug("_load_asset_db: %s", exc)
    return None
