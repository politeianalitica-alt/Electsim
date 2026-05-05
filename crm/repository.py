"""
crm/repository.py — Acceso DB para el CRM.

Patrón:
    repo = CRMRepository()
    contact = repo.create_contact(contact_obj)
    contact = repo.get_contact("cnt_abc123", "tenant_id")
    contacts = repo.list_contacts("tenant_id", limit=50)

En modo sin DB: retorna None/[] sin lanzar error.
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


class CRMRepository:
    """Repository de acceso a DB para el CRM institucional."""

    # ── Contacts ─────────────────────────────────────────────────────────────

    def create_contact(self, contact) -> bool:
        """Persiste un Contact en crm_contacts. Retorna True si OK."""
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO crm_contacts (
                        contact_id, tenant_id, full_name, email, phone,
                        contact_type, organization_id, role_title, territory_id,
                        topics, sectors, consent_status, data_classification,
                        public_profile_url, source, source_url, workspace_id,
                        raw_payload, created_at, updated_at
                    ) VALUES (
                        %s,%s,%s,%s,%s,
                        %s,%s,%s,%s,
                        %s,%s,%s,%s,
                        %s,%s,%s,%s,
                        %s,%s,%s
                    )
                    ON CONFLICT (contact_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        email = EXCLUDED.email,
                        phone = EXCLUDED.phone,
                        contact_type = EXCLUDED.contact_type,
                        organization_id = EXCLUDED.organization_id,
                        role_title = EXCLUDED.role_title,
                        territory_id = EXCLUDED.territory_id,
                        topics = EXCLUDED.topics,
                        sectors = EXCLUDED.sectors,
                        consent_status = EXCLUDED.consent_status,
                        data_classification = EXCLUDED.data_classification,
                        public_profile_url = EXCLUDED.public_profile_url,
                        raw_payload = EXCLUDED.raw_payload,
                        updated_at = EXCLUDED.updated_at
                    """,
                    (
                        contact.contact_id, contact.tenant_id, contact.full_name,
                        contact.email, contact.phone,
                        contact.contact_type,
                        getattr(contact, "organization_id", None),
                        getattr(contact, "role_title", None),
                        getattr(contact, "territory_id", None),
                        _safe_json(getattr(contact, "topics", [])),
                        _safe_json(getattr(contact, "sectors", [])),
                        contact.consent_status,
                        contact.data_classification,
                        getattr(contact, "public_profile_url", None),
                        getattr(contact, "source", "manual"),
                        getattr(contact, "source_url", None),
                        getattr(contact, "workspace_id", None),
                        _safe_json(getattr(contact, "raw_payload", {})),
                        datetime.utcnow(),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CRMRepository.create_contact error: %s", exc)
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

    def get_contact(self, contact_id: str, tenant_id: str) -> dict | None:
        conn = _get_conn()
        if conn is None:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM crm_contacts WHERE contact_id=%s AND tenant_id=%s",
                    (contact_id, tenant_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))
        except Exception as exc:
            logger.debug("CRMRepository.get_contact error: %s", exc)
            return None
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def list_contacts(self, tenant_id: str, limit: int = 100,
                      contact_type: str | None = None) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                if contact_type:
                    cur.execute(
                        "SELECT * FROM crm_contacts WHERE tenant_id=%s AND contact_type=%s LIMIT %s",
                        (tenant_id, contact_type, limit),
                    )
                else:
                    cur.execute(
                        "SELECT * FROM crm_contacts WHERE tenant_id=%s LIMIT %s",
                        (tenant_id, limit),
                    )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CRMRepository.list_contacts error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def update_contact_consent(self, contact_id: str, consent_status: str,
                                tenant_id: str) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE crm_contacts SET consent_status=%s, updated_at=%s WHERE contact_id=%s AND tenant_id=%s",
                    (consent_status, datetime.utcnow(), contact_id, tenant_id),
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CRMRepository.update_consent error: %s", exc)
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

    # ── Organizations ─────────────────────────────────────────────────────────

    def create_organization(self, org) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO crm_organizations (
                        organization_id, tenant_id, name, organization_type,
                        country, territory_id, sectors, topics,
                        website, public_profile_url,
                        risk_entity_id, actor_graph_id, raw_payload, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (organization_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        organization_type = EXCLUDED.organization_type,
                        sectors = EXCLUDED.sectors,
                        topics = EXCLUDED.topics,
                        raw_payload = EXCLUDED.raw_payload
                    """,
                    (
                        org.organization_id, org.tenant_id, org.name,
                        org.organization_type,
                        getattr(org, "country", "ES"),
                        getattr(org, "territory_id", None),
                        _safe_json(getattr(org, "sectors", [])),
                        _safe_json(getattr(org, "topics", [])),
                        getattr(org, "website", None),
                        getattr(org, "public_profile_url", None),
                        getattr(org, "risk_entity_id", None),
                        getattr(org, "actor_graph_id", None),
                        _safe_json(getattr(org, "raw_payload", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CRMRepository.create_organization error: %s", exc)
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

    def get_organization(self, organization_id: str, tenant_id: str) -> dict | None:
        conn = _get_conn()
        if conn is None:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM crm_organizations WHERE organization_id=%s AND tenant_id=%s",
                    (organization_id, tenant_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))
        except Exception as exc:
            logger.debug("CRMRepository.get_organization error: %s", exc)
            return None
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def list_organizations(self, tenant_id: str, limit: int = 100) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM crm_organizations WHERE tenant_id=%s LIMIT %s",
                    (tenant_id, limit),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CRMRepository.list_organizations error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    # ── Interactions ──────────────────────────────────────────────────────────

    def create_interaction(self, interaction) -> bool:
        conn = _get_conn()
        if conn is None:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO crm_interactions (
                        interaction_id, tenant_id, contact_id, organization_id,
                        interaction_type, title, summary, interaction_date,
                        sentiment, outcome, raw_payload, created_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (interaction_id) DO NOTHING
                    """,
                    (
                        interaction.interaction_id, interaction.tenant_id,
                        getattr(interaction, "contact_id", None),
                        getattr(interaction, "organization_id", None),
                        interaction.interaction_type,
                        getattr(interaction, "title", ""),
                        getattr(interaction, "summary", None),
                        getattr(interaction, "interaction_date", datetime.utcnow()),
                        getattr(interaction, "sentiment", "unknown"),
                        getattr(interaction, "outcome", None),
                        _safe_json(getattr(interaction, "raw_payload", {})),
                        datetime.utcnow(),
                    )
                )
            conn.commit()
            return True
        except Exception as exc:
            logger.warning("CRMRepository.create_interaction error: %s", exc)
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

    def list_interactions(self, contact_id: str, tenant_id: str) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT * FROM crm_interactions
                       WHERE contact_id=%s AND tenant_id=%s
                       ORDER BY interaction_date DESC LIMIT 50""",
                    (contact_id, tenant_id),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CRMRepository.list_interactions error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass

    # ── Tasks ─────────────────────────────────────────────────────────────────

    def list_due_tasks(self, tenant_id: str, days: int = 7) -> list[dict]:
        conn = _get_conn()
        if conn is None:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT * FROM crm_outreach_tasks
                       WHERE tenant_id=%s AND status NOT IN ('done','cancelled')
                       AND due_date <= NOW() + INTERVAL '%s days'
                       ORDER BY due_date ASC LIMIT 50""",
                    (tenant_id, days),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in rows]
        except Exception as exc:
            logger.debug("CRMRepository.list_due_tasks error: %s", exc)
            return []
        finally:
            try:
                conn.close()
            except Exception:
                pass
