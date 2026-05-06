"""
Briefing Engine (Sprint 3).
Wraps existing morning_briefing_engine + analysis_hub + editorial_engine
to produce typed BriefingDocument objects.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from api.schemas.briefings import (
    BriefingDocument, BriefingRequest, BriefingSection, BriefingEvidence,
)
from api.schemas.status import DataMode

_BRIEFING_TITLES = {
    "morning": "Briefing matinal de inteligencia",
    "client": "Briefing de cliente",
    "legislative": "Briefing legislativo",
    "crisis": "Briefing de crisis",
    "media": "Briefing mediático y narrativo",
    "geopolitical": "Briefing geopolítico y sectorial",
    "sectorial": "Briefing sectorial",
}

_SYSTEM_PROMPT = """
Eres Politeia Brain, analista senior de inteligencia política, regulatoria y mediática.
Redactas briefings ejecutivos para profesionales.
No inventes datos, fuentes, cifras ni citas.
Solo puedes usar las señales y evidencias proporcionadas.
Si la información está en modo demo o fallback, indícalo de forma sobria.
Tu estilo es claro, analítico, sobrio y accionable. Escribe en español.
"""


def _collect_signals(period: str, workspace_id: str) -> dict[str, Any]:
    """Get analysis hub data with graceful fallback."""
    try:
        from services.analysis.analysis_hub import build_analysis_hub
        hub = build_analysis_hub(period=period, workspace_id=workspace_id)
        return hub.model_dump(mode="json")
    except Exception as exc:
        return {
            "mode": "fallback",
            "top_signals": [],
            "changed_24h": [],
            "risks": [],
            "opportunities": [],
            "source_health_summary": {},
            "recommended_next_actions": [],
            "executive_summary": "",
            "_error": str(exc),
        }


def _get_legacy_morning(workspace_id: str) -> dict[str, Any]:
    """Fetch from existing morning_briefing_engine."""
    try:
        from services.intelligence.morning_briefing_engine import build_morning_briefing
        result = build_morning_briefing("demo", workspace_id)
        return result.model_dump() if hasattr(result, "model_dump") else dict(result)
    except Exception:
        return {}


def _generate_ai_summary(
    request: BriefingRequest, hub: dict, legacy: dict
) -> tuple[str, DataMode, str | None, int | None]:
    """Try Ollama LLM; fallback to deterministic template."""
    top_signals = hub.get("top_signals", [])[:6]
    risks = hub.get("risks", [])[:3]
    opportunities = hub.get("opportunities", [])[:3]
    actions = hub.get("recommended_next_actions", [])[:4]
    legacy_summary = legacy.get("executive_summary", "")
    legacy_note = legacy.get("analyst_note", "")

    payload = {
        "briefing_type": request.briefing_type,
        "audience": request.audience,
        "period": request.period,
        "topic": request.topic,
        "sector": request.sector,
        "top_signals": [
            {"title": s.get("title"), "severity": s.get("severity"), "summary": s.get("summary")}
            for s in top_signals
        ],
        "risks": [{"title": r.get("title"), "severity": r.get("severity")} for r in risks],
        "opportunities": [{"title": o.get("title")} for o in opportunities],
        "recommended_actions": actions,
        "source_health": hub.get("source_health_summary", {}),
        "legacy_briefing_note": legacy_note[:300] if legacy_note else "",
    }

    start = time.perf_counter()
    try:
        from agents.brain.llm_router import route
        import json
        prompt = (
            f"Genera un briefing de tipo '{request.briefing_type}' para audiencia '{request.audience}'.\n"
            f"Periodo: {request.period}. Workspace: {request.workspace_id}.\n"
            f"Tema: {request.topic or 'general'}. Sector: {request.sector or 'general'}.\n\n"
            f"Datos disponibles:\n{json.dumps(payload, ensure_ascii=False, default=str)}\n\n"
            "Devuelve un resumen ejecutivo de 5-8 frases. "
            "Responde solo el texto del resumen, sin JSON ni formato adicional."
        )
        result = route(task_type="briefing", prompt=prompt)
        text = result.get("response", "") if isinstance(result, dict) else str(result)
        model = result.get("model", "ollama") if isinstance(result, dict) else "ollama"
        elapsed = int((time.perf_counter() - start) * 1000)
        if text and len(text) > 50:
            return text.strip(), "real", model, elapsed
    except Exception:
        pass

    # Deterministic fallback
    n = len(top_signals)
    top_title = top_signals[0].get("title", "sin señales") if top_signals else "sin señales activas"
    risk_title = risks[0].get("title", "sin riesgos críticos") if risks else "sin riesgos críticos identificados"
    opp_title = opportunities[0].get("title", "sin oportunidades claras") if opportunities else "sin oportunidades inmediatas"
    health = hub.get("source_health_summary", {})
    active = health.get("active", "—")
    total = health.get("total", "—")
    mode_str = hub.get("mode", "fallback")
    legacy_part = f" {legacy_summary[:200]}." if legacy_summary else ""

    summary = (
        f"Análisis del periodo {request.period}: el sistema detecta {n} señales activas. "
        f"La señal prioritaria es: {top_title}. "
        f"El principal riesgo es: {risk_title}. "
        f"La oportunidad más clara es: {opp_title}."
        f"{legacy_part} "
        f"Calidad de datos: {active} de {total} fuentes activas (modo {mode_str}). "
        "Resumen generado sin motor IA por indisponibilidad o ausencia de señales suficientes."
    )
    elapsed = int((time.perf_counter() - start) * 1000)
    return summary, "fallback", None, elapsed


def _build_sections(request: BriefingRequest, hub: dict, legacy: dict) -> list[BriefingSection]:
    sections: list[BriefingSection] = []
    mode: DataMode = hub.get("mode", "fallback")

    # Key changes
    changed = hub.get("changed_24h", [])[:6]
    if changed:
        sections.append(BriefingSection(
            id="key_changes",
            type="key_changes",
            title="Cambios clave en el periodo",
            body=f"Se detectaron {len(changed)} cambios o señales nuevas en las últimas {request.period}.",
            bullets=[
                f"[{s.get('severity','').upper()}] {s.get('title','')} — {s.get('summary','')[:100]}"
                for s in changed
            ],
            mode=mode,
            target_route="/analisis",
        ))

    # Risks
    risks = hub.get("risks", [])[:5]
    if risks:
        sections.append(BriefingSection(
            id="risks",
            type="risks",
            title="Riesgos identificados",
            body="Señales de riesgo priorizadas por severidad y puntuación.",
            bullets=[
                f"[{r.get('severity','').upper()}] {r.get('title','')} — {r.get('summary','')[:120]}"
                for r in risks
            ],
            recommended_action=hub.get("recommended_next_actions", ["Revisar estado de fuentes"])[0],
            mode=mode,
            target_route="/riesgo",
        ))

    # Opportunities
    opps = hub.get("opportunities", [])[:4]
    if opps:
        sections.append(BriefingSection(
            id="opportunities",
            type="opportunities",
            title="Oportunidades",
            body="Señales con potencial positivo o accionable.",
            bullets=[f"{o.get('title','')} — {o.get('summary','')[:100]}" for o in opps],
            mode=mode,
        ))

    # Recommended actions
    actions = hub.get("recommended_next_actions", [])
    if actions:
        sections.append(BriefingSection(
            id="recommended_actions",
            type="recommended_actions",
            title="Acciones recomendadas",
            body="Prioridades operativas para el analista.",
            bullets=actions[:6],
            mode=mode,
        ))

    # Type-specific sections
    if request.briefing_type == "legislative":
        leg_updates = legacy.get("legislative_updates", [])[:5]
        bullets = (
            [
                f"{u.get('title','')} — Estado: {u.get('status','')} ({u.get('date','')})"
                for u in leg_updates
            ]
            if leg_updates
            else ["Sin actualizaciones legislativas disponibles (modo demo/fallback)."]
        )
        sections.append(BriefingSection(
            id="legislative_watch",
            type="legislative_watch",
            title="Radar normativo",
            body="Iniciativas y publicaciones legislativas recientes.",
            bullets=bullets,
            mode="real" if leg_updates else "fallback",
            target_route="/legislativo",
        ))
    elif request.briefing_type == "media":
        narratives = legacy.get("active_narratives", [])[:5]
        bullets = (
            [f"{n.get('frame_label','')} — Velocidad: {n.get('velocity','')}" for n in narratives]
            if narratives
            else ["Sin narrativas disponibles en modo fallback."]
        )
        sections.append(BriefingSection(
            id="media_narratives",
            type="media_narratives",
            title="Narrativas mediáticas",
            body="Encuadres y narrativas activas en prensa y redes.",
            bullets=bullets,
            mode="real" if narratives else "fallback",
            target_route="/medios",
        ))
    elif request.briefing_type == "crisis":
        crisis_signals = [
            s for s in hub.get("top_signals", [])
            if s.get("severity") in ("critical", "high")
        ][:3]
        bullets = (
            [f"{s.get('title','')} — {s.get('summary','')[:120]}" for s in crisis_signals]
            if crisis_signals
            else ["Sin señales de crisis activas. Vigilancia preventiva recomendada."]
        )
        sections.append(BriefingSection(
            id="crisis_signal",
            type="executive_summary",
            title="Señal de crisis",
            body="Señales de mayor intensidad con potencial de escalada.",
            bullets=bullets,
            mode=mode,
            recommended_action="Activar protocolo de respuesta si severidad escala a crítica",
            target_route="/alertas",
        ))

    # Source health / methodology
    if request.include_methodology:
        health = hub.get("source_health_summary", {})
        active = health.get("active", "—")
        total = health.get("total", "—")
        sections.append(BriefingSection(
            id="methodology",
            type="methodology",
            title="Nota metodologica y salud de datos",
            body=(
                f"Briefing generado a partir de Analysis Hub (Sprint 2), señales cross-domain y motor IA Ollama. "
                f"Fuentes activas: {active} de {total}. "
                f"Modo de datos: {mode}. "
                "Las señales de sistema son heurísticas basadas en severidad, tendencia y evidencia acumulada."
            ),
            mode=mode,
            target_route="/fuentes",
        ))

    return sections


def generate_briefing(request: BriefingRequest) -> BriefingDocument:
    """Main entry point: generate a typed BriefingDocument."""
    briefing_id = f"brfg-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"

    hub = _collect_signals(period=request.period, workspace_id=request.workspace_id)
    legacy = _get_legacy_morning(workspace_id=request.workspace_id)

    warnings: list[str] = []
    if hub.get("mode") in ("fallback", "demo"):
        warnings.append(f"Datos de Analysis Hub en modo {hub.get('mode')}.")
    if not legacy:
        warnings.append("Motor de briefing matinal legacy no disponible.")

    summary, mode, model_used, latency = _generate_ai_summary(request, hub, legacy)

    if mode == "fallback":
        warnings.append("Resumen generado sin motor IA por indisponibilidad o datos insuficientes.")

    sections = _build_sections(request, hub, legacy)
    title = _BRIEFING_TITLES.get(request.briefing_type, "Briefing de inteligencia")
    if request.topic:
        title += f" — {request.topic}"
    if request.sector:
        title += f" [{request.sector}]"

    source_ids = list(
        {s.get("source_ids", [""])[0] for s in hub.get("top_signals", []) if s.get("source_ids")}
    )
    signal_ids = [s.get("id", "") for s in hub.get("top_signals", [])[:8]]

    methodology = (
        "Generado mediante: Analysis Hub (Sprint 2), señales cross-domain, "
        f"motor IA Ollama ({'disponible' if mode == 'real' else 'no disponible'}). "
        "Señales priorizadas por severidad + tendencia + evidencia."
    ) if request.include_methodology else None

    doc = BriefingDocument(
        id=briefing_id,
        title=title,
        briefing_type=request.briefing_type,
        audience=request.audience,
        workspace_id=request.workspace_id,
        client_id=request.client_id,
        sector=request.sector,
        topic=request.topic,
        period=request.period,
        mode=mode,
        model_used=model_used,
        latency_ms=latency,
        executive_summary=summary,
        sections=sections,
        source_ids=[s for s in source_ids if s],
        signal_ids=[s for s in signal_ids if s],
        warnings=warnings,
        methodology_note=methodology,
    )
    return doc
