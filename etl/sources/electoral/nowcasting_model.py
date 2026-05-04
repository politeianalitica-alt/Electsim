"""
Electoral Nowcasting Model — Bloque 6.

Fase 1: promedio ponderado de encuestas con pesos por recencia, calidad y muestra.
Fase 2 (futura): modelo bayesiano/state-space con múltiples fuentes.

Fórmula:
    weight_i = recency_i * quality_i * sample_i
    estimate_j = Σ(weight_i * vote_share_ij) / Σ(weight_i)

Recencia: exp(-days_since_fieldwork / half_life_days)   [default: 21 días]
"""
from __future__ import annotations

import logging
import math
from datetime import date, datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_HALF_LIFE = 21  # días


# ── Core ──────────────────────────────────────────────────────────────────────

def compute_nowcast(
    polls: list,
    estimates_by_poll: dict[str, list],
    quality_by_poll: dict[str, float] | None = None,
    half_life_days: int = DEFAULT_HALF_LIFE,
    total_seats: int = 350,
    majority_threshold: int = 176,
    model_name: str = "weighted_average_v1",
    geography: str = "ES",
) -> "NowcastSnapshot | None":
    """
    Calcula el nowcasting electoral a partir de encuestas.

    Args:
        polls: Lista de Poll ordenadas por fecha (más reciente primero).
        estimates_by_poll: dict {poll_id: [PollEstimate]}.
        quality_by_poll: dict {poll_id: quality_score 0-1}. None = calidad uniforme.
        half_life_days: Semivida de la función de recencia.
        total_seats: Escaños totales a repartir.
        majority_threshold: Umbral de mayoría.
        model_name: Nombre del modelo.
        geography: Código geográfico.

    Returns:
        NowcastSnapshot o None si no hay suficientes datos.
    """
    from etl.sources.electoral.schemas import NowcastSnapshot
    from etl.sources.electoral.seat_allocator import dhondt

    if not polls:
        return None

    # Calcular pesos
    weights: dict[str, float] = {}
    for poll in polls:
        if poll.poll_id not in estimates_by_poll:
            continue
        ref_date = poll.fieldwork_end or poll.publication_date
        days_old = (date.today() - ref_date).days if isinstance(ref_date, date) else 30
        recency = math.exp(-days_old / half_life_days)
        quality = (quality_by_poll or {}).get(poll.poll_id, 0.7)
        n = poll.sample_size or 500
        sample_w = min(n / 2000.0, 1.0)
        weights[poll.poll_id] = recency * quality * sample_w

    if not any(w > 0 for w in weights.values()):
        logger.warning("compute_nowcast: todos los pesos son cero.")
        return None

    # Acumular estimaciones ponderadas por partido
    party_sums: dict[str, float] = {}
    party_weight_sums: dict[str, float] = {}

    for poll_id, poll_ests in estimates_by_poll.items():
        w = weights.get(poll_id, 0.0)
        if w <= 0:
            continue
        for est in poll_ests:
            pid = est.party_id
            if est.vote_share is None:
                continue
            party_sums[pid] = party_sums.get(pid, 0.0) + w * est.vote_share
            party_weight_sums[pid] = party_weight_sums.get(pid, 0.0) + w

    if not party_sums:
        return None

    # Estimaciones finales
    party_estimates: dict[str, float] = {}
    for pid, total_w in party_weight_sums.items():
        if total_w > 0:
            party_estimates[pid] = round(party_sums[pid] / total_w, 3)

    # Calcular incertidumbre básica (desviación entre encuestas)
    uncertainty: dict[str, dict[str, float]] = {}
    for pid in party_estimates:
        vals = [
            e.vote_share
            for poll_id, ests in estimates_by_poll.items()
            for e in ests
            if e.party_id == pid and e.vote_share is not None
        ]
        if len(vals) >= 2:
            mean = sum(vals) / len(vals)
            std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
            uncertainty[pid] = {
                "std": round(std, 3),
                "lower_80": round(party_estimates[pid] - 1.28 * std, 2),
                "upper_80": round(party_estimates[pid] + 1.28 * std, 2),
            }

    # Calcular escaños (D'Hondt nacional)
    seat_estimates: dict[str, int] = {}
    try:
        valid_shares = {p: v for p, v in party_estimates.items() if v >= 1.0}
        if valid_shares:
            seat_estimates = dhondt(valid_shares, total_seats)
    except Exception as exc:
        logger.debug("compute_nowcast seat allocation error: %s", exc)

    # Probabilidad de mayoría por coalición
    majority_probability: dict[str, float] = {}
    try:
        majority_probability = _estimate_majority_probs(seat_estimates, uncertainty, majority_threshold)
    except Exception:
        pass

    return NowcastSnapshot(
        snapshot_date=datetime.now(timezone.utc),
        model_name=model_name,
        model_version="1.0",
        geography=geography,
        party_estimates=party_estimates,
        seat_estimates=seat_estimates,
        uncertainty=uncertainty,
        majority_probability=majority_probability,
        inputs_summary={
            "n_polls": len(polls),
            "polls_used": list(weights.keys()),
            "half_life_days": half_life_days,
        },
    )


