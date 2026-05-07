# api/schemas/risk.py
"""Rich schema system for the Risk & Crisis Intelligence module."""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field
from api.schemas.status import DataMode

# ── Type aliases ─────────────────────────────────────────────────
RiskDomain = Literal[
    "legislative", "media", "actors", "coalition",
    "economic", "geopolitical", "territorial", "system"
]
RiskSeverity = Literal["low", "medium", "high", "critical"]
RiskTrend = Literal["rising", "stable", "falling"]
RiskVelocity = Literal["surging", "fast", "moderate", "slow"]
TimeHorizon = Literal["24h", "7d", "30d", "90d"]
IndicatorStatus = Literal["green", "yellow", "red", "grey"]


# ── Core risk models ──────────────────────────────────────────────
class RiskEvidence(BaseModel):
    source: str
    excerpt: str = ""
    date: str = ""
    confidence: float = Field(default=1.0, ge=0, le=1)


class RiskDriver(BaseModel):
    label: str
    contribution: int = Field(ge=0, le=100)  # % contribution to score
    trend: RiskTrend = "stable"
    description: str = ""


class RiskDimension(BaseModel):
    domain: RiskDomain
    label: str
    score: int = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)  # weight in global score
    trend: RiskTrend = "stable"
    velocity: RiskVelocity = "slow"
    severity: RiskSeverity = "low"
    drivers: list[RiskDriver] = Field(default_factory=list)
    evidence: list[RiskEvidence] = Field(default_factory=list)
    mode: DataMode = "demo"


class RiskSignal(BaseModel):
    signal_id: str
    title: str
    description: str
    domain: RiskDomain
    severity: RiskSeverity
    probability: int = Field(ge=0, le=100)
    impact: int = Field(ge=0, le=100)
    velocity: RiskVelocity = "slow"
    time_horizon: TimeHorizon = "30d"
    evidence: list[RiskEvidence] = Field(default_factory=list)
    actors_involved: list[str] = Field(default_factory=list)
    created_at: str = ""
    mode: DataMode = "demo"


class CrisisSignal(BaseModel):
    crisis_id: str
    title: str
    description: str
    severity: RiskSeverity = "critical"
    probability: int = Field(ge=0, le=100)
    domains_affected: list[RiskDomain] = Field(default_factory=list)
    time_to_impact: str = ""  # e.g., "72h", "2 semanas"
    recommended_action: str = ""
    evidence_count: int = 0


class EarlyWarningIndicator(BaseModel):
    indicator_id: str
    label: str
    status: IndicatorStatus
    value: int = Field(ge=0, le=100)
    threshold: int = Field(ge=0, le=100)
    domain: RiskDomain
    description: str = ""
    trend: RiskTrend = "stable"
    last_updated: str = ""


class RiskScenario(BaseModel):
    scenario_id: str
    title: str
    description: str
    probability: int = Field(ge=0, le=100)
    impact: int = Field(ge=0, le=100)
    time_horizon: TimeHorizon
    risk_score: int = Field(ge=0, le=100)
    domains: list[RiskDomain] = Field(default_factory=list)
    triggers: list[str] = Field(default_factory=list)
    mitigations: list[str] = Field(default_factory=list)


class RiskTimelinePoint(BaseModel):
    date: str
    score: int = Field(ge=0, le=100)
    event: Optional[str] = None
    severity: RiskSeverity = "low"


# ── Response models ───────────────────────────────────────────────
class RiskKpiItem(BaseModel):
    label: str
    value: int = Field(ge=0, le=100)
    color: str = "blue"  # "red" | "amber" | "blue" | "green" | "cyan"
    delta: int = 0
    trend: RiskTrend = "stable"


class RiskOverviewResponse(BaseModel):
    """Full risk overview: global score + dimensions + crisis signals + KPIs + spark."""
    global_score: int = Field(ge=0, le=100)
    level: RiskSeverity = "low"
    trend: RiskTrend = "stable"
    trend_delta: int = 0
    kpis: list[RiskKpiItem] = Field(default_factory=list)
    dimensions: list[RiskDimension] = Field(default_factory=list)
    crisis_signals: list[CrisisSignal] = Field(default_factory=list)
    top_signals: list[RiskSignal] = Field(default_factory=list)
    early_warnings: list[EarlyWarningIndicator] = Field(default_factory=list)
    spark: list[int] = Field(default_factory=list)
    mode: DataMode


class RiskSignalsResponse(BaseModel):
    signals: list[RiskSignal] = Field(default_factory=list)
    total: int = 0
    domain: Optional[str] = None
    severity: Optional[str] = None
    mode: DataMode


class RiskAnalysisRequest(BaseModel):
    question: str
    context: str = ""
    domain: Optional[RiskDomain] = None
    time_horizon: TimeHorizon = "30d"


class RiskAnalysisResponse(BaseModel):
    question: str
    answer: str
    global_score: int
    key_risks: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    model_used: str = "demo"
    mode: DataMode


# ── Legacy compat (keeps existing risk_overview.py working) ──────
class RiskKpiItemLegacy(BaseModel):
    label: str
    value: int
    color: str


class RiskSignalItemLegacy(BaseModel):
    title: str
    description: str
    probability: int
    impact: str


class RiskOverview(BaseModel):
    """Legacy model — kept for backward compat with existing GET /api/risk/overview."""
    global_score: int
    level: str
    kpis: list[RiskKpiItemLegacy] = Field(default_factory=list)
    signals: list[RiskSignalItemLegacy] = Field(default_factory=list)
    spark: list[int] = Field(default_factory=list)
    trend_delta: int = 0
    mode: DataMode
