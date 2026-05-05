"""Motor de simulación electoral avanzado para ElectSim España.

Implementa simulación Monte Carlo con incertidumbre de sondeos, swings
distritales, modificadores narrativos y cálculo de probabilidades de mayoría.
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Modelos Pydantic v2
# ---------------------------------------------------------------------------


class ElectoralScenario(BaseModel):
    """Definición de un escenario electoral simulable."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: str = ""
    base_polls: dict[str, float] = Field(default_factory=dict)
    polling_uncertainty_pp: float = 2.0
    turnout_pct: float = 72.0
    turnout_uncertainty_pp: float = 3.0
    district_swings: dict[str, dict[str, float]] = Field(default_factory=dict)
    tactical_voting: dict[str, str] = Field(default_factory=dict)
    economic_modifier: float = 0.0
    narrative_modifiers: dict[str, float] = Field(default_factory=dict)
    incumbency_advantage: float = 0.5
    abstention_modifier: float = 0.0


class SimulationResult(BaseModel):
    """Resultado completo de una simulación Monte Carlo."""

    model_config = ConfigDict(extra="ignore")

    scenario_id: str
    runs: int
    seats_distribution: dict[str, dict[str, float]]
    vote_share: dict[str, dict[str, float]]
    majority_probability: dict[str, float]
    government_scenarios: list[dict[str, Any]]
    executed_at: datetime
    elapsed_seconds: float
    seed: int | None = None


# ---------------------------------------------------------------------------
# Asignación D'Hondt
# ---------------------------------------------------------------------------


def compute_dhondt(votes: dict[str, int], seats: int) -> dict[str, int]:
    """Reparte ``seats`` escaños mediante el método D'Hondt."""

    if seats <= 0 or not votes:
        return {p: 0 for p in votes}

    parties = list(votes.keys())
    counts = {p: 0 for p in parties}
    totals = {p: float(votes.get(p, 0)) for p in parties}

    for _ in range(seats):
        best_party = None
        best_quotient = -1.0
        for p in parties:
            divisor = counts[p] + 1
            quotient = totals[p] / divisor if divisor > 0 else 0.0
            if quotient > best_quotient:
                best_quotient = quotient
                best_party = p
        if best_party is None:
            break
        counts[best_party] += 1

    return counts


def compute_dhondt_district(
    district_votes: dict[str, dict[str, int]],
    district_seats: dict[str, int],
) -> dict[str, int]:
    """Aplica D'Hondt por distrito y agrega escaños totales por partido."""

    aggregated: dict[str, int] = {}
    for district, votes in district_votes.items():
        seats = district_seats.get(district, 0)
        if seats <= 0:
            continue
        result = compute_dhondt(votes, seats)
        for party, n in result.items():
            aggregated[party] = aggregated.get(party, 0) + n
    return aggregated


# ---------------------------------------------------------------------------
# Aplicación de incertidumbre y modificadores
# ---------------------------------------------------------------------------


def apply_polling_uncertainty(
    base: dict[str, float],
    uncertainty_pp: float,
    rng: np.random.Generator,
) -> dict[str, float]:
    """Añade ruido gaussiano a cada partido y normaliza para sumar 100."""

    if not base:
        return {}
    sigma = max(0.0, float(uncertainty_pp))
    out: dict[str, float] = {}
    for party, pct in base.items():
        noise = float(rng.normal(0.0, sigma))
        out[party] = max(0.0, float(pct) + noise)
    total = sum(out.values())
    if total <= 0:
        # Fallback equiprobable.
        n = len(out)
        return {p: 100.0 / n for p in out}
    return {p: v * 100.0 / total for p, v in out.items()}


def apply_turnout_effect(
    votes: dict[str, float],
    turnout_pct: float,
    total_voters: int = 36_500_000,
) -> dict[str, int]:
    """Convierte porcentajes a votos absolutos según participación."""

    turnout = max(0.0, min(100.0, float(turnout_pct))) / 100.0
    casted = int(total_voters * turnout)
    out: dict[str, int] = {}
    for party, pct in votes.items():
        out[party] = int(round(casted * float(pct) / 100.0))
    return out


def apply_district_swings(
    national_pct: dict[str, float],
    district_swings: dict[str, dict[str, float]],
    population_weights: dict[str, float],
) -> dict[str, dict[str, float]]:
    """Aplica swings distritales sobre el nacional y normaliza por distrito."""

    result: dict[str, dict[str, float]] = {}
    districts = set(population_weights.keys()) | set(district_swings.keys())
    for district in districts:
        swings = district_swings.get(district, {})
        per_party: dict[str, float] = {}
        for party, pct in national_pct.items():
            swing = float(swings.get(party, 0.0))
            per_party[party] = max(0.0, float(pct) + swing)
        total = sum(per_party.values())
        if total <= 0:
            n = len(per_party) or 1
            per_party = {p: 100.0 / n for p in per_party}
        else:
            per_party = {p: v * 100.0 / total for p, v in per_party.items()}
        result[district] = per_party
    return result


