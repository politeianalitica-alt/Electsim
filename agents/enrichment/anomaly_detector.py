"""
Detector de anomalias en menciones de entidades (Bloque 3).

Para cada entidad activa:
  1. Calcula la media y desviacion estandar de menciones por dia
     en los ultimos 14 dias (baseline).
  2. Compara el conteo de hoy (o las ultimas 24h) con el baseline.
  3. Si z-score >= 2.0, genera una hipotesis con Ollama.
  4. Detecta tambien cambios de tono (positivo <-> negativo) significativos.

Alertas almacenadas en memory para que el dashboard las consulte
sin necesidad de recalculo continuo.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from .models import AnomalyAlert

log = logging.getLogger(__name__)

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("ANOMALY_OLLAMA_MODEL", "politeia-brain:latest")

_Z_SCORE_THRESHOLD   = 2.0    # umbral para alerta de spike
_TONE_SHIFT_DELTA    = 0.4    # cambio de sentimiento medio suficiente para alerta


# ---------------------------------------------------------------------------
# Hipotesis con Ollama
# ---------------------------------------------------------------------------

def _generate_hypothesis(
    nombre: str,
    tipo: str,
    alert_type: str,
    value_current: float,
    value_baseline: float,
    z_score: float,
    sample_contexts: list[str],
) -> str:
    ctx_str = " | ".join(sample_contexts[:3])[:500]
    prompt = f"""\
Eres un analista de inteligencia politica. Genera una hipotesis breve
(1-2 oraciones) para explicar la siguiente anomalia detectada en medios espanoles.

ENTIDAD: {nombre} ({tipo})
TIPO DE ANOMALIA: {alert_type}
VALOR ACTUAL: {value_current:.1f}
VALOR MEDIO: {value_baseline:.1f}
Z-SCORE: {z_score:.2f}
CONTEXTOS RECIENTES: {ctx_str}

