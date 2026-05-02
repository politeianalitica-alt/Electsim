"""
Nodo critic — Evalua la calidad del analisis y solicita re-ejecucion si es necesario.

El critic verifica:
  - Cobertura de actores (al menos 60% de los focus_actors analizados)
  - Presencia de señales de alta urgencia no procesadas
  - Coherencia de los assessments (riesgos sin evidencia = baja confianza)

Actualiza:
  critic_feedback
  critic_confidence
  critic_requires_rerun
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def critic_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """Nodo critico que evalua la calidad del analisis."""
    assessments: list[dict[str, Any]] = state.get("analysis_assessments", [])
    focus_actors: list[str] = state.get("input_focus_actors", [])
    signals: list[dict[str, Any]] = state.get("extracted_signals", [])
    iteration: int = state.get("meta_iteration", 0)

    feedback_parts = []
    confidence = 0.8
    requires_rerun = False

    # Verificar cobertura de actores
    analyzed_actors = {a["actor"] for a in assessments}
    if focus_actors:
        coverage = len(analyzed_actors & set(focus_actors)) / len(focus_actors)
        if coverage < 0.6:
            feedback_parts.append(
                f"Cobertura de actores insuficiente: {coverage:.0%} "
                f"(analizados: {analyzed_actors})"
            )
            confidence -= 0.2
            if iteration == 0:
                requires_rerun = True

    # Verificar señales de alta urgencia procesadas
    high_urgency = [s for s in signals if s.get("urgency") == "alta"]
    classifications = state.get("analysis_classifications", [])
    if high_urgency and not classifications:
        feedback_parts.append(
            f"Hay {len(high_urgency)} señales de alta urgencia sin clasificar"
        )
        confidence -= 0.1

    # Verificar coherencia: assessments sin riesgos
    no_risk_actors = [a["actor"] for a in assessments if not a.get("risks")]
    if no_risk_actors and len(no_risk_actors) > len(assessments) * 0.5:
        feedback_parts.append(
            f"Muchos actores sin riesgos identificados: {no_risk_actors[:3]}"
        )
        confidence -= 0.1

    # Uso de LLM para feedback cualitativo (opcional, no bloquea)
    if assessments and engine:
        try:
            summaries = [
                f"{a['actor']}: {a.get('executive_summary', '')[:100]}"
                for a in assessments[:3]
            ]
            prompt = (
                "Evalua en 50 palabras la calidad de estos analisis politicos:\n"
                + "\n".join(summaries)
            )
            llm_feedback = await engine.generate(
                role="rapido", prompt=prompt, temperature=0.2
            )
            feedback_parts.append(f"LLM feedback: {llm_feedback[:150]}")
        except Exception:
            pass

    feedback = "; ".join(feedback_parts) if feedback_parts else "Analisis completo y coherente."
    confidence = max(0.0, min(1.0, confidence))

    return {
        **state,
        "critic_feedback": feedback,
        "critic_confidence": confidence,
        "critic_requires_rerun": requires_rerun,
        "meta_iteration": iteration + 1,
        "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["critic"],
    }
