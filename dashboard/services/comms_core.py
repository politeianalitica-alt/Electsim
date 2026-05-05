"""
Comms Core Service — Bloque 16.

Funciones de carga para el dashboard de Communications.
Todas con caché, fallback a vacío, nunca rompen.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

_cache_store: dict[str, tuple[Any, datetime]] = {}


def _cache(ttl: int = 60):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            key = f"{fn.__name__}:{args}:{sorted(kwargs.items())}"
            if key in _cache_store:
                val, exp = _cache_store[key]
                if datetime.utcnow() < exp:
                    return val
            result = fn(*args, **kwargs)
            _cache_store[key] = (result, datetime.utcnow() + timedelta(seconds=ttl))
            return result
        return wrapper
    return decorator


try:
    from communications.message_studio import list_assets, get_asset
    from communications.channel_registry import list_channels, seed_default_channels
    from communications.content_calendar import get_calendar_items, get_overdue_items
    from communications.approval_workflow import get_pending_approvals
    from communications.publication_queue import get_publication_queue
    from communications.briefing_distribution import list_distribution_lists
    from communications.performance_tracker import (
        get_asset_performance, compute_channel_performance, detect_content_outliers,
    )
    from communications.comms_recommender import generate_comms_alerts
    from communications.comms_monitor import get_comms_health
    _comms_available = True
    seed_default_channels()  # Inicializar canales por defecto
except Exception as exc:
    logger.warning("Communications no disponible: %s", exc)
    _comms_available = False


@_cache(ttl=120)
def cargar_comms_kpis(tenant_id: str = "default") -> dict:
    """KPIs resumen del módulo de comunicación."""
    try:
        if not _comms_available:
            return {}
        return get_comms_health(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_comms_kpis: %s", exc)
        return {}


@_cache(ttl=60)
def cargar_content_assets(
    tenant_id: str = "default",
    limit: int = 100,
    status: str | None = None,
) -> list:
    """Lista de activos de contenido."""
    try:
        if not _comms_available:
            return []
        return list_assets(tenant_id=tenant_id, status=status, limit=limit)
    except Exception as exc:
        logger.warning("cargar_content_assets: %s", exc)
        return []


def cargar_content_asset(asset_id: str) -> Any | None:
    """Activo individual."""
    try:
        if not _comms_available:
            return None
        return get_asset(asset_id)
    except Exception as exc:
        logger.warning("cargar_content_asset: %s", exc)
        return None


@_cache(ttl=90)
def cargar_editorial_calendar(tenant_id: str = "default", days: int = 30) -> list:
    """Elementos del calendario editorial."""
    try:
        if not _comms_available:
            return []
        return get_calendar_items(tenant_id=tenant_id, days=days)
    except Exception as exc:
        logger.warning("cargar_editorial_calendar: %s", exc)
        return []


@_cache(ttl=60)
def cargar_publication_queue(tenant_id: str = "default", status: str | None = None) -> list:
    """Cola de publicación manual."""
    try:
        if not _comms_available:
            return []
        return get_publication_queue(status=status, tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_publication_queue: %s", exc)
        return []


@_cache(ttl=60)
def cargar_pending_approvals(tenant_id: str = "default", limit: int = 50) -> list:
    """Aprobaciones pendientes."""
    try:
        if not _comms_available:
            return []
        return get_pending_approvals(tenant_id=tenant_id)[:limit]
    except Exception as exc:
        logger.warning("cargar_pending_approvals: %s", exc)
        return []


@_cache(ttl=120)
def cargar_distribution_lists(tenant_id: str = "default") -> list:
    """Listas de distribución."""
    try:
        if not _comms_available:
            return []
        return list_distribution_lists(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_distribution_lists: %s", exc)
        return []


@_cache(ttl=300)
def cargar_content_performance(tenant_id: str = "default", days: int = 30) -> list:
    """Datos de performance de contenido."""
    try:
        if not _comms_available:
            return []
        return detect_content_outliers(days=days)
    except Exception as exc:
        logger.warning("cargar_content_performance: %s", exc)
        return []


@_cache(ttl=180)
def cargar_recommended_content(tenant_id: str = "default", limit: int = 20) -> list[dict]:
    """Recomendaciones de contenido del sistema."""
    try:
        if not _comms_available:
            return []
        return generate_comms_alerts(tenant_id=tenant_id)[:limit]
    except Exception as exc:
        logger.warning("cargar_recommended_content: %s", exc)
        return []


@_cache(ttl=300)
def cargar_channels(tenant_id: str = "default") -> list:
    """Canales de comunicación disponibles."""
    try:
        if not _comms_available:
            return []
        return list_channels(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_channels: %s", exc)
        return []
