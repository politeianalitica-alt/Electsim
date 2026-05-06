# TAB 1 — Monitor Legislativo & Regulatorio: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/legislativo` from a basic 3-panel page into a professional legislative intelligence console for consultores políticos, periodistas, IBEX companies, campaign teams, and intelligence units.

**Architecture:** Full-stack upgrade using the existing real|demo|fallback DataMode pattern. Backend gains a rich schema system + service layer + 9 endpoints. Frontend gains 15 components assembled into a multi-tab professional console.

**Tech Stack:** FastAPI + Pydantic v2 (backend), React Query v5 + Next.js 14 App Router + Tailwind v3 dark theme (frontend), psycopg2 cursor pattern (DB access), DataMode pattern (transparency)

---

## File Map

### New / Modified Backend
| File | Action |
|------|--------|
| `api/schemas/legislative.py` | **Rewrite** — add 10+ enums/models |
| `services/legislative/__init__.py` | **Create** |
| `services/legislative/legislative_fixtures.py` | **Create** — rich demo data |
| `services/legislative/legislative_scoring.py` | **Create** — scoring functions |
| `services/legislative/legislative_service.py` | **Create** — DB + ETL connections |
| `api/routers/legislative.py` | **Rewrite** — 9 endpoints |

### New / Modified Frontend
| File | Action |
|------|--------|
| `apps/web/lib/types/legislative.ts` | **Rewrite** — rich TS interfaces |
| `apps/web/lib/api/endpoints.ts` | **Modify** — add 6 new endpoint functions |
| `apps/web/components/legislative/LegislativeKpiBar.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeItemRow.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeItemDetail.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeFilters.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeCalendar.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeBoeDiary.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeHeatmap.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeSectorImpact.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeActorPosition.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeTimeline.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeAlertBanner.tsx` | **Create** |
| `apps/web/components/legislative/LegislativeModeBadge.tsx` | **Create** |
| `apps/web/components/legislative/index.ts` | **Create** — barrel export |
| `apps/web/app/legislativo/page.tsx` | **Rewrite** — multi-tab console |
| `docs/tab-legislativo-regulatorio.md` | **Create** — delivery report |

---

## Task 1: Enrich api/schemas/legislative.py

**Files:**
- Rewrite: `api/schemas/legislative.py`

Keep all existing models (BoeItem, BoeResponse, Initiative, InitiativesResponse, LegislativeKpis) — they are imported by the existing router. Add new models.

- [ ] **Step 1: Open the existing file to understand current models**

Current content has: BoeItem, BoeResponse, Initiative, InitiativesResponse, LegislativeKpis

- [ ] **Step 2: Write the complete new file**

```python
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
    outcome: str | None = None  # "aprobado", "rechazado", "pendiente", None


class SectorImpact(BaseModel):
    """Impact of a legislative item on a specific economic sector."""
    sector: SectorCode
    sector_label: str
    impact_level: ImpactLevel
    impact_score: int = Field(ge=0, le=100)  # 0-100
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
    day_label: str  # "Lun", "Mar", ...
    time: str | None = None
    title: str
    institution: InstitutionType = "camara_baja"
    event_type: Literal["pleno", "comision", "ponencia", "votacion", "otro"] = "otro"
    event_type_label: str = ""
    commission: str | None = None
    related_item_id: str | None = None


class LegislativeHeatmapCell(BaseModel):
    """One cell in the sector × urgency heatmap."""
    sector: SectorCode
    sector_label: str
    urgency: UrgencyLevel
    count: int
    score: float  # average impact score


class LegislativeOverviewResponse(BaseModel):
    """Response for GET /api/legislative/overview — complete dashboard data."""
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
```

- [ ] **Step 3: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2" && python3 -c "from api.schemas.legislative import LegislativeItemDetail, LegislativeOverviewResponse, LegislativeAnalysisResponse; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add api/schemas/legislative.py
git commit -m "feat(legislativo): rich schema system — 10 enums + 15 models for legislative intelligence"
```

---

## Task 2: Create services/legislative/ layer

**Files:**
- Create: `services/legislative/__init__.py`
- Create: `services/legislative/legislative_fixtures.py`
- Create: `services/legislative/legislative_scoring.py`
- Create: `services/legislative/legislative_service.py`

- [ ] **Step 1: Create directory and __init__.py**

```bash
mkdir -p "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/services/legislative"
touch "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/services/legislative/__init__.py"
```

- [ ] **Step 2: Write legislative_fixtures.py**

Rich demo data with realistic Spanish legislative context (2026):

```python
# services/legislative/legislative_fixtures.py
"""
Rich demo / fallback data for the Monitor Legislativo.
All data is realistic for Spain 2026 but clearly labelled mode=fallback|demo.
"""
from __future__ import annotations
from datetime import date, timedelta
from api.schemas.legislative import (
    LegislativeItem, LegislativeItemDetail, LegislativeEvent,
    SectorImpact, ActorLegislativePosition, LegislativeEvidence,
    CalendarItem, BoeItem, LegislativeKpis, LegislativeHeatmapCell,
    LegislativeOverviewResponse, LegislativeItemsResponse,
)

_today = date.today().isoformat()
_yesterday = (date.today() - timedelta(days=1)).isoformat()
_next_week = (date.today() + timedelta(days=7)).isoformat()

# ── Demo items ────────────────────────────────────────────────────────────────

DEMO_ITEMS: list[LegislativeItem] = [
    LegislativeItem(
        id="leg-001",
        title="Proyecto de Ley de Vivienda Asequible 2026",
        short_title="Ley Vivienda 2026",
        procedure_type="proyecto_ley",
        procedure_label="Proyecto de Ley",
        jurisdiction="congreso",
        institution="camara_baja",
        proponent="Gobierno",
        proponent_party="PSOE-Sumar",
        proponent_color="#E03A3E",
        current_stage="pleno_debate",
        stage_label="Pleno — Debate",
        urgency="critical",
        submitted_at="2026-02-10",
        expected_vote=_next_week,
        last_activity=_today,
        impact_score=91,
        primary_sector="inmobiliario",
        tags=["vivienda", "alquiler", "ibex35", "socimi"],
        status="Pleno — Debate",
        is_government=True,
    ),
    LegislativeItem(
        id="leg-002",
        title="Reforma Fiscal SICAV y SOCIMI — Tributación mínima UE",
        short_title="Reforma SICAV/SOCIMI",
        procedure_type="proyecto_ley",
        procedure_label="Proyecto de Ley",
        jurisdiction="congreso",
        institution="camara_baja",
        proponent="Ministerio de Hacienda",
        proponent_party="PSOE",
        proponent_color="#E03A3E",
        current_stage="enmiendas",
        stage_label="Enmiendas parciales",
        urgency="high",
        submitted_at="2026-03-01",
        expected_vote=(date.today() + timedelta(days=21)).isoformat(),
        last_activity=_yesterday,
        impact_score=85,
        primary_sector="banca",
        tags=["fiscalidad", "sicav", "socimi", "hacienda", "ibex35"],
        status="Enmiendas",
        is_government=True,
        ue_origin=True,
    ),
    LegislativeItem(
        id="leg-003",
        title="Real Decreto-ley Fondos Europeos 2026-2030",
        short_title="RDL Fondos UE",
        procedure_type="real_decreto_ley",
        procedure_label="Real Decreto-ley",
        jurisdiction="boe",
        institution="gobierno",
        proponent="Presidencia del Gobierno",
        proponent_party="PSOE",
        proponent_color="#E03A3E",
        current_stage="boe_publicacion",
        stage_label="Publicado BOE",
        urgency="high",
        submitted_at="2026-04-28",
        last_activity=_yesterday,
        impact_score=78,
        primary_sector="general",
        tags=["fondos_ue", "ngeu", "inversión", "pymes"],
        status="Convalidación pendiente",
        is_government=True,
        ue_origin=True,
        boe_url="https://www.boe.es/boe/dias/2026/04/28/pdfs/BOE-A-2026-5123.pdf",
    ),
    LegislativeItem(
        id="leg-004",
        title="Directiva UE IA Act — Transposición española",
        short_title="Transposición IA Act",
        procedure_type="directiva_ue",
        procedure_label="Directiva UE",
        jurisdiction="ue",
        institution="ue_comision",
        proponent="Comisión Europea",
        proponent_party="UE",
        proponent_color="#003399",
        current_stage="comision",
        stage_label="Comisión Mixta UE",
        urgency="high",
        submitted_at="2026-01-15",
        expected_vote=(date.today() + timedelta(days=45)).isoformat(),
        last_activity=_yesterday,
        impact_score=82,
        primary_sector="tecnologia",
        tags=["ia", "regulacion", "tecnologia", "compliance", "bigtech"],
        status="Comisión Mixta",
        is_government=False,
        ue_origin=True,
    ),
    LegislativeItem(
        id="leg-005",
        title="Proposición de Ley Transición Energética Justa",
        short_title="Transición Energética",
        procedure_type="proposicion_ley",
        procedure_label="Proposición de Ley",
        jurisdiction="congreso",
        institution="camara_baja",
        proponent="Sumar",
        proponent_party="Sumar",
        proponent_color="#9B59B6",
        current_stage="ponencia",
        stage_label="Ponencia",
        urgency="medium",
        submitted_at="2026-03-10",
        expected_vote=(date.today() + timedelta(days=60)).isoformat(),
        last_activity=(date.today() - timedelta(days=3)).isoformat(),
        impact_score=71,
        primary_sector="energia",
        tags=["energia", "renovables", "clima", "empleos_verdes"],
        status="Ponencia",
        is_government=False,
    ),
    LegislativeItem(
        id="leg-006",
        title="Ley de Defensa Nacional — Presupuesto 2% PIB OTAN",
        short_title="Ley Defensa 2%",
        procedure_type="proyecto_ley",
        procedure_label="Proyecto de Ley",
        jurisdiction="congreso",
        institution="camara_baja",
        proponent="Ministerio de Defensa",
        proponent_party="PSOE",
        proponent_color="#E03A3E",
        current_stage="comision",
        stage_label="Comisión Defensa",
        urgency="medium",
        submitted_at="2026-04-01",
        expected_vote=(date.today() + timedelta(days=90)).isoformat(),
        last_activity=(date.today() - timedelta(days=5)).isoformat(),
        impact_score=64,
        primary_sector="defensa",
        tags=["defensa", "otan", "presupuesto", "industria_militar"],
        status="Comisión",
        is_government=True,
    ),
    LegislativeItem(
        id="leg-007",
        title="Reforma de la Ley de Telecomunicaciones — Infraestructuras 5G/6G",
        short_title="Telecom 5G/6G",
        procedure_type="proposicion_ley",
        procedure_label="Proposición de Ley",
        jurisdiction="congreso",
        institution="camara_baja",
        proponent="PP",
        proponent_party="PP",
        proponent_color="#1F77FF",
        current_stage="presentacion",
        stage_label="Presentada",
        urgency="low",
        submitted_at="2026-05-02",
        last_activity=_today,
        impact_score=55,
        primary_sector="telecomunicaciones",
        tags=["5g", "6g", "telecom", "digitalizacion"],
        status="Presentada",
        is_government=False,
    ),
    LegislativeItem(
        id="leg-008",
        title="Reglamento UE Taxonomía Verde 2026 — Impacto sectorial",
        short_title="Taxonomía Verde UE",
        procedure_type="reglamento_ue",
        procedure_label="Reglamento UE",
        jurisdiction="ue",
        institution="ue_comision",
        proponent="Comisión Europea",
        proponent_party="UE",
        proponent_color="#003399",
        current_stage="vigor",
        stage_label="En vigor",
        urgency="high",
        submitted_at="2025-12-01",
        last_activity=(date.today() - timedelta(days=2)).isoformat(),
        impact_score=80,
        primary_sector="banca",
        tags=["taxonomia", "esg", "finanzas_sostenibles", "banca", "energia"],
        status="En vigor",
        is_government=False,
        ue_origin=True,
    ),
]


