"""
Soft Vote Model — Bloque 6.

Modela el voto blando (decidido vs. blando) por partido y segmento:
  - Calcula % voto blando basado en polls y CIS
  - Detecta transferencias de voto entre partidos
  - Genera oportunidades de captación (opportunity scoring)
  - Estima efectos de mensajes sobre segmentos específicos
"""
from __future__ import annotations

import logging
import math
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

# ── Parámetros de calibración ──────────────────────────────────────────────────

# % medio de voto blando por partido (calibrado con CIS 2020-2024)
_DEFAULT_SOFT_PCT: dict[str, float] = {
    "PP":       28.0,
    "PSOE":     32.0,
    "VOX":      22.0,
    "SUMAR":    40.0,
    "CS":       55.0,
    "JUNTS":    25.0,
    "ERC":      30.0,
    "PNV":      20.0,
    "EH Bildu": 22.0,
    "CC":       28.0,
    "BNG":      26.0,
}

_DEFAULT_SOFT_PCT_FALLBACK = 35.0


# ── Estimación de voto blando ──────────────────────────────────────────────────

def estimate_soft_vote(
    party_estimates: dict[str, float],
    geography: str = "ES",
    soft_overrides: dict[str, float] | None = None,
) -> list:
    """
    Estima el voto blando por partido.

    Args:
        party_estimates: {partido: % voto} del nowcast actual.
        geography: Código geográfico.
        soft_overrides: {partido: % blando} para override manual.

    Returns:
        Lista de SoftVoteEstimate.
    """
    from etl.sources.electoral.schemas import SoftVoteEstimate

    overrides = soft_overrides or {}
    estimates = []

    for party_id, vote_share in party_estimates.items():
        soft_pct = overrides.get(
            party_id,
            _DEFAULT_SOFT_PCT.get(party_id, _DEFAULT_SOFT_PCT_FALLBACK)
        )
        decided_pct = 100.0 - soft_pct

        # Transferencia estimada: a quién puede ir el voto blando
        switchable = _estimate_transfer_targets(party_id, soft_pct)

        estimates.append(SoftVoteEstimate(
            estimate_date=date.today(),
            party_id=party_id,
            geography=geography,
            decided_pct=round(decided_pct, 1),
            soft_pct=round(soft_pct, 1),
            switchable_to=switchable,
            source="nowcast_model",
        ))

    return estimates


def _estimate_transfer_targets(
    party_id: str,
    soft_pct: float,
) -> dict[str, float]:
    """
    Estima a qué partidos se podría transferir el voto blando.
    Basado en cercanía ideológica y patrón histórico de transferencias.
    """
    from etl.sources.electoral.schemas import IDEOLOGY_SCORES

    score = IDEOLOGY_SCORES.get(party_id)
    if score is None:
        return {}

    # Partidos ideológicamente cercanos
    nearby: dict[str, float] = {}
    for other, other_score in IDEOLOGY_SCORES.items():
        if other == party_id:
            continue
        dist = abs(score - other_score)
        if dist <= 4.0:  # umbral de cercanía
            # Peso inversamente proporcional a la distancia
            w = max(0.0, 1.0 - dist / 4.0)
            nearby[other] = w

    # Normalizar
    total_w = sum(nearby.values())
    if total_w == 0:
        return {}

    # La transferencia potencial es el % de voto blando * peso de cada partido
    transfer_pool = soft_pct / 100.0
    return {
        p: round(transfer_pool * w / total_w, 4)
        for p, w in nearby.items()
    }


# ── Detección de oportunidades ────────────────────────────────────────────────

def compute_opportunity_score(
    party_id: str,
    segment,
    competitor_shares: dict[str, float] | None = None,
) -> float:
    """
    Calcula el opportunity score para captar un segmento de votantes.

    Score = party_pref × persuadability × turnout × (1 + soft_bonus)

    Args:
        party_id: Partido objetivo.
        segment: VoterSegment.
        competitor_shares: {partido: % voto actual} para calcular contexto.

    Returns:
        Opportunity score (0-1).
    """
    pref = segment.party_preference.get(party_id, 0.0)
    persuadability = segment.persuadability
    turnout = segment.turnout_probability

    # Bonus si el partido más cercano tiene soft vote alto
    soft_bonus = 0.0
    competitor = _nearest_competitor(party_id, segment.party_preference)
    if competitor:
        soft_pct = _DEFAULT_SOFT_PCT.get(competitor, _DEFAULT_SOFT_PCT_FALLBACK)
        soft_bonus = (soft_pct / 100.0) * 0.3  # max 30% bonus

    score = pref * persuadability * turnout * (1 + soft_bonus)
    return round(min(score, 1.0), 4)


