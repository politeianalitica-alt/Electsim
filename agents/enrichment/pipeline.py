"""
Pipeline Prefect — Bloque 3: Enriquecimiento, grafo y briefings.

Flujo principal (flow enrichment_flow):
  1. enrich_active_entities  — enriquece perfiles de entidades activas
  2. build_power_graph       — genera/actualiza aristas Neo4j (o fallback PG)
  3. detect_and_persist_anomalies — z-score + cambios de tono
  4. generate_daily_briefings — briefings automaticos para entidades top

Variables de entorno:
  DATABASE_URL            — PostgreSQL connection string
  ENR_TOP_ENTITIES        — num. entidades a enriquecer (default: 30)
  ENR_LOOKBACK_HOURS      — ventana de datos para grafo (default: 24)
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

try:
    from prefect import flow, task, get_run_logger  # type: ignore
    _PREFECT = True
except ImportError:
    _PREFECT = False

    def flow(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def task(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def get_run_logger():  # type: ignore
        return logging.getLogger(__name__)

from .entity_enricher import enrich_entity
from .graph_builder import build_graph
from .anomaly_detector import detect_anomalies, persist_alerts
from .briefing_generator import generate_briefing
from .models import AnomalyAlert, ClientBriefing

_TOP_ENTITIES    = int(os.getenv("ENR_TOP_ENTITIES",    "30"))
_LOOKBACK_HOURS  = int(os.getenv("ENR_LOOKBACK_HOURS",  "24"))


def _get_conn():
    import psycopg  # type: ignore
    return psycopg.connect(os.environ.get("DATABASE_URL", ""))


# ---------------------------------------------------------------------------
# Tarea 1: Enriquecimiento de entidades activas
# ---------------------------------------------------------------------------

@task(name="enr_enrich_active_entities", retries=1)
def enr_enrich_active_entities(top_n: int = _TOP_ENTITIES) -> list[str]:
    """
    Selecciona las top_n entidades mas activas en 24h y enriquece sus perfiles.
    Devuelve la lista de QIDs procesados.
    """
    logger = get_run_logger() if _PREFECT else log
    qids_done: list[str] = []
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT em.qid
                    FROM entity_mentions em
                    WHERE em.published_at >= NOW() - INTERVAL '24 hours'
                      AND em.qid IS NOT NULL
                    GROUP BY em.qid
                    ORDER BY COUNT(*) DESC
                    LIMIT %s
                    """,
                    (top_n,),
                )
                active_qids = [row[0] for row in cur.fetchall()]

            for qid in active_qids:
                try:
                    with conn.cursor() as _:
                        enrich_entity(qid, conn)
                    qids_done.append(qid)
                except Exception as exc:
                    log.warning("Error enriqueciendo %s: %s", qid, exc)
        conn.close()
    except Exception as exc:
        logger.error("Error en enr_enrich_active_entities: %s", exc)

    logger.info("enr_enrich_active_entities: %d entidades enriquecidas", len(qids_done))
    return qids_done


# ---------------------------------------------------------------------------
# Tarea 2: Construccion del grafo
# ---------------------------------------------------------------------------

@task(name="enr_build_power_graph", retries=2, retry_delay_seconds=15)
def enr_build_power_graph(lookback_hours: int = _LOOKBACK_HOURS) -> dict[str, int]:
    logger = get_run_logger() if _PREFECT else log
    try:
        conn = _get_conn()
        with conn:
            stats = build_graph(conn, lookback_hours=lookback_hours)
        conn.close()
    except Exception as exc:
        logger.error("Error en enr_build_power_graph: %s", exc)
        stats = {"edges_extracted": 0, "edges_merged": 0}

    logger.info("enr_build_power_graph: %s", stats)
    return stats


# ---------------------------------------------------------------------------
# Tarea 3: Deteccion y persistencia de anomalias
# ---------------------------------------------------------------------------

@task(name="enr_detect_anomalies", retries=1)
def enr_detect_anomalies(top_n: int = _TOP_ENTITIES) -> list[AnomalyAlert]:
    logger = get_run_logger() if _PREFECT else log
    alerts: list[AnomalyAlert] = []
    try:
        conn = _get_conn()
        with conn:
            alerts = detect_anomalies(conn, top_n_entities=top_n)
            persist_alerts(alerts, conn)
        conn.close()
    except Exception as exc:
        logger.error("Error en enr_detect_anomalies: %s", exc)

    logger.info("enr_detect_anomalies: %d alertas", len(alerts))
    return alerts


# ---------------------------------------------------------------------------
# Tarea 4: Generacion de briefings automaticos
# ---------------------------------------------------------------------------

