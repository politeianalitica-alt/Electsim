"""
Communications Schemas — Bloque 16.

10 modelos Pydantic v2 para el core de comunicación de ElectSim.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class CommunicationChannel(BaseModel):
    channel_id: str = Field(default_factory=lambda: _new_id("chn_"))
    name: str
    channel_type: Literal[
        "linkedin", "twitter_x", "newsletter", "email",
        "press_release", "website", "briefing", "internal_memo",
        "whatsapp", "telegram", "event", "other"
    ] = "other"
    owner: str | None = None
    tenant_id: str = "default"
    is_active: bool = True
    requires_approval: bool = True
    supports_direct_publish: bool = False
    character_limit: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MessageFrame(BaseModel):
    frame_id: str = Field(default_factory=lambda: _new_id("frm_"))
    title: str
    description: str | None = None
    frame_type: Literal[
        "policy_explanation", "risk_warning", "campaign_message",
        "reputation_response", "thought_leadership", "stakeholder_update",
        "crisis_response", "briefing_summary", "data_insight"
    ] = "data_insight"
    core_claim: str
    supporting_points: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    target_audience: str | None = None
    tone: Literal[
        "institutional", "analytical", "urgent", "technical",
        "accessible", "campaign", "defensive", "proactive"
    ] = "analytical"
    risk_flags: list[str] = Field(default_factory=list)
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ContentAsset(BaseModel):
    asset_id: str = Field(default_factory=lambda: _new_id("ast_"))
    title: str
    asset_type: Literal[
        "linkedin_post", "tweet", "thread", "newsletter", "email",
        "press_note", "talking_points", "qa", "briefing",
        "internal_memo", "speech", "slide_outline", "infographic_copy"
    ] = "internal_memo"
    body_markdown: str
    short_copy: str | None = None
    channel_id: str | None = None
    message_frame_id: str | None = None
    source_objects: list[dict[str, Any]] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    status: Literal[
        "draft", "review", "approved", "scheduled",
        "published", "archived", "rejected"
    ] = "draft"
    language: str = "es"
    tone: str | None = None
    created_by: str | None = None
    tenant_id: str = "default"
    workspace_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class EditorialCalendarItem(BaseModel):
    calendar_item_id: str = Field(default_factory=lambda: _new_id("cal_"))
    title: str
    content_asset_id: str | None = None
    channel_id: str | None = None
    planned_at: datetime
    deadline_at: datetime | None = None
    status: Literal[
        "idea", "drafting", "review", "approved",
        "scheduled", "published", "cancelled"
    ] = "idea"
    campaign_id: str | None = None
    related_alert_id: str | None = None
    related_scenario_id: str | None = None
    owner_user_id: str | None = None
    approver_user_id: str | None = None
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DistributionList(BaseModel):
    list_id: str = Field(default_factory=lambda: _new_id("lst_"))
    name: str
    description: str | None = None
    list_type: Literal[
        "crm_segment", "newsletter", "press", "stakeholders",
        "internal", "campaign", "client", "manual"
    ] = "manual"
    crm_segment_id: str | None = None
    static_members: list[dict[str, Any]] = Field(default_factory=list)
    allowed_use: Literal[
        "newsletter", "briefing_distribution", "event_invitation",
        "stakeholder_update", "internal_only"
    ] = "internal_only"
    consent_required: bool = True
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PublicationJob(BaseModel):
    publication_id: str = Field(default_factory=lambda: _new_id("pub_"))
    content_asset_id: str
    channel_id: str
    scheduled_at: datetime | None = None
    published_at: datetime | None = None
    status: Literal[
        "queued", "requires_approval", "approved", "sent_to_channel",
        "published", "failed", "cancelled"
    ] = "queued"
    external_post_id: str | None = None
    external_url: str | None = None
    requires_manual_publish: bool = True
    error_message: str | None = None
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ContentApproval(BaseModel):
    approval_id: str = Field(default_factory=lambda: _new_id("apr_"))
    content_asset_id: str
    requested_by: str | None = None
    approver_user_id: str | None = None
    approval_status: Literal[
        "pending", "approved", "changes_requested", "rejected"
    ] = "pending"
    comments: str | None = None
    risk_review_required: bool = False
    legal_review_required: bool = False
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    decided_at: datetime | None = None


class ContentPerformance(BaseModel):
    performance_id: str = Field(default_factory=lambda: _new_id("prf_"))
    content_asset_id: str
    channel_id: str
    measured_at: datetime = Field(default_factory=datetime.utcnow)
    impressions: int | None = None
    engagements: int | None = None
    clicks: int | None = None
    shares: int | None = None
    comments_count: int | None = None
    opens: int | None = None
    replies: int | None = None
    engagement_rate: float | None = None
    click_rate: float | None = None
    sentiment_score: float | None = None
    narrative_shift_score: float | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("engagement_rate", "click_rate", mode="before")
    @classmethod
    def clamp_rate(cls, v: Any) -> float | None:
        if v is None:
            return None
        try:
            return max(0.0, min(1.0, float(v)))
        except (TypeError, ValueError):
            return None


class ContentRecommendation(BaseModel):
    recommendation_id: str = Field(default_factory=lambda: _new_id("rec_"))
    source_type: str = ""
    source_id: str = ""
    asset_type: str = ""
    rationale: str = ""
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    suggested_channels: list[str] = Field(default_factory=list)
    tenant_id: str = "default"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ContentRiskCheck(BaseModel):
    check_id: str = Field(default_factory=lambda: _new_id("chk_"))
    content_asset_id: str
    flags: list[str] = Field(default_factory=list)
    requires_approval: bool = False
    requires_legal_review: bool = False
    requires_risk_review: bool = False
    sanitized: bool = False
    checked_at: datetime = Field(default_factory=datetime.utcnow)