def apply_narrative_modifiers(
    pcts: dict[str, float],
    modifiers: dict[str, float],
) -> dict[str, float]:
    """Aplica impactos narrativos (party_id -> delta_pp)."""

    out = dict(pcts)
    for party, delta in modifiers.items():
        if party in out:
            out[party] = max(0.0, out[party] + float(delta))
    total = sum(out.values())
    if total <= 0:
        return pcts
    return {p: v * 100.0 / total for p, v in out.items()}


# ---------------------------------------------------------------------------
# Pesos de población por defecto (52 circunscripciones simplificadas)
# ---------------------------------------------------------------------------


_DEFAULT_DISTRICT_SEATS: dict[str, int] = {
    "Madrid": 37,
    "Barcelona": 32,
    "Valencia": 15,
    "Sevilla": 12,
    "Alicante": 12,
    "Málaga": 11,
    "Murcia": 10,
    "Cádiz": 9,
    "Vizcaya": 8,
    "Coruña": 8,
    "Asturias": 7,
    "Zaragoza": 7,
    "Pontevedra": 7,
    "Granada": 6,
    "Las Palmas": 8,
    "Tenerife": 7,
    "Resto": 147,
}


def _default_weights() -> dict[str, float]:
    total = sum(_DEFAULT_DISTRICT_SEATS.values())
    return {d: s / total for d, s in _DEFAULT_DISTRICT_SEATS.items()}


# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------


def run_monte_carlo(
    scenario: ElectoralScenario,
    runs: int = 1000,
    seed: int | None = None,
) -> SimulationResult:
    """Ejecuta una simulación Monte Carlo del escenario."""

    started_at = datetime.utcnow()
    t0 = time.perf_counter()
    rng = np.random.default_rng(seed)
    runs = max(1, int(runs))

    weights = _default_weights()
    district_seats = dict(_DEFAULT_DISTRICT_SEATS)

    seat_runs: list[dict[str, int]] = []
    vote_runs: list[dict[str, float]] = []

    base = dict(scenario.base_polls)
    # Aplicar modificador económico al incumbente (proxy: PSOE como incumbente).
    if scenario.economic_modifier and "PSOE" in base:
        base["PSOE"] = max(0.0, base["PSOE"] + float(scenario.economic_modifier))

    for _ in range(runs):
        # 1. Ruido en sondeos
        national = apply_polling_uncertainty(base, scenario.polling_uncertainty_pp, rng)
        # 2. Modificadores narrativos
        if scenario.narrative_modifiers:
            national = apply_narrative_modifiers(national, scenario.narrative_modifiers)
        # 3. Participación con incertidumbre
        turnout_noise = float(rng.normal(0.0, scenario.turnout_uncertainty_pp))
        turnout = max(40.0, min(95.0, scenario.turnout_pct + turnout_noise))
        # Modificador de abstención asimétrico (penaliza izquierda si > 0)
        if scenario.abstention_modifier:
            for left in ("PSOE", "SUMAR", "PODEMOS"):
                if left in national:
                    national[left] = max(0.0, national[left] - 0.5 * scenario.abstention_modifier)
            total = sum(national.values())
            if total > 0:
                national = {p: v * 100.0 / total for p, v in national.items()}

        # 4. Swings distritales
        district_pct = apply_district_swings(national, scenario.district_swings, weights)

        # 5. Votos absolutos por distrito
        district_votes: dict[str, dict[str, int]] = {}
        for district, pcts in district_pct.items():
            seats_here = district_seats.get(district, 0)
            voters_here = int(36_500_000 * weights.get(district, 0.0))
            district_votes[district] = apply_turnout_effect(pcts, turnout, voters_here)
            _ = seats_here

        # 6. D'Hondt por distrito
        seats = compute_dhondt_district(district_votes, district_seats)
        seat_runs.append(seats)
        vote_runs.append(national)

    seats_summary = seat_distribution_summary(seat_runs)
    votes_summary = _vote_summary(vote_runs)
    majority_probs = compute_majority_probabilities(seat_runs)
    top_govs = find_top_government_scenarios(seat_runs, top_n=5)

    return SimulationResult(
        scenario_id=scenario.id,
        runs=runs,
        seats_distribution=seats_summary,
        vote_share=votes_summary,
        majority_probability=majority_probs,
        government_scenarios=top_govs,
        executed_at=started_at,
        elapsed_seconds=time.perf_counter() - t0,
        seed=seed,
    )


