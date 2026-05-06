"""
Analysis Hub service — aggregates cross-domain signals into a prioritized
intelligence report. Works with or without live DB/LLM.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from api.schemas.analysis import AnalysisSignal, AnalysisHubResponse
from api.schemas.status import DataMode, ModeMeta

# Severity scoring weights
_SEVERITY_WEIGHT = {"critical": 100, "high": 75, "medium": 50, "low": 25}
_TREND_BONUS = {"new": 10, "up": 8, "stable": 0, "down": -5}


def _score_signal(sig: AnalysisSignal) -> float:
    base = _SEVERITY_WEIGHT.get(sig.severity, 25)
    bonus = _TREND_BONUS.get(sig.trend, 0)
    evidence = min(sig.evidence_count, 10)
    return base + bonus + evidence


def _collect_alerts_signals() -> list[AnalysisSignal]:
    """Try to load real alerts from DB."""
    try:
        from dashboard.db import cargar_alertas
        df = cargar_alertas()
        if df is None or df.empty:
            return []
        signals = []
        for _, row in df.head(10).iterrows():
            severity = "high" if row.get("nivel", "medium") in ("critical", "high", "alto", "critico") else "medium"
            signals.append(AnalysisSignal(
                id=f"alert-{row.get('id', uuid.uuid4().hex[:6])}",
                title=str(row.get("titulo", row.get("message", "Alerta sin título"))),
                summary=str(row.get("descripcion", row.get("message", ""))),
                domain="system",
                severity=severity,
                trend="new",
                source_ids=["alertas_sistema"],
                evidence_count=1,
                created_at=row.get("timestamp", datetime.now(timezone.utc)),
                mode="real",
                target_route="/alertas",
            ))
        return signals
    except Exception:
        return []


def _collect_source_signals() -> list[AnalysisSignal]:
    """Generate signals from source health issues."""
    try:
        from services.sources.source_registry import get_sources_with_health
        items = get_sources_with_health()
        signals = []
        for item in items:
            if item.health.status in ("down", "degraded"):
                sev = "high" if item.health.status == "down" else "medium"
                signals.append(AnalysisSignal(
                    id=f"src-{item.definition.id}",
                    title=f"Fuente {item.definition.name}: {item.health.status}",
                    summary=item.health.last_error or f"La fuente '{item.definition.name}' está en estado {item.health.status}.",
                    domain="system",
                    severity=sev,
                    trend="stable",
                    source_ids=[item.definition.id],
                    evidence_count=1,
                    created_at=item.health.last_attempt_at or datetime.now(timezone.utc),
                    mode="real",
                    recommended_action="Revisar configuración de fuente",
                    target_route="/fuentes",
                ))
        return signals
    except Exception:
        return []


def _collect_system_signals(brain_ok: bool) -> list[AnalysisSignal]:
    """Always produce system-level signals as baseline."""
    now = datetime.now(timezone.utc)
    signals = []
    if not brain_ok:
        signals.append(AnalysisSignal(
            id="brain-offline",
            title="Motor IA no disponible",
            summary="Ollama/Politeia Brain no responde. Los análisis generados son deterministas.",
            domain="system",
            severity="medium",
            trend="stable",
            source_ids=["ollama_brain"],
            evidence_count=1,
            created_at=now,
            mode="real",
            recommended_action="Verificar estado de Ollama",
            target_route="/sistema/ia",
        ))
    return signals


def _get_source_health_summary() -> dict[str, Any]:
    try:
        from services.sources.source_registry import get_source_coverage_summary
        coverage = get_source_coverage_summary()
        total = sum(d.get("total", 0) for d in coverage)
        active = sum(d.get("active", 0) for d in coverage)
        return {
            "total": total,
            "active": active,
            "domains": coverage,
            "mode": "real",
        }
    except Exception as exc:
        return {"total": 0, "active": 0, "domains": [], "mode": "fallback", "error": str(exc)}


def _is_brain_available() -> bool:
    try:
        from agents.brain.llm_router import is_ollama_available
        return is_ollama_available()
    except Exception:
        return False


def _generate_summary_with_ai(signals: list[AnalysisSignal], period: str) -> tuple[str, DataMode]:
    """Try to generate executive summary with Ollama. Falls back to deterministic."""
    try:
        from agents.brain.llm_router import route
        signal_text = "\n".join(
            f"- [{s.severity.upper()}] {s.title}: {s.summary}" for s in signals[:8]
        )
        prompt = (
            f"Periodo de análisis: {period}.\n"
            f"Señales detectadas:\n{signal_text}\n\n"
            "Genera un resumen ejecutivo de 4-6 frases. "
            "Responde: qué cambió, qué importa, qué riesgo emerge, qué acción debe priorizar el analista. "
            "No añadas hechos externos. Si los datos son demo/fallback, indícalo."
        )
        result = route(task_type="briefing", prompt=prompt)
        text = result.get("response", "") if isinstance(result, dict) else str(result)
        if text:
            return text, "real"
    except Exception:
        pass

    # Deterministic fallback
    n_signals = len(signals)
    critical = sum(1 for s in signals if s.severity == "critical")
    high = sum(1 for s in signals if s.severity == "high")
    domains = list({s.domain for s in signals})
    summary = (
        f"Análisis del periodo {period}: se han detectado {n_signals} señales activas "
        f"({critical} críticas, {high} de alta severidad) en los dominios: {', '.join(domains)}. "
        "Los datos de fuentes están en proceso de integración. "
        "Se recomienda revisar el estado de las fuentes y validar la conectividad del motor IA."
    )
    return summary, "fallback"


def _build_recommended_actions(signals: list[AnalysisSignal]) -> list[str]:
    actions = []
    domains_present = {s.domain for s in signals}
    if any(s.severity in ("critical", "high") for s in signals if s.domain == "system"):
        actions.append("Revisar estado de fuentes en Fuentes & Ingesta")
    if "legislative" in domains_present:
        actions.append("Abrir Monitor Legislativo para revisar iniciativas")
    if "media" in domains_present:
        actions.append("Abrir Medios & Narrativa para seguimiento mediático")
    if "risk" in domains_present or any(s.severity == "critical" for s in signals):
        actions.append("Revisar índice de riesgo político")
    if not actions:
        actions.append("Conectar fuentes de datos adicionales para análisis más rico")
        actions.append("Configurar alertas para dominios prioritarios")
    return actions[:6]


def collect_cross_domain_signals(period: str = "24h") -> list[AnalysisSignal]:
    brain_ok = _is_brain_available()
    all_signals: list[AnalysisSignal] = []
    all_signals.extend(_collect_alerts_signals())
    all_signals.extend(_collect_source_signals())
    all_signals.extend(_collect_system_signals(brain_ok))
    # Sort by score
    all_signals.sort(key=_score_signal, reverse=True)
    return all_signals


def build_analysis_hub(period: str = "24h", workspace_id: str = "default") -> AnalysisHubResponse:
    now = datetime.now(timezone.utc)
    signals = collect_cross_domain_signals(period)
    top_signals = [s for s in signals[:8]]
    risks = [s for s in signals if s.severity in ("critical", "high") and s.domain in ("risk", "system")]
    opportunities = [s for s in signals if s.trend in ("up", "new") and s.severity in ("low", "medium")]
    changed_24h = [s for s in signals if s.trend in ("new", "up")][:6]

    summary_text, summary_mode = _generate_summary_with_ai(signals, period)
    overall_mode: DataMode = summary_mode if signals else "fallback"
    health_summary = _get_source_health_summary()
    actions = _build_recommended_actions(signals)

    return AnalysisHubResponse(
        mode=overall_mode,
        meta=ModeMeta(
            mode=overall_mode,
            source="analysis_hub",
            message="Análisis generado con IA" if overall_mode == "real" else "Análisis determinista (IA no disponible)",
        ),
        generated_at=now,
        period=period,
        executive_summary=summary_text,
        top_signals=top_signals,
        changed_24h=changed_24h,
        risks=risks,
        opportunities=opportunities,
        source_health_summary=health_summary,
        recommended_next_actions=actions,
    )
