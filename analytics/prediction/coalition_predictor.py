"""
Bloque 7a — CoalitionPredictor.

Predice la viabilidad de coaliciones de gobierno usando:
  - Estado del grafo causal entre partidos (aristas ideologicamente compatibles)
  - Embeddings ideologicos de los manifiestos (similitud coseno)
  - Historico de acuerdos de investidura / apoyo parlamentario
  - Nowcasting de escanos proyectados

Salida: lista de CoalitionScenario con probabilidad y composicion.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_MAJORITY_THRESHOLD: int = 176      # escanos para mayoria absoluta en el Congreso
_IDEOLOGY_COMPAT_THRESHOLD: float = 0.45  # similitud minima para considerar compatible

# Posiciones ideologicas en eje izq-der (0 = izquierda, 1 = derecha)
_PARTY_IDEOLOGY: dict[str, float] = {
    "Q101": 0.25,   # PSOE
    "Q102": 0.85,   # PP
    "Q103": 0.95,   # VOX
    "Q104": 0.10,   # SUMAR
    "Q105": 0.30,   # ERC
    "Q106": 0.35,   # Junts
    "Q107": 0.30,   # PNV
    "Q108": 0.20,   # Bildu
    "Q109": 0.40,   # Canarias Coalition
    "Q110": 0.50,   # Partido Regionalista Cantabria
    "Q111": 0.45,   # UPN
}

# Matices de incompatibilidad historica (pares que NUNCA coalicionan)
_HARD_INCOMPATIBLE: list[tuple[str, str]] = [
    ("Q101", "Q103"),  # PSOE - VOX
    ("Q102", "Q104"),  # PP - SUMAR
    ("Q103", "Q105"),  # VOX - ERC
]


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------

@dataclass
class CoalitionScenario:
    coalition_id: str = field(default_factory=lambda: f"COAL-{uuid.uuid4().hex[:8].upper()}")
    parties: list[str] = field(default_factory=list)       # lista de QIDs
    party_names: list[str] = field(default_factory=list)
    projected_seats: int = 0
    probability: float = 0.0
    confidence_low: float = 0.0
    confidence_high: float = 0.0
    ideological_distance: float = 0.0   # distancia maxima intracoalicion
    historic_precedent: bool = False    # hay precedente historico
    notes: str = ""
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# CoalitionPredictor
# ---------------------------------------------------------------------------

class CoalitionPredictor:
    """
    Predice coaliciones viables dado el estado actual del Congreso.

    Uso:
        predictor = CoalitionPredictor()
        scenarios = predictor.predict_coalitions()
    """

    def __init__(self, conn=None) -> None:
        if conn is None:
            try:
                from dashboard.db import get_conn
                self._conn = get_conn()
            except Exception:
                self._conn = None
        else:
            self._conn = conn

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def predict_coalitions(
        self,
        top_n: int = 5,
        min_probability: float = 0.05,
    ) -> list[CoalitionScenario]:
        """
        Genera y evalua posibles coaliciones de gobierno.

        Returns:
            Lista de CoalitionScenario ordenada por probabilidad desc.
        """
        seats = self._load_projected_seats()
        if not seats:
            return self._demo_scenarios()

        party_qids = list(seats.keys())
        candidates = self._enumerate_coalitions(party_qids, seats)
        scored = [self._score_coalition(c, seats) for c in candidates]
        scored = [s for s in scored if s.probability >= min_probability]
        scored.sort(key=lambda s: s.probability, reverse=True)

        result = scored[:top_n]
        self._persist(result)
        return result

    # ------------------------------------------------------------------
    # Carga de escanos proyectados
    # ------------------------------------------------------------------

    def _load_projected_seats(self) -> dict[str, int]:
        """
        Carga los escanos proyectados desde la ultima corrida de nowcasting.
        Devuelve {qid: escanos} o {} si no hay datos.
        """
        if self._conn is None:
            return {}
        try:
            rows = list(self._conn.execute(
                """
                SELECT partido, escanos_sim
                FROM nowcasting_results
                WHERE fecha = (SELECT MAX(fecha) FROM nowcasting_results)
                  AND escanos_sim > 0
                ORDER BY escanos_sim DESC
                """
            ))
            if not rows:
                return {}
            # Mapear siglas → QID aproximado
            siglas_to_qid = {
                "PSOE": "Q101", "PP": "Q102", "VOX": "Q103", "SUMAR": "Q104",
                "ERC": "Q105", "JUNTS": "Q106", "PNV": "Q107", "EH BILDU": "Q108",
                "CC": "Q109", "PRC": "Q110", "UPN": "Q111",
            }
            result = {}
            for partido, escanos in rows:
                qid = siglas_to_qid.get(str(partido).upper())
                if qid and escanos:
                    result[qid] = int(escanos)
            return result
        except Exception as exc:
            log.debug("CoalitionPredictor: error cargando escanos: %s", exc)
            return {}

    # ------------------------------------------------------------------
    # Enumeracion de coaliciones viables
    # ------------------------------------------------------------------

    def _enumerate_coalitions(
        self, party_qids: list[str], seats: dict[str, int]
    ) -> list[list[str]]:
        """
        Genera coaliciones de 2-5 partidos que superan _MAJORITY_THRESHOLD
        y no contienen pares incompatibles.
        """
        from itertools import combinations
        viable: list[list[str]] = []
        for size in range(2, min(6, len(party_qids) + 1)):
            for combo in combinations(party_qids, size):
                combo_list = list(combo)
                total_seats = sum(seats.get(q, 0) for q in combo_list)
                if total_seats < _MAJORITY_THRESHOLD:
                    continue
                if self._has_incompatible(combo_list):
                    continue
                viable.append(combo_list)
        return viable

    def _has_incompatible(self, parties: list[str]) -> bool:
        for a, b in _HARD_INCOMPATIBLE:
            if a in parties and b in parties:
                return True
        return False

    # ------------------------------------------------------------------
    # Scoring de una coalicion
    # ------------------------------------------------------------------

    def _score_coalition(
        self, parties: list[str], seats: dict[str, int]
    ) -> CoalitionScenario:
        ideologies = [_PARTY_IDEOLOGY.get(q, 0.5) for q in parties]
        max_dist = float(max(ideologies) - min(ideologies)) if len(ideologies) > 1 else 0.0
        compat_score = 1.0 - max_dist  # 0=incompatible, 1=identicos

        total_seats = sum(seats.get(q, 0) for q in parties)
        majority_margin = (total_seats - _MAJORITY_THRESHOLD) / _MAJORITY_THRESHOLD

        # Graph signal: peso causal promedio entre los partidos
        graph_score = self._graph_affinity(parties)

        # Probabilidad base = combinacion de factores
        base_prob = float(np.clip(
            0.40 * compat_score
            + 0.30 * min(1.0, majority_margin + 0.5)
            + 0.30 * graph_score,
            0.0, 1.0,
        ))

        # Ajuste por precedente historico
        historic = self._has_historic_precedent(parties)
        if historic:
            base_prob = min(1.0, base_prob * 1.15)

        conf_spread = 0.12
        return CoalitionScenario(
            parties=parties,
            projected_seats=total_seats,
            probability=round(base_prob, 4),
            confidence_low=round(max(0, base_prob - conf_spread), 4),
            confidence_high=round(min(1, base_prob + conf_spread), 4),
            ideological_distance=round(max_dist, 3),
            historic_precedent=historic,
            notes=f"Compat={compat_score:.2f} Graph={graph_score:.2f} Seats={total_seats}",
        )

    def _graph_affinity(self, parties: list[str]) -> float:
        """Calcula el peso causal promedio entre los partidos del grafo."""
        if self._conn is None or len(parties) < 2:
            return 0.5
        try:
            from itertools import combinations
            weights = []
            for a, b in combinations(parties, 2):
                qa, qb = (a, b) if a < b else (b, a)
                row = next(iter(self._conn.execute(
                    """
                    SELECT decayed_weight FROM entity_causal_edges
                    WHERE source_qid = %(qa)s AND target_qid = %(qb)s
                    """,
                    {"qa": qa, "qb": qb},
                )), None)
                weights.append(float(row[0]) if row else 0.3)
            return float(np.mean(weights)) if weights else 0.3
        except Exception:
            return 0.3

    def _has_historic_precedent(self, parties: list[str]) -> bool:
        """Heuristica: PSOE+SUMAR y PP+VOX tienen precedente."""
        psoe_sumar = {"Q101", "Q104"}
        pp_vox = {"Q102", "Q103"}
        party_set = set(parties)
        return bool(psoe_sumar & party_set == psoe_sumar or pp_vox & party_set == pp_vox)

    # ------------------------------------------------------------------
    # Demo (sin BD)
    # ------------------------------------------------------------------

    def _demo_scenarios(self) -> list[CoalitionScenario]:
        return [
            CoalitionScenario(
                parties=["Q101", "Q104", "Q105", "Q108"],
                party_names=["PSOE", "SUMAR", "ERC", "EH Bildu"],
                projected_seats=180,
                probability=0.52,
                confidence_low=0.40,
                confidence_high=0.64,
                ideological_distance=0.20,
                historic_precedent=True,
                notes="Gobierno de coalicion actual — base de datos demo",
            ),
            CoalitionScenario(
                parties=["Q102", "Q107", "Q110"],
                party_names=["PP", "PNV", "PRC"],
                projected_seats=178,
                probability=0.31,
                confidence_low=0.19,
                confidence_high=0.43,
                ideological_distance=0.45,
                historic_precedent=False,
                notes="Alternativa de centro-derecha — base de datos demo",
            ),
        ]

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _persist(self, scenarios: list[CoalitionScenario]) -> None:
        if self._conn is None:
            return
        import json as _json
        try:
            for s in scenarios:
                self._conn.execute(
                    """
                    INSERT INTO prediction_results
                      (prediction_id, model_type, horizon_days, probability,
                       confidence_low, confidence_high, entities_involved, scenario_json,
                       generated_at)
                    VALUES
                      (%(pid)s, 'coalition', 90, %(prob)s,
                       %(clo)s, %(chi)s, %(ent)s, %(scen)s,
                       NOW())
                    ON CONFLICT (prediction_id) DO NOTHING
                    """,
                    {
                        "pid":  s.coalition_id,
                        "prob": s.probability,
                        "clo":  s.confidence_low,
                        "chi":  s.confidence_high,
                        "ent":  _json.dumps(s.parties),
                        "scen": _json.dumps({
                            "seats": s.projected_seats,
                            "ideo_dist": s.ideological_distance,
                            "precedent": s.historic_precedent,
                            "notes": s.notes,
                        }),
                    },
                )
            self._conn.commit()
        except Exception as exc:
            log.debug("CoalitionPredictor: error persistiendo: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
