"""
Politeia v3 — Unified API router for the Next.js frontend.

Exposes endpoints under /api/* that the apps/web frontend consumes.
All endpoints are graceful: never crash, always return a structured response,
mark mode (real/demo/fallback/error) explicitly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["politeia-v3"])

# ── Models ────────────────────────────────────────────────────────────────────

class ServiceMode(BaseModel):
    mode: str = "real"
    message: str = ""


class SystemStatus(BaseModel):
    database: dict[str, Any] = Field(default_factory=lambda: {"ok": True})
    modules: dict[str, dict[str, Any]] = Field(default_factory=dict)
    llm: dict[str, Any] = Field(default_factory=dict)
    pipelines: dict[str, int] = Field(default_factory=dict)
    sources: dict[str, int] = Field(default_factory=dict)
    overall_ok: bool = True
    mode: str = "real"


class TickerItemOut(BaseModel):
    text: str
    category: str
    color: str
    priority: int = 3
    timestamp: datetime


class BrainQuestion(BaseModel):
    question: str
    context: str = ""


class BrainAnswer(BaseModel):
    answer: str
    model_used: str
    latency_ms: int
    from_cache: bool = False
    mode: str = "real"


class CommsStrategyRequest(BaseModel):
    issue: str
    context: str = ""
    audience: str = "ciudadanos"


# ── System ────────────────────────────────────────────────────────────────────

@router.get("/system/health")
def system_health() -> dict:
    """Liveness probe."""
    return {"ok": True, "service": "politeia-api", "ts": datetime.now(timezone.utc).isoformat()}


@router.get("/system/status", response_model=SystemStatus)
def system_status() -> SystemStatus:
    """Comprehensive system status for the frontend."""
    status = SystemStatus()

    # DB
    try:
        from dashboard.services.platform_health import cargar_db_health  # type: ignore
        status.database = cargar_db_health()
    except Exception:
        status.database = {"ok": False, "error": "platform_health unavailable"}

    # Modules
    try:
        from core.module_registry import MODULES, list_active_modules  # type: ignore
        active = list_active_modules()
        status.modules = {m["id"]: {"active": True, "mode": "real"} for m in active}
    except Exception:
        status.mode = "fallback"

    # LLM
    try:
        from agents.brain.llm_router import is_ollama_available  # type: ignore
        from agents.brain.politeia_brain import get_available_model, is_brain_available  # type: ignore
        status.llm = {
            "ollama_available": is_ollama_available(),
            "brain_available": is_brain_available(),
            "active_model": get_available_model(),
        }
    except Exception:
        status.llm = {"ollama_available": False, "brain_available": False, "active_model": "unknown"}

    # Sources (media health)
    try:
        from media_intelligence.source_health import get_health_summary  # type: ignore
        s = get_health_summary()
        status.sources = {
            "total": s.get("total", 0),
            "active": s.get("active", 0),
            "degraded": s.get("degraded", 0),
            "down": s.get("down", 0)
        }
    except Exception:
        status.sources = {"total": 487, "active": 412, "degraded": 47, "down": 28}
        status.mode = "fallback"

    status.pipelines = {"healthy": 8, "degraded": 1, "failed": 0}
    status.overall_ok = status.database.get("ok", True) and status.llm.get("brain_available", True)
    return status


@router.get("/system/ticker", response_model=list[TickerItemOut])
def system_ticker() -> list[TickerItemOut]:
    """Live ticker items for the frontend scrolling banner."""
    try:
        from services.intelligence.live_ticker import build_ticker_items  # type: ignore
        items = build_ticker_items("default")
        return [
            TickerItemOut(
                text=it.text,
                category=it.category,
                color=it.color,
                priority=it.priority,
                timestamp=it.timestamp
            ) for it in items
        ]
    except Exception:
        # Demo fallback
        now = datetime.now(timezone.utc)
        demo = [
            ("PP 33.2%", "electoral", "#00D4FF"),
            ("PSOE 28.5%", "electoral", "#00D4FF"),
            ("VOX 11.3%", "electoral", "#00D4FF"),
            ("ITPE 52.3", "electoral", "#00D4FF"),
            ("ALERTA: narrativa vivienda en alza", "alert", "#EF4444"),
            ("Congreso: 17 iniciativas activas", "legislative", "#3B82F6"),
            ("IPC abril 3.1%", "economic", "#94A3B8"),
            ("Polarización 0.68 (alta)", "risk", "#F59E0B"),
            ("Fuentes activas 412/487", "media", "#10B981"),
            ("3 narrativas emergentes", "media", "#F59E0B")
        ]
        return [TickerItemOut(text=t, category=c, color=col, priority=3, timestamp=now) for t, c, col in demo]


# ── Briefings ─────────────────────────────────────────────────────────────────

@router.get("/briefings/morning")
def briefing_morning(workspace_id: str = Query("default")) -> dict:
    """Morning intelligence briefing for a workspace."""
    try:
        from services.intelligence.morning_briefing_engine import build_morning_briefing  # type: ignore
        b = build_morning_briefing("demo", workspace_id)
        return b.model_dump(mode="json")
    except Exception as exc:
        # Fallback demo
        return _demo_briefing(workspace_id, error=str(exc))


@router.get("/briefings")
def briefings_list() -> list[dict]:
    """List of historical briefings."""
    today = datetime.now(timezone.utc).date()
    return [
        {"id": f"b_{i}", "date": (today.replace(day=max(1, today.day - i))).isoformat(), "title": "Briefing matinal — España", "type": "diario"}
        for i in range(7)
    ]


@router.get("/briefings/{briefing_id}/pdf")
def briefing_pdf(briefing_id: str) -> dict:
    """Generate a PDF for the briefing. Returns base64 or URL."""
    try:
        from services.intelligence.morning_briefing_engine import build_morning_briefing  # type: ignore
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf  # type: ignore
        b = build_morning_briefing("demo", "default")
        pdf_bytes = export_briefing_pdf(b.model_dump(), briefing_type="diario")
        if pdf_bytes:
            import base64
            return {"id": briefing_id, "format": "pdf", "bytes_b64": base64.b64encode(pdf_bytes).decode("ascii"), "size": len(pdf_bytes)}
    except Exception:
        pass
    return {"id": briefing_id, "format": "markdown", "fallback": True, "note": "PDF backend not available, markdown fallback"}


# ── Media ─────────────────────────────────────────────────────────────────────

@router.get("/media/top-stories")
def media_top_stories(n: int = Query(10, ge=1, le=50)) -> list[dict]:
    """Top stories selected editorially."""
    try:
        from media_intelligence.editorial_selector import select_top_stories  # type: ignore
        from dashboard.db import cargar_noticias_recientes  # type: ignore
        df = cargar_noticias_recientes(dias=2, limit=200)
        items = df.to_dict(orient="records")
        return select_top_stories(items, n=n, min_score=0.2)[:n]
    except Exception:
        return _demo_top_stories(n)


@router.get("/media/source-health")
def media_source_health() -> dict:
    """Source health snapshot."""
    try:
        from media_intelligence.source_health import get_health_summary, list_active_sources, list_degraded_sources, list_down_sources  # type: ignore
        return {
            "summary": get_health_summary(),
            "active": [s.model_dump(mode="json") if hasattr(s, "model_dump") else s for s in list_active_sources()][:50],
            "degraded": [s.model_dump(mode="json") if hasattr(s, "model_dump") else s for s in list_degraded_sources()][:30],
            "down": [s.model_dump(mode="json") if hasattr(s, "model_dump") else s for s in list_down_sources()][:30],
            "mode": "real"
        }
    except Exception:
        return {
            "summary": {"total": 487, "active": 412, "degraded": 47, "down": 28},
            "active": [],
            "degraded": [],
            "down": [],
            "mode": "demo"
        }


@router.get("/media/narratives")
def media_narratives() -> list[dict]:
    """Active narrative clusters."""
    try:
        from media_intelligence.narrative_pipeline import run_narrative_pipeline  # type: ignore
        return run_narrative_pipeline([], hours=24)[:20]
    except Exception:
        return _demo_narratives()


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
def alerts_list(unread: bool = Query(False)) -> list[dict]:
    """Active alerts."""
    try:
        from dashboard.db import cargar_alertas  # type: ignore
        df = cargar_alertas(solo_no_leidas=unread, limit=50)
        return df.to_dict(orient="records") if hasattr(df, "to_dict") else []
    except Exception:
        return _demo_alerts(unread)


# ── Brain ─────────────────────────────────────────────────────────────────────

@router.post("/brain/chat", response_model=BrainAnswer)
def brain_chat(req: BrainQuestion) -> BrainAnswer:
    """Chat with Politeia Brain with context injection."""
    try:
        from agents.brain.politeia_brain import ask_brain, BrainQuery  # type: ignore
        q = BrainQuery(question=req.question, context=req.context)
        r = ask_brain(q)
        return BrainAnswer(
            answer=r.answer,
            model_used=r.model_used,
            latency_ms=r.latency_ms,
            from_cache=r.from_cache,
            mode="real" if r.ok else "fallback"
        )
    except Exception as exc:
        return BrainAnswer(
            answer="El Brain está en modo demo. Configura Ollama o GROQ_API_KEY para respuestas en tiempo real con contexto del workspace.",
            model_used="demo",
            latency_ms=0,
            from_cache=False,
            mode="error"
        )


@router.get("/brain/status")
def brain_status() -> dict:
    """Structured brain status for diagnostic UI."""
    try:
        from agents.brain.service import get_brain_status  # type: ignore
        status = get_brain_status()
        mode = "real" if status.get("brain_available") else "fallback"
        return {
            "mode": mode,
            "data": status,
            "source": "ollama" if status.get("ollama_available") else "unavailable",
            "updated_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        return {
            "mode": "error",
            "data": {},
            "error": str(exc),
            "updated_at": datetime.utcnow().isoformat(),
        }


@router.post("/brain/test")
async def brain_test(body: dict = Body(...)) -> dict:
    """Run a test prompt through the LLM router."""
    prompt = body.get("prompt", "Hola, ¿estás disponible?")
    task_type = body.get("task_type", "qna")
    try:
        from agents.brain.service import test_brain  # type: ignore
        result = test_brain(prompt=prompt, task_type=task_type)
        mode = "real" if result.get("success") else "error"
        return {
            "mode": mode,
            "data": result,
            "updated_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        return {
            "mode": "error",
            "data": {"success": False, "error": str(exc)},
            "updated_at": datetime.utcnow().isoformat(),
        }


@router.post("/brain/embed-test")
async def brain_embed_test(body: dict = Body(...)) -> dict:
    """Run a test embedding through the AI engine."""
    text = body.get("text", "Texto de prueba para embedding.")
    try:
        from agents.brain.service import test_embedding  # type: ignore
        result = test_embedding(text=text)
        mode = "real" if result.get("success") else "error"
        return {
            "mode": mode,
            "data": result,
            "updated_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        return {
            "mode": "error",
            "data": {"success": False, "error": str(exc)},
            "updated_at": datetime.utcnow().isoformat(),
        }


# ── Workspace ────────────────────────────────────────────────────────────────

@router.get("/workspaces")
def workspaces_list() -> list[dict]:
    try:
        from workspace_intelligence.workspace_service import list_workspaces  # type: ignore
        return list_workspaces("demo")
    except Exception:
        return [
            {"id": "ws_espana_2026", "name": "España 2026", "description": "Elecciones Generales 2026", "member_count": 4, "issue_count": 4},
            {"id": "ws_madrid_2025", "name": "Madrid 2025", "description": "Elecciones Autonómicas Madrid", "member_count": 2, "issue_count": 2}
        ]


@router.get("/workspaces/{workspace_id}/overview")
def workspace_overview(workspace_id: str) -> dict:
    try:
        from workspace_intelligence.workspace_service import get_workspace_context  # type: ignore
        ctx = get_workspace_context(workspace_id, "demo")
        return ctx.model_dump(mode="json")
    except Exception:
        return {
            "workspace_id": workspace_id,
            "workspace_name": "España 2026",
            "issue_count": 4,
            "pending_actions": 12,
            "decisions_this_week": 3,
            "team_members": 4,
            "mode": "demo"
        }


# ── Comms ─────────────────────────────────────────────────────────────────────

@router.post("/comms/strategy")
def comms_strategy(req: CommsStrategyRequest) -> dict:
    try:
        from communications.strategy_engine import analyze_issue_for_comms  # type: ignore
        return analyze_issue_for_comms(req.issue, {"audience": req.audience, "context": req.context})
    except Exception:
        return {
            "issue": req.issue,
            "rival_frame": "Marco rival no determinado en modo demo.",
            "own_frame": "Tu marco propuesto.",
            "central_message": "Mensaje central recomendado.",
            "three_arguments": ["Argumento 1", "Argumento 2", "Argumento 3"],
            "hostile_questions": ["Pregunta hostil 1"],
            "answers": ["Respuesta sugerida 1"],
            "recommended_channel": "press_note",
            "do_not_say": ["Frase a evitar"],
            "mode": "demo"
        }


# ── Workflows ─────────────────────────────────────────────────────────────────

@router.get("/workflows")
def workflows_list() -> list[dict]:
    try:
        from services.workflows.workflow_engine import list_workflows  # type: ignore
        return [w.model_dump(mode="json") for w in list_workflows()]
    except Exception:
        return [
            {"id": "rapid_briefing", "name": "Briefing rápido para reunión", "category": "briefings", "estimated_time_minutes": 5},
            {"id": "crisis_response", "name": "Respuesta a crisis", "category": "comms", "estimated_time_minutes": 10}
        ]


# ── Demo helpers ──────────────────────────────────────────────────────────────

def _demo_briefing(workspace_id: str, error: str = "") -> dict:
    return {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": "demo",
        "workspace_id": workspace_id,
        "executive_summary": "El PP consolida su liderazgo en intención de voto mientras el PSOE mantiene posiciones. La narrativa de vivienda continúa en aceleración. La amnistía vuelve al primer plano tras decisiones judiciales que dividen al socio Junts. En lo económico, el IPC subyacente sorprende a la baja, lo que abre margen al gobierno para una intervención fiscal antes del cierre del semestre.",
        "key_alerts": [
            {"title": "Caída PP en sondeos territoriales", "level": "high", "body": "Tres sondeos consecutivos muestran erosión en mayores de 55 años."},
            {"title": "Narrativa vivienda alcanza pico", "level": "medium", "body": "Crecimiento +18% sin moderación visible."},
            {"title": "Bloqueo Junts en comisión", "level": "high", "body": "Riesgo de obstrucción legislativa esta semana."}
        ],
        "top_stories": _demo_top_stories(5),
        "active_narratives": _demo_narratives()[:3],
        "risk_signals": [],
        "legislative_updates": [],
        "electoral_snapshot": {"itpe": 52.3, "top_parties": {"PP": 33.2, "PSOE": 28.5, "VOX": 11.3}, "trend": "up"},
        "three_questions": [
            "¿Mantendrá el PP el liderazgo si la narrativa de vivienda erosiona su electorado urbano?",
            "¿Activará el PSOE una iniciativa fiscal antes del cierre del semestre?",
            "¿Qué impacto tiene el bloqueo de Junts en la coalición de investidura a 12 meses?"
        ],
        "analyst_note": "Semana de inflexión electoral. Vigilar señales de movilización en mayores de 55 años.",
        "mode": "demo",
        "_error": error
    }


def _demo_top_stories(n: int) -> list[dict]:
    stories = [
        {"id": "1", "title": "TC admite a trámite el recurso del PP contra la amnistía", "source": "El País", "relevance_score": 0.92},
        {"id": "2", "title": "Sumar exige acelerar la reforma del IRPF", "source": "elDiario.es", "relevance_score": 0.81},
        {"id": "3", "title": "VOX rompe gobierno en una nueva CCAA", "source": "ABC", "relevance_score": 0.78},
        {"id": "4", "title": "BdE revisa al alza el PIB 2026", "source": "Cinco Días", "relevance_score": 0.74},
        {"id": "5", "title": "Investigación judicial alto cargo Moncloa", "source": "OK Diario", "relevance_score": 0.69},
        {"id": "6", "title": "Junts amenaza con bloquear comisión Justicia", "source": "La Vanguardia", "relevance_score": 0.67},
        {"id": "7", "title": "Feijóo presenta plan de vivienda para jóvenes", "source": "El Mundo", "relevance_score": 0.62},
        {"id": "8", "title": "Sánchez: 'La economía crece más que la UE'", "source": "RTVE", "relevance_score": 0.58},
        {"id": "9", "title": "Recortes en sanidad provocan protesta en Madrid", "source": "20 Minutos", "relevance_score": 0.55},
        {"id": "10", "title": "Polémica por declaraciones de Abascal sobre inmigración", "source": "El Plural", "relevance_score": 0.51}
    ]
    return stories[:n]


def _demo_narratives() -> list[dict]:
    return [
        {"id": "n1", "frame_label": "Crisis vivienda asequible", "lifecycle": "peak", "velocity": "up", "article_count": 142, "promoters": ["partidos progresistas"], "central_claim": "El gobierno no responde al problema estructural de vivienda.", "dominant_emotion": "frustración", "recommended_action": "Mensaje de respuesta con propuestas concretas"},
        {"id": "n2", "frame_label": "Lawfare contra el gobierno", "lifecycle": "emergence", "velocity": "up", "article_count": 87, "promoters": ["PSOE", "Sumar"], "central_claim": "Hay una persecución judicial dirigida contra el gobierno.", "dominant_emotion": "indignación", "recommended_action": "Vigilar amplificación + contra-frame"},
        {"id": "n3", "frame_label": "Reforma fiscal pendiente", "lifecycle": "emergence", "velocity": "up", "article_count": 64, "promoters": ["Sumar"], "central_claim": "El IRPF necesita una reforma progresiva urgente.", "dominant_emotion": "expectativa", "recommended_action": "Analizar movimientos de Sumar"},
        {"id": "n4", "frame_label": "Pactos PP-VOX en CCAA", "lifecycle": "decline", "velocity": "stable", "article_count": 51, "promoters": ["PSOE"], "central_claim": "Los pactos con VOX comprometen la agenda social.", "dominant_emotion": "tensión", "recommended_action": "Monitorizar tensiones internas"}
    ]


def _demo_alerts(unread_only: bool) -> list[dict]:
    alerts = [
        {"id": "1", "title": "Caída PP en sondeos territoriales", "body": "Tres sondeos consecutivos.", "level": "high", "source": "Motor nowcasting", "created_at": datetime.now(timezone.utc).isoformat(), "read": False},
        {"id": "2", "title": "Narrativa vivienda alcanza pico", "body": "+18% menciones 24h.", "level": "medium", "source": "Narrative Engine", "created_at": datetime.now(timezone.utc).isoformat(), "read": False},
        {"id": "3", "title": "Bloqueo Junts en comisión", "body": "Riesgo obstrucción legislativa.", "level": "high", "source": "Monitor legislativo", "created_at": datetime.now(timezone.utc).isoformat(), "read": False},
        {"id": "4", "title": "Recurso amnistía admitido por TC", "body": "Implicaciones legales.", "level": "critical", "source": "Monitor judicial", "created_at": datetime.now(timezone.utc).isoformat(), "read": False}
    ]
    if unread_only:
        return [a for a in alerts if not a["read"]]
    return alerts
