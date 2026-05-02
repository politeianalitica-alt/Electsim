"""
Nodo synthesizer — Genera el briefing y los productos de inteligencia.

Actualiza:
  output_briefing
  output_alerts
  output_products
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def synthesizer_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """Nodo de sintesis: genera briefing, alertas y productos."""
    from agents.analysis.synthesis_engine import SynthesisEngine, IntelAlert
    from agents.analysis.layer9_products import IntelligenceProductFactory, IntelProduct
    from agents.analysis.strategic_analyzer import (
        StrategicAssessment, ActorTrend, RiskItem, Opportunity
    )
    from agents.analysis.extractor import IntelSignal

    assessments_raw: list[dict[str, Any]] = state.get("analysis_assessments", [])
    signals_raw: list[dict[str, Any]] = state.get("extracted_signals", [])
    market_id: str = state.get("input_market_id", "ES")
    briefing_type: str = state.get("input_briefing_type", "morning_briefing")

    # Reconstruir objetos de dominio
    assessments = []
    for ad in assessments_raw:
        risks = [
            RiskItem(
                category=r.get("category", "reputacional"),
                description=r.get("description", ""),
                severity=r.get("severity", "medio"),
            )
            for r in ad.get("risks", [])
        ]
        a = StrategicAssessment(
            actor=ad["actor"],
            position_summary=ad.get("position_summary", ""),
            executive_summary=ad.get("executive_summary", ""),
            risks=risks,
        )
        a.trend.direction = ad.get("trend_direction", "estable")
        assessments.append(a)

    signals = [
        IntelSignal(
            signal_type=s.get("type", "declaracion"),
            urgency=s.get("urgency", "media"),
            summary=s.get("summary", ""),
        )
        for s in signals_raw
    ]

    synth = SynthesisEngine(engine, market_id=market_id)

    # Briefing
    briefing_dict: dict[str, Any] = {}
    alerts_list: list[dict[str, Any]] = []
    try:
        briefing = await synth.morning_briefing(
            assessments=assessments,
            raw_signals=signals,
            market_context=f"Mercado: {market_id}",
        )
        briefing_dict = {
            "type": briefing_type,
            "title": briefing.title,
            "executive_summary": briefing.executive_summary,
            "sections": briefing.sections,
            "actors_covered": briefing.actors_covered,
            "word_count": briefing.word_count,
            "markdown": briefing.to_markdown(),
        }

        for alert in briefing.alerts:
            alerts_list.append({
                "id": alert.alert_id,
                "level": alert.level,
                "title": alert.title,
                "body": alert.body,
                "actors": alert.actors,
                "requires_action": alert.requires_action,
            })
    except Exception as exc:
        logger.warning("synthesizer_node briefing error: %s", exc)

    # Alertas adicionales por señales de alta urgencia
    high_urgency = [s for s in signals if s.urgency == "alta"]
    if high_urgency:
        try:
            extra = await synth.generate_alert(signals=high_urgency)
            if extra:
                alerts_list.append({
                    "id": extra.alert_id,
                    "level": extra.level,
                    "title": extra.title,
                    "body": extra.body,
                    "actors": extra.actors,
                    "requires_action": extra.requires_action,
                })
        except Exception as exc:
            logger.warning("synthesizer_node extra alert error: %s", exc)

    # Productos de inteligencia (war room, risk report, etc.)
    products_list: list[dict[str, Any]] = []

    return {
        **state,
        "output_briefing": briefing_dict,
        "output_alerts": alerts_list,
        "output_products": products_list,
        "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["synthesizer"],
    }
