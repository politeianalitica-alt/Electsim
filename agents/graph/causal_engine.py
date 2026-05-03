"""
Bloque 5 — CausalGraphEngine.

Calcula aristas causales entre entidades con:
  - Decaimiento temporal exponencial (half-life = 30 dias)
  - Inferencia de direccion causal via test de Granger (statsmodels)
  - Pesos de frecuencia normalizados por ventana de analisis
  - Persistencia en entity_causal_edges (Postgres) y Neo4j (si disponible)

Formula de peso de arista:
    decayed_weight = 0.5^(age_days / DECAY_HALF_LIFE) * base_strength * frequency_score

Donde:
  base_strength   = fuerza de la relacion (co-menciones normalizadas)
  frequency_score = num_co_menciones / max_co_menciones_en_ventana
  age_days        = dias desde el ultimo evento compartido
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

DECAY_HALF_LIFE_DAYS: float = 30.0   # peso se reduce a la mitad cada 30 dias
_GRANGER_MAX_LAG: int = 3            # max lag para test de Granger
_GRANGER_ALPHA: float = 0.10         # nivel de significacion para inferir causalidad
_WINDOW_DAYS: int = 90               # ventana de analisis historico
_MIN_OBSERVATIONS: int = 10          # minimo de puntos para test de Granger
_TOP_PAIRS: int = 200                # top pares a recalcular por ejecucion


# ---------------------------------------------------------------------------
# Calculo de peso temporal
# ---------------------------------------------------------------------------

def compute_edge_weight(
    age_days: float,
    base_strength: float = 1.0,
    frequency_score: float = 1.0,
) -> float:
    """
    Calcula el peso decaido de una arista causal.

    Args:
        age_days:        dias desde el ultimo evento que conecta source y target
        base_strength:   fuerza base de la relacion (0-1), normalizada sobre co-menciones
        frequency_score: score de frecuencia (0-1), co-menciones / max_co-menciones

    Returns:
        float en [0, 1]
    """
    decay = 0.5 ** (age_days / DECAY_HALF_LIFE_DAYS)
    return float(np.clip(decay * base_strength * frequency_score, 0.0, 1.0))


# ---------------------------------------------------------------------------
# Test de Granger (statsmodels opcional)
# ---------------------------------------------------------------------------

def infer_causal_direction(
    series_a: list[float],
    series_b: list[float],
    max_lag: int = _GRANGER_MAX_LAG,
    alpha: float = _GRANGER_ALPHA,
) -> tuple[str, float]:
    """
    Infiere la direccion causal entre dos series temporales usando
    el test de Granger.

    Args:
        series_a, series_b: series de menciones diarias (longitud minima = max_lag + 2)
        max_lag:            lags maximos a testear
        alpha:              nivel de significacion

    Returns:
        (direction, p_value)
        direction: 'forward' (A→B), 'backward' (B→A),
                   'bidirectional', 'none'
        p_value:   el p-valor mas bajo entre las dos direcciones
    """
    if len(series_a) < _MIN_OBSERVATIONS or len(series_b) < _MIN_OBSERVATIONS:
        return "none", 1.0

    try:
        from statsmodels.tsa.stattools import grangercausalitytests
        import warnings

        data_ab = list(zip(series_b, series_a))  # [B, A]: B causado por A
        data_ba = list(zip(series_a, series_b))  # [A, B]: A causado por B

        p_ab = _min_granger_pvalue(data_ab, max_lag)
        p_ba = _min_granger_pvalue(data_ba, max_lag)

        a_causes_b = p_ab < alpha
        b_causes_a = p_ba < alpha
        min_p = min(p_ab, p_ba)

        if a_causes_b and b_causes_a:
            return "bidirectional", min_p
        elif a_causes_b:
            return "forward", p_ab
        elif b_causes_a:
            return "backward", p_ba
        else:
            return "none", min_p

    except ImportError:
        log.debug("statsmodels no disponible: Granger no ejecutado")
        return "none", 1.0
    except Exception as exc:
        log.debug("Granger error: %s", exc)
        return "none", 1.0


def _min_granger_pvalue(data: list[tuple], max_lag: int) -> float:
    """Extrae el p-valor minimo del test F de Granger para todos los lags."""
    try:
        from statsmodels.tsa.stattools import grangercausalitytests
        import warnings
        import numpy as np_local
        arr = np_local.array(data, dtype=float)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            results = grangercausalitytests(arr, max_lag, verbose=False)
        pvals = [results[lag][0]["ssr_ftest"][1] for lag in range(1, max_lag + 1)]
        return float(min(pvals))
    except Exception:
        return 1.0


# ---------------------------------------------------------------------------
# CausalGraphEngine principal
# ---------------------------------------------------------------------------

class CausalGraphEngine:
    """
    Calcula y persiste aristas causales entre entidades.

    Uso tipico:
        engine = CausalGraphEngine()
        engine.run(window_days=90)
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
    # Entry point principal
    # ------------------------------------------------------------------

    def run(self, window_days: int = _WINDOW_DAYS) -> dict:
        """
        Ejecuta el pipeline completo:
          1. Carga pares de co-mencion de la ventana indicada
          2. Para cada par: calcula peso decaido + infiere causalidad
          3. Persiste en entity_causal_edges
        """
        if self._conn is None:
            log.warning("CausalGraphEngine: sin conexion BD")
            return {"edges_updated": 0}

        since = datetime.now(timezone.utc) - timedelta(days=window_days)
        pairs = self._load_cooccurrence_pairs(since, limit=_TOP_PAIRS)
        log.info("CausalGraphEngine: %d pares de co-mencion cargados", len(pairs))

        edges_updated = 0
        max_cooc = max((p["n_cooc"] for p in pairs), default=1)

        for pair in pairs:
            try:
                weight = self._process_pair(pair, max_cooc, window_days)
                self._upsert_edge(pair, weight)
                edges_updated += 1
            except Exception as exc:
                log.debug("CausalGraphEngine: error en par %s-%s: %s",
                          pair["qid_a"], pair["qid_b"], exc)

        try:
            self._conn.commit()
        except Exception:
            pass

        return {"edges_updated": edges_updated, "pairs_evaluated": len(pairs)}

    # ------------------------------------------------------------------
    # Carga de pares
    # ------------------------------------------------------------------

    def _load_cooccurrence_pairs(
        self, since: datetime, limit: int = _TOP_PAIRS
    ) -> list[dict]:
        """
        Carga pares de entidades que co-aparecen en el mismo articulo
        dentro de la ventana de analisis.
        """
        try:
            rows = list(self._conn.execute(
                """
                SELECT
                    a.resolved_qid AS qid_a,
                    b.resolved_qid AS qid_b,
                    COUNT(*)       AS n_cooc,
                    MAX(a.published_at) AS last_event_at
                FROM entity_mentions a
                JOIN entity_mentions b
                  ON a.article_url = b.article_url
                 AND a.resolved_qid < b.resolved_qid
                WHERE a.resolved_qid IS NOT NULL
                  AND b.resolved_qid IS NOT NULL
                  AND a.published_at >= %(since)s
                GROUP BY a.resolved_qid, b.resolved_qid
                ORDER BY n_cooc DESC
                LIMIT %(lim)s
                """,
                {"since": since, "lim": limit},
            ))
            return [
                {
                    "qid_a": r[0], "qid_b": r[1],
                    "n_cooc": int(r[2]), "last_event_at": r[3],
                }
                for r in rows
            ]
        except Exception as exc:
            log.warning("CausalGraphEngine: error cargando pares: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Procesamiento de un par
    # ------------------------------------------------------------------

    def _process_pair(self, pair: dict, max_cooc: int, window_days: int) -> dict:
        """Calcula peso y causalidad para un par de entidades."""
        now = datetime.now(timezone.utc)
        last_at = pair.get("last_event_at")
        if last_at is None:
            age_days = float(window_days)
        elif hasattr(last_at, "tzinfo") and last_at.tzinfo is not None:
            age_days = (now - last_at).total_seconds() / 86400.0
        else:
            age_days = (now - last_at.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0

        frequency_score = pair["n_cooc"] / max(max_cooc, 1)
        base_strength = min(1.0, pair["n_cooc"] / 10.0)
        decayed = compute_edge_weight(age_days, base_strength, frequency_score)

        # Series temporales para Granger (menciones diarias en ventana)
        series_a, series_b = self._load_daily_series(
            pair["qid_a"], pair["qid_b"], window_days
        )
        direction, granger_p = infer_causal_direction(series_a, series_b)

        return {
            "decayed_weight": decayed,
            "base_strength": base_strength,
            "frequency_score": frequency_score,
            "causal_direction": direction,
            "granger_pvalue": granger_p,
        }

    def _load_daily_series(
        self, qid_a: str, qid_b: str, window_days: int
    ) -> tuple[list[float], list[float]]:
        """Carga series diarias de menciones para cada entidad."""
        since = datetime.now(timezone.utc) - timedelta(days=window_days)
        try:
            rows_a = list(self._conn.execute(
                """
                SELECT DATE(published_at) AS d, COUNT(*) AS n
                FROM entity_mentions
                WHERE resolved_qid = %(qid)s AND published_at >= %(since)s
                GROUP BY d ORDER BY d
                """,
                {"qid": qid_a, "since": since},
            ))
            rows_b = list(self._conn.execute(
                """
                SELECT DATE(published_at) AS d, COUNT(*) AS n
                FROM entity_mentions
                WHERE resolved_qid = %(qid)s AND published_at >= %(since)s
                GROUP BY d ORDER BY d
                """,
                {"qid": qid_b, "since": since},
            ))
            return [float(r[1]) for r in rows_a], [float(r[1]) for r in rows_b]
        except Exception:
            return [], []

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _upsert_edge(self, pair: dict, weight_info: dict) -> None:
        import json as _json
        self._conn.execute(
            """
            INSERT INTO entity_causal_edges
              (source_qid, target_qid, causal_direction, granger_pvalue,
               base_strength, frequency_score, decayed_weight,
               last_event_at, computed_at)
            VALUES
              (%(qid_a)s, %(qid_b)s, %(direction)s, %(pval)s,
               %(base)s, %(freq)s, %(weight)s,
               %(last_at)s, NOW())
            ON CONFLICT (source_qid, target_qid) DO UPDATE SET
              causal_direction = EXCLUDED.causal_direction,
              granger_pvalue   = EXCLUDED.granger_pvalue,
              base_strength    = EXCLUDED.base_strength,
              frequency_score  = EXCLUDED.frequency_score,
              decayed_weight   = EXCLUDED.decayed_weight,
              last_event_at    = EXCLUDED.last_event_at,
              computed_at      = NOW()
            """,
            {
                "qid_a":     pair["qid_a"],
                "qid_b":     pair["qid_b"],
                "direction": weight_info["causal_direction"],
                "pval":      weight_info["granger_pvalue"],
                "base":      weight_info["base_strength"],
                "freq":      weight_info["frequency_score"],
                "weight":    weight_info["decayed_weight"],
                "last_at":   pair["last_event_at"],
            },
        )

    # ------------------------------------------------------------------
    # Lectura del grafo para consumo externo
    # ------------------------------------------------------------------

    def get_graph(
        self,
        min_weight: float = 0.1,
        limit: int = 100,
    ) -> list[dict]:
        """
        Devuelve las aristas causales con mayor peso para visualizacion
        o consumo por el dashboard.
        """
        if self._conn is None:
            return []
        try:
            rows = list(self._conn.execute(
                """
                SELECT source_qid, target_qid, causal_direction,
                       granger_pvalue, decayed_weight, last_event_at
                FROM entity_causal_edges
                WHERE decayed_weight >= %(min_w)s
                ORDER BY decayed_weight DESC
                LIMIT %(lim)s
                """,
                {"min_w": min_weight, "lim": limit},
            ))
            return [
                {
                    "source_qid":      r[0],
                    "target_qid":      r[1],
                    "causal_direction": r[2],
                    "granger_pvalue":   r[3],
                    "decayed_weight":   r[4],
                    "last_event_at":    r[5],
                }
                for r in rows
            ]
        except Exception as exc:
            log.warning("CausalGraphEngine.get_graph error: %s", exc)
            return []
