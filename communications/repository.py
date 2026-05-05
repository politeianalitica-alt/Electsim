"""
communications/repository.py — Acceso DB para el módulo de comunicaciones.
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


def _safe_json(v: Any) -> str:
    if v is None:
        return "[]"
    if isinstance(v, str):
        return v
    return json.dumps(v)


class CommsRepository:
    """Repository de acceso DB para comunicaciones."""

    def create_message_frame(self, frame) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO message_frames (
                        frame_id, tenant_id, title, core_claim, key_points,
                        evidence_ids, target_audiences, tone, topics,
                        status, raw_payload, created_at, updated_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (frame_id) DO UPDATE SET
                        title=EXCLUDED.title, core_claim=EXCLUDED.core_claim,
                        key_points=EXCLUDED.key_points, status=EXCLUDED.status,
                        updated_at=EXCLUDED.updated_at
                    """,
                    (
                        frame.frame_id, frame.tenant_id, frame.title,
                        getattr(frame, "core_claim", ""),
                        _safe_json(getattr(frame, "key_points", [])),
                        _safe_json(getattr(frame, "evidence_ids", [])),
                        _safe_json(getattr(frame, "target_audiences", [])),
                        getattr(frame, "tone", "neutral"),
                        _safe_json(getattr(frame, "topics", [])),
                        getattr(frame, "status", "draft"),
                        _safe_json(getattr(frame, "raw_payload", {})),
                        datetime.utcnow(), datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CommsRepository.create_message_frame error: %s", exc)
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

    def create_content_asset(self, asset) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO content_assets (
                        asset_id, tenant_id, frame_id, channel_id, asset_type,
                        title, body, status, requires_approval,
                        created_by, raw_payload, created_at, updated_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (asset_id) DO UPDATE SET
                        body=EXCLUDED.body, status=EXCLUDED.status,
                        updated_at=EXCLUDED.updated_at
                    """,
                    (
                        asset.asset_id, asset.tenant_id,
                        getattr(asset, "frame_id", None),
                        getattr(asset, "channel_id", None),
                        asset.asset_type,
                        getattr(asset, "title", ""),
                        getattr(asset, "body", ""),
                        getattr(asset, "status", "draft"),
                        getattr(asset, "requires_approval", True),
                        getattr(asset, "created_by", None),
                        _safe_json(getattr(asset, "raw_payload", {})),
                        datetime.utcnow(), datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CommsRepository.create_content_asset error: %s", exc)
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

    def list_content_assets(self, tenant_id: str, status: str | None = None,
                             asset_type: str | None = None, limit: int = 50) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                where = ["tenant_id=%s"]
                params: list = [tenant_id]
                if status:
                    where.append("status=%s")
                    params.append(status)
                if asset_type:
                    where.append("asset_type=%s")
                    params.append(asset_type)
                params.append(limit)
                cur.execute(
                    f"SELECT * FROM content_assets WHERE {' AND '.join(where)} ORDER BY created_at DESC LIMIT %s",
                    params,
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CommsRepository.list_content_assets error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_content_asset(self, asset_id: str, tenant_id: str) -> dict | None:
        conn = _get_conn()
        if conn is None:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM content_assets WHERE asset_id=%s AND tenant_id=%s",
                    (asset_id, tenant_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))
        except Exception as exc:
            logger.debug("CommsRepository.get_content_asset error: %s", exc)
            return None
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def list_pending_approvals(self, tenant_id: str) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM content_approvals WHERE tenant_id=%s AND status='pending' ORDER BY created_at DESC LIMIT 50",
                    (tenant_id,),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CommsRepository.list_pending_approvals error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass
