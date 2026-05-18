"""
Router /api/v1/sectores — capa de inteligencia sectorial unificada.

Cumple con el contrato esperado por el proxy Next.js
`apps/visual-oscar/app/api/sectores/*/route.ts`:

  GET /api/v1/sectores/index             → SectoresIndex
  GET /api/v1/sectores/{id}              → SectorReport
  GET /api/v1/sectores/{id}/kpis         → { kpis: KPISectorial[] }
  GET /api/v1/sectores/{id}/actores      → { actores: ActorSectorial[] }
  GET /api/v1/sectores/{id}/eventos      → { eventos: EventoSectorial[] }
  GET /api/v1/sectores/{id}/signals      → { signals: SectorSignal[] }
  POST /api/v1/sectores/{id}/rebuild     → fuerza reconstrucción + persistencia

Schemas tipados 1:1 con `apps/visual-oscar/types/sectores.ts`. La
construcción on-demand es síncrona y barata (<500ms con BOE y feeds
en caliente; <100ms si todas las fuentes externas fallan).

Coexiste con el router legacy `/api/sectors` (inglés) — son namespaces
distintos. Este router es la fuente de verdad para el módulo sectorial
unificado consumido por la página `/sector/[id]` de Visual_Oscar.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sectores", tags=["sectores"])


# ─────────────────────────────────────────────────────────────────
# INDEX
# ─────────────────────────────────────────────────────────────────

@router.get("/index")
def index_sectores() -> dict[str, Any]:
    """Vista panorámica de los 9 sectores · score + alertas."""
    from agents.brain.pipelines.sectorial_intel_builder import build_sectores_index
    try:
        return build_sectores_index()
    except Exception as exc:
        logger.exception("index_sectores falló")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:200]}") from exc


# ─────────────────────────────────────────────────────────────────
# SECTOR COMPLETO
# ─────────────────────────────────────────────────────────────────

@router.get("/{sector_id}")
def get_sector_report(sector_id: str) -> dict[str, Any]:
    """SectorReport completo · score, KPIs, eventos, actores, alertas.

    Si el sector no existe en la taxonomía → 404.
    Errores internos devuelven 500 con detalle truncado.
    """
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    from agents.brain.pipelines.sectorial_intel_builder import build_sector_report

    if not get_sector(sector_id):
        raise HTTPException(status_code=404, detail="sector_not_found")

    try:
        return build_sector_report(sector_id)
    except Exception as exc:
        logger.exception("get_sector_report(%s) falló", sector_id)
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:200]}") from exc


# ─────────────────────────────────────────────────────────────────
# KPIs · ACTORES · EVENTOS
# ─────────────────────────────────────────────────────────────────

@router.get("/{sector_id}/kpis")
def get_sector_kpis(sector_id: str) -> dict[str, Any]:
    """KPIs derivados del sector (counts BOE, news, signals)."""
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    if not get_sector(sector_id):
        raise HTTPException(status_code=404, detail="sector_not_found")
    try:
        from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
        report = build_sector_report(sector_id)
        return {"kpis": report.get("kpis", [])}
    except Exception as exc:
        logger.exception("get_sector_kpis(%s) falló", sector_id)
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


@router.get("/{sector_id}/actores")
def get_sector_actores(sector_id: str) -> dict[str, Any]:
    """Actores del sector (reguladores + entidades clave)."""
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    if not get_sector(sector_id):
        raise HTTPException(status_code=404, detail="sector_not_found")
    try:
        from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
        report = build_sector_report(sector_id)
        return {"actores": report.get("actores", [])}
    except Exception as exc:
        logger.exception("get_sector_actores(%s) falló", sector_id)
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


@router.get("/{sector_id}/eventos")
def get_sector_eventos(
    sector_id: str,
    desde: str | None = Query(default=None, description="ISO date filter inicio"),
    hasta: str | None = Query(default=None, description="ISO date filter fin"),
    tipo: str | None = Query(default=None, description="regulatorio | politico | economico"),
) -> dict[str, Any]:
    """Eventos recientes del sector con filtros opcionales."""
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    if not get_sector(sector_id):
        raise HTTPException(status_code=404, detail="sector_not_found")
    try:
        from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
        report = build_sector_report(sector_id)
        eventos = report.get("eventos_recientes", [])
        if desde:
            eventos = [e for e in eventos if e.get("fecha", "") >= desde]
        if hasta:
            eventos = [e for e in eventos if e.get("fecha", "") <= hasta]
        if tipo:
            eventos = [e for e in eventos if e.get("tipo") == tipo]
        return {"eventos": eventos}
    except Exception as exc:
        logger.exception("get_sector_eventos(%s) falló", sector_id)
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


# ─────────────────────────────────────────────────────────────────
# SIGNALS · capa de inteligencia transversal (PDF Bloque 10)
# ─────────────────────────────────────────────────────────────────

@router.get("/{sector_id}/signals")
def get_sector_signals(
    sector_id: str,
    days: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=30, ge=1, le=100),
) -> dict[str, Any]:
    """Señales unificadas (BOE + prensa) con scoring por sector.

    Equivalente al endpoint `/api/intelligence/signals?dominio={sector}`
    del PDF Bloque 10. Devuelve cada item con:
      - id, dominio (regulatorio | politico | reputacional | ...)
      - titulo, descripcion, score (0-100), nivel
      - fuente_url, fuente_nombre, snapshot_at
    """
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    if not get_sector(sector_id):
        raise HTTPException(status_code=404, detail="sector_not_found")
    try:
        from agents.brain.pipelines.sectorial_intel_builder import build_signals_for_sector
        signals = build_signals_for_sector(sector_id, days=days, limit=limit)
        return {
            "sector_id": sector_id,
            "days": days,
            "total": len(signals),
            "signals": signals,
        }
    except Exception as exc:
        logger.exception("get_sector_signals(%s) falló", sector_id)
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


# ─────────────────────────────────────────────────────────────────
# TAXONOMÍA · metadata estática
# ─────────────────────────────────────────────────────────────────

@router.get("/taxonomy/list")
def list_taxonomy() -> dict[str, Any]:
    """Lista la taxonomía completa · útil para autocompletes y filtros."""
    from agents.brain.pipelines.data_sources.sector_taxonomy import list_sectors
    return {"sectores": list_sectors()}


@router.get("/taxonomy/{sector_id}")
def get_taxonomy(sector_id: str) -> dict[str, Any]:
    """Devuelve la metadata estática del sector (keywords, CPV, ministerio)."""
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector
    meta = get_sector(sector_id)
    if not meta:
        raise HTTPException(status_code=404, detail="sector_not_found")
    return meta


# ─────────────────────────────────────────────────────────────────
# MATCH · taggea texto libre con sectores que aplican
# ─────────────────────────────────────────────────────────────────

@router.get("/match/text")
def match_text(q: str = Query(min_length=2, description="Texto a clasificar")) -> dict[str, Any]:
    """Dado un texto libre devuelve los sector_id que matchean por keywords.

    Útil para enriquecer items de BOE/news sobre la marcha.
    """
    from agents.brain.pipelines.data_sources.sector_taxonomy import match_text_to_sectors
    matched = match_text_to_sectors(q)
    return {"q": q, "sectores": matched}