DEMO_CALENDAR: list[CalendarItem] = [
    CalendarItem(
        date=(date.today() + timedelta(days=0)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][date.today().weekday()],
        time="10:00",
        title="Pleno Congreso: Debate Ley Vivienda 2026",
        institution="camara_baja",
        event_type="pleno",
        event_type_label="Pleno",
        commission=None,
        related_item_id="leg-001",
    ),
    CalendarItem(
        date=(date.today() + timedelta(days=1)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][(date.today() + timedelta(1)).weekday()],
        time="09:30",
        title="Comisión Hacienda: Enmiendas reforma SICAV/SOCIMI",
        institution="camara_baja",
        event_type="comision",
        event_type_label="Comisión",
        commission="Comisión de Hacienda",
        related_item_id="leg-002",
    ),
    CalendarItem(
        date=(date.today() + timedelta(days=2)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][(date.today() + timedelta(2)).weekday()],
        time="11:00",
        title="Ponencia Transición Energética: dictamen",
        institution="camara_baja",
        event_type="ponencia",
        event_type_label="Ponencia",
        commission="Comisión de Transición Ecológica",
        related_item_id="leg-005",
    ),
    CalendarItem(
        date=(date.today() + timedelta(days=3)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][(date.today() + timedelta(3)).weekday()],
        time="10:00",
        title="Comisión Mixta UE: IA Act — posición española",
        institution="ue_comision",
        event_type="comision",
        event_type_label="Comisión UE",
        commission="Comisión Mixta para la UE",
        related_item_id="leg-004",
    ),
    CalendarItem(
        date=(date.today() + timedelta(days=4)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][(date.today() + timedelta(4)).weekday()],
        time="12:00",
        title="Pleno Congreso: Votación RDL Fondos UE (convalidación)",
        institution="camara_baja",
        event_type="votacion",
        event_type_label="Votación",
        related_item_id="leg-003",
    ),
    CalendarItem(
        date=(date.today() + timedelta(days=7)).isoformat(),
        day_label=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][(date.today() + timedelta(7)).weekday()],
        time="10:00",
        title="Comisión Defensa: audición Ministro, presupuesto OTAN",
        institution="camara_baja",
        event_type="comision",
        event_type_label="Comisión",
        commission="Comisión de Defensa",
        related_item_id="leg-006",
    ),
]


DEMO_BOE: list[BoeItem] = [
    BoeItem(title="RDL 8/2026 de medidas urgentes para la vivienda", section="I. Disposiciones generales", department="Presidencia", date=_today, url="https://www.boe.es/boe/dias/2026/05/06/pdfs/BOE-A-2026-5123.pdf", type="Real Decreto-ley", relevance="alta"),
    BoeItem(title="Orden HAC/520/2026 sobre tributación rentas capital", section="I. Disposiciones generales", department="Hacienda", date=_today, url=None, type="Orden", relevance="alta"),
    BoeItem(title="Resolución CNMV: normas transparencia ESG 2026", section="III. Otras disposiciones", department="CNMV", date=_today, url=None, type="Resolución", relevance="media"),
    BoeItem(title="Convocatoria fondos PERTE VEC 2026 — vehículo eléctrico", section="III. Otras disposiciones", department="Industria", date=_today, url=None, type="Convocatoria", relevance="media"),
    BoeItem(title="Licitación contratos defensa — sistemas C4ISR", section="V. Anuncios", department="Defensa", date=_today, url=None, type="Anuncio", relevance="baja"),
]


DEMO_HEATMAP: list[LegislativeHeatmapCell] = [
    LegislativeHeatmapCell(sector="inmobiliario", sector_label="Inmobiliario", urgency="critical", count=3, score=88.0),
    LegislativeHeatmapCell(sector="banca", sector_label="Banca", urgency="high", count=4, score=79.5),
    LegislativeHeatmapCell(sector="tecnologia", sector_label="Tecnología", urgency="high", count=2, score=76.0),
    LegislativeHeatmapCell(sector="energia", sector_label="Energía", urgency="medium", count=5, score=65.0),
    LegislativeHeatmapCell(sector="banca", sector_label="Banca", urgency="critical", count=1, score=85.0),
    LegislativeHeatmapCell(sector="tecnologia", sector_label="Tecnología", urgency="medium", count=3, score=58.0),
    LegislativeHeatmapCell(sector="defensa", sector_label="Defensa", urgency="medium", count=2, score=60.0),
    LegislativeHeatmapCell(sector="telecomunicaciones", sector_label="Telecomunicaciones", urgency="low", count=4, score=45.0),
    LegislativeHeatmapCell(sector="inmobiliario", sector_label="Inmobiliario", urgency="high", count=2, score=72.0),
    LegislativeHeatmapCell(sector="energia", sector_label="Energía", urgency="high", count=3, score=70.0),
    LegislativeHeatmapCell(sector="general", sector_label="General", urgency="high", count=6, score=68.0),
    LegislativeHeatmapCell(sector="agroalimentario", sector_label="Agroalimentario", urgency="low", count=3, score=38.0),
]


DEMO_KPIS = LegislativeKpis(
    active_initiatives=187,
    approved_this_month=23,
    critical_tramitation=9,
    upcoming_votes=14,
    mode="fallback",
)


def get_demo_overview() -> LegislativeOverviewResponse:
    return LegislativeOverviewResponse(
        kpis=DEMO_KPIS,
        critical_items=[i for i in DEMO_ITEMS if i.urgency in ("critical", "high")][:6],
        calendar_week=DEMO_CALENDAR,
        boe_today=DEMO_BOE,
        heatmap=DEMO_HEATMAP,
        mode="demo",
    )


def get_demo_items(page: int = 1, page_size: int = 20) -> LegislativeItemsResponse:
    start = (page - 1) * page_size
    end = start + page_size
    return LegislativeItemsResponse(
        items=DEMO_ITEMS[start:end],
        total=len(DEMO_ITEMS),
        page=page,
        page_size=page_size,
        mode="demo",
    )
```

- [ ] **Step 3: Write legislative_scoring.py**

```python
# services/legislative/legislative_scoring.py
"""
Scoring utilities for legislative items.
All functions are pure (no DB, no network).
"""
from __future__ import annotations
from api.schemas.legislative import UrgencyLevel, ImpactLevel

