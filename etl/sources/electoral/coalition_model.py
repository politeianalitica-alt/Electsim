"""
Coalition Model — Bloque 6.

Análisis y persistencia de escenarios de coalición.
Reutiliza lógica de coalition_service.py cuando está disponible.
Añade: ideological_compatibility, historical_plausibility,
       negotiation_complexity, persistencia en coalition_scenarios.
"""
from __future__ import annotations

import itertools
import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Compatibilidad ideológica ─────────────────────────────────────────────────

def ideological_distance(party_a: str, party_b: str) -> float:
    """
    Distancia ideológica entre dos partidos (0=idénticos, 1=opuestos).
    Basada en scores del esquema de schemas.py.
    """
    from etl.sources.electoral.schemas import IDEOLOGY_SCORES
    sa = IDEOLOGY_SCORES.get(party_a, 0.0)
    sb = IDEOLOGY_SCORES.get(party_b, 0.0)
    return abs(sa - sb) / 20.0  # normalizado 0-1 en escala -10/+10


def coalition_ideological_compatibility(parties: list[str]) -> float:
    """
    Compatibilidad ideológica media de una coalición (0=incompatible, 1=homogénea).
    """
    if len(parties) < 2:
        return 1.0
    pairs = list(itertools.combinations(parties, 2))
    avg_dist = sum(ideological_distance(a, b) for a, b in pairs) / len(pairs)
    return round(1 - avg_dist, 4)


# ── Plausibilidad histórica ───────────────────────────────────────────────────

# Pares que han gobernado juntos o apoyado investidura en España (2000-2024)
_HISTORICAL_PAIRS: dict[frozenset, float] = {
    frozenset(["PSOE", "SUMAR"]): 0.90,
    frozenset(["PSOE", "UP"]): 0.85,
    frozenset(["PP", "CS"]): 0.75,
    frozenset(["PP", "VOX"]): 0.55,
    frozenset(["PSOE", "PNV"]): 0.70,
    frozenset(["PSOE", "ERC"]): 0.55,
    frozenset(["PSOE", "JUNTS"]): 0.40,
    frozenset(["PSOE", "EH Bildu"]): 0.45,
    frozenset(["PP", "PNV"]): 0.50,
    frozenset(["PP", "PSOE"]): 0.15,
    frozenset(["PSOE", "BNG"]): 0.60,
    frozenset(["PP", "PSOE"]): 0.10,
}

def historical_plausibility(parties: list[str]) -> float:
    """
    Plausibilidad histórica de una coalición (0-1).
    Promedio de los scores históricos de todos los pares.
    """
    if len(parties) < 2:
        return 0.5
    pairs = list(itertools.combinations(parties, 2))
    scores = []
    for a, b in pairs:
        key = frozenset([a, b])
        scores.append(_HISTORICAL_PAIRS.get(key, 0.3))
    return round(sum(scores) / len(scores), 4)


# ── Complejidad de negociación ────────────────────────────────────────────────

def negotiation_complexity(parties: list[str]) -> float:
    """
    Complejidad de negociación (0=simple, 1=muy complejo).
    Depende del número de partes y la diversidad ideológica.
    """
    n = len(parties)
    size_factor = min(n / 6, 1.0)  # más partidos = más complejo
    ideol = 1 - coalition_ideological_compatibility(parties)
    return round(0.5 * size_factor + 0.5 * ideol, 4)


# ── Escenario de coalición ────────────────────────────────────────────────────

def build_coalition_scenario(
    parties: list[str],
    seats: dict[str, int],
    majority_threshold: int = 176,
    snapshot_id: int | None = None,
) -> "CoalitionScenario":
    """
    Construye un CoalitionScenario a partir de una lista de partidos y escaños.
    """
    from etl.sources.electoral.schemas import CoalitionScenario

    seats_total = sum(seats.get(p, 0) for p in parties)
    has_majority = seats_total >= majority_threshold
    majority_margin = seats_total - majority_threshold

    ideo = coalition_ideological_compatibility(parties)
    hist = historical_plausibility(parties)
    neg = negotiation_complexity(parties)

    # Probabilidad heurística
    if seats_total < majority_threshold:
        scenario_type = "blocking" if seats_total >= majority_threshold * 0.6 else "impossible"
        prob = hist * ideo * 0.3
    elif len(parties) == 1:
        scenario_type = "minority"
        prob = 0.1
    elif any(p in ["PP", "PSOE"] for p in parties) and len(parties) == 2:
        if "PP" in parties and "PSOE" in parties:
            scenario_type = "grand_coalition"
            prob = hist * 0.15
        else:
            scenario_type = "government"
            prob = hist * ideo * 0.6
    else:
        scenario_type = "government"
        prob = hist * ideo * max(0.1, 1 - neg * 0.4)

    prob = round(min(max(prob, 0.0), 1.0), 4)
    name = " + ".join(sorted(parties))

    # Explicación
    explanation = _build_coalition_explanation(
        parties, seats_total, has_majority, majority_margin, ideo, hist, scenario_type
    )

    return CoalitionScenario(
        snapshot_id=snapshot_id,
        name=name,
        parties=list(parties),
        seats_total=seats_total,
        has_majority=has_majority,
        majority_margin=majority_margin,
        ideological_compatibility=ideo,
        historical_plausibility=hist,
        negotiation_complexity=neg,
        probability=prob,
        scenario_type=scenario_type,
        explanation=explanation,
    )


