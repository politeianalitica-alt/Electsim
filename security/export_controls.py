"""
Export Controls — Bloque 13.

Control de exportaciones de datos. Gestiona aprobaciones,
límites de registros y clasificación de datos exportados.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from security.settings import settings
from security.schemas import DataClassificationLevel, ExportJobStatus

logger = logging.getLogger(__name__)

# Cache de export jobs pendientes
_EXPORT_JOBS_CACHE: dict[str, dict[str, Any]] = {}


def can_export(
    user: dict[str, Any],
    module_id: str,
    export_type: str,
    record_count: int = 0,
    data_level: DataClassificationLevel = DataClassificationLevel.INTERNAL,
) -> dict[str, Any]:
    """
    Verifica si una exportación está permitida.

    Returns:
        Dict con {allowed, requires_approval, reason, max_records}.
    """
    if settings.dev_mode:
        return {
            "allowed": True,
            "requires_approval": False,
            "reason": "DEV_MODE: exportación libre",
            "max_records": settings.max_export_records,
        }

    if not settings.feature_export_controls:
        return {
            "allowed": True,
            "requires_approval": False,
            "reason": "Export controls desactivados",
            "max_records": settings.max_export_records,
        }

    # Verificar formato permitido
    if export_type not in settings.allowed_export_formats:
        return {
            "allowed": False,
            "requires_approval": False,
            "reason": f"Formato '{export_type}' no permitido. Formatos: {settings.allowed_export_formats}",
            "max_records": 0,
        }

    # Verificar límite de registros
    if record_count > settings.max_export_records:
        return {
            "allowed": False,
            "requires_approval": False,
            "reason": f"Demasiados registros ({record_count} > {settings.max_export_records})",
            "max_records": settings.max_export_records,
        }

    # Verificar clasificación de datos
    from security.data_classification import can_export as _can_export_level
    level_allowed, level_requires_approval = _can_export_level(
        "module", module_id, user.get("roles", [])
    )
    if not level_allowed:
        return {
            "allowed": False,
            "requires_approval": False,
            "reason": f"Datos clasificados como {data_level.value} no exportables",
            "max_records": 0,
        }

    # Verificar umbral de aprobación por volumen
    requires_approval = (
        level_requires_approval
        or record_count >= settings.export_require_approval_threshold
        or data_level in (DataClassificationLevel.SENSITIVE, DataClassificationLevel.RESTRICTED)
    )

    return {
        "allowed": True,
        "requires_approval": requires_approval,
        "reason": "Exportación permitida" + (" (requiere aprobación)" if requires_approval else ""),
        "max_records": settings.max_export_records,
    }


def create_export_job(
    module_id: str,
    export_type: str,
    filename: str,
    user_id: str | None = None,
    tenant_id: str | None = None,
    record_count: int | None = None,
    data_classification: DataClassificationLevel = DataClassificationLevel.INTERNAL,
    requires_approval: bool = False,
) -> dict[str, Any]:
    """
    Crea un export job.

    Returns el job creado.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    job: dict[str, Any] = {
        "id": job_id,
        "module_id": module_id,
        "export_type": export_type,
        "filename": filename,
        "user_id": user_id,
        "tenant_id": tenant_id or settings.default_tenant_id,
        "status": ExportJobStatus.PENDING.value if requires_approval else ExportJobStatus.APPROVED.value,
        "requires_approval": requires_approval,
        "approved_by": None,
        "record_count": record_count,
        "data_classification": data_classification.value,
        "created_at": now.isoformat(),
        "completed_at": None,
    }

    _EXPORT_JOBS_CACHE[job_id] = job
    _save_export_job(job)

    # Auditoría
    try:
        from security.audit import log_export
        log_export(
            user_id=user_id,
            module_id=module_id,
            export_type=export_type,
            record_count=record_count or 0,
            tenant_id=tenant_id,
        )
    except Exception:
        pass

    return job


def approve_export_job(
    job_id: str,
    approver_id: str,
) -> bool:
    """
    Aprueba un export job pendiente.

    Returns True si éxito.
    """
    job = get_export_job(job_id)
    if not job:
        return False

    if job.get("status") != ExportJobStatus.PENDING.value:
        return False

    job["status"] = ExportJobStatus.APPROVED.value
    job["approved_by"] = approver_id
    _EXPORT_JOBS_CACHE[job_id] = job
    _update_export_job_status(job_id, ExportJobStatus.APPROVED.value, approver_id)

    try:
        from security.audit import log_audit_event
        log_audit_event(
            event_type="export_job_approved",
            user_id=approver_id,
            resource_type="export_job",
            resource_id=job_id,
            action="approve_export",
            result="ok",
            details={"module_id": job.get("module_id")},
        )
    except Exception:
        pass

    return True


def get_export_job(job_id: str) -> dict[str, Any] | None:
    """Obtiene un export job por ID."""
    if job_id in _EXPORT_JOBS_CACHE:
        return _EXPORT_JOBS_CACHE[job_id]
    return _load_export_job(job_id)


def list_export_jobs(
    user_id: str | None = None,
    tenant_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista export jobs con filtros."""
    jobs = _load_export_jobs(user_id=user_id, tenant_id=tenant_id, status=status, limit=limit)
    if jobs:
        return jobs

    # Fallback cache
    cached = list(_EXPORT_JOBS_CACHE.values())
    if user_id:
        cached = [j for j in cached if j.get("user_id") == user_id]
    if tenant_id:
        cached = [j for j in cached if j.get("tenant_id") == tenant_id]
    if status:
        cached = [j for j in cached if j.get("status") == status]
    return sorted(cached, key=lambda j: j.get("created_at", ""), reverse=True)[:limit]


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _save_export_job(job: dict[str, Any]) -> bool:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO export_jobs "
            "(id, module_id, export_type, filename, user_id, tenant_id, status, "
            "requires_approval, record_count, data_classification) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                job["id"], job["module_id"], job["export_type"], job["filename"],
                job.get("user_id"), job.get("tenant_id"), job["status"],
                job.get("requires_approval", False), job.get("record_count"),
                job.get("data_classification", "internal"),
            ),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("_save_export_job: %s", exc)
        return False


def _update_export_job_status(job_id: str, status: str, approved_by: str | None = None) -> bool:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE export_jobs SET status = %s, approved_by = %s WHERE id = %s",
            (status, approved_by, job_id),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("_update_export_job_status: %s", exc)
        return False


def _load_export_job(job_id: str) -> dict[str, Any] | None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, module_id, export_type, filename, user_id, tenant_id, "
            "status, requires_approval, approved_by, record_count, data_classification, created_at "
            "FROM export_jobs WHERE id = %s",
            (job_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        return dict(zip(cols, row))
    except Exception as exc:
        logger.debug("_load_export_job: %s", exc)
        return None


def _load_export_jobs(
    user_id: str | None = None,
    tenant_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return []
        where_clauses = []
        params: list[Any] = []
        if user_id:
            where_clauses.append("user_id = %s")
            params.append(user_id)
        if tenant_id:
            where_clauses.append("tenant_id = %s")
            params.append(tenant_id)
        if status:
            where_clauses.append("status = %s")
            params.append(status)
        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        params.append(limit)
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, module_id, export_type, filename, user_id, tenant_id, "
            f"status, requires_approval, record_count, created_at "
            f"FROM export_jobs {where_sql} ORDER BY created_at DESC LIMIT %s",
            params,
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as exc:
        logger.debug("_load_export_jobs: %s", exc)
        return []