def _nearest_competitor(party_id: str, preferences: dict[str, float]) -> str | None:
    """Partido con mayor preferencia en el segmento (excluyendo el propio)."""
    ranked = sorted(
        [(p, v) for p, v in preferences.items() if p != party_id],
        key=lambda x: x[1],
        reverse=True,
    )
    return ranked[0][0] if ranked else None


def rank_segments_by_opportunity(
    party_id: str,
    segments: list,
    min_pref: float = 0.10,
) -> list[dict[str, Any]]:
    """
    Clasifica segmentos de votante por opportunity score para un partido.

    Args:
        party_id: Partido objetivo.
        segments: Lista de VoterSegment.
        min_pref: Preferencia mínima para incluir en el ranking.

    Returns:
        Lista de dicts con {segment_id, label, opportunity_score, ...} ordenada desc.
    """
    ranked = []
    for seg in segments:
        pref = seg.party_preference.get(party_id, 0.0)
        if pref < min_pref:
            continue
        score = compute_opportunity_score(party_id, seg)
        ranked.append({
            "segment_id": seg.segment_id,
            "label": seg.label,
            "party_preference": pref,
            "persuadability": seg.persuadability,
            "turnout_probability": seg.turnout_probability,
            "opportunity_score": score,
            "ideology_mean": seg.ideology_mean,
        })

    return sorted(ranked, key=lambda x: x["opportunity_score"], reverse=True)


# ── Estimación de efecto de mensaje ───────────────────────────────────────────

def estimate_message_effect(
    party_id: str,
    theme: str,
    target_segment_id: str | None,
    segments: list,
    current_estimates: dict[str, float],
    saturation_count: int = 1,
    week_of_campaign: int = 4,
) -> dict[str, Any]:
    """
    Estima el efecto de un mensaje de campaña sobre los segmentos.

    Args:
        party_id: Partido que emite el mensaje.
        theme: Tema del mensaje.
        target_segment_id: Segmento objetivo (None = todos).
        segments: Lista de VoterSegment.
        current_estimates: {partido: % voto} del nowcast actual.
        saturation_count: Nº de veces que se emite el mensaje (más = saturación).
        week_of_campaign: Semana de campaña (más tarde = menor efecto base).

    Returns:
        dict con expected_vote_shift, affected_segments, confidence, narrative.
    """
    # Filtrar segmentos objetivo
    if target_segment_id:
        target_segments = [s for s in segments if s.segment_id == target_segment_id]
    else:
        target_segments = segments

    if not target_segments:
        return {
            "expected_vote_shift": {},
            "affected_segments": [],
            "confidence": 0.1,
            "narrative": "Sin segmentos objetivo disponibles.",
        }

    # Factor de tema (temas con mayor capacidad de movilización)
    theme_factor = _theme_mobilization_factor(theme)

    # Factor de saturación (decaimiento logístico)
    saturation_decay = _saturation_decay(saturation_count)

    # Factor de semana de campaña (primeras semanas = mayor impacto)
    week_decay = math.exp(-0.08 * max(0, week_of_campaign - 1))

    # Efecto base por segmento
    vote_shifts: dict[str, float] = {p: 0.0 for p in current_estimates}
    affected = []

    for seg in target_segments:
        pref = seg.party_preference.get(party_id, 0.0)
        if pref < 0.05:
            continue  # sin penetración real en este segmento

        # Ganancia de voto = base × persuadabilidad × tema × saturación × semana
        base_gain = 0.015  # 1.5pp máximo por mensaje-segmento
        gain = base_gain * seg.persuadability * theme_factor * saturation_decay * week_decay

        # El gain se expresa como fracción del voto total (afecta solo a ese segmento)
        size_pct = seg.raw_payload.get("size_pct", 15.0) / 100.0
        effective_gain = gain * size_pct

        if effective_gain > 0.0001:
            vote_shifts[party_id] = vote_shifts.get(party_id, 0.0) + effective_gain
            # Pérdida proporcional en competidores más cercanos
            competitor = _nearest_competitor(party_id, seg.party_preference)
            if competitor and competitor in vote_shifts:
                vote_shifts[competitor] -= effective_gain * 0.6
            affected.append(seg.segment_id)

    # Redondear
    vote_shifts = {p: round(v, 4) for p, v in vote_shifts.items() if abs(v) > 0.0001}

    confidence = min(0.85, 0.3 + 0.1 * len(affected) * theme_factor * saturation_decay)

    narrative = _build_effect_narrative(
        party_id, theme, vote_shifts, affected, saturation_count
    )

    return {
        "expected_vote_shift": vote_shifts,
        "affected_segments": affected,
        "confidence": round(confidence, 3),
        "narrative": narrative,
        "theme_factor": round(theme_factor, 3),
        "saturation_decay": round(saturation_decay, 3),
        "week_decay": round(week_decay, 3),
    }