@task(name="enr_generate_briefings", retries=1)
def enr_generate_briefings(
    active_qids: list[str],
    alerts: list[AnomalyAlert],
    periodo: str = "24h",
) -> list[ClientBriefing]:
    """Genera un briefing automatico con las entidades mas activas."""
    logger = get_run_logger() if _PREFECT else log
    briefings: list[ClientBriefing] = []

    if not active_qids:
        return briefings

    # Briefing global: top 10 entidades
    top10 = active_qids[:10]
    try:
        conn = _get_conn()
        with conn:
            briefing = generate_briefing(
                titulo=f"Briefing Automatico — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
                entity_qids=top10,
                periodo=periodo,
                alerts=alerts,
                conn=conn,
            )
            briefings.append(briefing)

            # Persistir en BD
            _persist_briefing(briefing, conn)
        conn.close()
    except Exception as exc:
        logger.error("Error generando briefing automatico: %s", exc)

    logger.info("enr_generate_briefings: %d briefings generados", len(briefings))
    return briefings


def _persist_briefing(briefing: ClientBriefing, conn) -> None:
    """Guarda el briefing en client_briefings (si existe la tabla)."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS client_briefings (
                    id              BIGSERIAL PRIMARY KEY,
                    briefing_id     VARCHAR(20) UNIQUE,
                    titulo          TEXT,
                    entidades_qids  JSONB,
                    periodo         VARCHAR(10),
                    contenido_md    TEXT,
                    resumen_ejecutivo TEXT,
                    alertas_incluidas JSONB,
                    generated_at    TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                INSERT INTO client_briefings
                    (briefing_id, titulo, entidades_qids, periodo,
                     contenido_md, resumen_ejecutivo, alertas_incluidas)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (briefing_id) DO NOTHING
                """,
                (
                    briefing.briefing_id,
                    briefing.titulo,
                    json.dumps(briefing.entidades_qids),
                    briefing.periodo,
                    briefing.contenido_md,
                    briefing.resumen_ejecutivo,
                    json.dumps(briefing.alertas_incluidas),
                ),
            )
    except Exception as exc:
        log.warning("Error persistiendo briefing: %s", exc)


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(
    name="enrichment_flow",
    description="Bloque 3: Enriquece entidades, construye grafo y genera briefings",
)
def enrichment_flow(
    top_entities: int = _TOP_ENTITIES,
    lookback_hours: int = _LOOKBACK_HOURS,
    periodo: str = "24h",
) -> dict[str, Any]:
    logger = get_run_logger() if _PREFECT else log
    logger.info("enrichment_flow iniciado")

    stats: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "entities_enriched": 0,
        "graph_edges": 0,
        "anomalies_detected": 0,
        "briefings_generated": 0,
    }

    # Paso 1: enriquecimiento
    active_qids = enr_enrich_active_entities(top_n=top_entities)
    stats["entities_enriched"] = len(active_qids)

    # Paso 2: grafo (puede correr en paralelo con Prefect, aqui es secuencial)
    graph_stats = enr_build_power_graph(lookback_hours=lookback_hours)
    stats["graph_edges"] = graph_stats.get("edges_merged", 0)

    # Paso 3: anomalias
    alerts = enr_detect_anomalies(top_n=top_entities)
    stats["anomalies_detected"] = len(alerts)

    # Paso 4: briefings
    briefings = enr_generate_briefings(
        active_qids=active_qids, alerts=alerts, periodo=periodo
    )
    stats["briefings_generated"] = len(briefings)

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    logger.info("enrichment_flow completado: %s", stats)
    return stats


def run_enrichment(
    top_entities: int = _TOP_ENTITIES,
    lookback_hours: int = _LOOKBACK_HOURS,
    periodo: str = "24h",
) -> dict[str, Any]:
    """Punto de entrada sin Prefect."""
    if _PREFECT:
        return enrichment_flow(
            top_entities=top_entities,
            lookback_hours=lookback_hours,
            periodo=periodo,
        )
    stats: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "entities_enriched": 0,
        "graph_edges": 0,
        "anomalies_detected": 0,
        "briefings_generated": 0,
    }
    active_qids = enr_enrich_active_entities(top_n=top_entities)
    stats["entities_enriched"] = len(active_qids)
    gs = enr_build_power_graph(lookback_hours=lookback_hours)
    stats["graph_edges"] = gs.get("edges_merged", 0)
    alerts = enr_detect_anomalies(top_n=top_entities)
    stats["anomalies_detected"] = len(alerts)
    briefings = enr_generate_briefings(active_qids=active_qids, alerts=alerts, periodo=periodo)
    stats["briefings_generated"] = len(briefings)
    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    return stats


if __name__ == "__main__":
    import json as _json
    print(_json.dumps(run_enrichment(), indent=2, default=str))
