"""
Bloque 3 — Forecasting · 5 tools del GroqBrain.

Lectura razonada de resultados numéricos producidos por los simuladores y
modelos del sistema. El brain explica el "por qué" detrás de los números:

  · interpret_simulation_results    — qué significa el output de campana/MC
  · forecast_political_scenario     — escenarios prospectivos
  · analyze_coalition_viability     — viabilidad de pactos / coaliciones
  · assess_electoral_risk           — riesgos electorales puntuales
  · interpret_nowcasting            — leer un nowcasting de intención de voto

Estos métodos NUNCA ejecutan simulación: reciben el output ya calculado y
producen interpretación narrativa, riesgos y recomendaciones.
"""
from __future__ import annotations

from typing import Any


class ForecastingMixin:
    """Bloque 3 · Interpretación razonada de simulaciones y forecasts."""

    # ─────────────────────────────────────────────────────────────
    def interpret_simulation_results(
        self,
        *,
        simulation_type: str,
        inputs_summary: str,
        results_payload: dict[str, Any] | str,
        audience: str = "analista político",
    ) -> dict[str, Any]:
        """Interpreta cualquier output de simulador (campaña, Monte Carlo,
        estrés, sensibilidad, contrafactual...).

        Devuelve: {executive_takeaway, key_drivers, surprises, uncertainties,
                   recommended_actions, ...}
        """
        return self._call(
            "forecast_interpret_simulation",
            {
                "simulation_type": simulation_type,
                "inputs_summary": inputs_summary,
                "results_payload": results_payload,
                "audience": audience,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def forecast_political_scenario(
        self,
        *,
        topic: str,
        current_situation: str,
        time_horizon: str = "3-6 meses",
        constraints: list[str] | None = None,
    ) -> dict[str, Any]:
        """Construye escenarios (base / optimista / pesimista / tail) sobre un
        tema o evento político.

        Devuelve: {scenarios: [{name, probability, triggers, consequences,
                   early_indicators}], ...}
        """
        return self._call(
            "forecast_political_scenario",
            {
                "topic": topic,
                "current_situation": current_situation,
                "time_horizon": time_horizon,
                "constraints": constraints or [],
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_coalition_viability(
        self,
        *,
        proposed_coalition: list[str],
        seats_by_party: dict[str, int],
        context: str = "",
        red_lines: dict[str, list[str]] | None = None,
    ) -> dict[str, Any]:
        """Evalúa viabilidad ideológica, aritmética y de gobernabilidad de una
        coalición.

        Devuelve: {viable, arithmetic_majority, ideological_distance,
                   internal_tensions, durability_months, ...}
        """
        return self._call(
            "forecast_coalition_viability",
            {
                "proposed_coalition": proposed_coalition,
                "seats_by_party": seats_by_party,
                "context": context,
                "red_lines": red_lines or {},
            },
        )

    # ─────────────────────────────────────────────────────────────
    def assess_electoral_risk(
        self,
        *,
        party: str,
        risk_event: str,
        polls_summary: str = "",
        narrative_context: str = "",
    ) -> dict[str, Any]:
        """Evalúa el impacto electoral esperado de un evento puntual sobre un
        partido (escándalo, ley, ruptura, gesto, error de comunicación).

        Devuelve: {direction, magnitude_pct, half_life_days, segments_affected,
                   mitigation, ...}
        """
        return self._call(
            "forecast_assess_electoral_risk",
            {
                "party": party,
                "risk_event": risk_event,
                "polls_summary": polls_summary,
                "narrative_context": narrative_context,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def interpret_nowcasting(
        self,
        *,
        nowcast_payload: dict[str, Any] | str,
        previous_nowcast_payload: dict[str, Any] | str | None = None,
        recent_events: list[str] | None = None,
    ) -> dict[str, Any]:
        """Interpreta el output del nowcasting electoral: movimientos
        significativos, drivers plausibles, lectura periodística.

        Devuelve: {headline, big_movers, plausible_drivers, noise_vs_signal,
                   confidence_caveats, ...}
        """
        return self._call(
            "forecast_interpret_nowcasting",
            {
                "nowcast_payload": nowcast_payload,
                "previous_nowcast_payload": previous_nowcast_payload or {},
                "recent_events": recent_events or [],
            },
        )
