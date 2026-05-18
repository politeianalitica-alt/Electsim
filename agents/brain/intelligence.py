"""
Bloque 4 — Intelligence · 5 tools del GroqBrain.

Inteligencia política accionable sobre actores, oposición, posiciones
legislativas, geopolítica y voto blando.

  · build_actor_profile          — perfil 360º de un actor político
  · opposition_research          — análisis del rival (estilo war room)
  · analyze_legislative_position — postura del actor sobre una ley/tema
  · geopolitical_impact          — impacto geopolítico sobre España
  · analyze_soft_vote            — quiénes son los blandos y cómo moverlos

Estos tools producen output operativo, no narrativo: el output es para
estrategia y decisión.
"""
from __future__ import annotations

from typing import Any


class IntelligenceMixin:
    """Bloque 4 · Inteligencia política accionable."""

    # ─────────────────────────────────────────────────────────────
    def build_actor_profile(
        self,
        *,
        actor_name: str,
        role: str = "",
        known_facts: list[str] | str = "",
        recent_statements: list[str] | None = None,
    ) -> dict[str, Any]:
        """Construye perfil 360º: biografía política, estilo, redes, momentum,
        riesgos, palancas.

        Devuelve: {biography, political_style, key_relations, momentum,
                   strengths, weaknesses, leverage_points, ...}
        """
        return self._call(
            "intel_build_actor_profile",
            {
                "actor_name": actor_name,
                "role": role,
                "known_facts": known_facts,
                "recent_statements": recent_statements or [],
            },
        )

    # ─────────────────────────────────────────────────────────────
    def opposition_research(
        self,
        *,
        target_actor: str,
        client_position: str,
        recent_actions: list[str] | None = None,
        time_window: str = "últimos 6 meses",
    ) -> dict[str, Any]:
        """Análisis del rival desde una posición concreta. Genera vectores de
        ataque y contraataque, prediciendo su respuesta probable.

        Devuelve: {vulnerabilities, attack_vectors, predicted_responses,
                   counter_arguments, risks_for_client, ...}
        """
        return self._call(
            "intel_opposition_research",
            {
                "target_actor": target_actor,
                "client_position": client_position,
                "recent_actions": recent_actions or [],
                "time_window": time_window,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_legislative_position(
        self,
        *,
        actor_or_party: str,
        law_or_topic: str,
        historical_votes: str = "",
        public_statements: list[str] | None = None,
    ) -> dict[str, Any]:
        """Predice y explica la postura del actor/partido sobre una ley o tema.

        Devuelve: {predicted_vote, certainty, official_position, real_position,
                   internal_dissent, conditions_for_change, ...}
        """
        return self._call(
            "intel_analyze_legislative_position",
            {
                "actor_or_party": actor_or_party,
                "law_or_topic": law_or_topic,
                "historical_votes": historical_votes,
                "public_statements": public_statements or [],
            },
        )

    # ─────────────────────────────────────────────────────────────
    def geopolitical_impact(
        self,
        *,
        event: str,
        region: str = "España",
        sectors: list[str] | None = None,
        time_horizon: str = "3-12 meses",
    ) -> dict[str, Any]:
        """Razona el impacto geopolítico de un evento sobre intereses
        nacionales/sectoriales.

        Devuelve: {direct_impacts, indirect_impacts, sectors_affected,
                   policy_implications, opportunities, risks, ...}
        """
        return self._call(
            "intel_geopolitical_impact",
            {
                "event": event,
                "region": region,
                "sectors": sectors or [],
                "time_horizon": time_horizon,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_soft_vote(
        self,
        *,
        party: str,
        territory: str = "España",
        polls_summary: str = "",
        segments_data: dict[str, Any] | str = "",
    ) -> dict[str, Any]:
        """Identifica el voto blando y propone palancas de movilización o
        captura.

        Devuelve: {soft_voter_segments, motivations, persuasive_messages,
                   channels, expected_yield, ...}
        """
        return self._call(
            "intel_analyze_soft_vote",
            {
                "party": party,
                "territory": territory,
                "polls_summary": polls_summary,
                "segments_data": segments_data,
            },
        )
