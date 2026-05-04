"""
Campaign Effects — Bloque 6.

Integra campaign_simulator.py con los nuevos schemas para:
  - Crear CampaignMessage desde texto/tema/partido
  - Ejecutar simulación y devolver CampaignSimulation
  - Persistir resultados en campaign_messages y campaign_simulations
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def create_campaign_message(
    party_id: str,
    theme: str,
    frame: str = "",
    target_segment: str | None = None,
    target_geography: str | None = None,
    text: str | None = None,
    source: str = "manual",
    expected_effect: dict[str, Any] | None = None,
    risk_flags: list[str] | None = None,
) -> "CampaignMessage":
    """
    Crea un CampaignMessage con los campos dados.

    Returns:
        CampaignMessage listo para persistir o simular.
    """
    from etl.sources.electoral.schemas import CampaignMessage

    message_id = f"msg_{party_id}_{theme[:20].replace(' ', '_')}_{uuid.uuid4().hex[:8]}"

    return CampaignMessage(
        message_id=message_id,
        party_id=party_id,
        theme=theme,
        frame=frame,
        target_segment=target_segment,
        target_geography=target_geography,
        text=text,
        source=source,
        expected_effect=expected_effect or {},
        risk_flags=risk_flags or [],
    )


def simulate_campaign_message(
    message: "CampaignMessage",
    segments: list,
    current_estimates: dict[str, float],
    total_seats: int = 350,
    saturation_count: int = 1,
    week_of_campaign: int = 4,
    majority_threshold: int = 176,
) -> "CampaignSimulation":
    """
    Simula el efecto de un CampaignMessage sobre los votantes.

    Primero intenta usar campaign_simulator.py existente.
    Si no está disponible, usa soft_vote_model.estimate_message_effect().

    Args:
        message: CampaignMessage a simular.
        segments: Lista de VoterSegment.
        current_estimates: {partido: % voto} del nowcast.
        total_seats: Total de escaños (350 para Congreso).
        saturation_count: Nº de exposiciones.
        week_of_campaign: Semana de la campaña.
        majority_threshold: Umbral de mayoría.

    Returns:
        CampaignSimulation con resultados del efecto.
    """
    from etl.sources.electoral.schemas import CampaignSimulation
    from etl.sources.electoral.soft_vote_model import estimate_message_effect
    from etl.sources.electoral.seat_allocator import dhondt, allocate_congress_seats

    # Intentar delegar al simulador existente
    effect = _try_legacy_simulator(message, segments, current_estimates, saturation_count)

    if effect is None:
        # Implementación autónoma
        effect = estimate_message_effect(
            party_id=message.party_id,
            theme=message.theme,
            target_segment_id=message.target_segment,
            segments=segments,
            current_estimates=current_estimates,
            saturation_count=saturation_count,
            week_of_campaign=week_of_campaign,
        )

    vote_shift = effect.get("expected_vote_shift", {})
    affected_segments = effect.get("affected_segments", [])
    confidence = effect.get("confidence", 0.3)
    narrative = effect.get("narrative", "")

    # Calcular cambio en escaños
    seat_shift: dict[str, int] = {}
    try:
        new_estimates = {
            p: max(0.0, current_estimates.get(p, 0.0) + vote_shift.get(p, 0.0))
            for p in set(current_estimates) | set(vote_shift)
        }
        current_seats = allocate_congress_seats(current_estimates)
        new_seats = allocate_congress_seats(new_estimates)
        all_parties = set(current_seats) | set(new_seats)
        seat_shift = {
            p: new_seats.get(p, 0) - current_seats.get(p, 0)
            for p in all_parties
            if new_seats.get(p, 0) != current_seats.get(p, 0)
        }
    except Exception as exc:
        logger.debug("campaign_effects seat calculation error: %s", exc)

    sim_id = f"sim_{message.message_id}_{uuid.uuid4().hex[:8]}"

    return CampaignSimulation(
        simulation_id=sim_id,
        message_id=message.message_id,
        party_id=message.party_id,
        geography=message.target_geography or "ES",
        week_of_campaign=week_of_campaign,
        saturation_count=saturation_count,
        expected_vote_shift=vote_shift,
        expected_seat_shift=seat_shift,
        affected_segments=affected_segments,
        confidence=confidence,
        narrative=narrative,
    )


def _try_legacy_simulator(
    message: "CampaignMessage",
    segments: list,
    current_estimates: dict[str, float],
    saturation_count: int,
) -> dict[str, Any] | None:
    """
    Intenta usar campaign_simulator.py existente.
    Devuelve None si no está disponible o falla.
    """
    try:
        from dashboard.services.campaign_simulator import (
            receptividad_tema_perfil,
            narrativa_impacto,
        )
        from dashboard.models.voter_profiles import PERFILES_VOTANTES_DICT
        from dashboard.models.transfer_vectors import calcular_flujos
        from dashboard.models.timing_model import timing_weight, saturation_decay

        if not PERFILES_VOTANTES_DICT:
            return None

        tema = message.theme
        partido = message.party_id

        # Calcular receptividad por perfil
        impactos: dict[str, float] = {}
        for seg_id, perfil in PERFILES_VOTANTES_DICT.items():
            r = receptividad_tema_perfil(tema, perfil, {})
            impactos[seg_id] = r

        # Flujos de transferencia
        flujos = calcular_flujos(partido, tema, PERFILES_VOTANTES_DICT)
        vote_shift: dict[str, float] = {}
        for partido_dest, delta in flujos.items():
            sd = saturation_decay(saturation_count)
            vote_shift[partido_dest] = round(delta * sd, 4)

        if partido not in vote_shift:
            total_gain = sum(v for v in vote_shift.values() if v < 0) * -0.7
            vote_shift[partido] = round(total_gain, 4)

        return {
            "expected_vote_shift": vote_shift,
            "affected_segments": list(impactos.keys()),
            "confidence": 0.55,
            "narrative": f"Análisis de '{tema}' para {partido} via legacy simulator.",
        }

    except Exception as exc:
        logger.debug("_try_legacy_simulator: %s", exc)
        return None


def recommend_messages(
    party_id: str,
    segments: list,
    current_estimates: dict[str, float],
    candidate_themes: list[str] | None = None,
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """
    Recomienda temas de campaña para un partido basándose en el opportunity score.

    Args:
        party_id: Partido objetivo.
        segments: Lista de VoterSegment.
        current_estimates: {partido: % voto} del nowcast.
        candidate_themes: Lista de temas a evaluar (None = temas predefinidos).
        top_n: Número de recomendaciones.

    Returns:
        Lista de dicts {theme, expected_gain, top_segment, confidence}.
    """
    from etl.sources.electoral.soft_vote_model import estimate_message_effect

    themes = candidate_themes or [
        "economia", "empleo", "vivienda", "sanidad", "educacion",
        "pensiones", "medioambiente", "seguridad", "fiscalidad", "corrupcion",
    ]

    recommendations = []
    for theme in themes:
        msg = create_campaign_message(party_id=party_id, theme=theme)
        effect = estimate_message_effect(
            party_id=party_id,
            theme=theme,
            target_segment_id=None,
            segments=segments,
            current_estimates=current_estimates,
        )
        gain = effect["expected_vote_shift"].get(party_id, 0.0)
        top_seg = effect["affected_segments"][0] if effect["affected_segments"] else None

        recommendations.append({
            "theme": theme,
            "expected_gain_pp": round(gain, 4),
            "top_segment": top_seg,
            "confidence": effect["confidence"],
            "message_id": msg.message_id,
        })

    return sorted(recommendations, key=lambda x: x["expected_gain_pp"], reverse=True)[:top_n]


def detect_risk_flags(
    party_id: str,
    theme: str,
    message_text: str | None = None,
) -> list[str]:
    """
    Detecta posibles riesgos de un mensaje de campaña.

    Returns:
        Lista de strings con los riesgos detectados.
    """
    flags = []
    t = theme.lower()
    text = (message_text or "").lower()

    # Temas de alto riesgo de polarización
    if any(k in t for k in ["inmigración", "inmigracion", "independencia", "secesión"]):
        flags.append("alto_riesgo_polarizacion")

    # Riesgo de consistencia ideológica
    from etl.sources.electoral.schemas import IDEOLOGY_SCORES
    score = IDEOLOGY_SCORES.get(party_id, 0.0)
    if (score > 4 and any(k in t for k in ["social", "redistribucion", "redistribución"])):
        flags.append("inconsistencia_ideologica_derecha")
    if (score < -4 and any(k in t for k in ["bajada_impuestos", "privatización"])):
        flags.append("inconsistencia_ideologica_izquierda")

    # Riesgo de saturación mediática
    if "seguridad" in t and "inmigracion" in t:
        flags.append("narrativa_doble_riesgo")

    return flags


# ── Persistencia ──────────────────────────────────────────────────────────────

def save_campaign_message(message: "CampaignMessage", engine: Any) -> bool:
    """Persiste CampaignMessage en BD."""
    if engine is None:
        return False
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO campaign_messages (
                    message_id, party_id, theme, frame,
                    target_segment, target_geography, text,
                    source, expected_effect, risk_flags, created_at
                ) VALUES (
                    :message_id, :party_id, :theme, :frame,
                    :target_segment, :target_geography, :text,
                    :source, :expected_effect::jsonb, :risk_flags::jsonb, :created_at
                )
                ON CONFLICT (message_id) DO NOTHING
            """), {
                "message_id": message.message_id,
                "party_id": message.party_id,
                "theme": message.theme,
                "frame": message.frame,
                "target_segment": message.target_segment,
                "target_geography": message.target_geography,
                "text": message.text,
                "source": message.source,
                "expected_effect": _json.dumps(message.expected_effect),
                "risk_flags": _json.dumps(message.risk_flags),
                "created_at": message.created_at,
            })
        return True
    except Exception as exc:
        logger.error("save_campaign_message: %s", exc)
        return False


