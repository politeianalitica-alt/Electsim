"""
Cache Manager — Bloque 8.

Gestión operativa de la caché HTTP (tabla cache_http).
Reutiliza la tabla existente de BaseRealTimeScraper.
No elimina caché no expirada salvo comando explícito.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def cache_stats(engine: Any = None) -> dict:
    """
    Devuelve estadísticas de la caché HTTP.

    Returns:
        Dict con entradas_total, entradas_activas, entradas_expiradas,
        size_mb_estimate, fuentes_con_mas_cache.
    """
    eng = engine or _get_engine()
    if eng is None:
        return {"available": False, "reason": "sin engine"}

    try:
        from sqlalchemy import text as sa_text
        with eng.connect() as conn:
            # Total
            total = conn.execute(sa_text("SELECT COUNT(*) FROM cache_http")).scalar() or 0
            # Expiradas
            expired = conn.execute(sa_text("""
                SELECT COUNT(*) FROM cache_http
                WHERE expires_at IS NOT NULL AND expires_at < NOW()
            """)).scalar() or 0
            # Tamaño estimado
            size_est = conn.execute(sa_text("""
                SELECT COALESCE(SUM(LENGTH(response_body::text)) / 1024.0 / 1024.0, 0)
                FROM cache_http
            """)).scalar() or 0.0

        return {
            "available": True,
            "entries_total": total,
            "entries_active": total - expired,
            "entries_expired": expired,
            "size_mb_estimate": round(float(size_est), 2),
        }
    except Exception as exc:
        logger.debug("cache_stats: %s", exc)
        return {"available": False, "reason": str(exc)}


def purge_expired_cache(engine: Any = None) -> int:
    """
    Elimina entradas de caché expiradas.

    Returns:
        Número de entradas eliminadas.
    """
    eng = engine or _get_engine()
    if eng is None:
        return 0

    try:
        from sqlalchemy import text as sa_text
        with eng.begin() as conn:
            result = conn.execute(sa_text("""
                DELETE FROM cache_http
                WHERE expires_at IS NOT NULL AND expires_at < NOW()
            """))
            deleted = result.rowcount or 0
        logger.info("purge_expired_cache: %d entradas eliminadas", deleted)
        return deleted
    except Exception as exc:
        logger.debug("purge_expired_cache: %s", exc)
        return 0


def purge_source_cache(source_id: str, engine: Any = None) -> int:
    """
    Elimina caché de una fuente específica (por dominio de URL).

    Args:
        source_id: ID de la fuente (se mapea a dominio de URL).
        engine: SQLAlchemy engine.

    Returns:
        Número de entradas eliminadas.
    """
    eng = engine or _get_engine()
    if eng is None:
        return 0

    # Obtener URL base de la fuente
    try:
        from etl.operations.source_registry import get_source
        src = get_source(source_id)
        base_url = src.base_url if src else None
    except Exception:
        base_url = None

    if not base_url:
        logger.warning("purge_source_cache: fuente '%s' no tiene base_url", source_id)
        return 0

    # Extraer dominio
    try:
        from urllib.parse import urlparse
        domain = urlparse(base_url).netloc
    except Exception:
        domain = base_url

    try:
        from sqlalchemy import text as sa_text
        with eng.begin() as conn:
            result = conn.execute(sa_text("""
                DELETE FROM cache_http
                WHERE url LIKE :pattern
            """), {"pattern": f"%{domain}%"})
            deleted = result.rowcount or 0
        logger.info("purge_source_cache '%s' (%s): %d eliminadas", source_id, domain, deleted)
        return deleted
    except Exception as exc:
        logger.debug("purge_source_cache: %s", exc)
        return 0


def inspect_cache_url(url: str, engine: Any = None) -> dict:
    """
    Inspecciona la entrada de caché para una URL específica.

    Returns:
        Dict con datos de la caché o indicación de que no existe.
    """
    eng = engine or _get_engine()
    if eng is None:
        return {"found": False, "reason": "sin engine"}

    try:
        from sqlalchemy import text as sa_text
        with eng.connect() as conn:
            row = conn.execute(sa_text("""
                SELECT url, status_code, created_at, expires_at,
                       LENGTH(response_body::text) AS size_bytes
                FROM cache_http
                WHERE url = :url
                ORDER BY created_at DESC
                LIMIT 1
            """), {"url": url}).fetchone()

        if row is None:
            return {"found": False, "url": url}

        now = datetime.now(timezone.utc)
        expires_at = row[3]
        is_expired = (expires_at is not None and expires_at < now) if expires_at else False

        return {
            "found": True,
            "url": row[0],
            "status_code": row[1],
            "cached_at": str(row[2]),
            "expires_at": str(expires_at) if expires_at else None,
            "expired": is_expired,
            "size_bytes": row[4] or 0,
        }
    except Exception as exc:
        logger.debug("inspect_cache_url: %s", exc)
        return {"found": False, "error": str(exc)}
