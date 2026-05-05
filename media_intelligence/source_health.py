"""Registro de salud de fuentes mediáticas."""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from media_intelligence.schemas import MediaSourceHealth

log = logging.getLogger(__name__)

# In-memory fallback (DB opcional)
_HEALTH_STORE: dict[str, MediaSourceHealth] = {}


def record_source_success(
    source_id: str,
    source_name: str,
    rss_url: str | None,
    articles_count: int,
    parser_used: str = "rss",
) -> MediaSourceHealth:
    """Registra fetch exitoso de fuente."""
    now = datetime.now(timezone.utc).isoformat()
    existing = _HEALTH_STORE.get(source_id, MediaSourceHealth(source_id=source_id, source_name=source_name))
    health = MediaSourceHealth(
        source_id=source_id,
        source_name=source_name,
        rss_url=rss_url,
        status="active" if articles_count > 0 else "no_recent",
        last_success_at=now,
        last_failure_at=existing.last_failure_at,
        http_status=200,
        articles_last_24h=articles_count,
        parser_used=parser_used,
        quality_score=min(1.0, articles_count / 10),
        updated_at=now,
    )
    _HEALTH_STORE[source_id] = health
    try:
        _persist_health(health)
    except Exception:
        pass
    return health


def record_source_failure(
    source_id: str,
    source_name: str,
    rss_url: str | None,
    error_type: str,
    error_message: str,
    http_status: int | None = None,
) -> MediaSourceHealth:
    """Registra fallo de fetch."""
    now = datetime.now(timezone.utc).isoformat()
    existing = _HEALTH_STORE.get(source_id, MediaSourceHealth(source_id=source_id, source_name=source_name))
    needs_html = error_type in ("403", "blocked", "non_xml")
    status_map = {
        "404": "down",
        "timeout": "degraded",
        "403": "blocked",
        "non_xml": "non_xml",
        "redirect": "redirect",
        "ssl_error": "degraded",
        "parse_error": "degraded",
        "empty": "no_recent",
    }
    health = MediaSourceHealth(
        source_id=source_id,
        source_name=source_name,
        rss_url=rss_url,
        status=status_map.get(error_type, "down"),
        last_success_at=existing.last_success_at,
        last_failure_at=now,
        http_status=http_status,
        error_type=error_type,
        error_message=error_message[:500] if error_message else None,
        articles_last_24h=0,
        needs_html_scraper=needs_html,
        quality_score=0.0,
        updated_at=now,
    )
    _HEALTH_STORE[source_id] = health
    try:
        _persist_health(health)
    except Exception:
        pass
    return health


def get_source_health(source_id: str) -> MediaSourceHealth | None:
    return _HEALTH_STORE.get(source_id)


def list_active_sources() -> list[MediaSourceHealth]:
    return [h for h in _HEALTH_STORE.values() if h.status == "active"]


def list_degraded_sources() -> list[MediaSourceHealth]:
    return [h for h in _HEALTH_STORE.values() if h.status in ("degraded", "no_recent")]


def list_down_sources() -> list[MediaSourceHealth]:
    return [h for h in _HEALTH_STORE.values() if h.status in ("down", "blocked", "redirect", "non_xml")]


def get_health_summary() -> dict:
    total = len(_HEALTH_STORE)
    if total == 0:
        return {"total": 0, "active": 0, "degraded": 0, "down": 0, "unknown": 0}
    return {
        "total": total,
        "active": len(list_active_sources()),
        "degraded": len(list_degraded_sources()),
        "down": len(list_down_sources()),
        "unknown": total - len(list_active_sources()) - len(list_degraded_sources()) - len(list_down_sources()),
    }


def _persist_health(health: MediaSourceHealth) -> None:
    """Persiste en DB si disponible."""
    try:
        from db.session import get_raw_conn
        conn = get_raw_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO media_source_health
                  (source_id, source_name, rss_url, status, last_success_at, last_failure_at,
                   http_status, error_type, error_message, articles_last_24h, parser_used,
                   needs_html_scraper, quality_score, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (source_id) DO UPDATE SET
                  status=EXCLUDED.status,
                  last_success_at=COALESCE(EXCLUDED.last_success_at, media_source_health.last_success_at),
                  last_failure_at=COALESCE(EXCLUDED.last_failure_at, media_source_health.last_failure_at),
                  http_status=EXCLUDED.http_status,
                  error_type=EXCLUDED.error_type,
                  error_message=EXCLUDED.error_message,
                  articles_last_24h=EXCLUDED.articles_last_24h,
                  parser_used=EXCLUDED.parser_used,
                  needs_html_scraper=EXCLUDED.needs_html_scraper,
                  quality_score=EXCLUDED.quality_score,
                  updated_at=EXCLUDED.updated_at
            """, (
                health.source_id, health.source_name, health.rss_url, health.status,
                health.last_success_at, health.last_failure_at, health.http_status,
                health.error_type, health.error_message, health.articles_last_24h,
                health.parser_used, health.needs_html_scraper, health.quality_score,
                health.updated_at,
            ))
            conn.commit()
    except Exception:
        pass
