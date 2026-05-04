"""
Electoral Adapter — Bloque 6.

Normalización, deduplicación y validación de datos electorales.
"""
from __future__ import annotations

import logging
import math
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)


# ── Normalización de partidos ─────────────────────────────────────────────────

def normalize_party_id(raw: str) -> str:
    """
    Normaliza el nombre/sigla de un partido a su ID canónico.

    Ejemplo: "Partido Popular" → "PP", "PSOE-A" → "PSOE"
    """
    from etl.sources.electoral.schemas import PARTY_ALIASES
    raw = raw.strip()
    if raw in PARTY_ALIASES:
        return PARTY_ALIASES[raw]
    # Check siglas directas
    raw_upper = raw.upper()
    known = {"PP", "PSOE", "VOX", "SUMAR", "JUNTS", "ERC", "PNV", "EH BILDU", "CC", "BNG", "CUP"}
    for k in known:
        if raw_upper == k or raw_upper == k.replace(" ", ""):
            return k.replace("EH BILDU", "EH Bildu")
    # Búsqueda parcial en aliases
    raw_lower = raw.lower()
    for alias, canonical in PARTY_ALIASES.items():
        if alias.lower() in raw_lower or raw_lower in alias.lower():
            return canonical
    return raw  # devuelve original si no se reconoce


def normalize_vote_share(value: Any) -> float | None:
    """Convierte un valor de porcentaje a float 0-100."""
    if value is None:
        return None
    try:
        v = float(value)
        if 0 <= v <= 1:
            return round(v * 100, 4)  # formato 0-1 → 0-100
        if 0 <= v <= 100:
            return round(v, 4)
        return None
    except (TypeError, ValueError):
        return None