def _build_coalition_explanation(
    parties: list[str],
    seats: int,
    has_majority: bool,
    margin: int,
    ideo: float,
    hist: float,
    scenario_type: str,
) -> str:
    parties_str = " + ".join(parties)
    majority_txt = f"✅ Mayoría ({seats} escaños, margen {margin:+d})" if has_majority else f"❌ Minoría ({seats} escaños, faltan {-margin})"
    ideo_txt = "🟢 Alta compatibilidad" if ideo >= 0.7 else ("🟡 Moderada" if ideo >= 0.4 else "🔴 Baja compatibilidad")
    hist_txt = "🟢 Alta plausibilidad" if hist >= 0.6 else ("🟡 Posible" if hist >= 0.35 else "🔴 Poco probable históricamente")
    return f"{parties_str}: {majority_txt} | Ideología: {ideo_txt} ({ideo:.0%}) | Histórico: {hist_txt} ({hist:.0%})"


# ── Analizar todas las coaliciones ───────────────────────────────────────────

def analyze_all_coalitions(
    seats: dict[str, int],
    majority_threshold: int = 176,
    max_parties: int = 5,
    min_seats_threshold: int = 2,
    snapshot_id: int | None = None,
) -> list["CoalitionScenario"]:
    """
    Genera y evalúa todos los escenarios de coalición posibles.

    Args:
        seats: {partido: n_escaños}
        majority_threshold: Umbral de mayoría.
        max_parties: Máximo de partidos en una coalición.
        min_seats_threshold: Excluir partidos con menos escaños.
        snapshot_id: ID del snapshot de nowcasting asociado.

    Returns:
        Lista de CoalitionScenario ordenados por probabilidad descendente.
    """
    # Intentar reutilizar coalition_service si existe
    try:
        from dashboard.services.coalition_service import analizar_coaliciones
        df = analizar_coaliciones(seats, max_partidos=max_parties)
        if df is not None and not df.empty:
            return _df_to_scenarios(df, seats, majority_threshold, snapshot_id)
    except Exception:
        pass

    # Implementación autónoma
    eligible = [p for p, s in seats.items() if s >= min_seats_threshold]
    scenarios = []

    for n in range(2, min(max_parties + 1, len(eligible) + 1)):
        for combo in itertools.combinations(eligible, n):
            sc = build_coalition_scenario(
                list(combo), seats, majority_threshold, snapshot_id
            )
            if sc.scenario_type != "impossible" or sc.seats_total >= majority_threshold * 0.5:
                scenarios.append(sc)

    # Deduplicar y ordenar
    seen: set[frozenset] = set()
    unique = []
    for sc in sorted(scenarios, key=lambda s: s.probability, reverse=True):
        key = frozenset(sc.parties)
        if key not in seen:
            seen.add(key)
            unique.append(sc)

    return unique[:30]  # top 30


def _df_to_scenarios(df: Any, seats: dict[str, int], threshold: int, snapshot_id: int | None) -> list:
    """Convierte DataFrame de coalition_service a lista de CoalitionScenario."""
    scenarios = []
    for _, row in df.iterrows():
        try:
            parties_raw = row.get("partidos", row.get("coalition", ""))
            if isinstance(parties_raw, str):
                parties = [p.strip() for p in parties_raw.split("+")]
            elif isinstance(parties_raw, list):
                parties = parties_raw
            else:
                continue
            sc = build_coalition_scenario(parties, seats, threshold, snapshot_id)
            scenarios.append(sc)
        except Exception:
            continue
    return scenarios


# ── Persistencia ──────────────────────────────────────────────────────────────

def save_coalition_scenarios(scenarios: list, engine: Any) -> int:
    """Persiste CoalitionScenarios en BD."""
    if not scenarios or engine is None:
        return 0
    n = 0
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for sc in scenarios:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO coalition_scenarios (
                            snapshot_id, name, parties, seats_total, has_majority,
                            majority_margin, ideological_compatibility, historical_plausibility,
                            negotiation_complexity, probability, scenario_type, explanation
                        ) VALUES (
                            :snapshot_id, :name, :parties, :seats_total, :has_majority,
                            :majority_margin, :ideological_compatibility, :historical_plausibility,
                            :negotiation_complexity, :probability, :scenario_type, :explanation
                        )
                    """), {
                        "snapshot_id": sc.snapshot_id,
                        "name": sc.name,
                        "parties": sc.parties,
                        "seats_total": sc.seats_total,
                        "has_majority": sc.has_majority,
                        "majority_margin": sc.majority_margin,
                        "ideological_compatibility": sc.ideological_compatibility,
                        "historical_plausibility": sc.historical_plausibility,
                        "negotiation_complexity": sc.negotiation_complexity,
                        "probability": sc.probability,
                        "scenario_type": sc.scenario_type,
                        "explanation": sc.explanation,
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("save_coalition_scenario error: %s", exc)
    except Exception as exc:
        logger.error("save_coalition_scenarios: %s", exc)
    return n
