"""
Bloque 7b — CrisisEscalationModel.

Predice la probabilidad de escalada de crisis politica usando:
  - Anomalias activas de alta severidad (MultivariateAnomalyDetector)
  - Centralidad de actores clave en el grafo causal
  - Indicadores macroeconomicos de riesgo (prima, IPC)
  - Actividad legislativa de urgencia
  - Señales de coordinacion mediatica anormal

Salida: dict {horizon_days: probability} para horizontes 7, 14, 30 dias.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_HORIZONS: list[int] = [7, 14, 30]     # dias de prediccion
_ALERT_SEVERITY_WEIGHT: float = 0.35   # peso de anomalias activas
_MACRO_WEIGHT: float = 0.25            # peso de indicadores macro
_GRAPH_WEIGHT: float = 0.20            # peso de centralidad en grafo
_LEGISLATIVE_WEIGHT: float = 0.20      # peso de actividad legislativa urgente

# Umbrales macro: prima de riesgo > 150pb o IPC > 4% → riesgo alto
_PRIMA_HIGH_THRESHOLD: float = 150.0
_IPC_HIGH_THRESHOLD: float = 4.0

# Decaimiento de probabilidad por horizonte mas lejano
_HORIZON_DECAY: dict[int, float] = {7: 1.0, 14: 0.82, 30: 0.65}


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------

@dataclass
class CrisisPrediction:
    prediction_id: str = field(default_factory=lambda: f"CRISIS-{uuid.uuid4().hex[:8].upper()}")
    horizons: dict[int, float] = field(default_factory=dict)   # {horizon_days: probability}
    confidence_intervals: dict[int, tuple[float, float]] = field(default_factory=dict)
    dominant_signals: list[str] = field(default_factory=list)  # senales que mas contribuyen
    entities_at_risk: list[str] = field(default_factory=list)  # QIDs involucradas
    scenario_description: str = ""
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# CrisisEscalationModel
# ---------------------------------------------------------------------------

class CrisisEscalationModel:
    """
    Predice la probabilidad de escalada de una crisis politica.

    Uso:
        model = CrisisEscalationModel()
        pred = model.predict_crisis()
        print(pred.horizons)  # {7: 0.34, 14: 0.28, 30: 0.22}
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

    def predict_crisis(self) -> CrisisPrediction:
        """
        Ejecuta el modelo y devuelve la prediccion de escalada.
        """
        alert_score, alert_entities = self._score_alerts()
        macro_score = self._score_macro()
        graph_score = self._score_graph_centrality()
        legislative_score = self._score_legislative_urgency()

        # Score base 7d
        base_score = float(np.clip(
            _ALERT_SEVERITY_WEIGHT * alert_score
            + _MACRO_WEIGHT * macro_score
            + _GRAPH_WEIGHT * graph_score
            + _LEGISLATIVE_WEIGHT * legislative_score,
            0.0, 1.0,
        ))

        horizons: dict[int, float] = {}
        ci: dict[int, tuple[float, float]] = {}
        spread = 0.08

        for h in _HORIZONS:
            prob = float(np.clip(base_score * _HORIZON_DECAY[h], 0.0, 1.0))
            horizons[h] = round(prob, 4)
            ci[h] = (round(max(0, prob - spread), 4), round(min(1, prob + spread), 4))

        dominant = self._dominant_signals(alert_score, macro_score, graph_score, legislative_score)

        pred = CrisisPrediction(
            horizons=horizons,
            confidence_intervals=ci,
            dominant_signals=dominant,
            entities_at_risk=alert_entities[:5],
            scenario_description=self._describe(base_score, dominant),
        )

        self._persist(pred)
        return pred

    # ------------------------------------------------------------------
    # Componentes de scoring
    # ------------------------------------------------------------------

    def _score_alerts(self) -> tuple[float, list[str]]:
        """Pondera las alertas activas de alta severidad."""
        if self._conn is None:
            return 0.3, []
        try:
            rows = list(self._conn.execute(
                """
                SELECT qid, severity, z_score
                FROM entity_anomaly_alerts
                WHERE activa = TRUE
                  AND generated_at >= %(since)s
                ORDER BY severity DESC NULLS LAST
                LIMIT 20
                """,
                {"since": datetime.now(timezone.utc) - timedelta(days=2)},
            ))
            if not rows:
                return 0.0, []

            severities = [float(r[1]) if r[1] is not None else float(r[2] or 0) / 10 for r in rows]
            entities = [r[0] for r in rows]
            score = float(np.clip(np.mean(severities[:5]), 0.0, 1.0))
            return score, entities
        except Exception as exc:
            log.debug("CrisisEscalation: score_alerts error: %s", exc)
            return 0.2, []

    def _score_macro(self) -> float:
        """Evalua indicadores macroeconomicos de riesgo."""
        if self._conn is None:
            return 0.3
        try:
            rows = list(self._conn.execute(
                """
                SELECT indicador, valor
                FROM macro_indicadores
                WHERE fecha = (SELECT MAX(fecha) FROM macro_indicadores)
                  AND indicador IN ('Prima Riesgo (pb)', 'IPC General (%)', 'Tasa de Paro (%)')
                """
            ))
            if not rows:
                return 0.2
            indicators = {r[0]: float(r[1]) for r in rows if r[1] is not None}
            score = 0.0
            if indicators.get("Prima Riesgo (pb)", 0) > _PRIMA_HIGH_THRESHOLD:
                score += 0.40
            if indicators.get("IPC General (%)", 0) > _IPC_HIGH_THRESHOLD:
                score += 0.35
            paro = indicators.get("Tasa de Paro (%)", 10.0)
            score += float(np.clip((paro - 10.0) / 20.0, 0.0, 0.25))
            return float(np.clip(score, 0.0, 1.0))
        except Exception as exc:
            log.debug("CrisisEscalation: score_macro error: %s", exc)
            return 0.2

    def _score_graph_centrality(self) -> float:
        """Proxy de centralidad: peso medio de aristas activas en el grafo."""
        if self._conn is None:
            return 0.3
        try:
            row = next(iter(self._conn.execute(
                """
                SELECT AVG(decayed_weight), STDDEV(decayed_weight)
                FROM entity_causal_edges
                WHERE computed_at >= %(since)s
                """,
                {"since": datetime.now(timezone.utc) - timedelta(days=3)},
            )), (None, None))
            if row[0] is None:
                return 0.2
            avg_w = float(row[0])
            std_w = float(row[1]) if row[1] else 0.0
            # Alta varianza en pesos + peso elevado = estructura de grafo tensa
            return float(np.clip(avg_w * 0.7 + std_w * 1.5, 0.0, 1.0))
        except Exception as exc:
            log.debug("CrisisEscalation: score_graph error: %s", exc)
            return 0.2

    def _score_legislative_urgency(self) -> float:
        """Detecta actividad parlamentaria urgente reciente."""
        if self._conn is None:
            return 0.2
        try:
            row = next(iter(self._conn.execute(
                """
                SELECT COUNT(*)
                FROM iniciativas_parlamentarias
                WHERE tipo ILIKE '%urgente%'
                   OR tipo ILIKE '%urgencia%'
                   OR titulo ILIKE '%estado de alarma%'
                   OR titulo ILIKE '%mocion de censura%'
                   OR titulo ILIKE '%cuestion de confianza%'
                LIMIT 1
                """
            )), (0,))
            n = int(row[0])
            return float(np.clip(n / 5.0, 0.0, 1.0))
        except Exception:
            return 0.1

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _dominant_signals(
        self,
        alert: float,
        macro: float,
        graph: float,
        legislative: float,
    ) -> list[str]:
        signals = [
            ("Anomalias de entidades", alert),
            ("Indicadores macro", macro),
            ("Grafo causal", graph),
            ("Legislacion urgente", legislative),
        ]
        signals.sort(key=lambda x: x[1], reverse=True)
        return [name for name, score in signals if score > 0.3]

    def _describe(self, base_score: float, dominant: list[str]) -> str:
        if base_score < 0.20:
            level = "BAJO"
        elif base_score < 0.40:
            level = "MODERADO"
        elif base_score < 0.60:
            level = "ELEVADO"
        else:
            level = "CRITICO"

        dom_str = " y ".join(dominant[:2]) if dominant else "ninguna senal dominante"
        return (
            f"Riesgo de escalada {level} (score={base_score:.2f}). "
            f"Factores principales: {dom_str}."
        )

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _persist(self, pred: CrisisPrediction) -> None:
        if self._conn is None:
            return
        import json as _json
        try:
            for h in _HORIZONS:
                pid = f"{pred.prediction_id}-{h}d"
                self._conn.execute(
                    """
                    INSERT INTO prediction_results
                      (prediction_id, model_type, horizon_days, probability,
                       confidence_low, confidence_high, entities_involved, scenario_json,
                       generated_at)
                    VALUES
                      (%(pid)s, 'crisis_escalation', %(h)s, %(prob)s,
                       %(clo)s, %(chi)s, %(ent)s, %(scen)s,
                       NOW())
                    ON CONFLICT (prediction_id) DO NOTHING
                    """,
                    {
                        "pid":  pid,
                        "h":    h,
                        "prob": pred.horizons[h],
                        "clo":  pred.confidence_intervals[h][0],
                        "chi":  pred.confidence_intervals[h][1],
                        "ent":  _json.dumps(pred.entities_at_risk),
                        "scen": _json.dumps({
                            "description": pred.scenario_description,
                            "dominant_signals": pred.dominant_signals,
                        }),
                    },
                )
            self._conn.commit()
        except Exception as exc:
            log.debug("CrisisEscalation: persist error: %s", exc)
            try:
                self._conn.rollback()
            except Exception:
                pass
