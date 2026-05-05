"""
Channel Registry — Bloque 16.

Gestión de canales de comunicación: LinkedIn, X, newsletter, email, etc.
"""
from __future__ import annotations

import logging
from typing import Any

from communications.schemas import CommunicationChannel

logger = logging.getLogger(__name__)

_CHANNELS: dict[str, CommunicationChannel] = {}

DEFAULT_CHANNELS = [
    {"name": "LinkedIn", "channel_type": "linkedin", "character_limit": 3000, "requires_approval": True},
    {"name": "X / Twitter", "channel_type": "twitter_x", "character_limit": 280, "requires_approval": True},
    {"name": "Newsletter", "channel_type": "newsletter", "requires_approval": True},
    {"name": "Email", "channel_type": "email", "requires_approval": True},
    {"name": "Nota de Prensa", "channel_type": "press_release", "requires_approval": True},
    {"name": "Briefing Interno", "channel_type": "briefing", "requires_approval": False},
    {"name": "Memo Interno", "channel_type": "internal_memo", "requires_approval": False},
]


def seed_default_channels(tenant_id: str = "default") -> list[CommunicationChannel]:
    """Crea los canales por defecto si no existen."""
    created = []
    for d in DEFAULT_CHANNELS:
        existing = [c for c in _CHANNELS.values()
                    if c.channel_type == d["channel_type"] and c.tenant_id == tenant_id]
        if existing:
            continue
        ch = create_channel(tenant_id=tenant_id, **d)
        created.append(ch)
    logger.info("seed_default_channels: %d canales creados", len(created))
    return created


def create_channel(
    name: str,
    channel_type: str,
    tenant_id: str = "default",
    requires_approval: bool = True,
    character_limit: int | None = None,
    **kwargs: Any,
) -> CommunicationChannel:
    ch = CommunicationChannel(
        name=name,
        channel_type=channel_type,
        tenant_id=tenant_id,
        requires_approval=requires_approval,
        character_limit=character_limit,
        **kwargs,
    )
    _CHANNELS[ch.channel_id] = ch
    _persist_channel(ch)
    return ch


def get_channel(channel_id: str) -> CommunicationChannel | None:
    if channel_id in _CHANNELS:
        return _CHANNELS[channel_id]
    return _load_channel_db(channel_id)


def get_channel_by_type(channel_type: str, tenant_id: str = "default") -> CommunicationChannel | None:
    for c in _CHANNELS.values():
        if c.channel_type == channel_type and c.tenant_id == tenant_id:
            return c
    return None


def list_channels(tenant_id: str = "default", active_only: bool = True) -> list[CommunicationChannel]:
    results = [c for c in _CHANNELS.values() if c.tenant_id == tenant_id]
    if active_only:
        results = [c for c in results if c.is_active]
    return sorted(results, key=lambda c: c.name)


def _persist_channel(ch: CommunicationChannel) -> None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO comms_channels
                   (channel_id, name, channel_type, owner, tenant_id, is_active,
                    requires_approval, supports_direct_publish, character_limit, metadata)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (channel_id) DO UPDATE SET
                   name=EXCLUDED.name, is_active=EXCLUDED.is_active,
                   requires_approval=EXCLUDED.requires_approval, updated_at=NOW()""",
                (ch.channel_id, ch.name, ch.channel_type, ch.owner, ch.tenant_id,
                 ch.is_active, ch.requires_approval, ch.supports_direct_publish,
                 ch.character_limit, ch.metadata),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_channel: %s", exc)


def _load_channel_db(channel_id: str) -> CommunicationChannel | None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM comms_channels WHERE channel_id=%s", (channel_id,))
            row = cur.fetchone()
            if row and cur.description:
                d = {col.name: val for col, val in zip(cur.description, row)}
                ch = CommunicationChannel(**{k: v for k, v in d.items() if k in CommunicationChannel.model_fields})
                _CHANNELS[ch.channel_id] = ch
                return ch
    except Exception as exc:
        logger.debug("_load_channel_db: %s", exc)
    return None
