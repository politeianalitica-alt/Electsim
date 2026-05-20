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


# ─────────────────────────────────────────────────────────────────
# Sprint 6 · S6.2 · BRIEFING SECTORIAL AUTOMÁTICO
# ─────────────────────────────────────────────────────────────────

@router.get("/{sector_id}/briefing")
def get_sector_briefing(
    sector_id: str,
    days_back: int = Query(default=7, ge=1, le=30, description="Días hacia atrás para cruzar fuentes"),
    use_llm: bool = Query(default=False, description="Si true, llama al LLM para generar resumen ejecutivo"),
) -> dict[str, Any]:
    """Briefing diario/semanal automático del sector · combina 5 fuentes (Sprint 6 · S6.2).

    Cruza en una sola llamada:
      1. KPIs del sector (BOE counts, news counts, signals)
      2. Convocatorias BDNS recientes con descripción cruzada al sector
      3. Licitaciones TED EU recientes con CPV del sector
      4. Actores reguladores clave (ministerios + agencias)
      5. Resumen LLM ejecutivo (opcional · use_llm=true)

    Sin LLM la llamada tarda <5s. Con LLM ~10-20s adicional.

    Args:
      sector_id: 'energia', 'farma', 'defensa', 'vivienda', 'banca', etc.
      days_back: ventana temporal (1-30 días)
      use_llm: invocar LLM para resumen ejecutivo en lenguaje natural

    Returns:
      Briefing estructurado JSON listo para mostrar en /sector-{X}
    """
    from datetime import datetime, timezone
    from agents.brain.pipelines.data_sources.sector_taxonomy import get_sector

    sector_meta = get_sector(sector_id)
    if not sector_meta:
        raise HTTPException(status_code=404, detail="sector_not_found")

    briefing: dict[str, Any] = {
        "sector_id": sector_id,
        "sector_name": sector_meta.get("nombre", sector_id),
        "days_back": days_back,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": {},
        "errors": [],
    }

    # ── 1. KPIs y reporte base del sector ──
    try:
        from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
        report = build_sector_report(sector_id)
        briefing["kpis"] = report.get("kpis", [])
        briefing["actores"] = (report.get("actores") or [])[:10]
        briefing["score"] = report.get("score")
        briefing["sources"]["sector_report"] = "ok"
    except Exception as exc:
        briefing["errors"].append(f"sector_report: {exc}")
        briefing["sources"]["sector_report"] = "error"

    # ── 2. BDNS · convocatorias del sector ──
    try:
        from agents.tools import ToolRegistry
        import agents.tools.contratacion_subvenciones_tools  # registra tools
        bdns_fn = ToolRegistry.get("bdns_search_convocatorias")
        # Usar palabra clave del sector si existe
        keywords = sector_meta.get("keywords", []) or [sector_id]
        descripcion = keywords[0] if keywords else sector_id
        bdns_result = bdns_fn(descripcion=descripcion, days_back=days_back, max_items=10)
        briefing["bdns"] = {
            "n_items": bdns_result.get("n_items", 0),
            "convocatorias": (bdns_result.get("convocatorias") or [])[:5],
        }
        briefing["sources"]["bdns"] = "ok" if bdns_result.get("error") is None else "partial"
    except Exception as exc:
        briefing["errors"].append(f"bdns: {exc}")
        briefing["sources"]["bdns"] = "error"

    # ── 3. TED EU · licitaciones del sector ──
    try:
        from agents.tools import ToolRegistry
        ted_fn = ToolRegistry.get("ted_search_licitaciones")
        # Mapeo sector_id Politeia → sector TED CPV (subset directo)
        ted_sector_map = {
            "energia": "energia",
            "farma": "farma",
            "salud": "farma",
            "defensa": "defensa",
            "vivienda": "vivienda",
            "inmobiliario": "vivienda",
            "telecom": "telecom",
            "telecomunicaciones": "telecom",
            "transporte": "transporte",
            "infraestructuras": "infraestructuras",
            "agroalimentario": "agroalimentario",
            "agricultura": "agroalimentario",
            "educacion": "educacion",
        }
        ted_sector = ted_sector_map.get(sector_id)
        if ted_sector:
            ted_result = ted_fn(sector=ted_sector, days_back=days_back, max_items=10)
            briefing["ted"] = {
                "n_items": ted_result.get("n_items", 0),
                "licitaciones": (ted_result.get("licitaciones") or [])[:5],
            }
            briefing["sources"]["ted"] = "ok" if ted_result.get("error") is None else "partial"
        else:
            briefing["sources"]["ted"] = "skipped_no_cpv_mapping"
    except Exception as exc:
        briefing["errors"].append(f"ted: {exc}")
        briefing["sources"]["ted"] = "error"

    # ── 4. BOE · novedades regulatorias del sector ──
    try:
        from agents.tools import ToolRegistry
        import agents.tools.boe_live_tools  # registra tools
        boe_fn = ToolRegistry.get("boe_novedades_ultimos_dias")
        keywords = sector_meta.get("keywords", []) or [sector_id]
        filtro = keywords[0] if keywords else sector_id
        boe_result = boe_fn(days=min(days_back, 7), filtro_titulo=filtro)
        briefing["boe"] = {
            "n_items": boe_result.get("items_filtrados", 0),
            "normas": (boe_result.get("items") or [])[:5],
        }
        briefing["sources"]["boe"] = "ok" if boe_result.get("error") is None else "partial"
    except Exception as exc:
        briefing["errors"].append(f"boe: {exc}")
        briefing["sources"]["boe"] = "error"

    # ── 5. LLM · resumen ejecutivo (opt-in) ──
    if use_llm:
        try:
            briefing["executive_summary"] = _generate_executive_summary(briefing)
            briefing["sources"]["llm"] = "ok"
        except Exception as exc:
            briefing["errors"].append(f"llm: {exc}")
            briefing["sources"]["llm"] = "error"
            briefing["executive_summary"] = ""
    else:
        briefing["executive_summary"] = ""

    return briefing


