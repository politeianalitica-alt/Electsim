"""
RiskScorer — Calcula el indice de riesgo politico para un cliente.

El score se compone de 4 dimensiones numericas (sin LLM) mas una narrativa
generada por LLM opcionalmente.

Dimensiones:
  coalition_stability    — estabilidad del gobierno (0-1, mayor = mas inestable)
  media_sentiment        — sentimiento mediático medio (0-1, mayor = mas negativo)
  legislative_activity   — volumen de legislacion relevante para el cliente (0-1)
  ideological_distance   — distancia ideologica gobierno-cliente (0-1)

El risk_index final es la media ponderada de los componentes * 100.

Pesos por defecto:
  coalition_stability:   0.35
  media_sentiment:       0.25
  legislative_activity:  0.20
  ideological_distance:  0.20

La serie historica se guarda como hypertable TimescaleDB
(tabla risk_snapshots, via migration 0024).

Sin emojis.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from services.intelligence.models import RiskScore

logger = logging.getLogger(__name__)

# Pesos de las dimensiones del risk index
_COMPONENT_WEIGHTS: Dict[str, float] = {
    "coalition_stability":  0.35,
    "media_sentiment":      0.25,
    "legislative_activity": 0.20,
    "ideological_distance": 0.20,
}


class RiskScorer:
    """
    Calcula el score de riesgo politico para un cliente.
    """

    def __init__(
        self,
        llm=None,               # LLMClient (opcional, para narrative)
        ontology_repo=None,     # OntologyGraphRepository
        db_session=None,        # SQLAlchemy Session
    ) -> None:
        self.llm = llm
        self.ontology_repo = ontology_repo
        self.session = db_session

    # ------------------------------------------------------------------
    # Calculo de componentes (sin LLM)
    # ------------------------------------------------------------------

    async def compute_components(
        self,
        client_id: str,
        market_code: str,
        as_of: datetime,
    ) -> Dict[str, float]:
        """
        Calcula las 4 dimensiones del riesgo sin LLM.
        Retorna dict con valores en [0, 1].
        """
        window_start = as_of - timedelta(days=7)

        coalition = await self._compute_coalition_stability(market_code, as_of)
        sentiment = await self._compute_media_sentiment(market_code, window_start, as_of)
        legislation = await self._compute_legislative_activity(market_code, window_start, as_of)
        ideological = await self._compute_ideological_distance(client_id, market_code)

        return {
            "coalition_stability":   _clamp(coalition),
            "media_sentiment":       _clamp(sentiment),
            "legislative_activity":  _clamp(legislation),
            "ideological_distance":  _clamp(ideological),
        }

    async def _compute_coalition_stability(
        self, market_code: str, as_of: datetime
    ) -> float:
        """
        Proxy de inestabilidad: numero de alertas de coalition_stability
        en la ultima semana normalizado por un techo de 10.
        """
        if self.session is None:
            return 0.3   # valor por defecto razonable

        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT COUNT(*) FROM alertas_sistema "
                    "WHERE tipo_regla = 'coalition_stability' "
                    "AND creada_en >= :since"
                ),
                {"since": as_of - timedelta(days=7)},
            ).scalar()
            return min(1.0, int(row or 0) / 10.0)
        except Exception as exc:
            logger.debug("_compute_coalition_stability: %s", exc)
            return 0.3

    async def _compute_media_sentiment(
        self, market_code: str, since: datetime, until: datetime
    ) -> float:
        """
        Sentimiento mediático negativo medio en el periodo.
        Usa la tabla articulos_prensa con columna sentiment_label.
        """
        if self.session is None:
            return 0.4

        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT "
                    "  COUNT(*) FILTER (WHERE sentiment_label = 'negative') AS neg, "
                    "  COUNT(*) AS total "
                    "FROM articulos_prensa "
                    "WHERE fecha_publicacion >= :since AND fecha_publicacion <= :until"
                ),
                {"since": since, "until": until},
            ).first()
            if row and row[1] and row[1] > 0:
                return float(row[0]) / float(row[1])
            return 0.4
        except Exception as exc:
            logger.debug("_compute_media_sentiment: %s", exc)
            return 0.4

    async def _compute_legislative_activity(
        self, market_code: str, since: datetime, until: datetime
    ) -> float:
        """
        Volumen de normas ingestadas en el periodo normalizado por techo de 50.
        """
        if self.session is None:
            return 0.2

        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT COUNT(*) FROM ontology_object o "
                    "JOIN ontology_object_type t ON t.id = o.object_type_id "
                    "WHERE t.code = 'legislation' "
                    "AND o.created_at >= :since AND o.created_at <= :until"
                ),
                {"since": since, "until": until},
            ).scalar()
            return min(1.0, int(row or 0) / 50.0)
        except Exception as exc:
            logger.debug("_compute_legislative_activity: %s", exc)
            return 0.2

    async def _compute_ideological_distance(
        self, client_id: str, market_code: str
    ) -> float:
        """
        Distancia ideologica entre el gobierno actual y el perfil del cliente.
        Usa ideologia_cliente y escenario actual del grafo.
        Retorna valor normalizado 0-1.
        """
        if self.session is None:
            return 0.3

        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT ideologia_cliente FROM clientes WHERE id = :cid LIMIT 1"
                ),
                {"cid": client_id},
            ).scalar()
            if row is None:
                return 0.3

            # Escala simplificada: centro=0, extremos=1
            ideologia_map = {
                "izquierda": -0.8, "centro_izquierda": -0.4,
                "centro": 0.0, "centro_derecha": 0.4, "derecha": 0.8,
            }
            cliente_score = ideologia_map.get(str(row).lower(), 0.0)
            # Gobierno de coalicion de izquierda = -0.4 como referencia
            gov_score = -0.4
            distance = abs(cliente_score - gov_score) / 1.6   # normalizado a [0, 1]
            return _clamp(distance)
        except Exception as exc:
            logger.debug("_compute_ideological_distance: %s", exc)
            return 0.3

    # ------------------------------------------------------------------
    # Score final
    # ------------------------------------------------------------------

    async def score_client(
        self,
        client_id: str,
        market_code: str,
        as_of: datetime | None = None,
        include_narrative: bool = False,
    ) -> RiskScore:
        """
        Calcula el risk score completo para un cliente.

        Args:
            client_id:          ID del cliente.
            market_code:        Codigo de mercado.
            as_of:              Momento de referencia (default: ahora UTC).
            include_narrative:  Si True, genera narrativa con LLM.
        """
        if as_of is None:
            as_of = datetime.now(timezone.utc)

        components = await self.compute_components(client_id, market_code, as_of)

        # Media ponderada
        total_weight = sum(_COMPONENT_WEIGHTS.values())
        weighted_sum = sum(
            _COMPONENT_WEIGHTS.get(k, 0.25) * v
            for k, v in components.items()
        )
        risk_index = (weighted_sum / total_weight) * 100.0

        narrative: str | None = None
        if include_narrative and self.llm is not None:
            narrative = await self._generate_narrative(components, risk_index, market_code)

        score = RiskScore(
            client_id=client_id,
            risk_index=round(risk_index, 2),
            components=components,
            narrative=narrative,
            computed_at=as_of,
        )

        # Persistir en BD
        await self._persist_score(score)

        return score

    async def _generate_narrative(
        self,
        components: Dict[str, float],
        risk_index: float,
        market_code: str,
    ) -> str:
        """Genera una narrativa breve del score con LLM."""
        from pydantic import BaseModel

        class NarrativeOut(BaseModel):
            narrative: str

        prompt = (
            f"Mercado: {market_code}. "
            f"Risk index: {risk_index:.1f}/100. "
            f"Componentes: {json_safe(components)}. "
            "En 2-3 frases explica el riesgo politico principal y sus causas. "
            "Responde con JSON: {\"narrative\": \"...\"}"
        )
        try:
            result = await self.llm.classify(prompt, NarrativeOut)
            return result.narrative
        except Exception as exc:
            logger.debug("_generate_narrative error: %s", exc)
            return f"Risk index: {risk_index:.1f}/100."

    async def _persist_score(self, score: RiskScore) -> None:
        """Guarda el snapshot en la tabla risk_snapshots (TimescaleDB)."""
        if self.session is None:
            return
        try:
            from sqlalchemy import text as sa_text
            import json
            self.session.execute(
                sa_text(
                    "INSERT INTO risk_snapshots "
                    "(client_id, risk_index, components, narrative, computed_at) "
                    "VALUES (:cid, :idx, :comp::jsonb, :narr, :ts) "
                    "ON CONFLICT DO NOTHING"
                ),
                {
                    "cid": score.client_id,
                    "idx": score.risk_index,
                    "comp": json.dumps(score.components),
                    "narr": score.narrative,
                    "ts": score.computed_at,
                },
            )
            self.session.commit()
        except Exception as exc:
            logger.warning("RiskScorer._persist_score: %s", exc)

    # ------------------------------------------------------------------
    # Historia del riesgo (serie temporal)
    # ------------------------------------------------------------------

    def get_risk_history(
        self,
        client_id: str,
        days: int = 30,
    ) -> list[dict]:
        """
        Retorna la serie temporal del risk_index para un cliente.
        Requiere tabla risk_snapshots.
        """
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT computed_at, risk_index, components "
                    "FROM risk_snapshots "
                    "WHERE client_id = :cid "
                    "AND computed_at >= NOW() - INTERVAL ':days days' "
                    "ORDER BY computed_at ASC"
                ),
                {"cid": client_id, "days": days},
            ).fetchall()
            return [
                {
                    "computed_at": row[0].isoformat(),
                    "risk_index": float(row[1]),
                    "components": row[2] or {},
                }
                for row in rows
            ]
        except Exception as exc:
            logger.debug("get_risk_history: %s", exc)
            return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def json_safe(obj: Any) -> str:
    import json
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return str(obj)


# satisface el import sin romper si 'Any' no se importa arriba
from typing import Any  # noqa: E402 (al final para no redefinir)
