"""
CRM Schemas — Bloque 15.

11 modelos Pydantic v2 para el CRM de ElectSim.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class Contact(BaseModel):
    contact_id: str = Field(default_factory=lambda: _new_id("cnt_"))
    full_name: str
    display_name: str | None = None

    contact_type: Literal[
        "public_official", "political_actor", "journalist",
        "expert", "business_actor", "civil_society",
        "campaign_contact", "client_contact", "internal_user", "other"
    ] = "other"

    email: str | None = None
    phone: str | None = None
    public_profile_url: str | None = None

    organization_id: str | None = None
    role_title: str | None = None

    country: str | None = "ES"
    territory_id: str | None = None

    sectors: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)

    consent_status: Literal[
        "unknown", "consented", "legitimate_interest",
        "do_not_contact", "revoked"
    ] = "unknown"

    data_classification: Literal[
        "public", "internal", "client_confidential", "sensitive", "restricted"
    ] = "internal"

    source: str = "manual"
    source_url: str | None = None

    tenant_id: str = "default"
    workspace_id: str | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class Organization(BaseModel):
    organization_id: str = Field(default_factory=lambda: _new_id("org_"))
    name: str
    organization_type: Literal[
        "political_party", "public_institution", "company", "ngo",
        "media", "think_tank", "union", "association",
        "campaign", "client", "other"
    ] = "other"

    country: str | None = "ES"
    territory_id: str | None = None

    sectors: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)

    website: str | None = None
    public_profile_url: str | None = None

    risk_entity_id: str | None = None
    actor_graph_id: str | None = None

    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class StakeholderProfile(BaseModel):
    stakeholder_id: str = Field(default_factory=lambda: _new_id("stk_"))

    object_type: Literal["contact", "organization"] = "contact"
    object_id: str

    influence_score: float = 0.0
    proximity_score: float = 0.0
    trust_score: float = 0.0
    responsiveness_score: float = 0.0
    risk_score: float = 0.0
    priority_score: float = 0.0

    stance_by_topic: dict[str, Any] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

    tenant_id: str = "default"
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator(
        "influence_score", "proximity_score", "trust_score",
        "responsiveness_score", "risk_score", "priority_score",
        mode="before",
    )
    @classmethod
    def clamp_score(cls, v: Any) -> float:
        try:
            return max(0.0, min(100.0, float(v)))
        except (TypeError, ValueError):
            return 0.0


class Relationship(BaseModel):
    relationship_id: str = Field(default_factory=lambda: _new_id("rel_"))

    source_object_type: Literal["contact", "organization"] = "contact"
    source_object_id: str

    target_object_type: Literal[
        "contact", "organization", "risk_entity",
        "legal_item", "territory", "campaign"
    ] = "organization"
    target_object_id: str

    relationship_type: Literal[
        "member_of", "works_for", "advisor_to", "partner_of",
        "opposes", "supports", "funds", "influences",
        "regulated_by", "affected_by", "contacted_by", "met_with", "unknown"
    ] = "unknown"

    confidence: float = 0.5
    evidence: list[dict[str, Any]] = Field(default_factory=list)

    start_date: date | None = None
    end_date: date | None = None

    source: str = "manual"
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Interaction(BaseModel):
    interaction_id: str = Field(default_factory=lambda: _new_id("int_"))

    contact_id: str | None = None
    organization_id: str | None = None

    interaction_type: Literal[
        "meeting", "call", "email", "message", "event",
        "briefing_sent", "report_shared", "field_visit",
        "campaign_action", "note"
    ] = "note"

    title: str
    summary: str | None = None
    interaction_date: datetime = Field(default_factory=datetime.utcnow)

    owner_user_id: str | None = None
    participants: list[str] = Field(default_factory=list)

    related_modules: list[str] = Field(default_factory=list)
    related_objects: list[dict[str, Any]] = Field(default_factory=list)

    sentiment: Literal["positive", "neutral", "negative", "mixed", "unknown"] = "unknown"
    outcome: str | None = None
    next_action: str | None = None
    follow_up_date: date | None = None

    tenant_id: str = "default"
    workspace_id: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class OutreachTask(BaseModel):
    task_id: str = Field(default_factory=lambda: _new_id("tsk_"))
    title: str
    description: str | None = None

    task_type: Literal[
        "call", "email", "meeting", "send_briefing", "invite_event",
        "field_visit", "follow_up", "research", "approval", "other"
    ] = "other"

    status: Literal["open", "in_progress", "done", "cancelled", "blocked"] = "open"
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"

    contact_id: str | None = None
    organization_id: str | None = None

    assigned_to: str | None = None
    due_date: date | None = None

    related_campaign_id: str | None = None
    related_workspace_id: str | None = None
    source_recommendation: str | None = None

    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CRMSegment(BaseModel):
    segment_id: str = Field(default_factory=lambda: _new_id("seg_"))
    name: str
    description: str | None = None

    segment_type: Literal[
        "stakeholder", "institutional", "sectoral", "territorial",
        "campaign", "media", "client", "custom"
    ] = "custom"

    rules: dict[str, Any] = Field(default_factory=dict)
    static_members: list[dict[str, Any]] = Field(default_factory=list)

    allowed_use: Literal[
        "relationship_management", "briefing_distribution",
        "event_invitation", "field_operations",
        "campaign_ops", "analysis_only"
    ] = "relationship_management"

    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MobilizationEvent(BaseModel):
    mobilization_id: str = Field(default_factory=lambda: _new_id("mob_"))
    name: str
    description: str | None = None

    event_type: Literal[
        "meeting", "townhall", "door_knocking", "phone_bank",
        "briefing_session", "stakeholder_roundtable", "campaign_event",
        "volunteer_action", "institutional_event"
    ] = "meeting"

    start_at: datetime
    end_at: datetime | None = None

    territory_id: str | None = None
    venue: str | None = None
    target_segment_id: str | None = None

    expected_attendance: int | None = None
    actual_attendance: int | None = None

    owner_user_id: str | None = None
    related_campaign_id: str | None = None
    related_scenario_id: str | None = None

    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConsentEvent(BaseModel):
    """Audit trail for consent changes."""
    consent_event_id: str = Field(default_factory=lambda: _new_id("cse_"))
    contact_id: str
    previous_status: str
    new_status: str
    changed_by: str | None = None
    source: str = "manual"
    reason: str | None = None
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingPack(BaseModel):
    """Dossier de reunión para un contacto."""
    pack_id: str = Field(default_factory=lambda: _new_id("pck_"))
    contact_id: str
    contact_name: str = ""
    topic: str | None = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    last_interaction_summary: str = ""
    sensitive_topics: list[str] = Field(default_factory=list)
    recent_legal_items: list[dict[str, Any]] = Field(default_factory=list)
    geopolitical_exposure: list[dict[str, Any]] = Field(default_factory=list)
    media_mentions: list[dict[str, Any]] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    recommended_questions: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


class OutreachRecommendation(BaseModel):
    """Recomendación de acción de outreach."""
    recommendation_id: str = Field(default_factory=lambda: _new_id("rec_"))
    contact_id: str | None = None
    organization_id: str | None = None

    action_type: str = ""
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    rationale: str = ""
    suggested_message: str | None = None
    related_objects: list[dict[str, Any]] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
