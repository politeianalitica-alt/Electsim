"""
security/repository.py — Acceso DB para auditoría, roles y clasificación de datos.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


def _get_conn():
    try:
        from db.connection import get_db_connection
        return get_db_connection()
    except Exception:
        return None


class SecurityRepository:
    """Repository de acceso DB para el módulo de seguridad."""

    def create_audit_event(self, event_data: dict) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO audit_events (
                        event_id, tenant_id, user_id, action, resource_type,
                        resource_id, result, ip_address, metadata, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (event_id) DO NOTHING
                    """,
                    (
                        event_data.get("event_id", f"evt_{datetime.utcnow().timestamp()}"),
                        event_data.get("tenant_id", "default"),
                        event_data.get("user_id"),
                        event_data.get("action", ""),
                        event_data.get("resource_type"),
                        event_data.get("resource_id"),
                        event_data.get("result", "success"),
                        event_data.get("ip_address"),
                        json.dumps(event_data.get("metadata", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.debug("SecurityRepository.create_audit_event error: %s", exc)
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

    def list_audit_events(self, tenant_id: str, limit: int = 100) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM audit_events WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s",
                    (tenant_id, limit),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("SecurityRepository.list_audit_events error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_user_roles(self, user_id: str, tenant_id: str) -> list[str]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT r.name FROM roles r
                       JOIN user_roles ur ON ur.role_id = r.id
                       WHERE ur.user_id=%s AND ur.tenant_id=%s""",
                    (user_id, tenant_id),
                )
                return [row[0] for row in cur.fetchall()]
        except Exception as exc:
            logger.debug("SecurityRepository.get_user_roles error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass
