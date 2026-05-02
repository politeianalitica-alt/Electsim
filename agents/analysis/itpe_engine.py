"""
ITPEEngine — Indice de Tension Politico-Economica.

El ITPE es un indice sintetico que combina:
  - Tension fiscal (deuda/PIB, deficit, tipo bono 10Y)
  - Tension social (desempleo, inflacion, desigualdad percibida)
  - Tension politica (fragmentacion parlamentaria, mocion censura, etc.)
  - Tension geopolitica (sanciones, conflictos adyacentes, dependencia energetica)
  - Tension institucional (investigaciones judiciales, crisi gobierno)

Cada dimension tiene peso configurable. El ITPE resultante
esta normalizado en [0, 100]:
  0-25   Tension baja    (estabilidad)
  25-50  Tension media   (vigilancia)
  50-75  Tension alta    (alerta)
  75-100 Tension critica (crisis)

Un ITPESnapshot puede persistirse en BD (tabla itpe_snapshots).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Dimensiones y pesos
# ---------------------------------------------------------------------------

_DEFAULT_WEIGHTS: dict[str, float] = {
    "fiscal": 0.25,
    "social": 0.25,
    "politico": 0.25,
    "geopolitico": 0.15,
    "institucional": 0.10,
}


@dataclass
class ITPEDimension:
    name: str
    score: float                     # 0-100
    weight: float                    # peso en el indice
    drivers: list[str] = field(default_factory=list)
    raw_inputs: dict[str, float] = field(default_factory=dict)

    @property
    def weighted_score(self) -> float:
        return self.score * self.weight


@dataclass
class ITPESnapshot:
    """Snapshot del ITPE en un momento dado. Persistible en BD."""
    market_id: str
    computed_at: datetime
    itpe_score: float                # 0-100
    itpe_level: str                  # bajo, medio, alto, critico
    dimensions: list[ITPEDimension] = field(default_factory=list)
    delta_7d: float | None = None    # cambio vs hace 7 dias
    delta_30d: float | None = None   # cambio vs hace 30 dias
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "market_id": self.market_id,
            "computed_at": self.computed_at.isoformat(),
            "itpe_score": self.itpe_score,
            "itpe_level": self.itpe_level,
            "dimensions": [
                {
                    "name": d.name,
                    "score": d.score,
                    "weight": d.weight,
                    "drivers": d.drivers,
                }
                for d in self.dimensions
            ],
            "delta_7d": self.delta_7d,
            "delta_30d": self.delta_30d,
        }

    @classmethod
    def level_for_score(cls, score: float) -> str:
        if score < 25:
            return "bajo"
        if score < 50:
            return "medio"
        if score < 75:
            return "alto"
        return "critico"


# ---------------------------------------------------------------------------
# ITPEEngine
# ---------------------------------------------------------------------------

class ITPEEngine:
    """
    Motor de calculo del ITPE.

    Uso:
        engine = ITPEEngine(market_id="ES")
        snapshot = engine.compute(
            economic_data={"tasa_paro": 11.5, "ipc": 3.2, "deuda_pib": 108.0},
            political_data={"fragmentacion": 0.7, "mocion_censura": False},
            geopolitical_data={"conflictos_adyacentes": 1, "dependencia_gas": 0.4},
        )
        print(f"ITPE: {snapshot.itpe_score:.1f} ({snapshot.itpe_level})")
    """

    def __init__(
        self,
        market_id: str = "ES",
        weights: dict[str, float] | None = None,
    ) -> None:
        self._market_id = market_id
        self._weights = weights or _DEFAULT_WEIGHTS.copy()

    def compute(
        self,
        economic_data: dict[str, float] | None = None,
        political_data: dict[str, Any] | None = None,
        geopolitical_data: dict[str, Any] | None = None,
        institutional_data: dict[str, Any] | None = None,
        previous_snapshot: ITPESnapshot | None = None,
    ) -> ITPESnapshot:
        """
        Calcula el ITPE a partir de los datos de entrada.

        Todos los parametros son opcionales — dimensiones sin datos
        reciben un score neutro de 50.
        """
        eco = economic_data or {}
        pol = political_data or {}
        geo = geopolitical_data or {}
        inst = institutional_data or {}

        dimensions = [
            self._compute_fiscal(eco),
            self._compute_social(eco),
            self._compute_politico(pol),
            self._compute_geopolitico(geo),
            self._compute_institucional(inst),
        ]

        # Score compuesto (suma ponderada)
        total_weight = sum(d.weight for d in dimensions)
        if total_weight == 0:
            itpe_score = 50.0
        else:
            itpe_score = sum(d.weighted_score for d in dimensions) / total_weight

        itpe_score = max(0.0, min(100.0, itpe_score))

        # Deltas
        delta_7d = None
        delta_30d = None
        if previous_snapshot:
            delta_7d = itpe_score - previous_snapshot.itpe_score

        snapshot = ITPESnapshot(
            market_id=self._market_id,
            computed_at=datetime.utcnow(),
            itpe_score=round(itpe_score, 2),
            itpe_level=ITPESnapshot.level_for_score(itpe_score),
            dimensions=dimensions,
            delta_7d=delta_7d,
            delta_30d=delta_30d,
        )
        return snapshot

    # ------------------------------------------------------------------
    # Dimension Fiscal
    # ------------------------------------------------------------------

    def _compute_fiscal(self, eco: dict[str, float]) -> ITPEDimension:
        drivers = []
        scores = []

        # Deuda/PIB: referencia UE 60%, critico >120%
        deuda_pib = eco.get("deuda_pib", eco.get("BDE_pib_variacion", 0.0))
        if deuda_pib:
            if deuda_pib < 60:
                scores.append(10.0)
            elif deuda_pib < 90:
                scores.append(30.0)
            elif deuda_pib < 110:
                scores.append(60.0)
                drivers.append(f"Deuda/PIB elevada: {deuda_pib:.1f}%")
            else:
                scores.append(85.0)
                drivers.append(f"Deuda/PIB critica: {deuda_pib:.1f}%")

        # Tipo bono 10Y: >4% es tension
        tipo_bono = eco.get("tipo_bono_10y", eco.get("BDE_euribor_12m", 0.0))
        if tipo_bono:
            if tipo_bono < 2:
                scores.append(5.0)
            elif tipo_bono < 3.5:
                scores.append(25.0)
            elif tipo_bono < 5:
                scores.append(60.0)
                drivers.append(f"Tipo bono 10Y elevado: {tipo_bono:.2f}%")
            else:
                scores.append(90.0)
                drivers.append(f"Tipo bono 10Y critico: {tipo_bono:.2f}%")

        score = sum(scores) / len(scores) if scores else 50.0
        return ITPEDimension(
            name="fiscal",
            score=score,
            weight=self._weights.get("fiscal", 0.25),
            drivers=drivers,
            raw_inputs={k: v for k, v in eco.items() if "deuda" in k or "bono" in k},
        )

    # ------------------------------------------------------------------
    # Dimension Social
    # ------------------------------------------------------------------

    def _compute_social(self, eco: dict[str, float]) -> ITPEDimension:
        drivers = []
        scores = []

        # Tasa de paro: referencia ES 12-15% historico
        paro = eco.get("tasa_paro", eco.get("INE_tasa_paro", eco.get("BDE_tasa_paro", 0.0)))
        if paro:
            if paro < 8:
                scores.append(10.0)
            elif paro < 12:
                scores.append(30.0)
            elif paro < 18:
                scores.append(60.0)
                drivers.append(f"Tasa paro elevada: {paro:.1f}%")
            else:
                scores.append(85.0)
                drivers.append(f"Tasa paro critica: {paro:.1f}%")

        # IPC: >4% tension, >6% critico
        ipc = eco.get("ipc_general", eco.get("BDE_ipc_general", eco.get("INE_ipc_tasa_anual", 0.0)))
        if ipc:
            if abs(ipc) < 2:
                scores.append(5.0)
            elif abs(ipc) < 4:
                scores.append(30.0)
            elif abs(ipc) < 6:
                scores.append(65.0)
                drivers.append(f"Inflacion elevada: {ipc:.1f}%")
            else:
                scores.append(90.0)
                drivers.append(f"Inflacion critica: {ipc:.1f}%")

        score = sum(scores) / len(scores) if scores else 50.0
        return ITPEDimension(
            name="social",
            score=score,
            weight=self._weights.get("social", 0.25),
            drivers=drivers,
        )

    # ------------------------------------------------------------------
    # Dimension Politica
    # ------------------------------------------------------------------

    def _compute_politico(self, pol: dict[str, Any]) -> ITPEDimension:
        drivers = []
        scores = []

        # Fragmentacion parlamentaria (Herfindahl inverso, 0=uniforme, 1=bipartidismo)
        fragmentacion = float(pol.get("fragmentacion", 0.5))
        scores.append(fragmentacion * 100)
        if fragmentacion > 0.6:
            drivers.append(f"Alta fragmentacion parlamentaria: {fragmentacion:.2f}")

        # Mocion de censura activa
        if pol.get("mocion_censura"):
            scores.append(90.0)
            drivers.append("Mocion de censura activa")

        # Gobierno en minoria
        if pol.get("gobierno_minoria"):
            scores.append(60.0)
            drivers.append("Gobierno en minoria parlamentaria")

        # Elecciones proximas (<6 meses)
        meses_elecciones = float(pol.get("meses_prox_elecciones", 24))
        if meses_elecciones < 3:
            scores.append(80.0)
            drivers.append(f"Elecciones en {meses_elecciones:.0f} meses")
        elif meses_elecciones < 6:
            scores.append(55.0)

        score = sum(scores) / len(scores) if scores else 50.0
        return ITPEDimension(
            name="politico",
            score=score,
            weight=self._weights.get("politico", 0.25),
            drivers=drivers,
            raw_inputs=pol if isinstance(pol, dict) else {},
        )

    # ------------------------------------------------------------------
    # Dimension Geopolitica
    # ------------------------------------------------------------------

    def _compute_geopolitico(self, geo: dict[str, Any]) -> ITPEDimension:
        drivers = []
        scores = []

        conflictos = int(geo.get("conflictos_adyacentes", 0))
        if conflictos == 0:
            scores.append(10.0)
        elif conflictos == 1:
            scores.append(40.0)
            drivers.append(f"{conflictos} conflicto activo adyacente")
        else:
            scores.append(75.0)
            drivers.append(f"{conflictos} conflictos activos adyacentes")

        dependencia_gas = float(geo.get("dependencia_gas", 0.3))
        if dependencia_gas > 0.5:
            scores.append(70.0)
            drivers.append(f"Alta dependencia gas importado: {dependencia_gas:.0%}")

        sanciones_activas = bool(geo.get("sanciones_activas", False))
        if sanciones_activas:
            scores.append(65.0)
            drivers.append("Sanciones economicas activas en bloque regional")

        score = sum(scores) / len(scores) if scores else 30.0
        return ITPEDimension(
            name="geopolitico",
            score=score,
            weight=self._weights.get("geopolitico", 0.15),
            drivers=drivers,
        )

    # ------------------------------------------------------------------
    # Dimension Institucional
    # ------------------------------------------------------------------

    def _compute_institucional(self, inst: dict[str, Any]) -> ITPEDimension:
        drivers = []
        scores = []

        investigaciones = int(inst.get("investigaciones_judiciales_gobierno", 0))
        if investigaciones == 0:
            scores.append(5.0)
        elif investigaciones < 3:
            scores.append(40.0)
            drivers.append(f"{investigaciones} investigaciones judiciales abiertas")
        else:
            scores.append(80.0)
            drivers.append(f"Multiple investigaciones judiciales: {investigaciones}")

        crisis_gobierno = bool(inst.get("crisis_gobierno", False))
        if crisis_gobierno:
            scores.append(85.0)
            drivers.append("Crisis de gobierno activa")

        score = sum(scores) / len(scores) if scores else 20.0
        return ITPEDimension(
            name="institucional",
            score=score,
            weight=self._weights.get("institucional", 0.10),
            drivers=drivers,
        )
