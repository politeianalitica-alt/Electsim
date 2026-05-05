"""
Data Classification — Bloque 13.

Sistema de clasificación de datos por nivel de sensibilidad.
Integrado con detección de PII para clasificación automática.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from security.settings import settings
from security.schemas import DataClassificationLevel

logger = logging.getLogger(__name__)

# Cache en memoria
_CLASSIFICATION_CACHE: dict[str, dict[str, Any]] = {}

# Niveles y sus propiedades
CLASSIFICATION_LEVELS = {
    DataClassificationLevel.PUBLIC: {
        "label": "Público",
        "color": "#22c55e",
        "icon": "🌐",
        "description": "Datos accesibles públicamente",
        "retention_days": None,
        "export_allowed": True,
        "require_approval": False,
    },
    DataClassificationLevel.INTERNAL: {
        "label": "Interno",
        "color": "#3b82f6",
        "icon": "🏢",
        "description": "Uso interno de la organización",
        "retention_days": 365 * 3,
        "export_allowed": True,
        "require_approval": False,
    },
    DataClassificationLevel.CLIENT_CONFIDENTIAL: {
        "label": "Confidencial Cliente",
        "color": "#f59e0b",
        "icon": "🔒",
        "description": "Datos confidenciales del cliente",
        "retention_days": 365 * 5,
        "export_allowed": True,
        "require_approval": True,
    },
    DataClassificationLevel.SENSITIVE: {
        "label": "Sensible",
        "color": "#f97316",
        "icon": "⚠️",
        "description": "Datos sensibles (personales, estratégicos)",
        "retention_days": 365 * 7,
        "export_allowed": True,
        "require_approval": True,
    },
    DataClassificationLevel.RESTRICTED: {
        "label": "Restringido",
        "color": "#ef4444",
        "icon": "🔴",
        "description": "Datos con acceso mínimo requerido",
        "retention_days": 365 * 10,
        "export_allowed": False,
        "require_approval": True,
    },
}


def classify_resource(
    resource_type: str,
    resource_id: str,
    level: DataClassificationLevel,
    classified_by: str | None = None,
    rationale: str = "",
    pii_detected: bool = False,
    pii_types: list[str] | None = None,
) -> dict[str, Any]:
    """
    Clasifica un recurso con un nivel de sensibilidad.

    Returns el registro de clasificación.
    """
    classification_id = str(uuid.uuid4())
    record = {
        "id": classification_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "level": level.value,
        "classified_by": classified_by,
        "rationale": rationale,
        "pii_detected": pii_detected,
        "pii_types": pii_types or [],
        "retention_days": CLASSIFICATION_LEVELS[level].get("retention_days"),
    }

    cache_key = f"{resource_type}:{resource_id}"
    _CLASSIFICATION_CACHE[cache_key] = record

    _save_classification(record)
    return record


def get_classification(resource_type: str, resource_id: str) -> dict[str, Any] | None:
    """Obtiene la clasificación de un recurso."""
    cache_key = f"{resource_type}:{resource_id}"
    if cache_key in _CLASSIFICATION_CACHE:
        return _CLASSIFICATION_CACHE[cache_key]

    return _load_classification(resource_type, resource_id)


def get_effective_level(resource_type: str, resource_id: str) -> DataClassificationLevel:
    """
    Devuelve el nivel efectivo de un recurso.

    Si no hay clasificación, devuelve INTERNAL por defecto.
    """
    record = get_classification(resource_type, resource_id)
    if record:
        try:
            return DataClassificationLevel(record["level"])
        except ValueError:
            pass
    return DataClassificationLevel.INTERNAL


def can_export(
    resource_type: str,
    resource_id: str,
    user_roles: list[str] | None = None,
) -> tuple[bool, bool]:
    """
    Verifica si un recurso puede exportarse.

    Returns:
        (allowed, requires_approval)
    """
    level = get_effective_level(resource_type, resource_id)
    level_info = CLASSIFICATION_LEVELS[level]

    if not level_info["export_allowed"]:
        # RESTRICTED — no exportable sin override
        if user_roles and "super_admin" in user_roles:
            return True, True
        return False, False

    return True, level_info["require_approval"]


def get_level_info(level: DataClassificationLevel | str) -> dict[str, Any]:
    """Devuelve metadatos de un nivel de clasificación."""
    if isinstance(level, str):
        try:
            level = DataClassificationLevel(level)
        except ValueError:
            return {
                "label": level,
                "color": "#6b7280",
                "icon": "❓",
                "description": "",
            }
    return CLASSIFICATION_LEVELS.get(level, {})


def list_classifications(
    resource_type: str | None = None,
    level: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Lista clasificaciones con filtros opcionales."""
    records = _load_all_classifications(resource_type=resource_type, level=level, limit=limit)
    if not records:
        # Devolver cache
        cached = list(_CLASSIFICATION_CACHE.values())
        if resource_type:
            cached = [r for r in cached if r.get("resource_type") == resource_type]
        if level:
            cached = [r for r in cached if r.get("level") == level]
        return cached[:limit]
    return records


