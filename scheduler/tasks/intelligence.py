"""
Tareas Celery para la Intelligence Layer (Bloque 4).
Cola: intelligence — concurrencia 1 (misma GPU que ollama).

Tareas:
  task_morning_briefing         — briefing diario por cliente (cron 06:30 UTC)
  task_score_all_clients        — risk scores de todos los clientes (cron 06:00 UTC)
  task_label_narrative_cluster  — etiqueta un cluster nuevo (disparado por evento)
  task_assess_impact            — evalua impacto de un objeto sobre un cliente
  task_consume_intelligence_events — consume Redis Stream y despacha tareas
"""
from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


# ---------------------------------------------------------------------------
# Helper async -> sync
# ---------------------------------------------------------------------------

def _run(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("loop cerrado")
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Factoria de servicios
# ---------------------------------------------------------------------------

def _make_services(with_session: bool = True):
    """
    Construye los servicios de intelligence con sus dependencias.
    Retorna (llm, ontology_repo, session) — session puede ser None.
    """
    from services.llm_client import get_llm_client
    llm = get_llm_client()

    session = None
    ontology_repo = None

    if with_session:
        try:
            from db.session import get_sync_session
            session = get_sync_session()
            from api.ontology.repository import OntologyGraphRepository
            ontology_repo = OntologyGraphRepository(session)
        except Exception as exc:
            logger.warning("No se pudo crear sesion DB para intelligence: %s", exc)

    return llm, ontology_repo, session


# ---------------------------------------------------------------------------
# Briefing matutino
# ---------------------------------------------------------------------------

@shared_task(
    name="intelligence.task_morning_briefing",
    queue="intelligence",
    max_retries=2,
    default_retry_delay=300,
    soft_time_limit=600,
    time_limit=700,
)
def task_morning_briefing(
    client_id: str,
    market_code: str = "spain",
    date_iso: str | None = None,
) -> dict:
    """
    Genera el briefing matutino para un cliente.

    Args:
        client_id:    ID del cliente.
        market_code:  Codigo de mercado (default: spain).
        date_iso:     Fecha ISO YYYY-MM-DD (default: hoy UTC).
    """
    from services.intelligence.briefing_engine import BriefingEngine

    llm, ontology_repo, session = _make_services()

    target_date = (
        datetime.fromisoformat(date_iso).replace(tzinfo=timezone.utc)
        if date_iso
        else datetime.now(timezone.utc)
    )

    engine = BriefingEngine(llm=llm, ontology_repo=ontology_repo, db_session=session)

    try:
        briefing = _run(engine.generate_morning_briefing(
            client_id=client_id,
            market_code=market_code,
            target_date=target_date,
        ))
        logger.info(
            "Briefing generado [cliente=%s fecha=%s secciones=%d]",
            client_id, briefing.date, len(briefing.sections),
        )
        return briefing.model_dump(mode="json")
    except Exception as exc:
        logger.error("task_morning_briefing [%s] error: %s", client_id, exc)
        raise
    finally:
        if session:
            session.close()


# ---------------------------------------------------------------------------
# Risk scoring de todos los clientes
# ---------------------------------------------------------------------------

@shared_task(
    name="intelligence.task_score_all_clients",
    queue="intelligence",
    max_retries=1,
    soft_time_limit=900,
    time_limit=1000,
)
def task_score_all_clients(market_code: str = "spain") -> dict:
    """
    Calcula el risk score para todos los clientes activos de un mercado.
    Se ejecuta diariamente a las 06:00 UTC via Celery Beat.
    """
    from services.intelligence.risk_scorer import RiskScorer

    llm, ontology_repo, session = _make_services()
    results: dict[str, dict] = {}

    try:
        client_ids = _fetch_active_client_ids(session, market_code)
        logger.info("Calculando risk scores para %d clientes [%s]", len(client_ids), market_code)

        scorer = RiskScorer(llm=llm, ontology_repo=ontology_repo, db_session=session)

        for cid in client_ids:
            try:
                score = _run(scorer.score_client(
                    client_id=cid,
                    market_code=market_code,
                    include_narrative=False,   # sin LLM para no saturar GPU
                ))
                results[cid] = {"risk_index": score.risk_index, "ok": True}
                logger.info("Risk score [%s]: %.1f", cid, score.risk_index)
            except Exception as exc:
                logger.warning("score_client [%s] error: %s", cid, exc)
                results[cid] = {"ok": False, "error": str(exc)}

    finally:
        if session:
            session.close()

    return {"market_code": market_code, "clients": results}


# ---------------------------------------------------------------------------
# Etiquetado de cluster narrativo
# ---------------------------------------------------------------------------

@shared_task(
    name="intelligence.task_label_narrative_cluster",
    queue="intelligence",
    max_retries=2,
    default_retry_delay=60,
    soft_time_limit=300,
    time_limit=360,
)
def task_label_narrative_cluster(cluster_id: str) -> dict:
    """
    Etiqueta un cluster de narrativas con IA.
    Se dispara cuando el ETL detecta un nuevo cluster o uno actualizado.
    """
    from services.intelligence.narrative_tracker import NarrativeTracker

    llm, ontology_repo, session = _make_services()
    tracker = NarrativeTracker(llm=llm, ontology_repo=ontology_repo, db_session=session)

    try:
        label = _run(tracker.label_cluster(cluster_id))
        logger.info(
            "Cluster %s etiquetado: '%s' [%s]",
            cluster_id, label.label, label.threat_level,
        )
        return label.model_dump(mode="json")
    except Exception as exc:
        logger.error("task_label_narrative_cluster [%s] error: %s", cluster_id, exc)
        raise
    finally:
        if session:
            session.close()


# ---------------------------------------------------------------------------
# Evaluacion de impacto
# ---------------------------------------------------------------------------

@shared_task(
    name="intelligence.task_assess_impact",
    queue="intelligence",
    max_retries=2,
    default_retry_delay=60,
    soft_time_limit=300,
    time_limit=360,
)
def task_assess_impact(
    client_id: str,
    object_type: str,
    object_id: str,
) -> dict:
    """
    Evalua el impacto de un objeto (norma, narrativa, evento) sobre un cliente.
    Se dispara desde el event bus cuando llega un evento relevante.
    """
    from services.intelligence.impact_assessor import ImpactAssessor

    llm, ontology_repo, session = _make_services()
    assessor = ImpactAssessor(llm=llm, ontology_repo=ontology_repo, db_session=session)

    try:
        assessment = _run(assessor.assess(
            client_id=client_id,
            object_type=object_type,
            object_id=object_id,
        ))
        logger.info(
            "Impacto evaluado [cliente=%s objeto=%s/%s]: score=%.2f",
            client_id, object_type, object_id, assessment.impact_score,
        )
        return assessment.model_dump(mode="json")
    except Exception as exc:
        logger.error("task_assess_impact error: %s", exc)
        raise
    finally:
        if session:
            session.close()


# ---------------------------------------------------------------------------
# Consumidor del event bus (Redis Streams)
# ---------------------------------------------------------------------------

@shared_task(
    name="intelligence.task_consume_intelligence_events",
    queue="intelligence",
    max_retries=0,        # no reintentar el loop de consumo
    soft_time_limit=120,
    time_limit=150,
)
def task_consume_intelligence_events(max_events: int = 20) -> dict:
    """
    Consume hasta max_events eventos del Redis Stream y despacha las
    tareas apropiadas segun el event_type.

    Mapeado:
      new_cluster           -> task_label_narrative_cluster
      new_norm              -> task_assess_impact (para cada cliente activo)
      critical_alert        -> task_morning_briefing (on-demand)
    """
    from services.intelligence.event_bus import consume_events

    import socket
    consumer_name = f"worker-{socket.gethostname()}"

    events = consume_events(
        group="narrative",
        consumer_name=consumer_name,
        max_count=max_events,
    )

    dispatched = {"narrative": 0, "impact": 0, "briefing": 0, "ignored": 0}

    _, _, session = _make_services(with_session=True)
    try:
        client_ids = _fetch_active_client_ids(session, "") if session else []
    finally:
        if session:
            session.close()

    for event in events:
        etype = event.event_type

        if etype == "new_cluster":
            cluster_id = event.ontology_object_id or event.metadata.get("cluster_id", "")
            if cluster_id:
                task_label_narrative_cluster.delay(cluster_id)
                dispatched["narrative"] += 1

        elif etype in ("new_norm", "legislation"):
            for cid in client_ids[:10]:  # limitamos a 10 clientes por evento
                task_assess_impact.delay(cid, event.object_type, event.ontology_object_id)
            dispatched["impact"] += len(client_ids[:10])

        elif etype == "critical_alert":
            market_code = event.market_code or "spain"
            for cid in client_ids[:5]:
                task_morning_briefing.delay(cid, market_code)
            dispatched["briefing"] += len(client_ids[:5])

        else:
            dispatched["ignored"] += 1

    return {"events_consumed": len(events), "dispatched": dispatched}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_active_client_ids(session, market_code: str) -> list[str]:
    """Recupera los IDs de clientes activos del mercado."""
    if session is None:
        return []
    try:
        from sqlalchemy import text as sa_text
        query = "SELECT id::text FROM clientes WHERE activo = true"
        params: dict = {}
        if market_code:
            query += " AND market_code = :mc"
            params["mc"] = market_code
        query += " ORDER BY id LIMIT 100"
        rows = session.execute(sa_text(query), params).fetchall()
        return [str(r[0]) for r in rows]
    except Exception as exc:
        logger.debug("_fetch_active_client_ids: %s", exc)
        return []
