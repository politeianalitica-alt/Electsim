"""
Event Bus para la Intelligence Layer.

El ETL publica eventos en un Redis Stream cuando termina de procesar
un item relevante. Los workers de intelligence consumen estos eventos
y disparan los servicios apropiados.

Stream: electsim:intelligence:events
Grupos de consumo:
  narrative-workers  — NarrativeTracker.label_cluster
  impact-workers     — ImpactAssessor.assess
  risk-workers       — RiskScorer.score_client

Tambien expone funciones sync compatibles con Celery:
  publish_event()       — publica en el stream (desde ETL worker)
  consume_events()      — lee hasta max_count eventos (dentro de Celery task)

Sin emojis.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from services.intelligence.models import IntelligenceEvent

logger = logging.getLogger(__name__)

_STREAM_KEY = "electsim:intelligence:events"
_CONSUMER_GROUPS = {
    "narrative": "narrative-workers",
    "impact":    "impact-workers",
    "risk":      "risk-workers",
}
_MAX_LEN = 10_000   # maxlen del stream (MAXLEN ~ con trim automatico)
_ACK_TIMEOUT_MS = 60_000   # timeout para reclamar mensajes pendientes


# ---------------------------------------------------------------------------
# Conexion Redis lazy
# ---------------------------------------------------------------------------

def _get_redis():
    """Retorna cliente Redis sincrono (redis-py)."""
    try:
        import redis
        from config.settings import get_settings
        return redis.from_url(get_settings().redis_url, decode_responses=True)
    except ImportError:
        return None
    except Exception as exc:
        logger.debug("Redis no disponible: %s", exc)
        return None


async def _get_redis_async():
    """Retorna cliente Redis asincrono (redis.asyncio)."""
    try:
        from redis.asyncio import from_url
        from config.settings import get_settings
        return await from_url(get_settings().redis_url, decode_responses=True)
    except ImportError:
        return None
    except Exception as exc:
        logger.debug("Redis async no disponible: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Inicializacion de grupos de consumo
# ---------------------------------------------------------------------------

def ensure_consumer_groups() -> None:
    """
    Crea los grupos de consumo en el stream si no existen.
    Se llama al arrancar el worker de intelligence.
    """
    r = _get_redis()
    if r is None:
        return
    for group_name in _CONSUMER_GROUPS.values():
        try:
            r.xgroup_create(_STREAM_KEY, group_name, id="0", mkstream=True)
            logger.info("Grupo de consumo '%s' creado en stream '%s'", group_name, _STREAM_KEY)
        except Exception as exc:
            # BUSYGROUP si ya existe; ignorar
            if "BUSYGROUP" not in str(exc):
                logger.debug("ensure_consumer_groups %s: %s", group_name, exc)


# ---------------------------------------------------------------------------
# Publicacion (sync, desde ETL workers Celery)
# ---------------------------------------------------------------------------

def publish_event(event: IntelligenceEvent) -> bool:
    """
    Publica un IntelligenceEvent en el stream Redis.

    Retorna True si se publico con exito, False si Redis no esta disponible.
    El ETL no falla si la publicacion falla (best-effort).
    """
    r = _get_redis()
    if r is None:
        logger.debug("publish_event: Redis no disponible — evento descartado")
        return False

    try:
        payload = {
            "market_code":         event.market_code,
            "object_type":         event.object_type,
            "ontology_object_id":  event.ontology_object_id,
            "event_type":          event.event_type,
            "source_id":           event.source_id,
            "metadata":            json.dumps(event.metadata, ensure_ascii=False),
            "published_at":        event.published_at.isoformat(),
        }
        r.xadd(_STREAM_KEY, payload, maxlen=_MAX_LEN, approximate=True)
        return True
    except Exception as exc:
        logger.warning("publish_event: %s", exc)
        return False


def publish_from_pipeline_result(
    market_code: str,
    source_id: str,
    ontology_object_id: str,
    event_type: str,
    object_type: str = "article",
    metadata: dict | None = None,
) -> bool:
    """Helper para publicar desde el runner del pipeline."""
    event = IntelligenceEvent(
        market_code=market_code,
        source_id=source_id,
        ontology_object_id=ontology_object_id,
        event_type=event_type,
        object_type=object_type,
        metadata=metadata or {},
    )
    return publish_event(event)


# ---------------------------------------------------------------------------
# Consumo (sync, dentro de Celery tasks)
# ---------------------------------------------------------------------------

def consume_events(
    group: str,
    consumer_name: str,
    max_count: int = 10,
    block_ms: int = 1000,
) -> list[IntelligenceEvent]:
    """
    Lee hasta max_count eventos del stream para el grupo indicado.

    group: clave de _CONSUMER_GROUPS ('narrative', 'impact', 'risk')
    consumer_name: nombre unico del worker (p.ej. 'worker-intel-1')
    """
    r = _get_redis()
    if r is None:
        return []

    group_name = _CONSUMER_GROUPS.get(group, group)
    events: list[IntelligenceEvent] = []

    try:
        messages = r.xreadgroup(
            groupname=group_name,
            consumername=consumer_name,
            streams={_STREAM_KEY: ">"},
            count=max_count,
            block=block_ms,
        )
        if not messages:
            return []

        for stream_key, stream_messages in messages:
            for msg_id, fields in stream_messages:
                try:
                    metadata = json.loads(fields.get("metadata", "{}"))
                    event = IntelligenceEvent(
                        market_code=fields.get("market_code", ""),
                        object_type=fields.get("object_type", ""),
                        ontology_object_id=fields.get("ontology_object_id", ""),
                        event_type=fields.get("event_type", ""),
                        source_id=fields.get("source_id", ""),
                        metadata=metadata,
                    )
                    events.append(event)
                    # Acknowledge inmediatamente (at-least-once)
                    r.xack(_STREAM_KEY, group_name, msg_id)
                except Exception as exc:
                    logger.warning("consume_events: parse error msg %s: %s", msg_id, exc)
    except Exception as exc:
        logger.debug("consume_events: %s", exc)

    return events


def ack_event(group: str, msg_id: str) -> None:
    """Reconoce manualmente un mensaje (para procesamiento en dos pasos)."""
    r = _get_redis()
    if r is None:
        return
    group_name = _CONSUMER_GROUPS.get(group, group)
    try:
        r.xack(_STREAM_KEY, group_name, msg_id)
    except Exception as exc:
        logger.debug("ack_event: %s", exc)


# ---------------------------------------------------------------------------
# Metricas del stream
# ---------------------------------------------------------------------------

def stream_info() -> dict[str, Any]:
    """Retorna estadisticas del stream (para monitoreo)."""
    r = _get_redis()
    if r is None:
        return {"available": False}

    try:
        info = r.xinfo_stream(_STREAM_KEY)
        groups = r.xinfo_groups(_STREAM_KEY)
        return {
            "available": True,
            "stream_key": _STREAM_KEY,
            "length": info.get("length", 0),
            "groups": [
                {
                    "name": g.get("name"),
                    "pending": g.get("pending", 0),
                    "last_delivered_id": g.get("last-delivered-id"),
                }
                for g in groups
            ],
        }
    except Exception as exc:
        return {"available": False, "error": str(exc)}
