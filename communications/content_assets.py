"""
Content Assets — Bloque 16.

CRUD de ContentAsset y búsqueda/filtrado.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from communications.schemas import ContentAsset
from communications.message_studio import _ASSETS, save_asset, get_asset, list_assets

logger = logging.getLogger(__name__)


def create_asset(
    title: str,
    asset_type: str,
    body_markdown: str,
    tenant_id: str = "default",
    **kwargs: Any,
) -> ContentAsset:
    asset = ContentAsset(
        title=title,
        asset_type=asset_type,
        body_markdown=body_markdown,
        tenant_id=tenant_id,
        **kwargs,
    )
    return save_asset(asset)


def update_asset_status(
    asset_id: str,
    status: str,
    tenant_id: str = "default",
) -> ContentAsset | None:
    asset = get_asset(asset_id)
    if asset is None:
        return None
    updated = asset.model_copy(update={"status": status, "updated_at": datetime.utcnow()})
    return save_asset(updated)


def search_assets(
    query: str = "",
    asset_type: str | None = None,
    status: str | None = None,
    tenant_id: str = "default",
    limit: int = 50,
) -> list[ContentAsset]:
    results = list_assets(tenant_id=tenant_id, status=status, limit=999)
    if asset_type:
        results = [a for a in results if a.asset_type == asset_type]
    if query:
        q = query.lower()
        results = [a for a in results
                   if q in a.title.lower() or q in a.body_markdown.lower()]
    return results[:limit]


def get_assets_pending_review(tenant_id: str = "default") -> list[ContentAsset]:
    return list_assets(tenant_id=tenant_id, status="review")


def archive_asset(asset_id: str) -> bool:
    asset = get_asset(asset_id)
    if asset is None:
        return False
    save_asset(asset.model_copy(update={"status": "archived"}))
    return True