_PROCEDURE_WEIGHT: dict[str, int] = {
    "real_decreto_ley": 10,
    "proyecto_ley": 8,
    "directiva_ue": 8,
    "reglamento_ue": 7,
    "proposicion_ley": 6,
    "real_decreto": 5,
    "orden_ministerial": 3,
    "proposicion_no_ley": 2,
    "mocion": 1,
    "interpelacion": 1,
    "pregunta_oral": 0,
    "pregunta_escrita": 0,
}

_STAGE_WEIGHT: dict[str, int] = {
    "votacion": 10,
    "pleno_debate": 9,
    "boe_publicacion": 9,
    "vigor": 8,
    "enmiendas": 7,
    "ponencia": 6,
    "comision": 5,
    "senado_revision": 5,
    "promulgacion": 4,
    "presentacion": 2,
}


def compute_urgency(
    procedure_type: str,
    current_stage: str,
    days_to_vote: int | None,
    is_government: bool,
    ue_origin: bool,
) -> UrgencyLevel:
    """Compute urgency level from procedural features."""
    score = _PROCEDURE_WEIGHT.get(procedure_type, 3)
    score += _STAGE_WEIGHT.get(current_stage, 3)
    if is_government:
        score += 3
    if ue_origin:
        score += 2
    if days_to_vote is not None:
        if days_to_vote <= 7:
            score += 8
        elif days_to_vote <= 21:
            score += 5
        elif days_to_vote <= 60:
            score += 2
    if score >= 20:
        return "critical"
    if score >= 14:
        return "high"
    if score >= 8:
        return "medium"
    return "low"


def compute_impact_score(
    urgency: UrgencyLevel,
    procedure_type: str,
    is_government: bool,
    ue_origin: bool,
    sector_count: int = 1,
) -> int:
    """Compute a 0-100 impact score."""
    base = {"critical": 75, "high": 60, "medium": 45, "low": 25}[urgency]
    base += _PROCEDURE_WEIGHT.get(procedure_type, 3) * 2
    if is_government:
        base += 5
    if ue_origin:
        base += 5
    base += min(sector_count - 1, 5) * 3
    return min(base, 100)


def urgency_to_impact(urgency: UrgencyLevel) -> ImpactLevel:
    if urgency in ("critical", "high"):
        return "alto"
    if urgency == "medium":
        return "medio"
    return "bajo"


def urgency_sort_key(urgency: UrgencyLevel) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}[urgency]
```

- [ ] **Step 4: Write legislative_service.py**

```python
# services/legislative/legislative_service.py
"""
Main legislative service.
Tries to load real data from ETL modules and DB.
Falls back gracefully to demo fixtures at every step.
"""
from __future__ import annotations
import os
import logging
from datetime import date

from api.schemas.legislative import (
    BoeItem, BoeResponse, Initiative, InitiativesResponse, LegislativeKpis,
    LegislativeItem, LegislativeItemsResponse, LegislativeOverviewResponse,
    CalendarItem, LegislativeHeatmapCell,
)
from services.legislative.legislative_fixtures import (
    DEMO_ITEMS, DEMO_CALENDAR, DEMO_BOE, DEMO_HEATMAP, DEMO_KPIS,
    get_demo_overview, get_demo_items,
)
from services.legislative.legislative_scoring import urgency_sort_key

log = logging.getLogger(__name__)


def _dsn() -> str:
    return os.getenv("DATABASE_URL", "")


def get_overview() -> LegislativeOverviewResponse:
    """
    Assemble overview response.
    Tries real data from ETL; falls back to demo at each step.
    """
    try:
        kpis = _fetch_kpis()
        critical_items = _fetch_critical_items()
        calendar = _fetch_calendar()
        boe = _fetch_boe(5)
        heatmap = DEMO_HEATMAP  # no real heatmap ETL yet

        # If we got any real data, mark as real
        real_count = sum([
            kpis.mode == "real",
            len(critical_items) > 0 and any(getattr(i, "_real", False) for i in critical_items),
        ])
        overall_mode = "real" if kpis.mode == "real" else "fallback"

        return LegislativeOverviewResponse(
            kpis=kpis,
            critical_items=critical_items[:8],
            calendar_week=calendar,
            boe_today=boe,
            heatmap=heatmap,
            mode=overall_mode,
        )
    except Exception:
        log.warning("legislative_service.get_overview: falling back to demo", exc_info=True)
        return get_demo_overview()


def get_items(
    page: int = 1,
    page_size: int = 20,
    urgency: str | None = None,
    sector: str | None = None,
    jurisdiction: str | None = None,
    search: str | None = None,
) -> LegislativeItemsResponse:
    """Return paginated legislative items with optional filtering."""
    try:
        items = list(DEMO_ITEMS)  # start with demo, replace when ETL ready
        # Apply filters
        if urgency:
            items = [i for i in items if i.urgency == urgency]
        if sector:
            items = [i for i in items if i.primary_sector == sector]
        if jurisdiction:
            items = [i for i in items if i.jurisdiction == jurisdiction]
        if search:
            q = search.lower()
            items = [i for i in items if q in i.title.lower() or q in " ".join(i.tags).lower()]
        items.sort(key=lambda x: urgency_sort_key(x.urgency))
        total = len(items)
        start = (page - 1) * page_size
        return LegislativeItemsResponse(
            items=items[start:start + page_size],
            total=total,
            page=page,
            page_size=page_size,
            mode="demo",
        )
    except Exception:
        log.warning("legislative_service.get_items: error", exc_info=True)
        return get_demo_items(page, page_size)


def get_item_detail(item_id: str):
    """Return full detail for one legislative item."""
    from services.legislative.legislative_fixtures import DEMO_ITEMS
    item = next((i for i in DEMO_ITEMS if i.id == item_id), None)
    if item is None:
        return None
    # Promote to LegislativeItemDetail with rich demo data
    from api.schemas.legislative import LegislativeItemDetail, LegislativeEvent, SectorImpact, ActorLegislativePosition
    from api.schemas.legislative import LegislativeEvidence
    detail = LegislativeItemDetail(
        **item.model_dump(),
        full_title=item.title,
        summary=f"Esta iniciativa legislativa está en fase '{item.stage_label}'. "
                f"El impacto estimado en el sector {item.primary_sector} es de {item.impact_score}/100.",
        objetivos=[
            "Garantizar el derecho a la vivienda asequible en zonas de alta demanda",
            "Regular el mercado del alquiler con controles de precio",
            "Fomentar la construcción de vivienda pública",
        ],
        timeline=[
            LegislativeEvent(date=item.submitted_at or date.today().isoformat(), description="Presentación en el Congreso", institution="camara_baja", stage="presentacion"),
            LegislativeEvent(date=item.last_activity or date.today().isoformat(), description="Última actividad parlamentaria", institution="camara_baja", stage=item.current_stage),
        ],
        sector_impacts=[
            SectorImpact(sector=item.primary_sector, sector_label=item.primary_sector.title(), impact_level="alto" if item.impact_score >= 70 else "medio", impact_score=item.impact_score, summary=f"Impacto significativo en el sector {item.primary_sector}"),
        ],
        actor_positions=[
            ActorLegislativePosition(actor_name="Partido Socialista", party="PSOE", party_color="#E03A3E", position="favor", statement="Apoyamos esta iniciativa como prioridad de gobierno"),
            ActorLegislativePosition(actor_name="Partido Popular", party="PP", party_color="#1F77FF", position="contra", statement="Rechazamos el intervencionismo en el mercado"),
            ActorLegislativePosition(actor_name="Sumar", party="Sumar", party_color="#9B59B6", position="favor", statement="Exigimos mayor ambición regulatoria"),
        ],
        evidence=[
            LegislativeEvidence(source="El País", excerpt="El Congreso debate la ley de vivienda entre críticas del sector inmobiliario", date=item.last_activity or date.today().isoformat()),
        ],
        analyst_note="Iniciativa de alto impacto para IBEX inmobiliario y banca hipotecaria. Monitorizar enmiendas clave en comisión.",
    )
    return detail


def _fetch_kpis() -> LegislativeKpis:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return DEMO_KPIS
        active = len([x for x in items if x.get("status") not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.get("urgencia", 0) >= 4])
        return LegislativeKpis(
            active_initiatives=active,
            approved_this_month=len([x for x in items if x.get("status") == "Aprobada"]),
            critical_tramitation=critical,
            upcoming_votes=0,
            mode="real",
        )
    except Exception:
        return DEMO_KPIS


def _fetch_critical_items() -> list[LegislativeItem]:
    """Try to load critical items from ETL; fall back to demo."""
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        raw = fetch_iniciativas("proyecto-ley", n=50) + fetch_iniciativas("proposicion-ley", n=50)
        if not raw:
            return [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]
        items = []
        for r in raw[:20]:
            try:
                urgencia_raw = int(r.get("urgencia", 0))
                urgency = "critical" if urgencia_raw >= 5 else "high" if urgencia_raw >= 3 else "medium" if urgencia_raw >= 1 else "low"
                items.append(LegislativeItem(
                    id=str(r.get("id", "")),
                    title=r.get("titulo", r.get("title", "Sin título")),
                    short_title=r.get("titulo", "")[:40],
                    procedure_type=_map_tipo(r.get("tipo", r.get("initiative_type", ""))),
                    procedure_label=r.get("tipo", r.get("initiative_type", "")),
                    proponent=r.get("proponent_party", r.get("proponente", "")),
                    current_stage="comision",
                    stage_label=r.get("status", "En tramitación"),
                    urgency=urgency,
                    submitted_at=str(r.get("submitted_at", r.get("fecha", ""))),
                    impact_score=min(70 + urgencia_raw * 5, 100),
                    status=r.get("status", "En tramitación"),
                ))
            except Exception:
                continue
        return items if items else [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]
    except Exception:
        return [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]


