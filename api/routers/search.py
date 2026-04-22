from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from agents.semantic_search import semantic_search_posts
from api.dependencies import UserContext, get_db, get_user_context

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    k: int = Field(default=20, ge=1, le=100)
    filters: dict[str, Any] = Field(default_factory=dict)
    min_score: float | None = Field(default=None, ge=0.0, le=1.0)


@router.post("/posts/semantic")
def search_posts_semantic(
    payload: SemanticSearchRequest,
    db=Depends(get_db),
    ctx: UserContext = Depends(get_user_context),
):
    return semantic_search_posts(
        db,
        query=payload.query,
        tenant_id=ctx.tenant_id,
        limit=payload.k,
        filters=payload.filters,
        min_score=payload.min_score,
    )