def _generate_executive_summary(briefing: dict[str, Any]) -> str:
    """Genera resumen ejecutivo del briefing usando el LLM disponible.

    Usa GroqBrain si está activo · sino devuelve string vacío.
    Falla cerrado.
    """
    try:
        from agents.brain.groq_client import call_groq, is_groq_available
    except ImportError:
        return ""

    if not is_groq_available():
        return ""

    # Compactar briefing para prompt
    n_bdns = (briefing.get("bdns") or {}).get("n_items", 0)
    n_ted = (briefing.get("ted") or {}).get("n_items", 0)
    n_boe = (briefing.get("boe") or {}).get("n_items", 0)
    titulos_boe = [n.get("titulo", "")[:80] for n in (briefing.get("boe") or {}).get("normas", [])[:3]]
    convocatorias = [c.get("descripcion", "")[:80] for c in (briefing.get("bdns") or {}).get("convocatorias", [])[:3]]

    prompt = f"""Resume en 4 frases máximo el estado regulatorio del sector "{briefing.get('sector_name')}" en los últimos {briefing.get('days_back')} días.

Datos:
- {n_boe} normas BOE relevantes. Top: {' | '.join(titulos_boe) if titulos_boe else 'ninguna'}
- {n_bdns} convocatorias subvenciones. Top: {' | '.join(convocatorias) if convocatorias else 'ninguna'}
- {n_ted} licitaciones europeas en el sector

Formato: 4 viñetas. Sin emojis. En español. Tono ejecutivo.
"""

    try:
        from agents.brain.groq_client import call_groq
        response = call_groq(
            prompt=prompt,
            model="llama-3.3-70b-versatile",
            max_tokens=400,
            temperature=0.3,
        )
        if isinstance(response, dict):
            return str(response.get("content") or response.get("text") or "")[:1500]
        return str(response)[:1500]
    except Exception:
        return ""