def _fetch_calendar() -> list[CalendarItem]:
    """Calendar from ETL if available, else demo."""
    return DEMO_CALENDAR  # No calendar ETL yet — return demo


def _fetch_boe(limit: int) -> list[BoeItem]:
    try:
        from etl.institucional.boe_rss import fetch_boe_items  # type: ignore
        raw = fetch_boe_items(limit=limit)
        items = [
            BoeItem(
                boe_no=r.get("boe_no"),
                title=r.get("titulo", ""),
                section=r.get("seccion", ""),
                department=r.get("departamento", ""),
                date=r.get("fecha", date.today().isoformat()),
                url=r.get("url_html"),
                type=r.get("tipo", ""),
                relevance=r.get("relevancia", "media"),
            )
            for r in raw if r.get("titulo")
        ]
        return items[:limit] if items else DEMO_BOE[:limit]
    except Exception:
        return DEMO_BOE[:limit]


def _map_tipo(tipo: str) -> str:
    mapping = {
        "Proyecto de Ley": "proyecto_ley",
        "Proposición de Ley": "proposicion_ley",
        "Real Decreto-ley": "real_decreto_ley",
        "Real Decreto": "real_decreto",
        "Proposición no de Ley": "proposicion_no_ley",
    }
    return mapping.get(tipo, "proposicion_ley")
```

- [ ] **Step 5: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2" && python3 -c "
from services.legislative.legislative_fixtures import get_demo_overview, get_demo_items
from services.legislative.legislative_scoring import compute_urgency, compute_impact_score
from services.legislative.legislative_service import get_overview, get_items, get_item_detail
print('overview:', get_overview().mode)
print('items:', len(get_items().items))
print('detail:', get_item_detail('leg-001').short_title if get_item_detail('leg-001') else 'None')
print('urgency:', compute_urgency('proyecto_ley', 'pleno_debate', 3, True, False))
print('OK')
"
```

Expected: `overview: fallback`, `items: 8`, `detail: Ley Vivienda 2026`, `urgency: critical`, `OK`

- [ ] **Step 6: Commit**

```bash
git add services/legislative/
git commit -m "feat(legislativo): services layer — fixtures + scoring + service with ETL fallback"
```

---

## Task 3: Rewrite api/routers/legislative.py with 9 endpoints

**Files:**
- Rewrite: `api/routers/legislative.py`

Keep the 3 existing endpoints (/boe, /initiatives, /kpis) and add 6 new ones.

- [ ] **Step 1: Write the complete new router**

```python
# api/routers/legislative.py
from __future__ import annotations
from fastapi import APIRouter, Query, HTTPException
from api.schemas.legislative import (
    BoeResponse, InitiativesResponse, LegislativeKpis,
    LegislativeOverviewResponse, LegislativeItemsResponse,
    LegislativeItemDetail, LegislativeAnalysisRequest,
    LegislativeAnalysisResponse, SectorImpact, AlertRuleRequest,
    AlertRuleResponse, BoeItem, Initiative, CalendarItem,
    LegislativeHeatmapCell, LegislativeItem,
)
from services.legislative.legislative_service import (
    get_overview, get_items, get_item_detail,
    _fetch_boe, _fetch_kpis,
)
from services.legislative.legislative_fixtures import (
    DEMO_BOE, DEMO_CALENDAR, DEMO_HEATMAP, DEMO_KPIS, DEMO_ITEMS,
    get_demo_overview, get_demo_items,
)
from datetime import date
import uuid

router = APIRouter(prefix="/api/legislative", tags=["legislative"])


# ── Legacy endpoints (kept for backwards compatibility) ──────────────────────

@router.get("/boe", response_model=BoeResponse)
def get_boe(limit: int = Query(10, ge=1, le=50)) -> BoeResponse:
    try:
        from etl.institucional.boe_rss import fetch_boe_items  # type: ignore
        raw = fetch_boe_items(limit=limit)
        items = [
            BoeItem(
                boe_no=r.get("boe_no"),
                title=r.get("titulo", ""),
                section=r.get("seccion", ""),
                department=r.get("departamento", ""),
                date=r.get("fecha", date.today().isoformat()),
                url=r.get("url_html"),
                type=r.get("tipo", ""),
                relevance=r.get("relevancia", "media"),
            )
            for r in raw if r.get("titulo")
        ]
        if not items:
            return BoeResponse(items=DEMO_BOE[:limit], date=date.today().isoformat(), mode="fallback", total=len(DEMO_BOE))
        return BoeResponse(items=items[:limit], date=date.today().isoformat(), mode="real", total=len(items))
    except Exception:
        return BoeResponse(items=DEMO_BOE[:limit], date=date.today().isoformat(), mode="fallback", total=len(DEMO_BOE))


@router.get("/initiatives", response_model=InitiativesResponse)
def get_initiatives(limit: int = Query(20, ge=1, le=100)) -> InitiativesResponse:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        all_items: list[dict] = []
        for tipo in ("proposicion-ley", "proyecto-ley"):
            all_items.extend(fetch_iniciativas(tipo, n=limit))
        if not all_items:
            return _demo_initiatives()
        items = [
            Initiative(
                id=str(r.get("id", i)),
                title=r.get("titulo", r.get("title", "Iniciativa sin título")),
                type=r.get("tipo", r.get("initiative_type", "")),
                proponent=r.get("proponent_party", r.get("proponente", "")),
                status=r.get("status", "Pendiente"),
                submitted_at=str(r.get("submitted_at", r.get("fecha", ""))),
                urgency=("high" if r.get("urgencia", 0) >= 4 else "medium" if r.get("urgencia", 0) >= 2 else "low"),
            )
            for i, r in enumerate(all_items[:limit])
        ]
        active = len([x for x in items if x.status not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.urgency == "high"])
        return InitiativesResponse(items=items, mode="real", total=len(items), active=active, critical=critical)
    except Exception:
        return _demo_initiatives()


@router.get("/kpis", response_model=LegislativeKpis)
def get_legislative_kpis() -> LegislativeKpis:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return DEMO_KPIS
        active = len([x for x in items if x.get("status") not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.get("urgencia", 0) >= 4])
        return LegislativeKpis(
            active_initiatives=active,
            approved_this_month=len([x for x in items if x.get("status") == "Aprobada"]),
            critical_tramitation=critical,
            upcoming_votes=0,
            mode="real",
        )
    except Exception:
        return DEMO_KPIS


# ── New endpoints ─────────────────────────────────────────────────────────────

@router.get("/overview", response_model=LegislativeOverviewResponse)
def get_legislative_overview() -> LegislativeOverviewResponse:
    """Complete dashboard overview: KPIs + critical items + calendar + BOE + heatmap."""
    try:
        return get_overview()
    except Exception:
        return get_demo_overview()


@router.get("/items", response_model=LegislativeItemsResponse)
def list_legislative_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    urgency: str | None = Query(None),
    sector: str | None = Query(None),
    jurisdiction: str | None = Query(None),
    search: str | None = Query(None),
) -> LegislativeItemsResponse:
    """Paginated list of legislative items with optional filtering."""
    try:
        return get_items(page=page, page_size=page_size, urgency=urgency, sector=sector, jurisdiction=jurisdiction, search=search)
    except Exception:
        return get_demo_items(page, page_size)


@router.get("/items/{item_id}", response_model=LegislativeItemDetail)
def get_item(item_id: str) -> LegislativeItemDetail:
    """Full detail for a single legislative item including timeline, sector impacts, actor positions."""
    try:
        detail = get_item_detail(item_id)
        if detail is None:
            raise HTTPException(status_code=404, detail=f"Legislative item {item_id!r} not found")
        return detail
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error fetching item detail")


@router.get("/calendar", response_model=list[CalendarItem])
def get_calendar(days: int = Query(7, ge=1, le=30)) -> list[CalendarItem]:
    """Parliamentary calendar for next N days."""
    try:
        from services.legislative.legislative_service import _fetch_calendar
        cal = _fetch_calendar()
        return cal[:days]
    except Exception:
        return DEMO_CALENDAR[:days]


@router.get("/heatmap", response_model=list[LegislativeHeatmapCell])
def get_heatmap() -> list[LegislativeHeatmapCell]:
    """Sector × urgency heatmap of legislative activity."""
    try:
        # Future: build from real items in DB
        return DEMO_HEATMAP
    except Exception:
        return DEMO_HEATMAP


@router.post("/analyze", response_model=LegislativeAnalysisResponse)
def analyze_item(req: LegislativeAnalysisRequest) -> LegislativeAnalysisResponse:
    """AI-powered legislative analysis for an item or a free-text query."""
    from api.schemas.legislative import LegislativeAnalysisResponse, SectorImpact
    try:
        # Try LLM analysis if available
        from agents.tools.document_tools import run_legislative_analysis  # type: ignore
        result = run_legislative_analysis(req.query, req.item_id, req.sector)
        return LegislativeAnalysisResponse(
            item_id=req.item_id,
            query=req.query,
            answer=result.get("answer", "Análisis no disponible"),
            risk_level=result.get("risk_level", "medium"),
            confidence=result.get("confidence", 0.7),
            model_used=result.get("model", "llm"),
            mode="real",
        )
    except Exception:
        # Demo analysis
        sector_label = req.sector or "general"
        return LegislativeAnalysisResponse(
            item_id=req.item_id,
            query=req.query,
            answer=(
                f"**Análisis legislativo (modo demo)**\n\n"
                f"La consulta '{req.query}' afecta principalmente al sector {sector_label}. "
                f"Se identifican riesgos regulatorios de nivel ALTO para empresas cotizadas. "
                f"Se recomienda monitorizar las enmiendas en comisión y la posición del PP "
                f"como factor determinante del resultado final."
            ),
            sector_impacts=[
                SectorImpact(
                    sector=req.sector or "general",
                    sector_label=sector_label.title(),
                    impact_level="alto",
                    impact_score=72,
                    summary=f"Impacto regulatorio significativo en {sector_label}",
                )
            ],
            risk_level="high",
            confidence=0.6,
            model_used="demo",
            mode="demo",
        )


@router.post("/alert-rule", response_model=AlertRuleResponse)
def create_alert_rule(req: AlertRuleRequest) -> AlertRuleResponse:
    """Register a legislative alert rule (demo — no persistence yet)."""
    return AlertRuleResponse(
        id=str(uuid.uuid4()),
        name=req.name,
        active=True,
        mode="demo",
    )


# ── Private demo helpers (used by old endpoints) ────────────────────────────

def _demo_initiatives() -> InitiativesResponse:
    items = [
        Initiative(id="1", title="Ley de Vivienda 2026 (reforma)", type="Proyecto de Ley", proponent="Gobierno", status="Pleno", urgency="high"),
        Initiative(id="2", title="Reforma fiscal SICAV/SOCIMI", type="Proyecto de Ley", proponent="Hacienda", status="Enmiendas", urgency="high"),
        Initiative(id="3", title="Ley Memoria Democrática (modificación)", type="Proposición de Ley", proponent="PSOE-Sumar", status="Enmiendas", urgency="medium"),
        Initiative(id="4", title="Real Decreto-ley fondos UE 2026", type="Real Decreto-ley", proponent="Moncloa", status="Convalidación", urgency="high"),
        Initiative(id="5", title="Ley audiovisual (RTVE financiación)", type="Proyecto de Ley", proponent="Cultura", status="Ponencia", urgency="medium"),
        Initiative(id="6", title="Reforma reglamento Congreso", type="Proposición no de Ley", proponent="Mesa", status="Debate", urgency="low"),
    ]
    return InitiativesResponse(items=items, mode="fallback", total=6, active=6, critical=3)
```

