"""
Nodo context_builder — Enriquece el estado con contexto historico y economico.

Actualiza:
  context_actor_profiles
  context_economic
  context_historical
  context_geopolitical
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def context_builder_node(state: dict[str, Any], engine: Any) -> dict[str, Any]:
    """Nodo de construccion de contexto."""
    from agents.analysis.layer6_context import ContextAnalyzer
    from agents.analysis.strategic_analyzer import StrategicAssessment, StrategicAnalyzer, ActorTrend

    focus_actors: list[str] = state.get("input_focus_actors", [])
    entities: dict[str, list[str]] = state.get("extracted_entities", {})
    economic_data: dict[str, Any] = state.get("input_economic_data", {})
    geo_summary: str = state.get("input_geopolitical_summary", "")
    texts: list[str] = state.get("input_texts", [])

    all_actors = list(set(
        focus_actors + entities.get("personas", []) + entities.get("partidos", [])
    ))[:6]

    ctx = ContextAnalyzer(engine, market_id=state.get("input_market_id", "ES"))

    profiles: dict[str, dict[str, Any]] = {}
    for actor in all_actors[:4]:
        try:
            profile = await ctx._build_actor_profile(
                actor, "\n".join(texts[:3])
            )
            profiles[actor] = {
                "party": profile.party,
                "role": profile.role,
                "ideology_position": profile.ideology_position,
                "approval_trend": profile.approval_trend,
                "key_issues": profile.key_issues[:5],
                "known_alliances": profile.known_alliances[:5],
                "known_adversaries": profile.known_adversaries[:5],
            }
        except Exception as exc:
            logger.debug("context_builder: perfil %s error: %s", actor, exc)

    return {
        **state,
        "context_actor_profiles": profiles,
        "context_economic": economic_data,
        "context_historical": [],
        "context_geopolitical": geo_summary,
        "meta_nodes_executed": state.get("meta_nodes_executed", []) + ["context_builder"],
    }
