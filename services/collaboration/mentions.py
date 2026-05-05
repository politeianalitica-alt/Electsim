"""Sistema de @menciones."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict


_MENTION_RE = re.compile(r"@([A-Za-z0-9_\.\-]+)")


class Mention(BaseModel):
    """Una mención @user dentro de una anotación, mensaje o issue."""

    model_config = ConfigDict()

    id: str
    tenant_id: str
    mentioned_user_id: str
    mentioned_by_user_id: str
    context_type: str
    context_id: str
    text_excerpt: str
    created_at: datetime
    read: bool = False


# clave: mentioned_user_id -> list[Mention]
_MENTIONS: dict[str, list[Mention]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def parse_mentions(text: str) -> list[str]:
    """Extrae usernames mencionados con @user dentro de un texto."""

    if not text:
        return []
    found = _MENTION_RE.findall(text)
    seen: set[str] = set()
    result: list[str] = []
    for u in found:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def record_mention(
    tenant_id: str,
    mentioned_user_id: str,
    mentioned_by_user_id: str,
    context_type: str,
    context_id: str,
    text_excerpt: str,
) -> Mention:
    mention = Mention(
        id=_gen_id(),
        tenant_id=tenant_id,
        mentioned_user_id=mentioned_user_id,
        mentioned_by_user_id=mentioned_by_user_id,
        context_type=context_type,
        context_id=context_id,
        text_excerpt=text_excerpt[:280],
        created_at=_now(),
    )
    _MENTIONS.setdefault(mentioned_user_id, []).append(mention)
    return mention


def get_user_mentions(
    user_id: str,
    unread_only: bool = False,
    limit: int = 20,
) -> list[Mention]:
    bucket = list(_MENTIONS.get(user_id, []))
    if unread_only:
        bucket = [m for m in bucket if not m.read]
    bucket.sort(key=lambda m: m.created_at, reverse=True)
    return bucket[:limit]


def mark_mention_read(mention_id: str) -> bool:
    for bucket in _MENTIONS.values():
        for m in bucket:
            if m.id == mention_id:
                m.read = True
                return True
    return False


def count_unread_mentions(user_id: str) -> int:
    return sum(1 for m in _MENTIONS.get(user_id, []) if not m.read)