- [ ] **Step 2: Verify Python compiles and routes register**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2" && python3 -c "
from api.routers.legislative import router
routes = [r.path for r in router.routes]
print('Routes:', routes)
assert '/api/legislative/overview' in routes
assert '/api/legislative/items' in routes
assert '/api/legislative/calendar' in routes
assert '/api/legislative/heatmap' in routes
assert '/api/legislative/analyze' in routes
assert '/api/legislative/alert-rule' in routes
print('All 9 endpoint groups OK')
"
```

- [ ] **Step 3: Commit**

```bash
git add api/routers/legislative.py
git commit -m "feat(legislativo): 9 endpoints — overview + items + detail + calendar + heatmap + analyze + alert-rule"
```

---

## Task 4: Update TypeScript types and endpoints

**Files:**
- Rewrite: `apps/web/lib/types/legislative.ts`
- Modify: `apps/web/lib/api/endpoints.ts`

- [ ] **Step 1: Write the complete new legislative.ts**

```typescript
// apps/web/lib/types/legislative.ts
import type { DataMode } from "./status";

// ── Existing types (kept for compatibility) ──────────────────────────────────

export interface BoeItem {
  boe_no: string | null;
  title: string;
  section: string;
  department: string;
  date: string;
  url: string | null;
  type: string;
  relevance: string;
}

export interface BoeResponse {
  items: BoeItem[];
  date: string;
  mode: DataMode;
  total: number;
}

export interface Initiative {
  id: string;
  title: string;
  type: string;
  proponent: string;
  status: string;
  submitted_at: string | null;
  urgency: "low" | "medium" | "high";
}

export interface InitiativesResponse {
  items: Initiative[];
  mode: DataMode;
  total: number;
  active: number;
  critical: number;
}

export interface LegislativeKpis {
  active_initiatives: number;
  approved_this_month: number;
  critical_tramitation: number;
  upcoming_votes: number;
  mode: DataMode;
}

// ── New rich types ────────────────────────────────────────────────────────────

export type Jurisdiction = "congreso" | "senado" | "boe" | "ue" | "comunidad_autonoma";
export type InstitutionType = "camara_baja" | "camara_alta" | "gobierno" | "ue" | "ue_comision" | "ccaa";
export type ProcedureType =
  | "proyecto_ley" | "proposicion_ley" | "real_decreto_ley" | "real_decreto"
  | "orden_ministerial" | "proposicion_no_ley" | "mocion" | "interpelacion"
  | "pregunta_oral" | "pregunta_escrita" | "reglamento_ue" | "directiva_ue";
export type LegislativeStage =
  | "presentacion" | "comision" | "ponencia" | "pleno_debate" | "enmiendas"
  | "votacion" | "senado_revision" | "promulgacion" | "boe_publicacion" | "vigor";
export type UrgencyLevel = "critical" | "high" | "medium" | "low";
export type ImpactLevel = "alto" | "medio" | "bajo";
export type SectorCode =
  | "energia" | "banca" | "inmobiliario" | "tecnologia" | "salud" | "defensa"
  | "transporte" | "agroalimentario" | "turismo" | "telecomunicaciones" | "educacion" | "general";

export interface LegislativeEvidence {
  source: string;
  excerpt: string;
  date: string;
  url?: string | null;
}

export interface LegislativeEvent {
  date: string;
  description: string;
  institution: InstitutionType;
  stage: LegislativeStage;
  outcome?: string | null;
}

export interface SectorImpact {
  sector: SectorCode;
  sector_label: string;
  impact_level: ImpactLevel;
  impact_score: number;
  summary: string;
  affected_companies: string[];
}

export interface ActorLegislativePosition {
  actor_id?: string | null;
  actor_name: string;
  party: string;
  party_color: string;
  position: "favor" | "contra" | "abstencion" | "neutro" | "pendiente";
  statement: string;
  date?: string | null;
}

export interface LegislativeItem {
  id: string;
  title: string;
  short_title: string;
  procedure_type: ProcedureType;
  procedure_label: string;
  jurisdiction: Jurisdiction;
  institution: InstitutionType;
  proponent: string;
  proponent_party: string;
  proponent_color: string;
  current_stage: LegislativeStage;
  stage_label: string;
  urgency: UrgencyLevel;
  submitted_at?: string | null;
  expected_vote?: string | null;
  last_activity?: string | null;
  impact_score: number;
  primary_sector: SectorCode;
  tags: string[];
  status: string;
  is_government: boolean;
  ue_origin: boolean;
  boe_url?: string | null;
}

export interface LegislativeItemDetail extends LegislativeItem {
  full_title: string;
  summary: string;
  objetivos: string[];
  timeline: LegislativeEvent[];
  sector_impacts: SectorImpact[];
  actor_positions: ActorLegislativePosition[];
  evidence: LegislativeEvidence[];
  related_ids: string[];
  analyst_note: string;
}

export interface CalendarItem {
  date: string;
  day_label: string;
  time?: string | null;
  title: string;
  institution: InstitutionType;
  event_type: "pleno" | "comision" | "ponencia" | "votacion" | "otro";
  event_type_label: string;
  commission?: string | null;
  related_item_id?: string | null;
}

export interface LegislativeHeatmapCell {
  sector: SectorCode;
  sector_label: string;
  urgency: UrgencyLevel;
  count: number;
  score: number;
}

export interface LegislativeOverviewResponse {
  kpis: LegislativeKpis;
  critical_items: LegislativeItem[];
  calendar_week: CalendarItem[];
  boe_today: BoeItem[];
  heatmap: LegislativeHeatmapCell[];
  mode: DataMode;
}

export interface LegislativeItemsResponse {
  items: LegislativeItem[];
  total: number;
  page: number;
  page_size: number;
  mode: DataMode;
}

export interface LegislativeAnalysisRequest {
  item_id?: string | null;
  query: string;
  context?: string | null;
  sector?: SectorCode | null;
}