def save_campaign_simulation(simulation: "CampaignSimulation", engine: Any) -> bool:
    """Persiste CampaignSimulation en BD."""
    if engine is None:
        return False
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO campaign_simulations (
                    simulation_id, message_id, party_id, geography,
                    week_of_campaign, saturation_count,
                    expected_vote_shift, expected_seat_shift,
                    affected_segments, confidence, narrative, created_at
                ) VALUES (
                    :simulation_id, :message_id, :party_id, :geography,
                    :week_of_campaign, :saturation_count,
                    :expected_vote_shift::jsonb, :expected_seat_shift::jsonb,
                    :affected_segments::jsonb, :confidence, :narrative, :created_at
                )
                ON CONFLICT (simulation_id) DO NOTHING
            """), {
                "simulation_id": simulation.simulation_id,
                "message_id": simulation.message_id,
                "party_id": simulation.party_id,
                "geography": simulation.geography,
                "week_of_campaign": simulation.week_of_campaign,
                "saturation_count": simulation.saturation_count,
                "expected_vote_shift": _json.dumps(simulation.expected_vote_shift),
                "expected_seat_shift": _json.dumps(simulation.expected_seat_shift),
                "affected_segments": _json.dumps(simulation.affected_segments),
                "confidence": simulation.confidence,
                "narrative": simulation.narrative,
                "created_at": simulation.created_at,
            })
        return True
    except Exception as exc:
        logger.error("save_campaign_simulation: %s", exc)
        return False
