"""
Electoral Volatility Model — Bloque 6.

Indicadores de volatilidad y cambio electoral:
  - Pedersen Index (volatilidad inter-electoral)
  - Número efectivo de partidos
  - Swing por partido y bloque
  - Dispersión territorial
  - Escaños tipping point
"""
from __future__ import annotations

import logging
import math
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


# ── Pedersen Index ────────────────────────────────────────────────────────────

def pedersen_index(
    result_a: dict[str, float],
    result_b: dict[str, float],
) -> float:
    """
    Índice de Pedersen: volatilidad electoral entre dos elecciones.

    VI = 0.5 * Σ |Δvoto_i|   (rango 0-100)

    Args:
        result_a: {partido: % votos} en elección anterior.
        result_b: {partido: % votos} en elección posterior.

    Returns:
        Índice de Pedersen (0-100).
    """
    parties = set(result_a) | set(result_b)
    total = sum(
        abs(result_b.get(p, 0) - result_a.get(p, 0))
        for p in parties
    )
    return round(total / 2, 3)


# ── Swing ─────────────────────────────────────────────────────────────────────

def compute_party_swing(
    result_a: dict[str, float],
    result_b: dict[str, float],
) -> dict[str, float]:
    """
    Calcula el swing (cambio en pp) por partido entre dos momentos.

    Returns:
        {partido: delta_pp}
    """
    parties = set(result_a) | set(result_b)
    return {
        p: round(result_b.get(p, 0) - result_a.get(p, 0), 3)
        for p in parties
    }


def compute_bloc_swing(
    result_a: dict[str, float],
    result_b: dict[str, float],
    blocs: dict[str, list[str]] | None = None,
) -> dict[str, float]:
    """
    Calcula el swing por bloque.

    Args:
        blocs: {nombre_bloque: [partido1, partido2, ...]}
                Si None, usa bloques españoles por defecto.
    """
    if blocs is None:
        blocs = {
            "derecha": ["PP", "VOX", "CS", "UPN"],
            "izquierda": ["PSOE", "SUMAR", "IU", "UP", "Más País"],
            "nacionalistas": ["JUNTS", "ERC", "PNV", "EH Bildu", "BNG", "CC", "CUP"],
        }
    result: dict[str, float] = {}
    for bloc_name, parties in blocs.items():
        share_a = sum(result_a.get(p, 0) for p in parties)
        share_b = sum(result_b.get(p, 0) for p in parties)
        result[bloc_name] = round(share_b - share_a, 3)
    return result


# ── Volatilidad territorial ───────────────────────────────────────────────────

def territorial_swing(
    previous_results: pd.DataFrame,
    current_projection: pd.DataFrame,
    party_col: str = "party_id",
    geo_col: str = "geography_id",
    share_col: str = "vote_share",
) -> pd.DataFrame:
    """
    Calcula el swing territorial entre dos conjuntos de resultados.

    Args:
        previous_results: DataFrame con columnas [party_id, geography_id, vote_share].
        current_projection: DataFrame con las mismas columnas (proyección actual).

    Returns:
        DataFrame con [geography_id, party_id, share_prev, share_curr, swing].
    """
    if previous_results.empty or current_projection.empty:
        return pd.DataFrame()

    try:
        prev = previous_results.rename(columns={share_col: "share_prev"})
        curr = current_projection.rename(columns={share_col: "share_curr"})
        merged = pd.merge(prev[[geo_col, party_col, "share_prev"]],
                          curr[[geo_col, party_col, "share_curr"]],
                          on=[geo_col, party_col], how="outer")
        merged = merged.fillna(0)
        merged["swing"] = merged["share_curr"] - merged["share_prev"]
        merged["swing"] = merged["swing"].round(3)
        return merged.sort_values("swing", key=abs, ascending=False)
    except Exception as exc:
        logger.debug("territorial_swing error: %s", exc)
        return pd.DataFrame()


# ── Tipping point provinces ───────────────────────────────────────────────────

def detect_tipping_provinces(
    vote_share_by_province: dict[str, dict[str, float]],
    seats_by_province: dict[str, int],
    threshold_delta: float = 2.0,
    method: str = "dhondt",
) -> list[dict[str, Any]]:
    """
    Detecta provincias donde un pequeño cambio en votos altera la distribución de escaños.

    Args:
        vote_share_by_province: {provincia: {partido: % votos}}
        seats_by_province: {provincia: n_escaños}
        threshold_delta: Variación de pp a simular (default: 2pp).
        method: Método de asignación.

    Returns:
        Lista de dicts {province, party_winner, current_seats, alt_seats, delta_seats, sensitivity}
    """
    from etl.sources.electoral.seat_allocator import dhondt, webster

    _fn = dhondt if method == "dhondt" else webster
    tipping: list[dict[str, Any]] = []

    for province, shares in vote_share_by_province.items():
        n_seats = seats_by_province.get(province, 0)
        if n_seats == 0 or not shares:
            continue

        current = _fn(shares, n_seats)

        # Simular +threshold_delta pp para cada partido
        for party in shares:
            simulated = dict(shares)
            simulated[party] = shares[party] + threshold_delta
            # Normalizar para no superar 100
            total = sum(simulated.values())
            if total > 100:
                factor = 100 / total
                simulated = {p: v * factor for p, v in simulated.items()}
            alt = _fn(simulated, n_seats)

            delta = sum(abs(alt.get(p, 0) - current.get(p, 0)) for p in set(current) | set(alt))
            if delta > 0:
                tipping.append({
                    "province": province,
                    "n_seats": n_seats,
                    "party_simulated": party,
                    "current_seats": dict(current),
                    "alt_seats": dict(alt),
                    "seat_changes": delta,
                    "sensitivity": round(delta / threshold_delta, 2),
                })

    return sorted(tipping, key=lambda x: x["sensitivity"], reverse=True)


# ── Indicadores compuestos ────────────────────────────────────────────────────

def compute_volatility_summary(
    result_a: dict[str, float],
    result_b: dict[str, float],
    seats_a: dict[str, int] | None = None,
    seats_b: dict[str, int] | None = None,
) -> dict[str, Any]:
    """
    Resumen de volatilidad entre dos momentos electorales.

    Returns:
        dict con: pedersen, party_swing, bloc_swing, enp_a, enp_b,
        seat_changes, most_volatile_party.
    """
    from etl.sources.electoral.seat_allocator import effective_number_of_parties

    party_swing = compute_party_swing(result_a, result_b)
    most_volatile = max(party_swing, key=lambda p: abs(party_swing[p]), default=None)

    seat_changes: dict[str, int] = {}
    if seats_a and seats_b:
        all_parties = set(seats_a) | set(seats_b)
        seat_changes = {
            p: seats_b.get(p, 0) - seats_a.get(p, 0)
            for p in all_parties
        }

    return {
        "pedersen_index": pedersen_index(result_a, result_b),
        "party_swing": party_swing,
        "bloc_swing": compute_bloc_swing(result_a, result_b),
        "enp_before": effective_number_of_parties(result_a),
        "enp_after": effective_number_of_parties(result_b),
        "seat_changes": seat_changes,
        "most_volatile_party": most_volatile,
        "max_swing": round(abs(party_swing.get(most_volatile, 0)), 3) if most_volatile else 0,
    }