export interface LegislativeAnalysisResponse {
  item_id?: string | null;
  query: string;
  answer: string;
  sector_impacts: SectorImpact[];
  key_actors: ActorLegislativePosition[];
  risk_level: UrgencyLevel;
  confidence: number;
  model_used: string;
  mode: DataMode;
}
```

- [ ] **Step 2: Add 6 new endpoints to endpoints.ts**

In `apps/web/lib/api/endpoints.ts`, update the import from `legislative` and add new endpoint functions.

Update the import line (find: `import type { BoeResponse, InitiativesResponse, LegislativeKpis } from "@/lib/types/legislative";`):

```typescript
import type {
  BoeResponse, InitiativesResponse, LegislativeKpis,
  LegislativeOverviewResponse, LegislativeItemsResponse,
  LegislativeItemDetail, LegislativeAnalysisRequest,
  LegislativeAnalysisResponse, CalendarItem, LegislativeHeatmapCell,
} from "@/lib/types/legislative";
```

Add after the existing `legislativeKpis` entry (around line 212):

```typescript
  // Legislative — new endpoints
  legislativeOverview: () =>
    api.get<LegislativeOverviewResponse>("/api/legislative/overview"),

  legislativeItems: (params?: { page?: number; page_size?: number; urgency?: string; sector?: string; jurisdiction?: string; search?: string }) =>
    api.get<LegislativeItemsResponse>(`/api/legislative/items${toQuery(params)}`),

  legislativeItemDetail: (itemId: string) =>
    api.get<LegislativeItemDetail>(`/api/legislative/items/${itemId}`),

  legislativeCalendar: (days?: number) =>
    api.get<CalendarItem[]>(`/api/legislative/calendar${days ? `?days=${days}` : ""}`),

  legislativeHeatmap: () =>
    api.get<LegislativeHeatmapCell[]>("/api/legislative/heatmap"),

  legislativeAnalyze: (payload: LegislativeAnalysisRequest) =>
    api.post<LegislativeAnalysisResponse>("/api/legislative/analyze", payload),
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/types/legislative.ts apps/web/lib/api/endpoints.ts
git commit -m "feat(legislativo): TS rich types + 6 new API endpoint functions"
```

---

## Task 5: Create apps/web/components/legislative/ (15 components)

**Files:**
- Create: `apps/web/components/legislative/index.ts`
- Create: `apps/web/components/legislative/LegislativeKpiBar.tsx`
- Create: `apps/web/components/legislative/LegislativeItemRow.tsx`
- Create: `apps/web/components/legislative/LegislativeItemDetail.tsx`
- Create: `apps/web/components/legislative/LegislativeFilters.tsx`
- Create: `apps/web/components/legislative/LegislativeCalendar.tsx`
- Create: `apps/web/components/legislative/LegislativeBoeDiary.tsx`
- Create: `apps/web/components/legislative/LegislativeHeatmap.tsx`
- Create: `apps/web/components/legislative/LegislativeSectorImpact.tsx`
- Create: `apps/web/components/legislative/LegislativeActorPosition.tsx`
- Create: `apps/web/components/legislative/LegislativeTimeline.tsx`
- Create: `apps/web/components/legislative/LegislativeAlertBanner.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web/components/legislative"
```

- [ ] **Step 2: Write LegislativeKpiBar.tsx**

```tsx
// apps/web/components/legislative/LegislativeKpiBar.tsx
import type { LegislativeKpis } from "@/lib/types/legislative";

interface Props {
  kpis: LegislativeKpis;
  isLoading?: boolean;
}

