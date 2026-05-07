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


def _real_briefing_items(limit: int) -> list[dict]:
    """Build real briefing list from DB history."""
    from services.real_data import get_top_noticias, get_alertas, get_risk_overview
    items: list[dict] = []
    now = datetime.now(timezone.utc)

    # Morning briefings from noticias_prensa grouped by day
    try:
        noticias = get_top_noticias(limit=60, dias=30)
        seen_dates: set = set()
        for n in noticias:
            fecha = str(n.get("fecha_publicacion") or "")[:10]
            if fecha and fecha not in seen_dates:
                seen_dates.add(fecha)
                titles = [x.get("title") or x.get("titular") or "" for x in noticias if str(x.get("fecha_publicacion") or "")[:10] == fecha][:3]
                preview = " · ".join(t[:60] for t in titles if t)
                items.append({
                    "id": f"morning-{fecha}",
                    "title": f"Briefing Matinal — {fecha}",
                    "briefing_type": "morning",
                    "audience": "consultor_politico",
                    "workspace_id": "default",
                    "period": "today",
                    "mode": "real",
                    "generated_at": f"{fecha}T08:00:00+00:00",
                    "summary_preview": preview or f"Resumen informativo del {fecha}",
                })
    except Exception:
        pass

    # Risk briefings from informes_riesgo_politico
    try:
        risk_rows = get_risk_overview(limit=10)
        for r in risk_rows:
            fecha = str(r.get("fecha_calculo") or "")[:10]
            if not fecha:
                continue
            idx = r.get("indice_compuesto")
            sem = r.get("semaforo", "amarillo")
            score_str = f"{float(idx):.1f}/10" if idx is not None else "N/D"
            items.append({
                "id": f"risk-{fecha}",
                "title": f"Informe Riesgo Político — {fecha}",
                "briefing_type": "risk",
                "audience": "unidad_inteligencia",
                "workspace_id": "default",
                "period": "today",
                "mode": "real",
                "generated_at": f"{fecha}T09:00:00+00:00",
                "summary_preview": f"Índice riesgo: {score_str} ({sem}). Ver dimensiones y drivers para análisis detallado.",
            })
    except Exception:
        pass

    # Alert briefings from alertas_sistema grouped by week
    try:
        alerts = get_alertas(limit=30)
        alert_weeks: dict = {}
        for a in alerts:
            ts = str(a.get("created_at") or "")[:10]
            if ts:
                from datetime import date as _date, timedelta
                d = _date.fromisoformat(ts)
                week_start = (d - timedelta(days=d.weekday())).isoformat()
                alert_weeks.setdefault(week_start, []).append(a)
        for week, week_alerts in sorted(alert_weeks.items(), reverse=True)[:5]:
            critical = sum(1 for a in week_alerts if a.get("level") == "critical")
            preview = f"{len(week_alerts)} alertas ({critical} críticas). " + (week_alerts[0].get("title") or "")[:80]
            items.append({
                "id": f"alerts-{week}",
                "title": f"Monitor de Alertas — Semana {week}",
                "briefing_type": "alerts",
                "audience": "consultor_politico",
                "workspace_id": "default",
                "period": "week",
                "mode": "real",
                "generated_at": f"{week}T07:00:00+00:00",
                "summary_preview": preview,
            })
    except Exception:
        pass

    items.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
    return items[:limit]


@router.get("/api/briefings/v2")
async def briefings_list_v2(
    workspace_id: str = Query(default="default"),
    limit: int = Query(default=20, le=100),
):
    """List briefings — real items from DB history, saved items if available."""
    # Try saved briefings first
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

    # Build real items from DB history
    real_items = _real_briefing_items(limit)
    if real_items:
        return {
            "mode": "real",
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "items": real_items,
            "total": len(real_items),
        }

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