# ---------------------------------------------------------------------------
# Métricas derivadas
# ---------------------------------------------------------------------------


def compute_majority_probabilities(
    seat_runs: list[dict[str, int]],
    coalitions: list[list[str]] | None = None,
) -> dict[str, float]:
    """Probabilidad de que cada coalición alcance la mayoría absoluta (>=176)."""

    if not seat_runs:
        return {}
    if coalitions is None:
        coalitions = [
            ["PP"],
            ["PSOE"],
            ["PP", "VOX"],
            ["PSOE", "SUMAR"],
            ["PP", "VOX", "JUNTS"],
            ["PSOE", "SUMAR", "ERC", "JUNTS", "EH Bildu", "PNV"],
        ]
    out: dict[str, float] = {}
    n = len(seat_runs)
    for coalition in coalitions:
        label = "+".join(coalition)
        wins = sum(1 for run in seat_runs if sum(run.get(p, 0) for p in coalition) >= 176)
        out[label] = wins / n
    return out


def find_top_government_scenarios(
    seat_runs: list[dict[str, int]],
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """Identifica los gobiernos viables más probables."""

    candidates = [
        ["PP", "VOX"],
        ["PSOE", "SUMAR"],
        ["PSOE", "SUMAR", "ERC", "JUNTS", "EH Bildu", "PNV"],
        ["PP"],
        ["PSOE"],
        ["PP", "VOX", "JUNTS"],
        ["PP", "PSOE"],
        ["PSOE", "SUMAR", "PNV"],
    ]
    n = max(1, len(seat_runs))
    scored: list[dict[str, Any]] = []
    for coalition in candidates:
        wins = sum(1 for run in seat_runs if sum(run.get(p, 0) for p in coalition) >= 176)
        prob = wins / n
        if prob <= 0:
            continue
        avg_seats = float(
            np.mean([sum(run.get(p, 0) for p in coalition) for run in seat_runs])
        )
        scored.append(
            {
                "coalition": list(coalition),
                "label": "+".join(coalition),
                "probability": prob,
                "avg_seats": avg_seats,
            }
        )
    scored.sort(key=lambda x: x["probability"], reverse=True)
    return scored[:top_n]


def compute_pivotal_party(seat_runs: list[dict[str, int]]) -> dict[str, float]:
    """Frecuencia con la que cada partido es pivotal (kingmaker)."""

    if not seat_runs:
        return {}
    parties = sorted({p for run in seat_runs for p in run.keys()})
    counts = {p: 0 for p in parties}
    n = len(seat_runs)

    for run in seat_runs:
        # El partido es pivotal si su retirada de la coalición ganadora rompe la mayoría
        sorted_parties = sorted(parties, key=lambda x: run.get(x, 0), reverse=True)
        coalition: list[str] = []
        total = 0
        for p in sorted_parties:
            coalition.append(p)
            total += run.get(p, 0)
            if total >= 176:
                break
        if total < 176:
            continue
        # El último añadido es el pivote típico
        if coalition:
            counts[coalition[-1]] = counts.get(coalition[-1], 0) + 1

    return {p: c / n for p, c in counts.items()}


def seat_distribution_summary(
    seat_runs: list[dict[str, int]],
) -> dict[str, dict[str, float]]:
    """Resumen de cuantiles de la distribución de escaños por partido."""

    if not seat_runs:
        return {}
    parties = sorted({p for run in seat_runs for p in run.keys()})
    summary: dict[str, dict[str, float]] = {}
    for p in parties:
        arr = np.array([run.get(p, 0) for run in seat_runs], dtype=float)
        summary[p] = {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "p5": float(np.percentile(arr, 5)),
            "p25": float(np.percentile(arr, 25)),
            "p50": float(np.percentile(arr, 50)),
            "p75": float(np.percentile(arr, 75)),
            "p95": float(np.percentile(arr, 95)),
        }
    return summary


def _vote_summary(vote_runs: list[dict[str, float]]) -> dict[str, dict[str, float]]:
    if not vote_runs:
        return {}
    parties = sorted({p for run in vote_runs for p in run.keys()})
    out: dict[str, dict[str, float]] = {}
    for p in parties:
        arr = np.array([run.get(p, 0.0) for run in vote_runs], dtype=float)
        out[p] = {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "p5": float(np.percentile(arr, 5)),
            "p50": float(np.percentile(arr, 50)),
            "p95": float(np.percentile(arr, 95)),
        }
    return out