def _estimate_majority_probs(
    seats: dict[str, int],
    uncertainty: dict[str, dict[str, float]],
    threshold: int = 176,
) -> dict[str, float]:
    """
    Estima probabilidades simples de mayoría para bloques conocidos.
    Usa heurística (no simulación Monte Carlo todavía).
    """
    probs: dict[str, float] = {}

    pp_seats = seats.get("PP", 0)
    vox_seats = seats.get("VOX", 0)
    psoe_seats = seats.get("PSOE", 0)
    sumar_seats = seats.get("SUMAR", 0)
    pnv_seats = seats.get("PNV", 0)
    erc_seats = seats.get("ERC", 0)
    junts_seats = seats.get("JUNTS", 0)
    bildu_seats = seats.get("EH Bildu", 0)

    # Bloque derecha: PP + VOX
    right_total = pp_seats + vox_seats
    right_margin = right_total - threshold
    probs["PP+VOX"] = _sigmoid_prob(right_margin, scale=10)

    # Bloque progresista: PSOE + SUMAR + varios
    left_total = psoe_seats + sumar_seats + pnv_seats + erc_seats + junts_seats + bildu_seats
    left_margin = left_total - threshold
    probs["PSOE+SUMAR+otros"] = _sigmoid_prob(left_margin, scale=10)

    # Gran coalición: PP + PSOE
    gc_total = pp_seats + psoe_seats
    gc_margin = gc_total - threshold
    probs["PP+PSOE"] = _sigmoid_prob(gc_margin, scale=15)

    # Bloqueo (nadie llega)
    max_bloc = max(right_total, left_total)
    probs["bloqueo"] = max(0.0, 1 - _sigmoid_prob(max_bloc - threshold, scale=8))

    return {k: round(v, 3) for k, v in probs.items()}


def _sigmoid_prob(margin: int, scale: float = 10) -> float:
    """Probabilidad sigmoide basada en el margen hacia la mayoría."""
    return 1 / (1 + math.exp(-margin / scale))


# ── Persistencia ──────────────────────────────────────────────────────────────

def save_nowcast_snapshot(snapshot: "NowcastSnapshot", engine: Any) -> int | None:
    """Persiste un NowcastSnapshot en BD. Devuelve el ID insertado o None."""
    if engine is None:
        return None
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            result = conn.execute(sa_text("""
                INSERT INTO nowcast_snapshots (
                    snapshot_date, model_name, model_version, geography,
                    party_estimates, seat_estimates, uncertainty,
                    leading_party, majority_probability,
                    inputs_summary, raw_payload
                ) VALUES (
                    :snapshot_date, :model_name, :model_version, :geography,
                    :party_estimates::jsonb, :seat_estimates::jsonb, :uncertainty::jsonb,
                    :leading_party, :majority_probability::jsonb,
                    :inputs_summary::jsonb, :raw_payload::jsonb
                )
                RETURNING id
            """), {
                "snapshot_date": snapshot.snapshot_date,
                "model_name": snapshot.model_name,
                "model_version": snapshot.model_version,
                "geography": snapshot.geography,
                "party_estimates": json.dumps(snapshot.party_estimates),
                "seat_estimates": json.dumps(snapshot.seat_estimates),
                "uncertainty": json.dumps(snapshot.uncertainty),
                "leading_party": snapshot.leading_party,
                "majority_probability": json.dumps(snapshot.majority_probability),
                "inputs_summary": json.dumps(snapshot.inputs_summary),
                "raw_payload": json.dumps(snapshot.raw_payload),
            })
            row = result.fetchone()
            return row[0] if row else None
    except Exception as exc:
        logger.error("save_nowcast_snapshot: %s", exc)
        return None
