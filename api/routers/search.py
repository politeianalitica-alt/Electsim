from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from agents.semantic_search import semantic_search_posts
from api.dependencies import UserContext, get_db, get_user_context

router = APIRouter()


@router.post("/posts/semantic")
def search_posts_semantic(
    payload: dict[str, Any],
    db=Depends(get_db),
    ctx: UserContext = Depends(get_user_context),
):
    return semantic_search_posts(
        db,
        query=str(payload.get("query", "")),
        tenant_id=ctx.tenant_id,
        limit=int(payload.get("k", 20)),
        filters=payload.get("filters") or {},
        min_score=payload.get("min_score"),
    )
