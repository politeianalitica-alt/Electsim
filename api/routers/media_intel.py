"""
api/routers/media_intel.py
Media & Narrative Intelligence endpoints.
All under /api/media-intel/ prefix.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/media-intel", tags=["media-intel"])


@router.get("/kpis")
def media_kpis() -> dict:
    from services.media.media_intel_service import get_kpis
    return get_kpis()


@router.get("/feed")
def media_feed(
    category: Optional[str] = Query(None),
    bias: Optional[str] = Query(None),
    partido: Optional[str] = Query(None),
    scope: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    from services.media.media_intel_service import get_feed
    return get_feed(category=category, bias=bias, partido=partido,
                    scope=scope, page=page, page_size=page_size)


@router.get("/bias-spectrum")
def media_bias_spectrum() -> list:
    from services.media.media_intel_service import get_bias_spectrum
    return get_bias_spectrum()


@router.get("/sentiment-heatmap")
def media_sentiment_heatmap() -> dict:
    from services.media.media_intel_service import get_sentiment_heatmap
    return get_sentiment_heatmap()


@router.get("/narratives")
def media_narratives_intel() -> list:
    from services.media.media_intel_service import get_narratives
    return get_narratives()


@router.get("/map/world")
def media_map_world() -> list:
    from services.media.media_intel_service import get_map_world
    return get_map_world()


@router.get("/map/europe")
def media_map_europe() -> list:
    from services.media.media_intel_service import get_map_europe
    return get_map_europe()


@router.get("/map/spain-ccaa")
def media_map_spain_ccaa() -> list:
    from services.media.media_intel_service import get_map_spain_ccaa
    return get_map_spain_ccaa()


@router.get("/source-health")
def media_source_health_intel() -> dict:
    from services.media.media_intel_service import get_source_health
    return get_source_health()
