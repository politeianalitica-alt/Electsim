"""
etl/sources/documents/repository.py — Acceso DB para documentos y evidencias.
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


class DocumentRepository:
    """Repository de acceso DB para el módulo de documentos."""

    def register_document(self, doc_data: dict) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO source_documents (
                        document_id, tenant_id, title, doc_type, source_url,
                        language, status, raw_payload, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (document_id) DO NOTHING
                    """,
                    (
                        doc_data.get("document_id", f"doc_{datetime.utcnow().timestamp()}"),
                        doc_data.get("tenant_id", "default"),
                        doc_data.get("title", ""),
                        doc_data.get("doc_type", "other"),
                        doc_data.get("source_url"),
                        doc_data.get("language", "es"),
                        doc_data.get("status", "draft"),
                        json.dumps(doc_data.get("raw_payload", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("DocumentRepository.register_document error: %s", exc)
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

    def list_documents(self, tenant_id: str, limit: int = 50) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM source_documents WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s",
                    (tenant_id, limit),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("DocumentRepository.list_documents error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_document(self, document_id: str, tenant_id: str) -> dict | None:
        conn = _get_conn()
        if conn is None:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM source_documents WHERE document_id=%s AND tenant_id=%s",
                    (document_id, tenant_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))
        except Exception as exc:
            logger.debug("DocumentRepository.get_document error: %s", exc)
            return None
        finally:
            try:
                conn.close()
            except Exception:
                pass
