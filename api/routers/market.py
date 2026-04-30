"""
Router de endpoints de informacion de mercado.
Prefijo: /market
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from api.context.market_context import MarketContext
from api.market_dep import get_market_context
from config.market_loader import list_available_markets

router = APIRouter()


@router.get("/info", summary="Informacion del mercado activo")
async def market_info(
    market: MarketContext = Depends(get_market_context),
) -> dict[str, Any]:
    """
    Devuelve los metadatos basicos del mercado activo:
    codigo, nombre, locale, timezone, numero de partidos y fuentes.
    """
    return {
        "market_code": market.market_code,
        "name": market.config.name,
        "default_locale": market.default_locale,
        "timezone": market.timezone,
        "country_iso": market.country_iso,
        "currency": market.config.currency,
        "parties_count": len(market.config.parties),
        "media_outlets_count": len(market.config.media_outlets),
        "ingestion_sources_count": len(market.config.ingestion_sources),
        "dlcs_available": market.config.dlcs_available,
    }


@router.get("/parties", summary="Partidos configurados en el mercado activo")
async def market_parties(
    market: MarketContext = Depends(get_market_context),
) -> list[dict[str, Any]]:
    return [
        {
            "slug": p.slug,
            "name": p.name,
            "color_hex": p.color_hex,
            "ideology_axes": {"economic": p.ideology_axes.economic, "social": p.ideology_axes.social},
        }
        for p in market.config.parties
    ]


@router.get("/sources", summary="Fuentes de ingesta configuradas en el mercado activo")
async def market_sources(
    market: MarketContext = Depends(get_market_context),
) -> list[dict[str, Any]]:
    return [
        {
            "id": s.id,
            "type": s.type,
            "enabled": s.enabled,
            "description": s.description,
            "schedule_cron": s.schedule_cron,
        }
        for s in market.config.ingestion_sources
    ]


@router.get("/available", summary="Lista de mercados disponibles en el sistema")
async def available_markets() -> list[str]:
    return list_available_markets()


@router.get("/health", summary="Comprobacion de salud del contexto de mercado")
async def market_health(
    market: MarketContext = Depends(get_market_context),
) -> dict[str, Any]:
    """Endpoint de comprobacion; util para tests de integracion de la dependencia."""
    parties = [p.slug for p in market.config.parties]
    return {
        "market_code": market.market_code,
        "ok": True,
        "parties": parties,
        "enabled_sources": [s.id for s in market.config.enabled_sources],
    }
