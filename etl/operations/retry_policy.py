"""
Retry Policy — Bloque 8.

Política de reintentos para pipelines y extractores.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Callable

logger = logging.getLogger(__name__)

from etl.operations.schemas import RetryPolicy


_DEFAULT_POLICY = RetryPolicy(
    max_retries=3,
    backoff_seconds=60,
    backoff_multiplier=2.0,
    max_backoff_seconds=3600,
)


def with_retry(
    fn: Callable,
    policy: RetryPolicy | None = None,
    pipeline_id: str | None = None,
) -> Any:
    """
    Ejecuta una función con reintentos según la política.

    Args:
        fn: Función a ejecutar (sin argumentos).
        policy: Política de reintentos (None → default).
        pipeline_id: ID del pipeline para logging.

    Returns:
        Resultado de fn() en el primer éxito.

    Raises:
        Exception: La última excepción si todos los reintentos fallan.
    """
    p = policy or _DEFAULT_POLICY
    last_exc: Exception | None = None
    delay = p.backoff_seconds

    for attempt in range(p.max_retries + 1):
        try:
            if attempt > 0:
                logger.info(
                    "retry %s attempt %d/%d after %.0fs",
                    pipeline_id or "?", attempt, p.max_retries, delay
                )
                time.sleep(delay)
                delay = min(delay * p.backoff_multiplier, p.max_backoff_seconds)

            return fn()

        except Exception as exc:
            last_exc = exc
            logger.warning(
                "retry %s attempt %d/%d failed: %s",
                pipeline_id or "?", attempt + 1, p.max_retries + 1, exc
            )

            if attempt == p.max_retries:
                break

    raise last_exc  # type: ignore


def get_policy_for_pipeline(pipeline_id: str) -> RetryPolicy:
    """Obtiene la política de retry de un pipeline."""
    try:
        from etl.operations.pipeline_registry import get_pipeline
        pipeline = get_pipeline(pipeline_id)
        if pipeline and pipeline.retry_policy:
            return RetryPolicy(**pipeline.retry_policy)
    except Exception:
        pass
    return _DEFAULT_POLICY
