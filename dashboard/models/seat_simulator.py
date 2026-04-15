"""Simulación de escaños con D'Hondt y Monte Carlo."""

from __future__ import annotations

from pathlib import Path
import random

import pandas as pd


def hondt(votes: dict[str, float], seats: int, threshold: float = 0.03) -> dict[str, int]:
    """Reparte escaños por método D'Hondt."""
    valid = {p: v for p, v in votes.items() if v >= threshold}
    quotients: list[tuple[str, float]] = []
    for party, share in valid.items():
        for d in range(1, seats + 1):
            quotients.append((party, share / d))
    winners = sorted(quotients, key=lambda x: x[1], reverse=True)[:seats]
    out = {p: 0 for p in votes}
    for party, _ in winners:
        out[party] = out.get(party, 0) + 1
    return out


def simulate_congress(
    national_polls: dict[str, float],
    n_simulations: int = 10000,
    use_mrp: bool = False,
) -> pd.DataFrame:
    """Simula distribución de escaños en 52 circunscripciones."""
    circ_path = Path("./data/static/circunscripciones.csv")
    if not circ_path.exists():
        return pd.DataFrame()
    circ = pd.read_csv(circ_path)
    parties = list(national_polls.keys())
    rows = []
    for _ in range(n_simulations):
        sampled = {p: max(0.0, random.gauss(v, 1.2)) for p, v in national_polls.items()}
        total = sum(sampled.values()) or 1.0
        sampled = {p: v / total for p, v in sampled.items()}
        agg = {p: 0 for p in parties}
        for _, r in circ.iterrows():
            seats = int(r["n_escanos"])
            alloc = hondt(sampled, seats=seats, threshold=0.03)
            for p, s in alloc.items():
                agg[p] = agg.get(p, 0) + s
        rows.append(agg)
    return pd.DataFrame(rows)


def get_coalition_probabilities(seat_simulations: pd.DataFrame, coalitions: dict[str, list[str]]) -> dict[str, float]:
    """Calcula probabilidad de mayoría absoluta por coalición."""
    if seat_simulations.empty:
        return {name: 0.0 for name in coalitions}
    out: dict[str, float] = {}
    for name, members in coalitions.items():
        seats = seat_simulations.reindex(columns=members, fill_value=0).sum(axis=1)
        out[name] = float((seats > 175).mean())
    return out

