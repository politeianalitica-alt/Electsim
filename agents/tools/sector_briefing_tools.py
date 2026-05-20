"""Tools del Brain para briefings sectoriales · Sprint 6 · S6.3.

> **Sprint 6 · S6.3** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 6`)

Politeia tiene 9 sectores en taxonomía (energia, farma, defensa, vivienda,
banca, agroalimentario, telecom, infraestructuras, turismo). Cada uno tiene
sub-pestañas en el dashboard. Lo que faltaba: una tool del Brain que
combine todas las fuentes (BOE+BDNS+TED+actores) en un briefing automático.

Esta tool delega al endpoint /api/v1/sectores/{sector_id}/briefing (S6.2)
desde el Brain · permite al analista invocar:
  'Dame el briefing energético de esta semana'
  → sector_briefing(sector='energia', days_back=7, use_llm=true)
  → Briefing estructurado JSON + resumen ejecutivo LLM
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


@ToolRegistry.register("sector_briefing_extended")
def sector_briefing_extended(
    sector: str,
    days_back: int = 7,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Briefing sectorial EXTENDIDO · S6 (BOE+BDNS+TED) + tracker S7-S15.

    Devuelve el briefing completo incluyendo:
      · KPIs sector + actores reguladores
      · Convocatorias BDNS recientes
      · Licitaciones TED EU
      · BOE novedades regulatorias
      · Tracker dedicado del sector:
        - banca → regulatory_obligations
        - farma → pharma_signals activas
        - defensa → defense_programs + próximos hitos
        - vivienda → housing_markets ZMT + tensión
        - telecom → telecom_operators + última subasta espectro
        - infraestructuras → infra_projects retrasados
        - turismo → tourism_destinations en presión
        - agroalimentario → ENESA + commodities granos/aceites
        - energia → commodities energy live (Brent/TTF/Henry Hub)
      · Resumen LLM ejecutivo opcional

    Args:
      sector: clave o alias (salud=farma, inmobiliario=vivienda,
              telecomunicaciones=telecom, transporte=infraestructuras,
              agricultura=agroalimentario)
      days_back: 1-30
      use_llm: opt-in resumen LLM
    """
    try:
        from agents.brain.pipelines.sector_briefing_extended import (
            build_briefing_extended,
        )
        return build_briefing_extended(sector, days_back=days_back, use_llm=use_llm)
    except Exception as exc:
        return {"sector_id": sector, "error": str(exc), "errors": [str(exc)]}


@ToolRegistry.register("sector_briefing")
def sector_briefing(
    sector: str,
    days_back: int = 7,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Briefing sectorial automático · combina BOE+BDNS+TED+actores.

    Args:
      sector: 'energia', 'farma', 'defensa', 'vivienda', 'banca',
              'agroalimentario', 'telecom', 'infraestructuras', 'turismo'
      days_back: ventana temporal (1-30 días)
      use_llm: si true, genera resumen ejecutivo con LLM (~+15s)

    Returns:
      {
        "sector_id": "energia",
        "sector_name": "Energia y Utilities",
        "days_back": 7,
        "generated_at": "...",
        "kpis": [...],
        "actores": [...],
        "score": 0.78,
        "bdns": {"n_items": 5, "convocatorias": [...]},
        "ted": {"n_items": 8, "licitaciones": [...]},
        "boe": {"n_items": 12, "normas": [...]},
        "executive_summary": "...",  # solo si use_llm=true
        "sources": {bdns: "ok", ted: "ok", boe: "ok", llm: "ok"},
        "errors": [],
      }
    """
    try:
        from api.routers.sectores import get_sector_briefing
    except ImportError as exc:
        return {"error": str(exc), "sector_id": sector}

    try:
        # get_sector_briefing es la función FastAPI · la llamamos directa
        # No pasamos por HTTP porque estamos en el mismo proceso
        result = get_sector_briefing(
            sector_id=sector,
            days_back=max(1, min(days_back, 30)),
            use_llm=use_llm,
        )
        return result
    except Exception as exc:
        logger.warning("sector_briefing %s · %s", sector, exc)
        return {
            "error": str(exc),
            "sector_id": sector,
            "errors": [str(exc)],
            "sources": {},
        }


@ToolRegistry.register("list_sectors")
def list_sectors() -> dict[str, Any]:
    """Lista los 9 sectores configurados en Politeia.

    Returns:
      {"sectores": [{"id": "energia", "nombre": "..."}, ...]}
    """
    try:
        from agents.brain.pipelines.data_sources.sector_taxonomy import list_sectors as _list
        sectors = _list()
        return {
            "n_sectores": len(sectors),
            "sectores": sectors,
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "n_sectores": 0, "sectores": []}


__all__ = ["sector_briefing", "list_sectors"]
