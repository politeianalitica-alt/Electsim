"""
Runner del pipeline event-driven.

Orquesta los 9 pasos para un IngestionEvent y retorna un PipelineResult completo.
Puede ejecutarse de forma sincrona (para Celery workers) o asincrona.

Uso minimo:
    from etl.pipeline.runner import run_pipeline_for_event
    result = run_pipeline_for_event(event)
"""
from __future__ import annotations

import logging
import traceback
from typing import Any, Optional

from etl.pipeline.models import (
    IngestionEvent,
    NLPAnnotations,
    NormalizedDocument,
    PipelineResult,
)
from etl.pipeline import steps as _steps

logger = logging.getLogger(__name__)


def _build_normalized(event: IngestionEvent) -> NormalizedDocument:
    """Construye NormalizedDocument desde IngestionEvent."""
    payload = event.payload
    return NormalizedDocument(
        market_code=event.market_code,
        source_id=event.source_id,
        external_id=str(payload.get("id") or payload.get("url") or payload.get("external_id", "")),
        url=payload.get("url") or payload.get("link"),
        title=payload.get("title") or payload.get("titulo"),
        raw_text=payload.get("content") or payload.get("raw_text") or payload.get("texto") or "",
        published_at=payload.get("published_at") or payload.get("fecha_publicacion"),
        metadata={k: v for k, v in payload.items() if k not in (
            "id", "url", "link", "title", "titulo", "content", "raw_text", "texto",
            "published_at", "fecha_publicacion",
        )},
    )


def run_pipeline_for_event(
    event: IngestionEvent,
    session: Optional[Any] = None,
    entity_watchlist: Optional[set[str]] = None,
    topic_watchlist: Optional[set[str]] = None,
    client_id: int = 0,
    skip_steps: Optional[list[str]] = None,
) -> PipelineResult:
    """
    Ejecuta el pipeline completo para un IngestionEvent.

    Args:
        event:             Evento de ingesta crudo.
        session:           SQLAlchemy Session para resolucion de entidades en ontologia.
                           Si es None, resolve_entities se omite sin error.
        entity_watchlist:  Conjunto de nombres de entidad a vigilar.
        topic_watchlist:   Conjunto de topicos IPTC a vigilar.
        client_id:         ID del cliente para las alertas.
        skip_steps:        Lista de nombres de paso a omitir (p.ej. ["compute_embedding"]).

    Retorna:
        PipelineResult completo (con errors[] si alguno fallo).
    """
    skip = set(skip_steps or [])

    # Inicializacion
    normalized = _build_normalized(event)
    result = PipelineResult(
        normalized=normalized,
        nlp=NLPAnnotations(),
    )

    # -----------------------------------------------------------------------
    # Paso 1: Deduplicacion
    # -----------------------------------------------------------------------
    if "deduplicate" not in skip:
        try:
            result, is_dup = _steps.deduplicate(result)
            if is_dup:
                logger.debug(
                    "Pipeline: item duplicado ignorado [%s/%s/%s]",
                    event.market_code, event.source_id,
                    normalized.external_id,
                )
                result.steps_completed.append("__skipped_duplicate__")
                return result
        except Exception as exc:
            result.errors.append(f"deduplicate: {exc}")
            logger.warning("deduplicate error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 2: Extraccion de texto
    # -----------------------------------------------------------------------
    if "extract_text" not in skip:
        try:
            result = _steps.extract_text(result)
        except Exception as exc:
            result.errors.append(f"extract_text: {exc}")
            logger.warning("extract_text error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 3: NER
    # -----------------------------------------------------------------------
    if "annotate_ner" not in skip:
        try:
            result = _steps.annotate_ner(result)
        except Exception as exc:
            result.errors.append(f"annotate_ner: {exc}")
            logger.warning("annotate_ner error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 4: Resolucion de entidades en la ontologia
    # -----------------------------------------------------------------------
    if "resolve_entities" not in skip:
        try:
            result = _steps.resolve_entities(result, session=session)
        except Exception as exc:
            result.errors.append(f"resolve_entities: {exc}")
            logger.warning("resolve_entities error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 5: Clasificacion de topicos
    # -----------------------------------------------------------------------
    if "classify_topics" not in skip:
        try:
            result = _steps.classify_topics(result)
        except Exception as exc:
            result.errors.append(f"classify_topics: {exc}")
            logger.warning("classify_topics error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 6: Sentimiento
    # -----------------------------------------------------------------------
    if "compute_sentiment" not in skip:
        try:
            result = _steps.compute_sentiment(result)
        except Exception as exc:
            result.errors.append(f"compute_sentiment: {exc}")
            logger.warning("compute_sentiment error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 7: Embedding
    # -----------------------------------------------------------------------
    if "compute_embedding" not in skip:
        try:
            result = _steps.compute_embedding(result)
        except Exception as exc:
            result.errors.append(f"compute_embedding: {exc}")
            logger.warning("compute_embedding error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 8: Cluster update
    # -----------------------------------------------------------------------
    if "update_cluster" not in skip:
        try:
            result = _steps.update_cluster(result)
        except Exception as exc:
            result.errors.append(f"update_cluster: {exc}")
            logger.warning("update_cluster error: %s", exc)

    # -----------------------------------------------------------------------
    # Paso 9: Evaluacion de alertas
    # -----------------------------------------------------------------------
    if "evaluate_alerts" not in skip:
        try:
            result = _steps.evaluate_alerts(
                result,
                entity_watchlist=entity_watchlist,
                topic_watchlist=topic_watchlist,
                client_id=client_id,
            )
        except Exception as exc:
            result.errors.append(f"evaluate_alerts: {exc}")
            logger.warning("evaluate_alerts error: %s", exc)

    logger.info(
        "Pipeline completado [%s/%s] pasos=%s errores=%d",
        event.market_code, event.source_id,
        result.steps_completed,
        len(result.errors),
    )
    return result


async def run_pipeline_for_event_async(
    event: IngestionEvent,
    session: Optional[Any] = None,
    **kwargs: Any,
) -> PipelineResult:
    """
    Version asincrona del runner.

    Igual que run_pipeline_for_event pero usa embed_text_async para los embeddings.
    El resto de pasos son CPU-bound y se ejecutan de forma sincrona.
    """
    import asyncio

    # Ejecuta los primeros 6 pasos sincronos en thread pool
    skip = set(kwargs.get("skip_steps") or [])
    skip.add("compute_embedding")  # lo haremos async manualmente

    result = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: run_pipeline_for_event(event, session=session, skip_steps=list(skip), **{
            k: v for k, v in kwargs.items() if k != "skip_steps"
        }),
    )

    # Comprobar si fue un duplicado
    if "__skipped_duplicate__" in result.steps_completed:
        return result

    # Paso 7 async: embedding
    if "compute_embedding" not in (kwargs.get("skip_steps") or []):
        try:
            from etl.nlp.embedding import embed_text_async
            from etl.pipeline.models import VectorInfo
            text = result.normalized.raw_text
            if text:
                vector_info = await embed_text_async(text)
                if vector_info:
                    result.vector = VectorInfo(
                        embedding=vector_info["embedding"],
                        dim=vector_info["dim"],
                        model_name=vector_info["model_name"],
                    )
                    result.steps_completed.append("compute_embedding")
        except Exception as exc:
            result.errors.append(f"compute_embedding_async: {exc}")
            logger.warning("compute_embedding_async error: %s", exc)

    return result