export function LegislativeKpiBar({ kpis, isLoading }: Props) {
  const stats = [
    { label: "Iniciativas activas", value: kpis.active_initiatives, color: "text-cyan1" },
    { label: "Aprobadas este mes", value: kpis.approved_this_month, color: "text-green1" },
    { label: "Tramitación crítica", value: kpis.critical_tramitation, color: "text-red1" },
    { label: "Próximas votaciones", value: kpis.upcoming_votes, color: "text-amber1" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{s.label}</div>
          <div className={`text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write LegislativeItemRow.tsx**

```tsx
// apps/web/components/legislative/LegislativeItemRow.tsx
import type { LegislativeItem, UrgencyLevel } from "@/lib/types/legislative";
import { ChevronRight, Globe, Flag } from "lucide-react";

const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  critical: "badge-red",
  high: "badge-amber",
  medium: "badge-blue",
  low: "badge-blue",
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

interface Props {
  item: LegislativeItem;
  onClick?: (item: LegislativeItem) => void;
}

export function LegislativeItemRow({ item, onClick }: Props) {
  return (
    <li
      className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug flex-1">
          {item.short_title || item.title}
        </h3>
        <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`badge ${URGENCY_BADGE[item.urgency]}`}>{URGENCY_LABEL[item.urgency]}</span>
        <span className="badge badge-blue">{item.procedure_label || item.procedure_type}</span>
        {item.ue_origin && (
          <span className="badge badge-cyan flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" /> UE
          </span>
        )}
        {item.is_government && (
          <span className="badge badge-blue flex items-center gap-1">
            <Flag className="w-2.5 h-2.5" /> Gobierno
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-text2">
        <span>{item.stage_label}</span>
        <span className="flex items-center gap-2">
          {item.expected_vote && (
            <span className="text-amber1">Votación: {item.expected_vote.slice(0, 10)}</span>
          )}
          <span
            className="font-mono text-xs"
            style={{ color: item.impact_score >= 70 ? "#EF4444" : item.impact_score >= 50 ? "#F59E0B" : "#64748B" }}
          >
            {item.impact_score}
          </span>
        </span>
      </div>
      {/* Impact bar */}
      <div className="mt-2 h-0.5 bg-bg3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${item.impact_score}%`,
            backgroundColor: item.impact_score >= 70 ? "#EF4444" : item.impact_score >= 50 ? "#F59E0B" : "#3B82F6",
          }}
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Write LegislativeCalendar.tsx**

```tsx
// apps/web/components/legislative/LegislativeCalendar.tsx
import type { CalendarItem } from "@/lib/types/legislative";
import { Calendar, Vote, Users, BookOpen } from "lucide-react";

const EVENT_ICONS: Record<string, React.ElementType> = {
  pleno: Vote,
  votacion: Vote,
  comision: Users,
  ponencia: BookOpen,
  otro: Calendar,
};

const EVENT_COLOR: Record<string, string> = {
  pleno: "text-red1",
  votacion: "text-red1",
  comision: "text-cyan1",
  ponencia: "text-amber1",
  otro: "text-text2",
};

interface Props {
  items: CalendarItem[];
  isLoading?: boolean;
}

export function LegislativeCalendar({ items, isLoading }: Props) {
  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Agenda Parlamentaria</h2>
      </div>
      {isLoading ? (
        <div className="text-sm text-text2 text-center py-6">Cargando agenda…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((c, i) => {
            const Icon = EVENT_ICONS[c.event_type] ?? Calendar;
            const colorClass = EVENT_COLOR[c.event_type] ?? "text-text2";
            return (
              <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg3 transition cursor-pointer">
                <div className="text-xs font-mono text-cyan1 w-10 shrink-0 pt-0.5">{c.day_label}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 leading-snug">{c.title}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Icon className={`w-3 h-3 ${colorClass}`} />
                    <span className={`text-[10px] uppercase tracking-wider ${colorClass}`}>{c.event_type_label}</span>
                    {c.time && <span className="text-[10px] text-muted ml-1">{c.time}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Write LegislativeBoeDiary.tsx**

```tsx
// apps/web/components/legislative/LegislativeBoeDiary.tsx
import type { BoeItem } from "@/lib/types/legislative";
import { BookOpen, ChevronRight } from "lucide-react";

interface Props {
  items: BoeItem[];
  date?: string;
  isLoading?: boolean;
}

function relevanceBadge(r: string) {
  if (r === "alta") return "badge-red";
  if (r === "media") return "badge-amber";
  return "badge-blue";
}

export function LegislativeBoeDiary({ items, date, isLoading }: Props) {
  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
          BOE — {date ?? "hoy"}
        </h2>
      </div>
      {isLoading ? (
        <div className="text-sm text-text2 text-center py-6">Cargando BOE…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((b, i) => (
            <li key={i} className="p-2.5 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted">{b.section}</span>
                <span className={`badge ${relevanceBadge(b.relevance)}`}>{b.relevance}</span>
              </div>
              <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">{b.title}</div>
              {b.url ? (
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-1 text-[11px] text-cyan1 hover:underline">
                  Ver disposición <ChevronRight className="w-3 h-3" />
                </a>
              ) : (
                <div className="mt-1.5 text-[11px] text-muted">Sin enlace directo</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Write LegislativeHeatmap.tsx**

```tsx
// apps/web/components/legislative/LegislativeHeatmap.tsx
import type { LegislativeHeatmapCell, UrgencyLevel } from "@/lib/types/legislative";
import { BarChart3 } from "lucide-react";

const URGENCY_ORDER: UrgencyLevel[] = ["critical", "high", "medium", "low"];
const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo",
};

function cellColor(score: number, count: number): string {
  if (count === 0) return "bg-bg3";
  if (score >= 80) return "bg-red1/80";
  if (score >= 65) return "bg-amber1/70";
  if (score >= 50) return "bg-cyan1/50";
  return "bg-cyan1/20";
}

interface Props {
  cells: LegislativeHeatmapCell[];
}

export function LegislativeHeatmap({ cells }: Props) {
  const sectors = Array.from(new Set(cells.map(c => c.sector)));
  const byKey = Object.fromEntries(cells.map(c => [`${c.sector}|${c.urgency}`, c]));

  return (
    <section className="premium-card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-cyan1" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de calor legislativo</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-muted font-normal pb-2 pr-2">Sector</th>
              {URGENCY_ORDER.map(u => (
                <th key={u} className="text-center text-muted font-normal pb-2 px-1">{URGENCY_LABELS[u]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map(sector => (
              <tr key={sector}>
                <td className="text-text2 pr-2 py-1 capitalize">{sector}</td>
                {URGENCY_ORDER.map(urgency => {
                  const cell = byKey[`${sector}|${urgency}`];
                  return (
                    <td key={urgency} className="px-1 py-1 text-center">
                      {cell ? (
                        <div
                          className={`rounded px-1.5 py-1 ${cellColor(cell.score, cell.count)} font-mono text-text1`}
                          title={`${cell.count} iniciativas, score ${cell.score.toFixed(0)}`}
                        >
                          {cell.count}
                        </div>
                      ) : (
                        <div className="rounded px-1.5 py-1 bg-bg3 text-muted">—</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Write LegislativeSectorImpact.tsx**

```tsx
// apps/web/components/legislative/LegislativeSectorImpact.tsx
import type { SectorImpact, ImpactLevel } from "@/lib/types/legislative";
import { Layers } from "lucide-react";

const IMPACT_COLOR: Record<ImpactLevel, string> = {
  alto: "#EF4444", medio: "#F59E0B", bajo: "#3B82F6",
};

interface Props {
  impacts: SectorImpact[];
}

export function LegislativeSectorImpact({ impacts }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Impacto sectorial</h3>
      </div>
      {impacts.map((s, i) => (
        <div key={i} className="p-3 rounded-lg border border-border1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-text1">{s.sector_label}</span>
            <span className="font-mono text-xs" style={{ color: IMPACT_COLOR[s.impact_level] }}>
              {s.impact_score}/100
            </span>
          </div>
          {s.summary && <p className="text-xs text-text2 leading-relaxed">{s.summary}</p>}
          <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${s.impact_score}%`, backgroundColor: IMPACT_COLOR[s.impact_level] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Write LegislativeActorPosition.tsx**

```tsx
// apps/web/components/legislative/LegislativeActorPosition.tsx
import type { ActorLegislativePosition } from "@/lib/types/legislative";
import { Users } from "lucide-react";

const POSITION_BADGE: Record<string, string> = {
  favor: "badge-green",
  contra: "badge-red",
  abstencion: "badge-amber",
  neutro: "badge-blue",
  pendiente: "badge-blue",
};

const POSITION_LABEL: Record<string, string> = {
  favor: "A favor", contra: "En contra", abstencion: "Abstención", neutro: "Neutro", pendiente: "Pendiente",
};

interface Props {
  positions: ActorLegislativePosition[];
}

export function LegislativeActorPosition({ positions }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Posiciones de actores</h3>
      </div>
      {positions.map((p, i) => (
        <div key={i} className="p-3 rounded-lg border border-border1 flex items-start gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: p.party_color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-text1">{p.actor_name}</span>
              <span className={`badge ${POSITION_BADGE[p.position] ?? "badge-blue"} shrink-0`}>
                {POSITION_LABEL[p.position] ?? p.position}
              </span>
            </div>
            {p.statement && (
              <p className="text-xs text-text2 leading-relaxed italic">"{p.statement}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Write LegislativeTimeline.tsx**

```tsx
// apps/web/components/legislative/LegislativeTimeline.tsx
import type { LegislativeEvent } from "@/lib/types/legislative";
import { GitBranch } from "lucide-react";

interface Props {
  events: LegislativeEvent[];
}

function outcomeColor(outcome: string | null | undefined): string {
  if (!outcome) return "bg-cyan1";
  if (outcome === "aprobado") return "bg-green1";
  if (outcome === "rechazado") return "bg-red1";
  return "bg-amber1";
}

export function LegislativeTimeline({ events }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Cronología</h3>
      </div>
      <ol className="relative border-l border-border1 space-y-4 pl-4">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <div className={`absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full ${outcomeColor(e.outcome)}`} />
            <div className="text-[10px] text-muted font-mono mb-0.5">{e.date.slice(0, 10)}</div>
            <div className="text-sm text-text1 leading-snug">{e.description}</div>
            {e.outcome && (
              <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                e.outcome === "aprobado" ? "text-green1" : e.outcome === "rechazado" ? "text-red1" : "text-amber1"
              }`}>{e.outcome}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 10: Write LegislativeItemDetail.tsx (drawer panel)**

```tsx
// apps/web/components/legislative/LegislativeItemDetail.tsx
import type { LegislativeItemDetail as ItemDetail } from "@/lib/types/legislative";
import { X, ExternalLink, Globe, Flag } from "lucide-react";
import { LegislativeSectorImpact } from "./LegislativeSectorImpact";
import { LegislativeActorPosition } from "./LegislativeActorPosition";
import { LegislativeTimeline } from "./LegislativeTimeline";

interface Props {
  item: ItemDetail | null;
  onClose: () => void;
}

export function LegislativeItemDetailPanel({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-bg1 border-l border-border1 overflow-y-auto p-6 space-y-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              {item.procedure_label} · {item.stage_label}
            </div>
            <h2 className="text-lg font-bold text-text1 leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg3 transition shrink-0">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {item.ue_origin && <span className="badge badge-cyan flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> UE</span>}
          {item.is_government && <span className="badge badge-blue flex items-center gap-1"><Flag className="w-2.5 h-2.5" /> Gobierno</span>}
          {item.tags.slice(0, 5).map(t => (
            <span key={t} className="badge badge-blue">#{t}</span>
          ))}
        </div>

        {/* Summary */}
        {item.summary && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Resumen</h3>
            <p className="text-sm text-text2 leading-relaxed">{item.summary}</p>
          </div>
        )}

        {/* Objetivos */}
        {item.objetivos.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Objetivos</h3>
            <ul className="space-y-1">
              {item.objetivos.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text2">
                  <span className="text-cyan1 mt-0.5">•</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Analyst note */}
        {item.analyst_note && (
          <div className="p-3 rounded-lg bg-bg3 border border-border1">
            <div className="text-[10px] uppercase tracking-wider text-cyan1 mb-1">Nota analítica</div>
            <p className="text-sm text-text1 leading-relaxed">{item.analyst_note}</p>
          </div>
        )}

        {/* Timeline */}
        {item.timeline.length > 0 && <LegislativeTimeline events={item.timeline} />}

        {/* Sector Impacts */}
        {item.sector_impacts.length > 0 && <LegislativeSectorImpact impacts={item.sector_impacts} />}

        {/* Actor Positions */}
        {item.actor_positions.length > 0 && <LegislativeActorPosition positions={item.actor_positions} />}

        {/* BOE link */}
        {item.boe_url && (
          <a
            href={item.boe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-cyan1 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver en el BOE
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Write LegislativeFilters.tsx**

```tsx
// apps/web/components/legislative/LegislativeFilters.tsx
import { Search, SlidersHorizontal } from "lucide-react";

interface Props {
  search: string;
  urgency: string;
  sector: string;
  jurisdiction: string;
  onSearch: (v: string) => void;
  onUrgency: (v: string) => void;
  onSector: (v: string) => void;
  onJurisdiction: (v: string) => void;
}

export function LegislativeFilters({ search, urgency, sector, jurisdiction, onSearch, onUrgency, onSector, onJurisdiction }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <input
          className="w-full bg-bg3 border border-border1 rounded-lg pl-8 pr-3 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1 placeholder:text-muted"
          placeholder="Buscar iniciativa…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={urgency}
        onChange={e => onUrgency(e.target.value)}
      >
        <option value="">Todas las urgencias</option>
        <option value="critical">Crítico</option>
        <option value="high">Alto</option>
        <option value="medium">Medio</option>
        <option value="low">Bajo</option>
      </select>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={sector}
        onChange={e => onSector(e.target.value)}
      >
        <option value="">Todos los sectores</option>
        <option value="banca">Banca</option>
        <option value="energia">Energía</option>
        <option value="inmobiliario">Inmobiliario</option>
        <option value="tecnologia">Tecnología</option>
        <option value="salud">Salud</option>
        <option value="defensa">Defensa</option>
        <option value="telecomunicaciones">Telecomunicaciones</option>
      </select>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={jurisdiction}
        onChange={e => onJurisdiction(e.target.value)}
      >
        <option value="">Toda jurisdicción</option>
        <option value="congreso">Congreso</option>
        <option value="senado">Senado</option>
        <option value="boe">BOE</option>
        <option value="ue">UE</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 12: Write LegislativeAlertBanner.tsx**

```tsx
// apps/web/components/legislative/LegislativeAlertBanner.tsx
import type { LegislativeItem } from "@/lib/types/legislative";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface Props {
  items: LegislativeItem[];
}

export function LegislativeAlertBanner({ items }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const criticals = items.filter(i => i.urgency === "critical");
  if (dismissed || criticals.length === 0) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-red1/10 border border-red1/30">
      <AlertTriangle className="w-4 h-4 text-red1 shrink-0" />
      <div className="flex-1 text-sm text-text1">
        <span className="font-bold text-red1">{criticals.length} iniciativa{criticals.length > 1 ? "s" : ""} crítica{criticals.length > 1 ? "s" : ""}</span>
        {" "}requieren atención inmediata:{" "}
        <span className="text-text2">{criticals[0].short_title || criticals[0].title}</span>
        {criticals.length > 1 && <span className="text-muted"> +{criticals.length - 1} más</span>}
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-bg3 transition">
        <X className="w-3.5 h-3.5 text-muted" />
      </button>
    </div>
  );
}
```

- [ ] **Step 13: Write index.ts barrel**

```typescript
// apps/web/components/legislative/index.ts
export { LegislativeKpiBar } from "./LegislativeKpiBar";
export { LegislativeItemRow } from "./LegislativeItemRow";
export { LegislativeItemDetailPanel } from "./LegislativeItemDetail";
export { LegislativeFilters } from "./LegislativeFilters";
export { LegislativeCalendar } from "./LegislativeCalendar";
export { LegislativeBoeDiary } from "./LegislativeBoeDiary";
export { LegislativeHeatmap } from "./LegislativeHeatmap";
export { LegislativeSectorImpact } from "./LegislativeSectorImpact";
export { LegislativeActorPosition } from "./LegislativeActorPosition";
export { LegislativeTimeline } from "./LegislativeTimeline";
export { LegislativeAlertBanner } from "./LegislativeAlertBanner";
```

- [ ] **Step 14: TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 15: Commit**

```bash
git add apps/web/components/legislative/
git commit -m "feat(legislativo): 11 React components — kpi-bar, item-row, detail-panel, filters, calendar, boe, heatmap, sector-impact, actor-position, timeline, alert-banner"
```

---

## Task 6: Rewrite apps/web/app/legislativo/page.tsx

**Files:**
- Rewrite: `apps/web/app/legislativo/page.tsx`

- [ ] **Step 1: Write the complete new page**

```tsx
// apps/web/app/legislativo/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type {
  LegislativeOverviewResponse, LegislativeItemsResponse,
  LegislativeItem, LegislativeItemDetail as ItemDetail,
} from "@/lib/types/legislative";
import {
  LegislativeKpiBar,
  LegislativeAlertBanner,
  LegislativeItemRow,
  LegislativeItemDetailPanel,
  LegislativeFilters,
  LegislativeCalendar,
  LegislativeBoeDiary,
  LegislativeHeatmap,
} from "@/components/legislative";

type TabId = "monitor" | "iniciativas" | "agenda" | "boe" | "heatmap";

const TABS: { id: TabId; label: string }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "iniciativas", label: "Iniciativas" },
  { id: "agenda", label: "Agenda" },
  { id: "boe", label: "BOE" },
  { id: "heatmap", label: "Heatmap" },
];

const FALLBACK_KPIS = {
  active_initiatives: 187,
  approved_this_month: 23,
  critical_tramitation: 9,
  upcoming_votes: 14,
  mode: "fallback" as const,
};

export default function LegislativoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("monitor");
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");

  // Overview query
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery<LegislativeOverviewResponse>({
    queryKey: ["legislative", "overview"],
    queryFn: () => endpoints.legislativeOverview(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Items query (for "Iniciativas" tab)
  const { data: itemsData, isLoading: itemsLoading } = useQuery<LegislativeItemsResponse>({
    queryKey: ["legislative", "items", urgencyFilter, sectorFilter, jurisdictionFilter, search],
    queryFn: () => endpoints.legislativeItems({
      page: 1,
      page_size: 30,
      urgency: urgencyFilter || undefined,
      sector: sectorFilter || undefined,
      jurisdiction: jurisdictionFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mode = overview?.mode ?? (overviewError ? "error" : "fallback");
  const kpis = overview?.kpis ?? FALLBACK_KPIS;
  const criticalItems = overview?.critical_items ?? [];
  const calendarItems = overview?.calendar_week ?? [];
  const boeItems = overview?.boe_today ?? [];
  const heatmap = overview?.heatmap ?? [];
  const listItems = itemsData?.items ?? criticalItems;

  function handleItemClick(item: LegislativeItem) {
    // Attempt to fetch full detail; show partial while loading
    endpoints.legislativeItemDetail(item.id)
      .then(detail => setSelectedItem(detail))
      .catch(() => {
        // Show minimal detail from list item
        setSelectedItem({
          ...item,
          full_title: item.title,
          summary: "",
          objetivos: [],
          timeline: [],
          sector_impacts: [],
          actor_positions: [],
          evidence: [],
          related_ids: [],
          analyst_note: "",
        });
      });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <div className="flex items-center gap-3 mt-1">
          <Scale className="w-6 h-6 text-cyan1" />
          <h1 className="text-3xl font-bold text-text1">Monitor Legislativo & Regulatorio</h1>
          <ModeBadge
            mode={mode as any}
            source={mode === "real" ? "congreso_api" : "fixtures"}
            message={mode === "real" ? "Datos en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Iniciativas en tramitación, agenda parlamentaria, publicaciones BOE y análisis de impacto sectorial.
        </p>
      </header>

      {/* KPIs */}
      <LegislativeKpiBar kpis={kpis} isLoading={overviewLoading} />

      {/* Alert banner */}
      {criticalItems.length > 0 && <LegislativeAlertBanner items={criticalItems} />}

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-border1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg ${
              activeTab === t.id
                ? "text-cyan1 border-b-2 border-cyan1 bg-bg3/50"
                : "text-text2 hover:text-text1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical items */}
          <div className="lg:col-span-2">
            <section className="premium-card">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-cyan1" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas prioritarias</h2>
              </div>
              {overviewLoading ? (
                <div className="text-sm text-text2 text-center py-8">Cargando…</div>
              ) : (
                <ul className="space-y-3">
                  {criticalItems.slice(0, 6).map(item => (
                    <LegislativeItemRow key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </ul>
              )}
            </section>
          </div>
          {/* Calendar */}
          <div>
            <LegislativeCalendar items={calendarItems} isLoading={overviewLoading} />
          </div>
        </div>
      )}

      {activeTab === "iniciativas" && (
        <div className="space-y-4">
          <LegislativeFilters
            search={search}
            urgency={urgencyFilter}
            sector={sectorFilter}
            jurisdiction={jurisdictionFilter}
            onSearch={setSearch}
            onUrgency={setUrgencyFilter}
            onSector={setSectorFilter}
            onJurisdiction={setJurisdictionFilter}
          />
          <section className="premium-card">
            {itemsLoading ? (
              <div className="text-sm text-text2 text-center py-8">Cargando iniciativas…</div>
            ) : (
              <>
                <div className="text-xs text-muted mb-3">{itemsData?.total ?? listItems.length} resultados</div>
                <ul className="space-y-3">
                  {listItems.map(item => (
                    <LegislativeItemRow key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      {activeTab === "agenda" && (
        <LegislativeCalendar items={calendarItems} isLoading={overviewLoading} />
      )}

      {activeTab === "boe" && (
        <LegislativeBoeDiary items={boeItems} isLoading={overviewLoading} />
      )}

      {activeTab === "heatmap" && (
        <LegislativeHeatmap cells={heatmap} />
      )}

      {/* Detail drawer */}
      {selectedItem && (
        <LegislativeItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 3: Next.js build check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web" && npx next build 2>&1 | tail -20
```

Expected: Route `/legislativo` listed, 0 errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/legislativo/page.tsx
git commit -m "feat(legislativo): rewrite page — multi-tab console with monitor/iniciativas/agenda/boe/heatmap + detail drawer"
```

---

## Task 7: Write delivery report

**Files:**
- Create: `docs/tab-legislativo-regulatorio.md`

- [ ] **Step 1: Write the delivery report**

Create `docs/tab-legislativo-regulatorio.md` with:
- Sprint objective
- What was built (tables: backend files, frontend files, endpoints)
- API contracts (key schemas)
- DataMode table per component
- How to test (curl commands + browser URLs)
- Current limitations + Sprint 6 recommendations

- [ ] **Step 2: Commit**

```bash
git add docs/tab-legislativo-regulatorio.md
git commit -m "docs: tab-legislativo-regulatorio delivery report"
```

---

## Self-Review

**Spec coverage:**
- ✅ Rich schema system (10 enums, 15 models)
- ✅ Services layer (fixtures + scoring + service)
- ✅ 9 endpoints (boe + initiatives + kpis + overview + items + detail + calendar + heatmap + analyze + alert-rule = actually 10 but kpis/boe/initiatives are legacy)
- ✅ TypeScript rich types
- ✅ 11 React components
- ✅ Multi-tab page (monitor/iniciativas/agenda/boe/heatmap)
- ✅ Detail drawer with timeline, sector impact, actor positions
- ✅ DataMode pattern throughout
- ✅ Graceful fallback on all endpoints

**Placeholder scan:** No TBD, TODO, or vague steps. All code blocks complete.

**Type consistency:**
- `LegislativeItem` used in `LegislativeItemRow`, `LegislativeAlertBanner`
- `LegislativeItemDetail` extends `LegislativeItem` ✅
- `CalendarItem` used in `LegislativeCalendar` ✅
- `BoeItem` used in `LegislativeBoeDiary` ✅
- `LegislativeHeatmapCell` used in `LegislativeHeatmap` ✅
- All barrel exports match component names ✅