Hipotesis concisa, factual, sin emojis, en espanol:"""

    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": _OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
    except Exception:
        return (
            f"Aumento inusual de menciones de {nombre} "
            f"({value_current:.0f} vs media {value_baseline:.1f}). "
            f"Z-score: {z_score:.2f}."
        )


# ---------------------------------------------------------------------------
# Calculo de z-score
# ---------------------------------------------------------------------------

def _daily_counts_14d(qid: str, conn) -> list[float]:
    """
    Devuelve los conteos diarios de menciones para los ultimos 14 dias.
    Indice 0 = dia de hoy, indice 13 = hace 14 dias.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    DATE_TRUNC('day', published_at)::date AS dia,
                    COUNT(*) AS cnt
                FROM entity_mentions
                WHERE qid = %s
                  AND published_at >= NOW() - INTERVAL '15 days'
                GROUP BY dia
                ORDER BY dia DESC
                """,
                (qid,),
            )
            rows = cur.fetchall()
    except Exception as exc:
        log.warning("Error obteniendo conteos para %s: %s", qid, exc)
        return []

    # Rellenar con 0 los dias sin menciones
    from datetime import date, timedelta
    today = date.today()
    day_map = {row[0]: int(row[1]) for row in rows}
    return [float(day_map.get(today - timedelta(days=i), 0)) for i in range(15)]


def _daily_sentiments_14d(qid: str, conn) -> list[Optional[float]]:
    """Devuelve el sentimiento medio diario para los ultimos 14 dias."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    DATE_TRUNC('day', published_at)::date AS dia,
                    AVG(sentiment) AS avg_sent
                FROM entity_mentions
                WHERE qid = %s
                  AND published_at >= NOW() - INTERVAL '15 days'
                  AND sentiment IS NOT NULL
                GROUP BY dia
                ORDER BY dia DESC
                """,
                (qid,),
            )
            rows = cur.fetchall()
    except Exception:
        return []

    from datetime import date, timedelta
    today = date.today()
    day_map = {row[0]: float(row[1]) for row in rows if row[1] is not None}
    return [day_map.get(today - timedelta(days=i)) for i in range(15)]


# ---------------------------------------------------------------------------
# Detector principal
# ---------------------------------------------------------------------------

def detect_anomalies(conn, top_n_entities: int = 50) -> list[AnomalyAlert]:
    """
    Detecta anomalias en las top N entidades por menciones en los ultimos 7 dias.

    Returns:
      Lista de AnomalyAlert (puede ser vacia).
    """
    # Obtener entidades activas con mas menciones
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ec.qid, ec.nombre_oficial, ec.tipo
                FROM entity_mentions em
                JOIN entities_canonical ec ON ec.qid = em.qid
                WHERE em.published_at >= NOW() - INTERVAL '7 days'
                GROUP BY ec.qid, ec.nombre_oficial, ec.tipo
                ORDER BY COUNT(*) DESC
                LIMIT %s
                """,
                (top_n_entities,),
            )
            entities = cur.fetchall()
    except Exception as exc:
        log.warning("Error cargando entidades para anomalias: %s", exc)
        return []

    alerts: list[AnomalyAlert] = []

    for qid, nombre, tipo in entities:
        counts = _daily_counts_14d(qid, conn)
        if len(counts) < 7:
            continue

        today_count = counts[0]
        baseline = counts[1:15]  # ultimos 14 dias excepto hoy
        if not baseline:
            continue

        mean_b = float(np.mean(baseline))
        std_b  = float(np.std(baseline))

        # Evitar division por cero
        if std_b < 0.5:
            std_b = 0.5

        z = (today_count - mean_b) / std_b

        if abs(z) >= _Z_SCORE_THRESHOLD:
            # Obtener contextos de muestra para la hipotesis
            sample_contexts: list[str] = []
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT context_window FROM entity_mentions
                        WHERE qid = %s
                          AND published_at >= NOW() - INTERVAL '24 hours'
                          AND context_window IS NOT NULL
                        LIMIT 3
                        """,
                        (qid,),
                    )
                    sample_contexts = [r[0] for r in cur.fetchall()]
            except Exception:
                pass

            hypothesis = _generate_hypothesis(
                nombre=nombre,
                tipo=tipo,
                alert_type="spike_menciones",
                value_current=today_count,
                value_baseline=mean_b,
                z_score=z,
                sample_contexts=sample_contexts,
            )

            alerts.append(
                AnomalyAlert(
                    qid=qid,
                    nombre_oficial=nombre,
                    alert_type="spike_menciones",
                    z_score=z,
                    value_current=today_count,
                    value_baseline=mean_b,
                    hypothesis=hypothesis,
                )
            )

        # Deteccion de cambio de tono
        sentiments = _daily_sentiments_14d(qid, conn)
        sent_today    = sentiments[0] if sentiments else None
        sent_baseline = [s for s in sentiments[1:8] if s is not None]

        if sent_today is not None and sent_baseline:
            sent_mean = float(np.mean(sent_baseline))
            delta = abs(float(sent_today) - sent_mean)

            if delta >= _TONE_SHIFT_DELTA:
                hypothesis = _generate_hypothesis(
                    nombre=nombre,
                    tipo=tipo,
                    alert_type="cambio_tono",
                    value_current=float(sent_today),
                    value_baseline=sent_mean,
                    z_score=delta / 0.2,
                    sample_contexts=sample_contexts,
                )
                alerts.append(
                    AnomalyAlert(
                        qid=qid,
                        nombre_oficial=nombre,
                        alert_type="cambio_tono",
                        z_score=delta / 0.2,
                        value_current=float(sent_today),
                        value_baseline=sent_mean,
                        hypothesis=hypothesis,
                    )
                )

    log.info("detect_anomalies: %d alertas generadas", len(alerts))
    return alerts


def persist_alerts(alerts: list[AnomalyAlert], conn) -> int:
    """
    Guarda alertas en la tabla entity_anomaly_alerts (si existe).
    Si la tabla no existe, solo loggea (la migracion la creara).
    """
    if not alerts:
        return 0
    inserted = 0
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS entity_anomaly_alerts (
                    id            BIGSERIAL PRIMARY KEY,
                    qid           VARCHAR(20) NOT NULL,
                    nombre_oficial TEXT,
                    alert_type    VARCHAR(40),
                    z_score       FLOAT,
                    value_current FLOAT,
                    value_baseline FLOAT,
                    hypothesis    TEXT,
                    generated_at  TIMESTAMPTZ DEFAULT NOW(),
                    activa        BOOLEAN DEFAULT TRUE
                )
                """
            )
            for a in alerts:
                cur.execute(
                    """
                    INSERT INTO entity_anomaly_alerts
                        (qid, nombre_oficial, alert_type, z_score,
                         value_current, value_baseline, hypothesis)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        a.qid, a.nombre_oficial, a.alert_type,
                        a.z_score, a.value_current, a.value_baseline,
                        a.hypothesis,
                    ),
                )
                inserted += 1
    except Exception as exc:
        log.warning("Error persistiendo alertas: %s", exc)
    return inserted
