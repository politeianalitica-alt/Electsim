# api/schemas/legislative.py
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field
from api.schemas.status import DataMode

# ── Keep existing models (router depends on them) ───────────────────────────

class BoeItem(BaseModel):
    boe_no: str | None = None
    title: str
    section: str = ""
    department: str = ""
    date: str
    url: str | None = None
    type: str = ""
    relevance: str = "media"


class BoeResponse(BaseModel):
    items: list[BoeItem] = Field(default_factory=list)
    date: str
    mode: DataMode
    total: int


class Initiative(BaseModel):
    id: str
    title: str
    type: str = ""
    proponent: str = ""
    status: str = "Pendiente"
    submitted_at: str | None = None
    urgency: str = "low"  # low | medium | high


class InitiativesResponse(BaseModel):
    items: list[Initiative] = Field(default_factory=list)
    mode: DataMode
    total: int
    active: int
    critical: int


class LegislativeKpis(BaseModel):
    active_initiatives: int
    approved_this_month: int
    critical_tramitation: int
    upcoming_votes: int
    mode: DataMode


# ── New enums ───────────────────────────────────────────────────────────────

Jurisdiction = Literal["congreso", "senado", "boe", "ue", "comunidad_autonoma"]
InstitutionType = Literal["camara_baja", "camara_alta", "gobierno", "ue", "ue_comision", "ccaa"]
ProcedureType = Literal[
    "proyecto_ley", "proposicion_ley", "real_decreto_ley", "real_decreto",
    "orden_ministerial", "proposicion_no_ley", "mocion", "interpelacion",
    "pregunta_oral", "pregunta_escrita", "reglamento_ue", "directiva_ue"
]
LegislativeStage = Literal[
    "presentacion", "comision", "ponencia", "pleno_debate", "enmiendas",
    "votacion", "senado_revision", "promulgacion", "boe_publicacion", "vigor"
]
UrgencyLevel = Literal["critical", "high", "medium", "low"]
ImpactLevel = Literal["alto", "medio", "bajo"]
SectorCode = Literal[
    "energia", "banca", "inmobiliario", "tecnologia", "salud", "defensa",
    "transporte", "agroalimentario", "turismo", "telecomunicaciones", "educacion", "general"
]


# ── New rich models ──────────────────────────────────────────────────────────

class LegislativeEvidence(BaseModel):
    """Piece of supporting evidence for a legislative item."""
    source: str
    excerpt: str
    date: str
    url: str | None = None


class LegislativeEvent(BaseModel):
    """Single event in the procedural timeline."""
    date: str
    description: str
    institution: InstitutionType = "camara_baja"
    stage: LegislativeStage = "comision"
    outcome: str | None = None


class SectorImpact(BaseModel):
    """Impact of a legislative item on a specific economic sector."""
    sector: SectorCode
    sector_label: str
    impact_level: ImpactLevel
    impact_score: int = Field(ge=0, le=100)
    summary: str = ""
    affected_companies: list[str] = Field(default_factory=list)


class ActorLegislativePosition(BaseModel):
    """A political actor's position on a legislative item."""
    actor_id: str | None = None
    actor_name: str
    party: str
    party_color: str = "#64748B"
    position: Literal["favor", "contra", "abstencion", "neutro", "pendiente"] = "pendiente"
    statement: str = ""
    date: str | None = None


class LegislativeItem(BaseModel):
    """Rich legislative item for list views."""
    id: str
    title: str
    short_title: str = ""
    procedure_type: ProcedureType = "proyecto_ley"
    procedure_label: str = ""
    jurisdiction: Jurisdiction = "congreso"
    institution: InstitutionType = "camara_baja"
    proponent: str = ""
    proponent_party: str = ""
    proponent_color: str = "#64748B"
    current_stage: LegislativeStage = "comision"
    stage_label: str = ""
    urgency: UrgencyLevel = "low"
    submitted_at: str | None = None
    expected_vote: str | None = None
    last_activity: str | None = None
    impact_score: int = Field(ge=0, le=100, default=50)
    primary_sector: SectorCode = "general"
    tags: list[str] = Field(default_factory=list)
    status: str = "En tramitación"
    is_government: bool = False
    ue_origin: bool = False
    boe_url: str | None = None


class LegislativeItemDetail(LegislativeItem):
    """Full detail for item drill-down view."""
    full_title: str = ""
    summary: str = ""
    objetivos: list[str] = Field(default_factory=list)
    timeline: list[LegislativeEvent] = Field(default_factory=list)
    sector_impacts: list[SectorImpact] = Field(default_factory=list)
    actor_positions: list[ActorLegislativePosition] = Field(default_factory=list)
    evidence: list[LegislativeEvidence] = Field(default_factory=list)
    related_ids: list[str] = Field(default_factory=list)
    analyst_note: str = ""


class CalendarItem(BaseModel):
    """Parliamentary calendar event."""
    date: str
    day_label: str
    time: str | None = None
    title: str
    institution: InstitutionType = "camara_baja"
    event_type: Literal["pleno", "comision", "ponencia", "votacion", "otro"] = "otro"
    event_type_label: str = ""
    commission: str | None = None
    related_item_id: str | None = None


class LegislativeHeatmapCell(BaseModel):
    """One cell in the sector x urgency heatmap."""
    sector: SectorCode
    sector_label: str
    urgency: UrgencyLevel
    count: int
    score: float


class LegislativeOverviewResponse(BaseModel):
    """Response for GET /api/legislative/overview."""
    kpis: LegislativeKpis
    critical_items: list[LegislativeItem] = Field(default_factory=list)
    calendar_week: list[CalendarItem] = Field(default_factory=list)
    boe_today: list[BoeItem] = Field(default_factory=list)
    heatmap: list[LegislativeHeatmapCell] = Field(default_factory=list)
    mode: DataMode


class LegislativeItemsResponse(BaseModel):
    """Response for GET /api/legislative/items — paginated list."""
    items: list[LegislativeItem] = Field(default_factory=list)
    total: int
    page: int
    page_size: int
    mode: DataMode


class LegislativeAnalysisRequest(BaseModel):
    """Request for POST /api/legislative/analyze."""
    item_id: str | None = None
    query: str
    context: str | None = None
    sector: SectorCode | None = None


class LegislativeAnalysisResponse(BaseModel):
    """Response for POST /api/legislative/analyze."""
    item_id: str | None = None
    query: str
    answer: str
    sector_impacts: list[SectorImpact] = Field(default_factory=list)
    key_actors: list[ActorLegislativePosition] = Field(default_factory=list)
    risk_level: UrgencyLevel = "low"
    confidence: float = Field(ge=0.0, le=1.0, default=0.7)
    model_used: str = "demo"
    mode: DataMode


class AlertRuleRequest(BaseModel):
    """Request to create a legislative alert rule."""
    name: str
    keywords: list[str] = Field(default_factory=list)
    sectors: list[SectorCode] = Field(default_factory=list)
    urgency_min: UrgencyLevel = "medium"
    email: str | None = None
    webhook_url: str | None = None


class AlertRuleResponse(BaseModel):
    """Confirmation of alert rule creation."""
    id: str
    name: str
    active: bool
    mode: DataMode
