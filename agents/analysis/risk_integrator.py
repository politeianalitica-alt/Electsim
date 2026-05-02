"""
risk_integrator — Inyeccion del ITPE en el indice de riesgo politico.

Combina el ITPE (riesgo economico) con los riesgos politicos detectados
por el StrategicAnalyzer para producir un indice de riesgo unificado.

El indice final (0-100) pondera:
  - ITPE score (riesgo macro)
  - Riesgo politico agregado (de assessments)
  - Riesgo geopolitico (de señales clasificadas)
  - Alertas activas (de SynthesisEngine)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from agents.analysis.itpe_engine import ITPESnapshot
from agents.analysis.strategic_analyzer import StrategicAssessment
from agents.analysis.synthesis_engine import IntelAlert

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

_SEVERITY_SCORE = {"critico": 90, "alto": 70, "medio": 45, "bajo": 20}


@dataclass
class UnifiedRiskIndex:
    market_id: str
    computed_at: datetime
    total_score: float              # 0-100
    level: str                      # bajo, medio, alto, critico
    itpe_contribution: float
    political_contribution: float
    geopolitical_contribution: float
    alert_contribution: float
    top_drivers: list[str] = field(default_factory=list)
    actors_at_risk: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "market_id": self.market_id,
            "computed_at": self.computed_at.isoformat(),
            "total_score": self.total_score,
            "level": self.level,
            "components": {
                "itpe": self.itpe_contribution,
                "political": self.political_contribution,
                "geopolitical": self.geopolitical_contribution,
                "alerts": self.alert_contribution,
            },
            "top_drivers": self.top_drivers,
            "actors_at_risk": self.actors_at_risk,
        }


# ---------------------------------------------------------------------------
# Funcion principal
# ---------------------------------------------------------------------------

def inject_itpe_into_risk_index(
    itpe: ITPESnapshot | None = None,
    assessments: list[StrategicAssessment] | None = None,
    alerts: list[IntelAlert] | None = None,
    geopolitical_score: float = 30.0,
    weights: dict[str, float] | None = None,
    market_id: str = "ES",
) -> UnifiedRiskIndex:
    """
    Calcula el Indice de Riesgo Unificado combinando ITPE + riesgos politicos.

    Args:
        itpe: snapshot del ITPE (puede ser None)
        assessments: assessments estrategicos de actores
        alerts: alertas activas del SynthesisEngine
        geopolitical_score: score geopolitico externo (0-100)
        weights: pesos para cada componente
        market_id: identificador del mercado

    Returns:
        UnifiedRiskIndex con score total y desglose por componente
    """
    w = weights or {
        "itpe": 0.35,
        "political": 0.35,
        "geopolitical": 0.20,
        "alerts": 0.10,
    }

    # --- Componente ITPE ---
    itpe_score = itpe.itpe_score if itpe else 50.0
    itpe_contrib = itpe_score * w.get("itpe", 0.35)

    # --- Componente politico ---
    pol_score = _compute_political_score(assessments or [])
    pol_contrib = pol_score * w.get("political", 0.35)

    # --- Componente geopolitico ---
    geo_contrib = geopolitical_score * w.get("geopolitical", 0.20)

    # --- Componente alertas ---
    alert_score = _compute_alert_score(alerts or [])
    alert_contrib = alert_score * w.get("alerts", 0.10)

    total = itpe_contrib + pol_contrib + geo_contrib + alert_contrib
    total = max(0.0, min(100.0, total))

    # Drivers y actores en riesgo
    drivers = _collect_drivers(itpe, assessments, alerts)
    actors_at_risk = _actors_at_risk(assessments)

    return UnifiedRiskIndex(
        market_id=market_id,
        computed_at=datetime.utcnow(),
        total_score=round(total, 2),
        level=_level_for_score(total),
        itpe_contribution=round(itpe_contrib, 2),
        political_contribution=round(pol_contrib, 2),
        geopolitical_contribution=round(geo_contrib, 2),
        alert_contribution=round(alert_contrib, 2),
        top_drivers=drivers[:5],
        actors_at_risk=actors_at_risk[:6],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_political_score(assessments: list[StrategicAssessment]) -> float:
    if not assessments:
        return 50.0
    scores = []
    for a in assessments:
        actor_scores = [
            _SEVERITY_SCORE.get(r.severity, 45) * r.probability
            for r in a.risks
        ]
        scores.append(sum(actor_scores) / len(actor_scores) if actor_scores else 30.0)
    return sum(scores) / len(scores)


def _compute_alert_score(alerts: list[IntelAlert]) -> float:
    if not alerts:
        return 0.0
    level_scores = {"CRITICO": 100, "ALTO": 75, "MEDIO": 50, "BAJO": 25}
    scores = [level_scores.get(a.level, 50) for a in alerts]
    return sum(scores) / len(scores)


def _collect_drivers(
    itpe: ITPESnapshot | None,
    assessments: list[StrategicAssessment] | None,
    alerts: list[IntelAlert] | None,
) -> list[str]:
    drivers = []
    if itpe:
        for dim in itpe.dimensions:
            drivers.extend(dim.drivers[:1])
    for a in (assessments or []):
        for r in a.top_risks(1):
            drivers.append(f"{a.actor}: {r.description[:60]}")
    for alert in (alerts or []):
        if alert.level in ("CRITICO", "ALTO"):
            drivers.append(f"[{alert.level}] {alert.title[:60]}")
    return drivers


def _actors_at_risk(assessments: list[StrategicAssessment] | None) -> list[str]:
    at_risk = []
    for a in (assessments or []):
        if a.has_critical_risk() or any(r.severity == "alto" for r in a.risks):
            at_risk.append(a.actor)
    return at_risk


def _level_for_score(score: float) -> str:
    if score < 25:
        return "bajo"
    if score < 50:
        return "medio"
    if score < 75:
        return "alto"
    return "critico"
