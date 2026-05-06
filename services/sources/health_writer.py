"""
Source Health Writer — Sprint 5, Task 4.

Pings RSS/HTTP sources and persists health results to media_source_health.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone


def _now() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def check_rss_health(source_id: str, source_name: str, rss_url: str) -> dict:
    """
    Ping an RSS/HTTP URL and return a health record dict.

    Never raises — always returns a dict with keys matching media_source_health columns.
    """
    sid = (source_id or "")[:32]
    sname = (source_name or "")[:200]
    url = (rss_url or "").strip()

    if not url:
        return {
            "source_id": sid,
            "source_name": sname,
            "rss_url": "",
            "status": "disabled",
            "http_status": None,
            "error_type": None,
            "error_message": None,
            "updated_at": _now(),
        }

    try:
        try:
            import requests as _requests

            resp = _requests.head(url, timeout=5, allow_redirects=True)
            code = resp.status_code
        except ImportError:
            import urllib.request as _urllib

            req = _urllib.Request(url, method="HEAD")
            with _urllib.urlopen(req, timeout=5) as resp:  # type: ignore[arg-type]
                code = resp.status

        if code < 400:
            return {
                "source_id": sid,
                "source_name": sname,
                "rss_url": url,
                "status": "active",
                "last_success_at": _now(),
                "last_failure_at": None,
                "http_status": code,
                "error_type": None,
                "error_message": None,
                "updated_at": _now(),
            }
        else:
            return {
                "source_id": sid,
                "source_name": sname,
                "rss_url": url,
                "status": "degraded",
                "last_success_at": None,
                "last_failure_at": _now(),
                "http_status": code,
                "error_type": "http_error",
                "error_message": f"HTTP {code}",
                "updated_at": _now(),
            }

    except Exception as exc:
        return {
            "source_id": sid,
            "source_name": sname,
            "rss_url": url,
            "status": "down",
            "last_success_at": None,
            "last_failure_at": _now(),
            "http_status": None,
            "error_type": type(exc).__name__,
            "error_message": str(exc)[:200],
            "updated_at": _now(),
        }


def write_health_to_db(health_records: list[dict]) -> int:
    """
    Upsert health records into media_source_health via psycopg2.

    Returns count of records written (0 on any exception). Never raises.
    """
    if not health_records:
        return 0

    try:
        import psycopg2  # type: ignore

        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            return 0

        upsert_sql = """
            INSERT INTO media_source_health (
                source_id, source_name, rss_url, status,
                last_success_at, last_failure_at,
                http_status, error_type, error_message,
                updated_at, created_at
            ) VALUES (
                %(source_id)s, %(source_name)s, %(rss_url)s, %(status)s,
                %(last_success_at)s, %(last_failure_at)s,
                %(http_status)s, %(error_type)s, %(error_message)s,
                %(updated_at)s, %(updated_at)s
            )
            ON CONFLICT (source_id) DO UPDATE SET
                status        = EXCLUDED.status,
                http_status   = EXCLUDED.http_status,
                error_type    = EXCLUDED.error_type,
                error_message = EXCLUDED.error_message,
                updated_at    = EXCLUDED.updated_at
        """

        count = 0
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cur:
                for record in health_records:
                    row = {
                        "source_id": record.get("source_id"),
                        "source_name": record.get("source_name"),
                        "rss_url": record.get("rss_url") or "",
                        "status": record.get("status", "unknown"),
                        "last_success_at": record.get("last_success_at"),
                        "last_failure_at": record.get("last_failure_at"),
                        "http_status": record.get("http_status"),
                        "error_type": record.get("error_type"),
                        "error_message": record.get("error_message"),
                        "updated_at": record.get("updated_at") or _now(),
                    }
                    cur.execute(upsert_sql, row)
                    count += 1
            conn.commit()

        return count

    except Exception:
        return 0


def sync_all_sources() -> dict:
    """
    Ping all registered sources and persist results to media_source_health.

    Returns a summary dict. Never raises.
    """
    try:
        from services.sources.source_registry import list_source_definitions  # type: ignore

        sources = list_source_definitions()

        records: list[dict] = []
        for src in sources:
            # SourceDefinition uses .id, .name, .url (may be None)
            source_id = getattr(src, "id", None) or getattr(src, "source_id", "")
            source_name = getattr(src, "name", "") or ""
            rss_url = getattr(src, "rss_url", None) or getattr(src, "url", None) or ""

            record = check_rss_health(str(source_id), str(source_name), str(rss_url))
            records.append(record)

        written = write_health_to_db(records)

        status_counts: dict[str, int] = {"active": 0, "degraded": 0, "down": 0, "disabled": 0}
        for r in records:
            s = r.get("status", "")
            if s in status_counts:
                status_counts[s] += 1

        return {
            "checked": len(records),
            "written": written,
            "active": status_counts["active"],
            "degraded": status_counts["degraded"],
            "down": status_counts["down"],
        }

    except Exception as exc:
        return {
            "checked": 0,
            "written": 0,
            "active": 0,
            "degraded": 0,
            "down": 0,
            "error": str(exc),
        }
