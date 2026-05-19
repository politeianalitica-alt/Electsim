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

────────────────────────────────────────────────────────────────────────────
A2 · DISCLAIMER OBLIGATORIO PARA OUTPUTS GENERATIVOS
────────────────────────────────────────────────────────────────────────────
Las tools que devuelven probabilidades sin base estadística directa
(`forecast_political_scenario`, `interpret_nowcasting`, `assess_electoral_risk`)
SIEMPRE incluyen `generated_by_llm=True` y `requires_human_review=True` en
su output `result.disclaimer`. El brain no sustituye encuestas reales ni
modelos estadísticos — interpreta.

A5 · VALIDACIÓN ARITMÉTICA PREVIA
────────────────────────────────────────────────────────────────────────────
`analyze_coalition_viability` valida que los escaños sumen una mayoría real
antes de llamar al LLM, y avisa cuando la coalición es matemáticamente
inviable (la valoración cualitativa del LLM seguiría siendo coherente
solo si la base aritmética también lo es).
"""
from __future__ import annotations

from typing import Any

# Tamaños de cámara por defecto (mayoría absoluta)
PARLIAMENT_SIZES: dict[str, int] = {
    "congreso": 350,     # España · Congreso de los Diputados → mayoría 176
    "senado": 265,       # España · Senado (incluye designados CCAA) → mayoría 133
    "europeo_es": 61,    # PE asignados a España → no aplica mayoría
    "andalucia": 109,
    "aragon": 67,
    "asturias": 45,
    "baleares": 59,
    "canarias": 70,
    "cantabria": 35,
    "cataluna": 135,
    "castilla_leon": 81,
    "castilla_mancha": 33,
    "valenciana": 99,
    "extremadura": 65,
    "galicia": 75,
    "rioja": 33,
    "madrid": 135,
    "murcia": 45,
    "navarra": 50,
    "pais_vasco": 75,
    "ceuta": 25,
    "melilla": 25,
}


def _majority_threshold(seats_total: int) -> int:
    """Mayoría absoluta = mitad + 1."""
    return (seats_total // 2) + 1


def _llm_disclaimer(
    *,
    has_quantitative_base: bool,
    notes: str = "",
) -> dict[str, Any]:
    """A2 · Disclaimer estándar para outputs generativos del brain."""
    return {
        "generated_by_llm": True,
        "requires_human_review": True,
        "has_quantitative_base": bool(has_quantitative_base),
        "notes": notes or (
            "Las probabilidades y magnitudes provienen del razonamiento del modelo, "
            "no de un cálculo estadístico sobre datos. Contrastar con encuestas, "
            "modelos paramétricos (D'Hondt, monte-carlo) y juicio experto antes de "
            "usarlas en decisiones operativas o comunicación pública."
        ),
    }


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

        Esta tool sí tiene base cuantitativa (`results_payload` es el output
        real del simulador) — el disclaimer refleja `has_quantitative_base=True`.

        Devuelve: {executive_takeaway, key_drivers, surprises, uncertainties,
                   recommended_actions, disclaimer}
        """
        result = self._call(
            "forecast_interpret_simulation",
            {
                "simulation_type": simulation_type,
                "inputs_summary": inputs_summary,
                "results_payload": results_payload,
                "audience": audience,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["disclaimer"] = _llm_disclaimer(
                has_quantitative_base=True,
                notes="La interpretación es generativa pero los inputs vienen de un simulador determinista.",
            )
        return result

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

        A2 · El campo `probability` que el LLM produce es una estimación
        cualitativa, NO un cálculo bayesiano sobre datos. El output incluye
        `disclaimer.generated_by_llm=True` para que el dashboard pueda
        renderizar advertencia y los analistas no traten los números como
        si fueran de un modelo paramétrico.

        Devuelve: {scenarios: [{name, probability, triggers, consequences,
                   early_indicators}], disclaimer}
        """
        result = self._call(
            "forecast_political_scenario",
            {
                "topic": topic,
                "current_situation": current_situation,
                "time_horizon": time_horizon,
                "constraints": constraints or [],
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["disclaimer"] = _llm_disclaimer(has_quantitative_base=False)
        return result

    # ─────────────────────────────────────────────────────────────
    def analyze_coalition_viability(
        self,
        *,
        proposed_coalition: list[str],
        seats_by_party: dict[str, int],
        context: str = "",
        red_lines: dict[str, list[str]] | None = None,
        chamber: str = "congreso",
    ) -> dict[str, Any]:
        """Evalúa viabilidad ideológica, aritmética y de gobernabilidad de una
        coalición.

        A5 · Antes de llamar al LLM, suma los escaños de los partidos de la
        coalición y los compara contra la mayoría absoluta de la cámara
        (`chamber`). Si la coalición no llega a mayoría, lo notificamos al
        LLM en el prompt y lo marcamos en el output para que el analista
        sepa que la viabilidad "viable=true" debe interpretarse con cuidado
        (coalición minoritaria · necesita apoyos externos o investidura
        en segunda vuelta).

        `chamber` puede ser: "congreso" (default), "senado" o cualquier
        CCAA en PARLIAMENT_SIZES.

        Devuelve: {viable, arithmetic_majority, arithmetic_check: {...},
                   ideological_distance, internal_tensions, durability_months,
                   disclaimer}
        """
        chamber_norm = (chamber or "congreso").lower().replace(" ", "_")
        chamber_size = PARLIAMENT_SIZES.get(chamber_norm, 350)
        majority = _majority_threshold(chamber_size)

        # A5 · Verificación aritmética previa
        sum_seats = 0
        missing_parties: list[str] = []
        per_party: list[dict[str, Any]] = []
        for p in (proposed_coalition or []):
            n = seats_by_party.get(p)
            if n is None:
                missing_parties.append(p)
                per_party.append({"party": p, "seats": None, "in_data": False})
            else:
                try:
                    n_int = int(n)
                except (TypeError, ValueError):
                    n_int = 0
                sum_seats += n_int
                per_party.append({"party": p, "seats": n_int, "in_data": True})

        reaches_majority = sum_seats >= majority
        arithmetic_check = {
            "chamber": chamber_norm,
            "chamber_size": chamber_size,
            "majority_threshold": majority,
            "coalition_seats": sum_seats,
            "reaches_majority": reaches_majority,
            "seats_to_majority": max(0, majority - sum_seats),
            "per_party": per_party,
            "missing_seats_for_parties": missing_parties,
        }

        result = self._call(
            "forecast_coalition_viability",
            {
                "proposed_coalition": proposed_coalition,
                "seats_by_party": seats_by_party,
                "context": context,
                "red_lines": red_lines or {},
                "arithmetic_check": arithmetic_check,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["arithmetic_check"] = arithmetic_check
            result["result"]["disclaimer"] = _llm_disclaimer(
                has_quantitative_base=reaches_majority,
                notes=(
                    "La aritmética está verificada por el código; la viabilidad cualitativa "
                    "(distancia ideológica, tensiones, durabilidad) es razonamiento LLM."
                    + (" · ATENCIÓN: la coalición propuesta NO alcanza mayoría absoluta "
                       f"({sum_seats}/{majority})." if not reaches_majority else "")
                ),
            )
        return result

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
                   mitigation, disclaimer}
        """
        result = self._call(
            "forecast_assess_electoral_risk",
            {
                "party": party,
                "risk_event": risk_event,
                "polls_summary": polls_summary,
                "narrative_context": narrative_context,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            has_polls = bool((polls_summary or "").strip())
            result["result"]["disclaimer"] = _llm_disclaimer(
                has_quantitative_base=has_polls,
                notes=(
                    "Magnitudes (% impacto, half-life) son estimaciones generativas. "
                    + ("Hay polls_summary aportado · cruzar con serie histórica."
                       if has_polls else
                       "Sin polls_summary aportado · contrastar con encuesta reciente antes de actuar.")
                ),
            )
        return result

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

        A8 · Si no se aporta `previous_nowcast_payload`, los campos derivados
        de comparación (`big_movers`, `plausible_drivers` con sentido de
        cambio) carecen de referencia real. En ese caso marcamos
        `comparison_available=False` y advertimos en `disclaimer`.

        Devuelve: {headline, big_movers, plausible_drivers, noise_vs_signal,
                   confidence_caveats, comparison_available, disclaimer}
        """
        has_previous = bool(previous_nowcast_payload) and previous_nowcast_payload != {}
        result = self._call(
            "forecast_interpret_nowcasting",
            {
                "nowcast_payload": nowcast_payload,
                "previous_nowcast_payload": previous_nowcast_payload or {},
                "recent_events": recent_events or [],
                "comparison_available": has_previous,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["comparison_available"] = has_previous
            result["result"]["disclaimer"] = _llm_disclaimer(
                has_quantitative_base=True,  # el nowcast_payload sí lo es
                notes=(
                    "Los números del nowcast vienen del modelo estadístico. "
                    + ("Sin nowcast previo aportado · los campos 'big_movers' y "
                       "'plausible_drivers' carecen de referencia temporal y deben "
                       "tratarse como interpretación contextual, no comparación real."
                       if not has_previous else
                       "Comparación temporal con nowcast previo disponible.")
                ),
            )
        return result