def _theme_mobilization_factor(theme: str) -> float:
    """Devuelve el factor de movilización de un tema electoral."""
    high_impact = {
        "economia", "empleo", "paro", "vivienda", "sanidad", "pensiones",
        "corrupcion", "seguridad", "immigracion", "independencia", "autonomia"
    }
    medium_impact = {
        "educacion", "medioambiente", "igualdad", "feminismo", "familia",
        "cultura", "tecnologia", "infraestructura", "fiscalidad", "impuestos"
    }
    low_impact = {
        "internacional", "defensa", "cooperacion", "ciencia", "deporte"
    }

    t = theme.lower().replace(" ", "_").replace("á", "a").replace("é", "e")
    for h in high_impact:
        if h in t:
            return 1.0
    for m in medium_impact:
        if m in t:
            return 0.65
    for l in low_impact:
        if l in t:
            return 0.35
    return 0.50  # tema desconocido → impacto medio


def _saturation_decay(n: int) -> float:
    """Decaimiento por saturación del mensaje (función sigmoide inversa)."""
    if n <= 1:
        return 1.0
    # Decaimiento: cada repetición adicional vale la mitad que la anterior
    return round(1.0 / (1.0 + 0.4 * math.log(n)), 4)


def _build_effect_narrative(
    party_id: str,
    theme: str,
    shifts: dict[str, float],
    affected_segs: list[str],
    saturation: int,
) -> str:
    gain = shifts.get(party_id, 0.0)
    n_segs = len(affected_segs)
    sat_txt = f"({saturation} emisiones)" if saturation > 1 else "(primera emisión)"

    if gain >= 0.01:
        return (
            f"Mensaje '{theme}' {sat_txt}: ganancia estimada +{gain:.2f}pp para {party_id} "
            f"en {n_segs} segmento(s). Alta eficacia."
        )
    elif gain > 0:
        return (
            f"Mensaje '{theme}' {sat_txt}: impacto marginal +{gain:.2f}pp para {party_id} "
            f"en {n_segs} segmento(s)."
        )
    else:
        return (
            f"Mensaje '{theme}' {sat_txt}: sin impacto significativo para {party_id}."
        )


# ── Persistencia ──────────────────────────────────────────────────────────────

def save_soft_vote_estimates(estimates: list, engine: Any) -> int:
    """Persiste SoftVoteEstimate en BD."""
    if not estimates or engine is None:
        return 0
    n = 0
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            for est in estimates:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO soft_vote_estimates (
                            estimate_date, party_id, geography,
                            decided_pct, soft_pct, switchable_to, source
                        ) VALUES (
                            :estimate_date, :party_id, :geography,
                            :decided_pct, :soft_pct, :switchable_to::jsonb, :source
                        )
                        ON CONFLICT (estimate_date, party_id, geography) DO UPDATE SET
                            decided_pct = EXCLUDED.decided_pct,
                            soft_pct = EXCLUDED.soft_pct,
                            switchable_to = EXCLUDED.switchable_to
                    """), {
                        "estimate_date": est.estimate_date,
                        "party_id": est.party_id,
                        "geography": est.geography,
                        "decided_pct": est.decided_pct,
                        "soft_pct": est.soft_pct,
                        "switchable_to": _json.dumps(est.switchable_to),
                        "source": est.source,
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("save_soft_vote_estimates item error: %s", exc)
    except Exception as exc:
        logger.error("save_soft_vote_estimates: %s", exc)
    return n
