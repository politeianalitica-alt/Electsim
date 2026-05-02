"""
Nodo analyst — Analisis estrategico de actores y clasificacion de señales.

Actualiza:
  analysis_assessments
  analysis_classifications
  analysis_deep (si input_run_deep)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


async def analyst_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """Nodo de analisis estrategico."""
    from agents.analysis.extractor import ExtractionResult, NamedEntities, IntelSignal
    from agents.analysis.layer5_classifier import IntelligenceClassifier
    from agents.analysis.strategic_analyzer import StrategicAnalyzer

    focus_actors: list[str] = state.get("input_focus_actors", [])
    entities_raw: dict[str, list[str]] = state.get("extracted_entities", {})
    signals_raw: list[dict[str, Any]] = state.get("extracted_signals", [])
    texts: list[str] = state.get("input_texts", [])
    market_id: str = state.get("input_market_id", "ES")
    run_deep: bool = state.get("input_run_deep", True)

    # Reconstruir objetos de dominio desde el estado
    signals = [
        IntelSignal(
            signal_type=s.get("type", "declaracion"),
            urgency=s.get("urgency", "media"),
            actors=s.get("actors", []),
            summary=s.get("summary", ""),
            confidence=s.get("confidence", 0.6),
            tags=s.get("tags", []),
        )
        for s in signals_raw
    ]

    all_actors = list(set(
        focus_actors
        + entities_raw.get("personas", [])
        + entities_raw.get("partidos", [])
    ))[:6]

    analyzer = StrategicAnalyzer(engine)
    classifier = IntelligenceClassifier(engine, actors=all_actors, market_id=market_id)

    # Analisis estrategico por actor
    context_text = "\n".join(texts[:3])
    assess_tasks = [
        analyzer.analyze(
            actor=actor,
            signals=signals,
            context=context_text,
        )
        for actor in all_actors[:5]
    ]
    assess_results = await asyncio.gather(*assess_tasks, return_exceptions=True)

    assessments_dicts = []
    for res in assess_results:
        if hasattr(res, "actor"):
            assessments_dicts.append({
                "actor": res.actor,
                "position_summary": res.position_summary,
                "trend_direction": res.trend.direction,
                "trend_confidence": res.trend.confidence,
                "risks": [
                    {"severity": r.severity, "category": r.category, "description": r.description}
                    for r in res.risks
                ],
                "opportunities": [
                    {"type": o.type_, "description": o.description}
                    for o in res.opportunities
                ],
                "executive_summary": res.executive_summary,
                "has_critical_risk": res.has_critical_risk(),
            })

    # Clasificacion de señales
    classifications_dicts = []
    if signals:
        try:
            batch = await classifier.classify_batch(signals[:15])
            for c in batch.signals:
                classifications_dicts.append({
                    "intel_type": c.intel_type,
                    "subtype": c.subtype,
                    "impact_horizon": c.impact_horizon,
                    "audiences": c.audiences,
                    "relevance_scores": c.relevance_scores,
                    "confidence": c.classification_confidence,
                    "original_summary": c.original.summary,
                })
        except Exception as exc:
            logger.warning("analyst_node classify error: %s", exc)

    # Analisis profundo capa 7 (opcional)
    deep_dicts: list[dict[str, Any]] = []
    if run_deep and assessments_dicts:
        from agents.analysis.layer7_strategic import StrategicAnalyzer7
        from agents.analysis.layer6_context import EnrichedAssessment
        from agents.analysis.strategic_analyzer import StrategicAssessment, ActorTrend, RiskItem, Opportunity

        s7 = StrategicAnalyzer7(engine, market_id=market_id)
        poll_data: dict[str, float] = state.get("input_poll_data", {})

        for ad in assessments_dicts[:3]:
            try:
                deep = await s7.analyze(
                    actor=ad["actor"],
                    poll_data=poll_data,
                    competing_actors=all_actors,
                    run_scenarios=True,
                )
                deep_dicts.append({
                    "actor": deep.actor,
                    "synthesis": deep.synthesis,
                    "engines_run": deep.engines_run,
                    "position": {
                        "economic_axis": deep.position.economic_axis if deep.position else 0,
                        "social_axis": deep.position.social_axis if deep.position else 0,
                        "cluster": deep.position.nearest_cluster if deep.position else "",
                    } if deep.position else None,
                    "scenarios": [
                        {"name": s.name, "probability": s.probability, "description": s.description}
                        for s in deep.scenarios
                    ],
                })
            except Exception as exc:
                logger.warning("analyst_node deep %s: %s", ad["actor"], exc)

    return {
        **state,
        "analysis_assessments": assessments_dicts,
        "analysis_classifications": classifications_dicts,
        "analysis_deep": deep_dicts,
        "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["analyst"],
    }
