"""
Briefings API router (Sprint 3).
New endpoints alongside politeia_v3.py legacy endpoints.
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from api.schemas.briefings import BriefingRequest

router = APIRouter(tags=["briefings-v2"])


@router.post("/api/briefings/generate")
async def briefings_generate(body: BriefingRequest):
    """Generate and save a full typed briefing."""
    try:
        from services.briefings.briefing_engine import generate_briefing
        from services.briefings.briefing_store import save_briefing
        doc = generate_briefing(body)
        save_briefing(doc)
        return doc.model_dump(mode="json")
    except Exception as exc:
        return JSONResponse(status_code=500, content={"mode": "error", "error": str(exc)})


@router.post("/api/briefings/preview")
async def briefings_preview(body: BriefingRequest):
    """Generate briefing without saving."""
    try:
        from services.briefings.briefing_engine import generate_briefing
        doc = generate_briefing(body)
        d = doc.model_dump(mode="json")
        d["_preview"] = True
        return d
    except Exception as exc:
        return JSONResponse(status_code=500, content={"mode": "error", "error": str(exc)})


def _demo_briefing_items() -> list[dict]:
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "demo-morning-1", "title": "Briefing Matinal — Situación política",
            "briefing_type": "morning", "audience": "consultor_politico",
            "workspace_id": "default", "period": "today", "mode": "demo",
            "generated_at": (now - timedelta(hours=2)).isoformat(),
            "summary_preview": "PP consolida ventaja +5.8pp. Bloqueo Junts activo. Narrativa 'crisis' +340%. Tres señales críticas detectadas en las últimas 6h.",
        },
        {
            "id": "demo-legislative-1", "title": "Monitor Legislativo — Ley de Vivienda",
            "briefing_type": "legislative", "audience": "consultor_politico",
            "workspace_id": "default", "period": "week", "mode": "demo",
            "generated_at": (now - timedelta(days=1)).isoformat(),
            "summary_preview": "Ley de Vivienda en riesgo. Junts condiciona apoyo. Votación crítica prevista. Análisis de alternativas de coalición.",
        },
        {
            "id": "demo-geo-1", "title": "Inteligencia Geopolítica — Marruecos & OTAN",
            "briefing_type": "geopolitical", "audience": "unidad_inteligencia",
            "workspace_id": "default", "period": "week", "mode": "demo",
            "generated_at": (now - timedelta(days=2)).isoformat(),
            "summary_preview": "Tensión España-Marruecos escala tras incidente en Melilla. Implicaciones para la agenda migratoria y relaciones bilaterales.",
        },
        {
            "id": "demo-media-1", "title": "Análisis de Narrativas — Semana 19",
            "briefing_type": "media", "audience": "consultor_politico",
            "workspace_id": "default", "period": "week", "mode": "demo",
            "generated_at": (now - timedelta(days=3)).isoformat(),
            "summary_preview": "7 narrativas activas. Convergencia mediática en torno a 'crisis de gobierno'. Amplificación coordinada detectada en X.",
        },
    ]


@router.get("/api/briefings/v2")
async def briefings_list_v2(
    workspace_id: str = Query(default="default"),
    limit: int = Query(default=20, le=100),
):
    """List saved briefings (v2 — JSON store)."""
    try:
        from services.briefings.briefing_store import list_saved_briefings
        items = list_saved_briefings(workspace_id=workspace_id, limit=limit)
        if items:
            return {
                "mode": "real",
                "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
                "items": [i.model_dump(mode="json") for i in items],
                "total": len(items),
            }
    except Exception:
        pass
    demo = _demo_briefing_items()
    return {
        "mode": "fallback",
        "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
        "items": demo[:limit],
        "total": len(demo),
    }


@router.get("/api/briefings/{briefing_id}/detail")
async def briefing_detail(briefing_id: str):
    """Get a specific saved briefing."""
    try:
        from services.briefings.briefing_store import load_briefing
        doc = load_briefing(briefing_id)
        if doc is None:
            return JSONResponse(status_code=404, content={"mode": "error", "error": "Briefing not found"})
        return doc.model_dump(mode="json")
    except Exception as exc:
        return JSONResponse(status_code=500, content={"mode": "error", "error": str(exc)})


@router.get("/api/briefings/{briefing_id}/markdown")
async def briefing_markdown(briefing_id: str):
    """Export briefing as Markdown."""
    try:
        from services.briefings.briefing_store import load_briefing
        from services.briefings.briefing_renderer import render_briefing_markdown
        doc = load_briefing(briefing_id)
        if doc is None:
            return JSONResponse(status_code=404, content={"mode": "error", "error": "Briefing not found"})
        md = render_briefing_markdown(doc)
        filename = f"briefing-{briefing_id}-{doc.generated_at.strftime('%Y%m%d')}.md"
        return {
            "mode": "real",
            "briefing_id": briefing_id,
            "markdown": md,
            "filename": filename,
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
        }
    except Exception as exc:
        return JSONResponse(status_code=500, content={"mode": "error", "error": str(exc)})


@router.get("/api/briefings/{briefing_id}/pdf-v2")
async def briefing_pdf_v2(briefing_id: str):
    """Export briefing as PDF (reportlab) or fallback to markdown."""
    try:
        from services.briefings.briefing_store import load_briefing
        from services.briefings.briefing_renderer import render_briefing_markdown
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        doc = load_briefing(briefing_id)
        if doc is None:
            return JSONResponse(status_code=404, content={"mode": "error", "error": "Briefing not found"})

        briefing_dict = doc.model_dump(mode="json")
        pdf_bytes = export_briefing_pdf(briefing_dict, doc.briefing_type)
        if pdf_bytes:
            import base64
            filename = f"briefing-{briefing_id}.pdf"
            return {
                "mode": "real",
                "briefing_id": briefing_id,
                "format": "pdf",
                "bytes_b64": base64.b64encode(pdf_bytes).decode("utf-8"),
                "filename": filename,
                "size": len(pdf_bytes),
            }
        # PDF not available — fallback to markdown
        md = render_briefing_markdown(doc)
        return {
            "mode": "fallback",
            "briefing_id": briefing_id,
            "format": "markdown",
            "markdown": md,
            "message": "PDF backend no disponible. Devolviendo Markdown.",
        }
    except Exception as exc:
        return JSONResponse(status_code=500, content={"mode": "error", "error": str(exc)})
