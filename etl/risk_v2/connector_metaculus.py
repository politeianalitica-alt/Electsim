"""
Metaculus — mercado de predicciones públicas.

REST API público sin auth: https://www.metaculus.com/api2/questions/

Buscamos preguntas relacionadas con:
  - Elecciones anticipadas en España
  - Crisis política internacional
  - Recesión

Métricas:
  - prob_elecciones_ant (probabilidad mediana de la pregunta más relevante)
  - prob_crisis_intl

Por sencillez usamos búsqueda por keyword. Si no encontramos preguntas
activas, devolvemos [] y queda warning.
"""
from __future__ import annotations

import logging
from datetime import date

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)

METACULUS_SEARCH = "https://www.metaculus.com/api2/questions/?search={q}&status=open&limit=5"

SEARCHES = [
    ("Spain election 2025", "prob_elecciones_ant", "ES"),
    ("Spain snap election", "prob_elecciones_ant", "ES"),
    ("international crisis", "prob_crisis_intl",  "ES"),
    ("global recession",    "prob_recession",     "ES"),
]


class MetaculusConnector(RiskV2Connector):
    source_id = "metaculus"

    def fetch(self) -> list[RawValue]:
        try:
            import httpx
        except ImportError:
            return []
        today = date.today()
        out: list[RawValue] = []
        for query, metric, iso2 in SEARCHES:
            url = METACULUS_SEARCH.format(q=query.replace(" ", "+"))
            try:
                r = httpx.get(url, timeout=15)
                if not r.is_success:
                    continue
                results = r.json().get("results", [])
                if not results:
                    continue
                # Use median of top question's community_prediction.full.q2 (median)
                q = results[0]
                cp = q.get("community_prediction") or {}
                med = (cp.get("full") or {}).get("q2")
                if med is None:
                    continue
                out.append(RawValue(
                    source_id=self.source_id, country_iso2=iso2,
                    metric_name=metric,
                    metric_value=float(med), reference_date=today,
                ))
            except Exception as exc:
                logger.debug("Metaculus %s: %s", query, exc)
                continue
        return out
