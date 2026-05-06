"""Pure D'Hondt and electoral scoring functions — no I/O."""
from __future__ import annotations


def dhondt(votes: dict[str, int], seats: int) -> dict[str, int]:
    """
    D'Hondt proportional allocation.
    Args:
        votes: {party_code: vote_count}
        seats: number of seats to allocate
    Returns:
        {party_code: seats_won}
    """
    # allocations start at 0
    allocations = {p: 0 for p in votes}
    for _ in range(seats):
        # For each party, compute quotient = votes / (current_seats + 1)
        quotients = {p: votes[p] / (allocations[p] + 1) for p in votes}
        winner = max(quotients, key=quotients.get)  # type: ignore[arg-type]
        allocations[winner] += 1
    return allocations


def swing_seats(
    base_parties: list[dict],  # list of {code, pct_vote, seats}
    swings: list[dict],         # list of {party_code, delta_pct}
    total_seats: int = 350,
) -> dict[str, int]:
    """
    Naive national swing model: apply pct delta, redistribute proportionally.
    Returns {party_code: new_seats}.
    """
    # Build adjusted vote shares
    adj: dict[str, float] = {p["code"]: p["pct_vote"] for p in base_parties}
    for s in swings:
        if s["party_code"] in adj:
            adj[s["party_code"]] = max(0.0, adj[s["party_code"]] + s["delta_pct"])

    total_pct = sum(adj.values())
    if total_pct <= 0:
        return {p["code"]: 0 for p in base_parties}

    # Convert to vote counts (use pct as proxy for votes)
    votes = {code: int(pct * 1000) for code, pct in adj.items()}
    return dhondt(votes, total_seats)


def compute_coalition_viability(
    members: list[str],
    seat_map: dict[str, int],
    majority_threshold: int = 176,
) -> tuple[int, bool]:
    """Returns (total_seats, has_majority)."""
    total = sum(seat_map.get(m, 0) for m in members)
    return total, total >= majority_threshold


def ideological_distance(
    members: list[str],
    ideology_map: dict[str, float],
) -> int:
    """
    0-100 measure of internal ideological spread within a coalition.
    Uses range (max - min) of left-right scores.
    """
    scores = [ideology_map.get(m, 5.0) for m in members]
    if len(scores) < 2:
        return 0
    spread = max(scores) - min(scores)
    return min(100, int(spread * 10))


def stability_score(
    probability: int,
    ideological_distance_val: int,
    seats_above_majority: int,
) -> int:
    """
    Composite stability score 0-100.
    Higher probability + lower distance + more seats above majority = more stable.
    """
    base = probability * 0.5
    distance_penalty = ideological_distance_val * 0.3
    cushion_bonus = min(30, max(-10, seats_above_majority * 0.5))
    score = base - distance_penalty + cushion_bonus
    return max(0, min(100, int(score)))


def leverage_score(
    party_seats: int,
    coalition_appearances: int,
    total_viable_coalitions: int,
) -> int:
    """
    Kingmaker leverage: small party that appears in many coalitions has high leverage.
    """
    if total_viable_coalitions == 0 or party_seats <= 0:
        return 0
    appearance_ratio = coalition_appearances / total_viable_coalitions
    # More leverage if seats are small (hard to replace) but appearances are many
    size_factor = max(0, 1 - (party_seats / 50))  # normalized: 0 seats = 1.0, 50+ seats = 0
    return min(100, int(appearance_ratio * size_factor * 200))
