"""
Publication Queue — Bloque 16.

Cola manual de publicación — no publica automáticamente.
requires_manual_publish=True por defecto en todos los trabajos.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from communications.schemas import PublicationJob

logger = logging.getLogger(__name__)

_QUEUE: dict[str, PublicationJob] = {}


def queue_publication(
    content_asset_id: str,
    channel_id: str,
    scheduled_at: datetime | None = None,
    tenant_id: str = "default",
) -> PublicationJob:
    """Añade un contenido a la cola de publicación (manual)."""
    # Verificar aprobación previa
    from communications.message_studio import get_asset
    asset = get_asset(content_asset_id)
    if asset and asset.status not in ("approved", "scheduled"):
        status = "requires_approval"
    else:
        status = "queued"

    job = PublicationJob(
        content_asset_id=content_asset_id,
        channel_id=channel_id,
        scheduled_at=scheduled_at,
        status=status,
        requires_manual_publish=True,
        tenant_id=tenant_id,
    )
    _QUEUE[job.publication_id] = job
    _persist_job(job)
    return job


def mark_as_published(
    publication_id: str,
    external_url: str | None = None,
    external_post_id: str | None = None,
) -> None:
    """Registra la publicación manual realizada externamente por el usuario."""
    job = _QUEUE.get(publication_id)
    if job is None:
        return
    updated = job.model_copy(update={
        "status": "published",
        "published_at": datetime.utcnow(),
        "external_url": external_url,
        "external_post_id": external_post_id,
    })
    _QUEUE[publication_id] = updated
    _persist_job(updated)
    # Actualizar estado del asset
    try:
        from communications.content_assets import update_asset_status
        update_asset_status(job.content_asset_id, "published")
    except Exception:
        pass


def mark_failed(publication_id: str, error_message: str) -> None:
    job = _QUEUE.get(publication_id)
    if job is None:
        return
    updated = job.model_copy(update={"status": "failed", "error_message": error_message})
    _QUEUE[publication_id] = updated
    _persist_job(updated)


def cancel_publication(publication_id: str) -> None:
    job = _QUEUE.get(publication_id)
    if job is None:
        return
    updated = job.model_copy(update={"status": "cancelled"})
    _QUEUE[publication_id] = updated
    _persist_job(updated)


def get_publication_queue(
    status: str | None = None,
    tenant_id: str = "default",
) -> list[PublicationJob]:
    results = [j for j in _QUEUE.values() if j.tenant_id == tenant_id]
    if status:
        results = [j for j in results if j.status == status]
    return sorted(results, key=lambda j: j.created_at, reverse=True)


def _persist_job(job: PublicationJob) -> None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO publication_jobs
                   (publication_id, content_asset_id, channel_id, scheduled_at,
                    published_at, status, external_post_id, external_url,
                    requires_manual_publish, error_message, tenant_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (publication_id) DO UPDATE SET
                   status=EXCLUDED.status, published_at=EXCLUDED.published_at,
                   external_url=EXCLUDED.external_url, error_message=EXCLUDED.error_message""",
                (job.publication_id, job.content_asset_id, job.channel_id,
                 job.scheduled_at, job.published_at, job.status,
                 job.external_post_id, job.external_url, job.requires_manual_publish,
                 job.error_message, job.tenant_id),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_job: %s", exc)