def auto_classify_text(text: str) -> DataClassificationLevel:
    """
    Clasifica automáticamente texto basándose en su contenido.

    Heurística simple — para PII más sofisticado usar pii.py.
    """
    from security.pii import detect_pii
    pii_result = detect_pii(text)
    if pii_result.get("has_pii"):
        pii_types = pii_result.get("types", [])
        if "dni" in pii_types or "passport" in pii_types:
            return DataClassificationLevel.SENSITIVE
        return DataClassificationLevel.CLIENT_CONFIDENTIAL

    text_lower = text.lower()
    sensitive_keywords = ["secreto", "confidencial", "reservado", "clasificado", "restringido"]
    if any(kw in text_lower for kw in sensitive_keywords):
        return DataClassificationLevel.CLIENT_CONFIDENTIAL

    return DataClassificationLevel.INTERNAL


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _save_classification(record: dict[str, Any]) -> bool:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO data_classifications "
            "(id, resource_type, resource_id, level, classified_by, rationale, "
            "pii_detected, pii_types, retention_days) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (resource_type, resource_id) DO UPDATE SET "
            "level = EXCLUDED.level, classified_by = EXCLUDED.classified_by, "
            "rationale = EXCLUDED.rationale, pii_detected = EXCLUDED.pii_detected",
            (
                record["id"], record["resource_type"], record["resource_id"],
                record["level"], record.get("classified_by"), record.get("rationale", ""),
                record.get("pii_detected", False),
                json.dumps(record.get("pii_types", [])),
                record.get("retention_days"),
            ),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("_save_classification: %s", exc)
        return False


def _load_classification(resource_type: str, resource_id: str) -> dict[str, Any] | None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, resource_type, resource_id, level, classified_by, "
            "rationale, pii_detected, pii_types, retention_days "
            "FROM data_classifications "
            "WHERE resource_type = %s AND resource_id = %s LIMIT 1",
            (resource_type, resource_id),
        )
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        return dict(zip(cols, row))
    except Exception as exc:
        logger.debug("_load_classification: %s", exc)
        return None


def _load_all_classifications(
    resource_type: str | None = None,
    level: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return []
        where_clauses = []
        params: list[Any] = []
        if resource_type:
            where_clauses.append("resource_type = %s")
            params.append(resource_type)
        if level:
            where_clauses.append("level = %s")
            params.append(level)
        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        params.append(limit)
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, resource_type, resource_id, level, classified_by, "
            f"pii_detected, pii_types, retention_days "
            f"FROM data_classifications {where_sql} "
            f"ORDER BY created_at DESC LIMIT %s",
            params,
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as exc:
        logger.debug("_load_all_classifications: %s", exc)
        return []