def normalize_date(value: Any) -> date | None:
    """Normaliza fechas en múltiples formatos a date."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        from datetime import datetime
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y%m%d"):
            try:
                return datetime.strptime(str(value).strip(), fmt).date()
            except ValueError:
                continue
    except Exception:
        pass
    return None


# ── Deduplicación ─────────────────────────────────────────────────────────────

def deduplicate_polls(polls: list) -> list:
    """Deduplica encuestas por (pollster, publication_date). Conserva el más reciente."""
    seen: dict[tuple, Any] = {}
    for poll in polls:
        key = (poll.pollster.strip().lower(), poll.publication_date)
        if key not in seen:
            seen[key] = poll
    return list(seen.values())


def deduplicate_results(results: list) -> list:
    """Deduplica resultados electorales por (election_id, geography_id, party_id)."""
    seen: dict[tuple, Any] = {}
    for r in results:
        key = (r.election_id, r.geography_id, r.party_id)
        seen[key] = r  # último gana (asume orden cronológico de actualización)
    return list(seen.values())


# ── Validación ────────────────────────────────────────────────────────────────

def validate_poll_estimates(estimates: list) -> tuple[list, list[str]]:
    """
    Valida estimaciones de encuesta.

    Returns:
        (valid_estimates, error_messages)
    """
    valid = []
    errors = []
    total_share = sum(e.vote_share for e in estimates if e.vote_share is not None)

    for est in estimates:
        if est.vote_share is None:
            errors.append(f"poll={est.poll_id} party={est.party_id}: vote_share es None")
            continue
        if not (0 <= est.vote_share <= 100):
            errors.append(f"poll={est.poll_id} party={est.party_id}: vote_share fuera de rango ({est.vote_share})")
            continue
        valid.append(est)

    if valid and total_share > 0:
        # Normalizar si la suma supera 100 por redondeo
        if abs(total_share - 100) > 5:
            logger.warning("Suma de estimaciones %.1f%% — puede haber error.", total_share)

    return valid, errors


def validate_election_results(results: list) -> tuple[list, list[str]]:
    """Valida resultados electorales."""
    valid = []
    errors = []
    for r in results:
        if not r.election_id:
            errors.append("Resultado sin election_id")
            continue
        if not r.party_id:
            errors.append(f"election={r.election_id}: resultado sin party_id")
            continue
        valid.append(r)
    return valid, errors


# ── Cálculo de calidad de encuestas ──────────────────────────────────────────

def compute_poll_quality(poll) -> "PollQualityScore":
    """
    Calcula el score de calidad de una encuesta.

    Componentes:
        recency (40%):        exp(-days_old / 21)
        sample_size (25%):    min(n / 2000, 1.0)
        transparency (20%):   1.0 si hay metodología, else 0.5
        house_effect (15%):   0.7 por defecto (sin datos históricos)
    """
    from etl.sources.electoral.schemas import PollQualityScore
    import math

    days = poll.days_old if hasattr(poll, "days_old") else 30
    recency = math.exp(-days / 21.0)

    n = poll.sample_size or 0
    sample = min(n / 2000.0, 1.0) if n > 0 else 0.3

    transparency = 1.0 if poll.methodology else 0.5

    house_effect = 0.7  # default sin calibración histórica

    return PollQualityScore(
        poll_id=poll.poll_id,
        pollster=poll.pollster,
        recency_score=round(recency, 4),
        sample_size_score=round(sample, 4),
        transparency_score=transparency,
        house_effect_score=house_effect,
    )


# ── Upsert helpers ────────────────────────────────────────────────────────────

def upsert_polls(polls: list, estimates: list, engine: Any) -> dict[str, int]:
    """Persiste polls y poll_estimates en BD."""
    stats = {"n_polls": 0, "n_estimates": 0, "errors": 0}
    if not polls or engine is None:
        return stats
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for poll in polls:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO polls (source, poll_id, pollster,
                            fieldwork_start, fieldwork_end, publication_date,
                            geography, sample_size, methodology, client,
                            raw_url, raw_payload)
                        VALUES (:source, :poll_id, :pollster,
                            :fieldwork_start, :fieldwork_end, :publication_date,
                            :geography, :sample_size, :methodology, :client,
                            :raw_url, :raw_payload::jsonb)
                        ON CONFLICT (source, poll_id) DO UPDATE
                            SET pollster=EXCLUDED.pollster,
                                publication_date=EXCLUDED.publication_date,
                                updated_at=NOW()
                    """), {
                        "source": poll.source,
                        "poll_id": poll.poll_id,
                        "pollster": poll.pollster,
                        "fieldwork_start": poll.fieldwork_start,
                        "fieldwork_end": poll.fieldwork_end,
                        "publication_date": poll.publication_date,
                        "geography": poll.geography,
                        "sample_size": poll.sample_size,
                        "methodology": poll.methodology,
                        "client": poll.client,
                        "raw_url": poll.raw_url,
                        "raw_payload": json.dumps(poll.raw_payload),
                    })
                    stats["n_polls"] += 1
                except Exception as exc:
                    logger.debug("upsert_polls poll error: %s", exc)
                    stats["errors"] += 1

            for est in estimates:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO poll_estimates (poll_id, party_id, vote_share,
                            lower_bound, upper_bound, seats_estimate, raw_payload)
                        VALUES (:poll_id, :party_id, :vote_share,
                            :lower_bound, :upper_bound, :seats_estimate, :raw_payload::jsonb)
                        ON CONFLICT (poll_id, party_id) DO UPDATE
                            SET vote_share=EXCLUDED.vote_share
                    """), {
                        "poll_id": est.poll_id,
                        "party_id": est.party_id,
                        "vote_share": est.vote_share,
                        "lower_bound": est.lower_bound,
                        "upper_bound": est.upper_bound,
                        "seats_estimate": est.seats_estimate,
                        "raw_payload": json.dumps(est.raw_payload),
                    })
                    stats["n_estimates"] += 1
                except Exception as exc:
                    logger.debug("upsert_poll_estimates error: %s", exc)
                    stats["errors"] += 1
    except Exception as exc:
        logger.error("upsert_polls: %s", exc)
    return stats


def upsert_election_results(results: list, engine: Any) -> dict[str, int]:
    """Persiste election_results en BD."""
    stats = {"n_inserted": 0, "errors": 0}
    if not results or engine is None:
        return stats
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for r in results:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO election_results (
                            election_id, geography_id, geography_type,
                            party_id, votes, vote_share, seats,
                            turnout, abstention, raw_payload)
                        VALUES (
                            :election_id, :geography_id, :geography_type,
                            :party_id, :votes, :vote_share, :seats,
                            :turnout, :abstention, :raw_payload::jsonb)
                        ON CONFLICT (election_id, geography_id, party_id) DO UPDATE
                            SET votes=EXCLUDED.votes, vote_share=EXCLUDED.vote_share,
                                seats=EXCLUDED.seats
                    """), {
                        "election_id": r.election_id,
                        "geography_id": r.geography_id,
                        "geography_type": r.geography_type,
                        "party_id": r.party_id,
                        "votes": r.votes,
                        "vote_share": r.vote_share,
                        "seats": r.seats,
                        "turnout": r.turnout,
                        "abstention": r.abstention,
                        "raw_payload": json.dumps(r.raw_payload),
                    })
                    stats["n_inserted"] += 1
                except Exception as exc:
                    logger.debug("upsert_election_results error: %s", exc)
                    stats["errors"] += 1
    except Exception as exc:
        logger.error("upsert_election_results: %s", exc)
    return stats
