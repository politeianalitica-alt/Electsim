"""
etl/sources/geopolitics/repository.py — Acceso DB para eventos geopolíticos.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)


def _get_conn():
    try:
        from db.connection import get_db_connection
        return get_db_connection()
    except Exception:
        return None


class GeopoliticsRepository:
    """Repository de acceso DB para el módulo geopolítico."""

    def create_geo_event(self, event) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO geo_events (
                        event_id, source, event_type, event_subtype,
                        country, country_iso3, region, location_name,
                        lat, lon, event_date, actor_1, actor_2,
                        fatalities, severity, source_url, raw_payload, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (event_id) DO NOTHING
                    """,
                    (
                        event.event_id, event.source,
                        event.event_type, getattr(event, "event_subtype", None),
                        event.country, getattr(event, "country_iso3", None),
                        getattr(event, "region", None), getattr(event, "location_name", None),
                        getattr(event, "lat", None), getattr(event, "lon", None),
                        event.event_date if isinstance(event.event_date, str)
                            else event.event_date.isoformat(),
                        getattr(event, "actor_1", None), getattr(event, "actor_2", None),
                        getattr(event, "fatalities", None),
                        getattr(event, "severity", "LOW"),
                        getattr(event, "source_url", None),
                        json.dumps(getattr(event, "raw_payload", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("GeopoliticsRepository.create_geo_event error: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass
            return False
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def list_geo_events(self, country_iso3: str | None = None,
                         days: int = 30, limit: int = 100) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                if country_iso3:
                    cur.execute(
                        """SELECT * FROM geo_events
                           WHERE country_iso3=%s
                           AND event_date >= NOW() - INTERVAL '%s days'
                           ORDER BY event_date DESC LIMIT %s""",
                        (country_iso3, days, limit),
                    )
                else:
                    cur.execute(
                        """SELECT * FROM geo_events
                           WHERE event_date >= NOW() - INTERVAL '%s days'
                           ORDER BY event_date DESC LIMIT %s""",
                        (days, limit),
                    )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("GeopoliticsRepository.list_geo_events error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass
