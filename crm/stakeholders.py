"""
CRM Stakeholders — Bloque 15.

Gestión de perfiles de stakeholders.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from crm.schemas import StakeholderProfile

logger = logging.getLogger(__name__)

_STAKEHOLDERS: dict[str, StakeholderProfile] = {}


def get_stakeholder_profile(
    object_type: str, object_id: str, tenant_id: str = "default"
) -> StakeholderProfile | None:
    key = f"{object_type}:{object_id}:{tenant_id}"
    if key in _STAKEHOLDERS:
        return _STAKEHOLDERS[key]
    try:
        conn = _get_conn()
        if conn is None:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM crm_stakeholder_profiles WHERE object_type=%s AND object_id=%s AND tenant_id=%s",
                (object_type, object_id, tenant_id),
            )
            row = cur.fetchone()
            if row:
                return _row_to_profile(row, cur.description)
    except Exception as exc:
        logger.debug("get_stakeholder_profile DB error: %s", exc)
    return None


def compute_stakeholder_profile(
    object_type: str,
    object_id: str,
    tenant_id: str = "default",
    context: dict | None = None,
) -> StakeholderProfile:
    """Computa y guarda el perfil de prioridad."""
    from crm.crm_scoring import compute_stakeholder_priority
    profile = compute_stakeholder_priority(object_type, object_id, tenant_id, context)
    save_stakeholder_profile(profile)
    return profile


def save_stakeholder_profile(profile: StakeholderProfile) -> None:
    key = f"{profile.object_type}:{profile.object_id}:{profile.tenant_id}"
    _STAKEHOLDERS[key] = profile
    try:
        conn = _get_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crm_stakeholder_profiles (
                    stakeholder_id, object_type, object_id,
                    influence_score, proximity_score, trust_score,
                    responsiveness_score, risk_score, priority_score,
                    stance_by_topic, interests, concerns,
                    recommended_actions, tenant_id, last_updated_at
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                ON CONFLICT (object_type, object_id, tenant_id) DO UPDATE SET
                    priority_score=EXCLUDED.priority_score,
                    influence_score=EXCLUDED.influence_score,
                    recommended_actions=EXCLUDED.recommended_actions,
                    last_updated_at=NOW()
                """,
                (
                    profile.stakeholder_id, profile.object_type, profile.object_id,
                    profile.influence_score, profile.proximity_score, profile.trust_score,
                    profile.responsiveness_score, profile.risk_score, profile.priority_score,
                    json.dumps(profile.stance_by_topic), profile.interests,
                    profile.concerns, profile.recommended_actions,
                    profile.tenant_id,
                ),
            )
        conn.commit()
    except Exception as exc:
        logger.warning("save_stakeholder_profile DB error: %s", exc)


def list_priority_stakeholders(
    tenant_id: str = "default",
    min_score: float = 0.0,
    limit: int = 25,
) -> list[StakeholderProfile]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM crm_stakeholder_profiles
                    WHERE tenant_id=%s AND priority_score >= %s
                    ORDER BY priority_score DESC LIMIT %s
                    """,
                    (tenant_id, min_score, limit),
                )
                return [_row_to_profile(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("list_priority_stakeholders DB error: %s", exc)

    results = sorted(
        [s for s in _STAKEHOLDERS.values() if s.tenant_id == tenant_id and s.priority_score >= min_score],
        key=lambda s: s.priority_score,
        reverse=True,
    )
    return results[:limit]


def update_stakeholder_topics(
    object_type: str, object_id: str, topics: list[str], tenant_id: str = "default"
) -> None:
    profile = get_stakeholder_profile(object_type, object_id, tenant_id)
    if profile:
        updated = profile.model_copy(update={"interests": topics})
        save_stakeholder_profile(updated)


def recommended_actions_for_stakeholder(
    object_type: str, object_id: str, tenant_id: str = "default"
) -> list[str]:
    profile = get_stakeholder_profile(object_type, object_id, tenant_id)
    if profile:
        return profile.recommended_actions
    return ["Calcular perfil de stakeholder primero"]


def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None


def _row_to_profile(row: tuple, description: Any) -> StakeholderProfile:
    cols = [d[0] for d in description]
    d = dict(zip(cols, row))
    stance = d.get("stance_by_topic") or {}
    if isinstance(stance, str):
        import json as _json
        stance = _json.loads(stance)
    return StakeholderProfile(
        stakeholder_id=d.get("stakeholder_id", ""),
        object_type=d.get("object_type", "contact"),
        object_id=d.get("object_id", ""),
        influence_score=float(d.get("influence_score", 0)),
        proximity_score=float(d.get("proximity_score", 0)),
        trust_score=float(d.get("trust_score", 0)),
        responsiveness_score=float(d.get("responsiveness_score", 0)),
        risk_score=float(d.get("risk_score", 0)),
        priority_score=float(d.get("priority_score", 0)),
        stance_by_topic=stance,
        interests=list(d.get("interests") or []),
        concerns=list(d.get("concerns") or []),
        recommended_actions=list(d.get("recommended_actions") or []),
        tenant_id=d.get("tenant_id", "default"),
    )
