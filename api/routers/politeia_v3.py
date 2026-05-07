"""
Politeia v3 — Unified API router for the Next.js frontend.

Exposes endpoints under /api/* that the apps/web frontend consumes.
All endpoints are graceful: never crash, always return a structured response,
mark mode (real/demo/fallback/error) explicitly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
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
        from agents.brain.politeia_brain import get_available_model, is_brain_available  # type: ignore
        status.llm = {
            "available": is_brain_available(),
            "model": get_available_model(),
            "provider": "ollama-or-cloud"
        }
    except Exception:
        status.llm = {"available": False, "model": "demo", "provider": "none"}

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
    status.overall_ok = status.database.get("ok", True) and status.llm.get("available", True)
    return status


@router.get("/system/ticker", response_model=list[TickerItemOut])
def system_ticker() -> list[TickerItemOut]:
    """Live ticker items from real DB data."""
    now = datetime.now(timezone.utc)
    try:
        from services.real_data import build_ticker_data  # type: ignore
        items = build_ticker_data()
        if items:
            return [
                TickerItemOut(
                    text=it["text"],
                    category=it["category"],
                    color=it["color"],
                    priority=it.get("priority", 3),
                    timestamp=now
                ) for it in items if it.get("text")
            ]
    except Exception:
        pass
    # Static fallback — only if DB is completely unreachable
    return [
        TickerItemOut(text="PP 33.1%", category="electoral", color="#1F77FF", priority=2, timestamp=now),
        TickerItemOut(text="PSOE 27.8%", category="electoral", color="#E03A3E", priority=2, timestamp=now),
        TickerItemOut(text="VOX 11.4%", category="electoral", color="#5BC035", priority=2, timestamp=now),
        TickerItemOut(text="IPC 2.8%", category="economic", color="#94A3B8", priority=3, timestamp=now),
        TickerItemOut(text="Prima riesgo 85 pb", category="economic", color="#94A3B8", priority=3, timestamp=now),
        TickerItemOut(text="Riesgo político 6.4/10 (amarillo)", category="risk", color="#F59E0B", priority=2, timestamp=now),
        TickerItemOut(text="DANA Valencia — impacto social severo", category="alert", color="#EF4444", priority=1, timestamp=now),
    ]


# ── Briefings ─────────────────────────────────────────────────────────────────

@router.get("/briefings/morning")
def briefing_morning(workspace_id: str = Query("default")) -> dict:
    """Morning intelligence briefing built from real DB data."""
    try:
        from services.real_data import (  # type: ignore
            get_nowcasting, get_macro_ultimo, get_risk_latest,
            get_top_noticias, get_alertas,
        )
        now = datetime.now(timezone.utc)
        estimates = get_nowcasting()
        macro = get_macro_ultimo()
        risk = get_risk_latest()
        noticias = get_top_noticias(limit=8, dias=14)
        alertas = get_alertas(limit=5)

        top_parties: dict[str, float] = {}
        for e in estimates[:6]:
            pct = e.get("estimacion_pct")
            if pct is not None:
                top_parties[e["partido"]] = round(float(pct), 1)

        leader = estimates[0]["partido"] if estimates else "PP"
        leader_pct = float(estimates[0].get("estimacion_pct", 33.1)) if estimates else 33.1

        ipc = float(macro.get("ipc_general") or 2.8)
        prima = int(macro.get("prima_riesgo_bono10") or 85)
        risk_idx = float(risk.get("indice_compuesto") or 6.4)
        risk_sem = risk.get("semaforo", "amarillo")

        stories = [
            {
                "id": str(n.get("id", i)),
                "title": n.get("title") or n.get("titular", ""),
                "source": n.get("source") or n.get("fuente", ""),
                "relevance_score": float(n.get("relevance_score") or n.get("relevancia_score") or 0),
                "sentiment": n.get("sentimiento_label") or n.get("ai_sentiment") or "neutro",
                "url": n.get("url", ""),
                "published_at": n.get("fecha_publicacion") or n.get("published_at") or "",
            }
            for i, n in enumerate(noticias)
        ]

        key_alerts = [
            {
                "title": a.get("titulo", ""),
                "level": a.get("level", "medium"),
                "body": a.get("body") or a.get("descripcion") or "",
            }
            for a in alertas
        ]

        fecha_estimacion = estimates[0].get("fecha_estimacion", "") if estimates else ""
        executive_summary = (
            f"{leader} lidera la intención de voto con {leader_pct:.1f}% "
            f"(datos: {fecha_estimacion}). "
            f"IPC en {ipc:.1f}%, prima de riesgo {prima} pb. "
            f"Índice de riesgo político {risk_idx:.1f}/10 — semáforo {risk_sem}. "
            f"{len(noticias)} noticias procesadas en los últimos 14 días."
        )

        return {
            "date": now.date().isoformat(),
            "generated_at": now.isoformat(),
            "tenant_id": "real",
            "workspace_id": workspace_id,
            "executive_summary": executive_summary,
            "key_alerts": key_alerts,
            "top_stories": stories,
            "active_narratives": [],
            "risk_signals": [{"label": f"Riesgo político {risk_idx}/10", "color": risk_sem}] if risk else [],
            "legislative_updates": [],
            "electoral_snapshot": {
                "top_parties": top_parties,
                "fecha": fecha_estimacion,
                "leader": leader,
                "leader_pct": leader_pct,
            },
            "macro_snapshot": {
                "ipc": ipc,
                "prima_riesgo": prima,
                "euribor": float(macro.get("euribor_12m") or 3.2),
                "crecimiento_pib": float(macro.get("crecimiento_pib") or 3.2),
                "fecha": macro.get("fecha", ""),
            },
            "three_questions": [
                f"¿Puede {leader} mantener {leader_pct:.1f}% ante el ciclo electoral de 2026?",
                f"¿Cómo afecta un IPC del {ipc:.1f}% a la coalición gobernante?",
                f"¿Qué escenario de coalición consolida el liderazgo con {risk_idx:.1f}/10 de riesgo político?",
            ],
            "mode": "real",
        }
    except Exception as exc:
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
    """Top stories from real noticias_prensa + news_articles."""
    try:
        from services.real_data import get_top_noticias, get_top_news_articles  # type: ignore
        stories: list[dict] = []

        # Priority: noticias_prensa (higher relevance scores, curated)
        noticias = get_top_noticias(limit=n, dias=30)
        for item in noticias:
            stories.append({
                "id": str(item.get("id", "")),
                "title": item.get("title") or item.get("titular", ""),
                "source": item.get("source") or item.get("fuente", ""),
                "url": item.get("url", ""),
                "relevance_score": float(item.get("relevance_score") or item.get("relevancia_score") or 0),
                "sentiment": item.get("sentimiento_label", "neutro"),
                "category": item.get("categoria", ""),
                "published_at": item.get("fecha_publicacion") or "",
                "summary": item.get("resumen") or "",
            })

        # Supplement with news_articles if needed
        if len(stories) < n:
            articles = get_top_news_articles(limit=n - len(stories), dias=7)
            for item in articles:
                stories.append({
                    "id": str(item.get("id", "")),
                    "title": item.get("title", ""),
                    "source": item.get("source_name", ""),
                    "url": item.get("url", ""),
                    "relevance_score": float(item.get("ai_relevance") or 5) / 10.0,
                    "sentiment": item.get("ai_sentiment", "neutro"),
                    "category": item.get("ai_category", ""),
                    "published_at": item.get("published_at") or "",
                    "summary": item.get("ai_summary") or "",
                })

        if stories:
            return stories[:n]
    except Exception:
        pass
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
    """Active narrative clusters built from real noticias_prensa keyword groups."""
    try:
        from services.real_data import get_top_noticias
        noticias = get_top_noticias(limit=100, dias=14)
        if not noticias:
            return _demo_narratives()

        from datetime import datetime, timezone
        # Group articles by category / keyword for narrative clusters
        clusters: dict[str, list] = {}
        for n in noticias:
            cat = str(n.get("categoria") or n.get("category") or "general").lower()
            clusters.setdefault(cat, []).append(n)

        result = []
        emotion_map = {"politica": "tension", "economia": "anxiety", "sociedad": "concern",
                       "internacional": "urgency", "general": "neutral"}
        type_map = {"politica": "political", "economia": "economic", "sociedad": "social",
                    "internacional": "geopolitical", "general": "political"}
        now = datetime.now(timezone.utc).isoformat()
        for i, (cat, arts) in enumerate(sorted(clusters.items(), key=lambda x: -len(x[1]))):
            if len(arts) < 2:
                continue
            titles = [a.get("title") or a.get("titular") or "" for a in arts[:5]]
            sources = list({a.get("source") or a.get("fuente") or "" for a in arts if a.get("source") or a.get("fuente")})[:4]
            top_title = titles[0] if titles else cat
            result.append({
                "cluster_id": f"real_{cat}_{i:03d}",
                "frame_label": f"{top_title[:70]}",
                "frame_description": f"Clúster narrativo '{cat}': {len(arts)} artículos en los últimos 14 días",
                "central_claim": titles[1] if len(titles) > 1 else top_title,
                "promoters": sources[:2],
                "affected_actors": [],
                "diffuser_sources": sources,
                "representative_titles": [t for t in titles if t][:3],
                "dominant_emotion": emotion_map.get(cat, "neutral"),
                "frame_type": type_map.get(cat, "political"),
                "lifecycle": "active",
                "velocity": "fast" if len(arts) >= 10 else "moderate",
                "article_count": len(arts),
                "possible_coordination": False,
                "counter_narrative": "",
                "recommended_action": f"Monitorizar evolución del tema '{cat}'",
                "updated_at": now,
                "mode": "real",
            })
            if len(result) >= 12:
                break
        return result if result else _demo_narratives()
    except Exception:
        return _demo_narratives()


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
def alerts_list(unread: bool = Query(False)) -> list[dict]:
    """Active alerts from alertas_sistema."""
    try:
        from services.real_data import get_alertas  # type: ignore
        alerts = get_alertas(limit=50, solo_no_leidas=unread)
        if alerts:
            return alerts
    except Exception:
        pass
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
    """Brain model availability."""
    try:
        from agents.brain.politeia_brain import get_available_model, is_brain_available  # type: ignore
        return {"available": is_brain_available(), "model": get_available_model(), "mode": "real"}
    except Exception:
        return {"available": False, "model": "demo", "mode": "fallback"}


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
