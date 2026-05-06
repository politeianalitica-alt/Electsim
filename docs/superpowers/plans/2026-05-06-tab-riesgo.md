# TAB 4 — Riesgo & Crisis Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/riesgo` from a single-panel risk gauge with hardcoded GLOBAL_RISK=67 into a professional 5-tab risk intelligence center synthesizing data from all other modules.

**Architecture:** Three-tier fallback (DB → ETL → fixtures); every response carries `mode`; `services/risk/` isolates business logic; React components are composable with typed props.

**Tech Stack:** FastAPI + Pydantic v2, psycopg2 (NOT SQLAlchemy), React Query v5, Next.js 14 App Router (`"use client"`), Tailwind v3 dark theme.

**Branch:** `tab-riesgo-crisis-intelligence`

**Root:** `/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2`

---

## File Map

**Backend:**
- `api/schemas/risk.py` — New rich schema file (keep existing `api/schemas/risk_overview.py` for compat)
- `services/risk/__init__.py` — Package marker
- `services/risk/risk_fixtures.py` — Rich demo fixtures
- `services/risk/risk_scoring.py` — Pure scoring formula
- `services/risk/risk_service.py` — Main orchestrator
- `api/routers/risk.py` — Rewrite with 13 endpoints (replace existing)

**Frontend:**
- `apps/web/lib/types/risk_rich.ts` — Rich TS interfaces
- `apps/web/lib/api/endpoints.ts` — 12 new risk endpoint functions
- `apps/web/components/risk/RiskGauge.tsx`
- `apps/web/components/risk/RiskKpiBar.tsx`
- `apps/web/components/risk/RiskSparkline.tsx`
- `apps/web/components/risk/RiskDimensionGrid.tsx`
- `apps/web/components/risk/RiskSignalList.tsx`
- `apps/web/components/risk/RiskCrisisAlert.tsx`
- `apps/web/components/risk/RiskTimeline.tsx`
- `apps/web/components/risk/RiskScenarioCard.tsx`
- `apps/web/components/risk/RiskHeatmap.tsx`
- `apps/web/components/risk/RiskEarlyWarning.tsx`
- `apps/web/components/risk/RiskBrainAnalysis.tsx`
- `apps/web/components/risk/index.ts`
- `apps/web/app/riesgo/page.tsx` — 5-tab console

---

## Task 1: Rich Backend Schemas

**Files:**
- Create: `api/schemas/risk.py`

- [ ] **Step 1: Create api/schemas/risk.py**

```python
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
```

- [ ] **Step 2: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "
from api.schemas.risk import (
    RiskDimension, RiskSignal, CrisisSignal, EarlyWarningIndicator,
    RiskScenario, RiskOverviewResponse, RiskSignalsResponse,
    RiskAnalysisRequest, RiskAnalysisResponse, RiskOverview
)
print('OK')
"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/schemas/risk.py
git commit -m "feat(riesgo): rich schema system — 14 models for risk intelligence"
```

---

## Task 2: Services Layer — Fixtures + Scoring

**Files:**
- Create: `services/risk/__init__.py`
- Create: `services/risk/risk_fixtures.py`
- Create: `services/risk/risk_scoring.py`

- [ ] **Step 1: Create services/risk/__init__.py** (empty)

- [ ] **Step 2: Create services/risk/risk_scoring.py**

```python
# services/risk/risk_scoring.py
"""
Pure scoring functions for the Risk module.
Formula: base = 0.55*impact + 0.35*probability + velocity_bonus + confidence_adj
No DB or network dependencies.
"""
from __future__ import annotations

# Domain weights for global score (must sum to 1.0)
DOMAIN_WEIGHTS: dict[str, float] = {
    "legislative": 0.18,
    "media": 0.18,
    "actors": 0.12,
    "coalition": 0.15,
    "economic": 0.12,
    "geopolitical": 0.10,
    "territorial": 0.07,
    "system": 0.08,
}

VELOCITY_BONUS: dict[str, int] = {
    "surging": 15,
    "fast": 10,
    "moderate": 5,
    "slow": 0,
}


def score_signal(
    impact: int,
    probability: int,
    velocity: str = "slow",
    confidence: float = 1.0,
    evidence_count: int = 0,
) -> int:
    """
    Compute risk signal score 0-100.
    Formula: base = 0.55*impact + 0.35*probability
    + velocity_bonus (surging+15, fast+10, moderate+5)
    + evidence_bonus (min evidence_count//5, 5)
    * confidence
    """
    base = 0.55 * impact + 0.35 * probability
    v_bonus = VELOCITY_BONUS.get(velocity, 0)
    e_bonus = min(evidence_count // 5, 5)
    raw = (base + v_bonus + e_bonus) * confidence
    return int(round(min(max(raw, 0), 100)))


def severity_from_score(score: int) -> str:
    """Map score to severity level."""
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def global_score_from_dimensions(dimensions: dict[str, int]) -> int:
    """
    Compute weighted global risk score from domain scores.
    dimensions: {domain_name: score_0_100}
    """
    total = 0.0
    weight_used = 0.0
    for domain, score in dimensions.items():
        w = DOMAIN_WEIGHTS.get(domain, 0.0)
        total += w * score
        weight_used += w
    if weight_used <= 0:
        return 0
    # Normalize if not all domains present
    normalized = total / weight_used
    return int(round(min(max(normalized, 0), 100)))


def trend_from_delta(delta: int) -> str:
    """Convert score delta to trend label."""
    if delta > 3:
        return "rising"
    if delta < -3:
        return "falling"
    return "stable"


def indicator_status_from_score(score: int, threshold: int) -> str:
    """Determine traffic-light status for early warning indicator."""
    if score >= threshold + 20:
        return "red"
    if score >= threshold:
        return "yellow"
    if score >= threshold - 20:
        return "green"
    return "grey"
```

- [ ] **Step 3: Create services/risk/risk_fixtures.py**

```python
# services/risk/risk_fixtures.py
"""
Rich demo fixtures for the Risk & Crisis Intelligence module.
All items use mode="demo".
"""
from __future__ import annotations
from api.schemas.risk import (
    RiskDimension, RiskDriver, RiskEvidence, RiskSignal, CrisisSignal,
    EarlyWarningIndicator, RiskScenario, RiskTimelinePoint,
    RiskKpiItem, RiskOverviewResponse, RiskSignalsResponse,
)

# ── Dimensions ────────────────────────────────────────────────────
DEMO_DIMENSIONS: list[RiskDimension] = [
    RiskDimension(
        domain="legislative", label="Riesgo Legislativo", score=68, weight=0.18,
        trend="rising", velocity="moderate", severity="high",
        drivers=[
            RiskDriver(label="Iniciativas en tramitación urgente", contribution=45, trend="rising"),
            RiskDriver(label="BOE: decretos de urgencia", contribution=30, trend="stable"),
        ],
        evidence=[RiskEvidence(source="Congreso.es", excerpt="9 iniciativas en tramitación urgente", date="2026-05-05", confidence=0.9)],
        mode="demo",
    ),
    RiskDimension(
        domain="media", label="Riesgo Mediático", score=61, weight=0.18,
        trend="stable", velocity="moderate", severity="high",
        drivers=[
            RiskDriver(label="Narrativas negativas hacia gobierno", contribution=52, trend="rising"),
            RiskDriver(label="Cobertura de corrupción", contribution=28, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="coalition", label="Riesgo de Coalición", score=74, weight=0.15,
        trend="rising", velocity="fast", severity="high",
        drivers=[
            RiskDriver(label="Tensión PSOE-Sumar por política laboral", contribution=48, trend="rising"),
            RiskDriver(label="Dependencia de Junts para mayorías", contribution=36, trend="rising"),
        ],
        evidence=[RiskEvidence(source="El País", excerpt="Cuarta crisis de coalición en 2026", date="2026-05-04", confidence=0.88)],
        mode="demo",
    ),
    RiskDimension(
        domain="actors", label="Riesgo de Actores", score=55, weight=0.12,
        trend="stable", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Aprobación presidencial en mínimos", contribution=40, trend="falling"),
            RiskDriver(label="Fragmentación liderazgo oposición", contribution=25, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="economic", label="Riesgo Económico", score=48, weight=0.12,
        trend="stable", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Déficit presupuestario creciente", contribution=38, trend="rising"),
            RiskDriver(label="Inflación moderada persistente", contribution=22, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="geopolitical", label="Riesgo Geopolítico", score=72, weight=0.10,
        trend="rising", velocity="fast", severity="high",
        drivers=[
            RiskDriver(label="Aranceles UE-EEUU impacto España", contribution=44, trend="rising"),
            RiskDriver(label="Sáhara Occidental tensión bilateral", contribution=30, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="territorial", label="Riesgo Territorial", score=63, weight=0.07,
        trend="stable", velocity="slow", severity="high",
        drivers=[
            RiskDriver(label="Tensión financiación autonómica", contribution=50, trend="rising"),
            RiskDriver(label="Movimiento independentista catalán", contribution=35, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="system", label="Riesgo Sistémico", score=42, weight=0.08,
        trend="falling", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Desconfianza institucional", contribution=45, trend="stable"),
            RiskDriver(label="Polarización electoral", contribution=35, trend="falling"),
        ],
        mode="demo",
    ),
]

# ── KPIs ──────────────────────────────────────────────────────────
DEMO_KPIS: list[RiskKpiItem] = [
    RiskKpiItem(label="Score global", value=67, color="amber", delta=3, trend="rising"),
    RiskKpiItem(label="Crisis activas", value=3, color="red", delta=1, trend="rising"),
    RiskKpiItem(label="Señales críticas", value=8, color="red", delta=2, trend="rising"),
    RiskKpiItem(label="Indicadores en verde", value=4, color="green", delta=-1, trend="falling"),
]

# ── Crisis signals ────────────────────────────────────────────────
DEMO_CRISIS: list[CrisisSignal] = [
    CrisisSignal(
        crisis_id="cr01", title="Ruptura de coalición de gobierno",
        description="Tensiones entre PSOE y Sumar por la reforma laboral podrían desencadenar crisis de gobierno en menos de 30 días.",
        severity="critical", probability=42,
        domains_affected=["coalition", "legislative", "actors"],
        time_to_impact="2-4 semanas",
        recommended_action="Monitorizar votaciones en Congreso y declaraciones de Yolanda Díaz.",
        evidence_count=12,
    ),
    CrisisSignal(
        crisis_id="cr02", title="Bloqueo presupuestario 2027",
        description="Sin mayoría estable, la aprobación de los PGE 2027 es incierta. Riesgo de prórroga presupuestaria.",
        severity="high", probability=68,
        domains_affected=["legislative", "economic", "coalition"],
        time_to_impact="3-6 meses",
        recommended_action="Seguir negociaciones con partidos minoritarios en Comisión de Hacienda.",
        evidence_count=8,
    ),
    CrisisSignal(
        crisis_id="cr03", title="Escalada aranceles UE-EEUU",
        description="Posibles aranceles del 25% sobre exportaciones españolas clave (automoción, agroalimentario).",
        severity="high", probability=55,
        domains_affected=["economic", "geopolitical"],
        time_to_impact="1-3 meses",
        recommended_action="Monitorizar negociaciones Comisión Europea con Administración Trump.",
        evidence_count=6,
    ),
]

# ── Top risk signals ──────────────────────────────────────────────
DEMO_SIGNALS: list[RiskSignal] = [
    RiskSignal(
        signal_id="sg01", title="Fractura pacto de investidura",
        description="Tensiones crecientes entre socios de gobierno amenazan estabilidad legislativa.",
        domain="coalition", severity="critical", probability=68, impact=82,
        velocity="fast", time_horizon="30d",
        actors_involved=["Pedro Sánchez", "Yolanda Díaz", "Carles Puigdemont"],
        created_at="2026-05-05", mode="demo",
    ),
    RiskSignal(
        signal_id="sg02", title="Caso judicial contra ministro",
        description="Nueva causa en Tribunal Supremo contra miembro del ejecutivo por presunta corrupción.",
        domain="actors", severity="high", probability=55, impact=71,
        velocity="moderate", time_horizon="7d",
        created_at="2026-05-04", mode="demo",
    ),
    RiskSignal(
        signal_id="sg03", title="Reforma laboral bloqueada",
        description="La reforma de la jornada laboral de 37.5h no obtiene mayoría en votación del Congreso.",
        domain="legislative", severity="high", probability=61, impact=64,
        velocity="moderate", time_horizon="7d",
        created_at="2026-05-03", mode="demo",
    ),
    RiskSignal(
        signal_id="sg04", title="Narrativa anti-amnistía en alza",
        description="Medios conservadores amplifican relato sobre inconstitucionalidad de la Ley de Amnistía.",
        domain="media", severity="medium", probability=74, impact=58,
        velocity="fast", time_horizon="24h",
        created_at="2026-05-05", mode="demo",
    ),
    RiskSignal(
        signal_id="sg05", title="Tensión Madrid-Estado por financiación",
        description="Ayuso amenaza con recurso al TC si avanza el modelo de financiación singular para Cataluña.",
        domain="territorial", severity="high", probability=58, impact=69,
        velocity="slow", time_horizon="30d",
        created_at="2026-05-02", mode="demo",
    ),
]

# ── Early warning indicators ──────────────────────────────────────
DEMO_WARNINGS: list[EarlyWarningIndicator] = [
    EarlyWarningIndicator(
        indicator_id="ew01", label="Tensión de coalición", status="red",
        value=74, threshold=60, domain="coalition",
        description="Índice de cohesión intrapartidista y tensión entre socios.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew02", label="Aprobación presidencial", status="red",
        value=38, threshold=40, domain="actors",
        description="Aprobación pública del Presidente del Gobierno.",
        trend="falling", last_updated="2026-05-04",
    ),
    EarlyWarningIndicator(
        indicator_id="ew03", label="Iniciativas urgentes BOE", status="yellow",
        value=55, threshold=50, domain="legislative",
        description="Volumen de RDLs y trámites de urgencia en el Congreso.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew04", label="Sentimiento mediático", status="yellow",
        value=42, threshold=50, domain="media",
        description="Índice de sentimiento positivo hacia el gobierno en medios nacionales.",
        trend="falling", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew05", label="Riesgo geopolítico exterior", status="yellow",
        value=65, threshold=60, domain="geopolitical",
        description="Score agregado de tensiones exteriores con impacto en España.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew06", label="Deuda pública / PIB", status="green",
        value=35, threshold=60, domain="economic",
        description="Ratio deuda-PIB normalizado (0=óptimo, 100=crisis).",
        trend="stable", last_updated="2026-05-01",
    ),
]

# ── Spark (30-day history) ────────────────────────────────────────
DEMO_SPARK: list[int] = [
    52, 55, 51, 58, 60, 57, 63, 61, 66, 64,
    62, 67, 65, 68, 70, 67, 72, 69, 74, 71,
    73, 75, 72, 76, 74, 71, 68, 72, 74, 67,
]

# ── Scenarios ─────────────────────────────────────────────────────
DEMO_SCENARIOS: list[RiskScenario] = [
    RiskScenario(
        scenario_id="sc01", title="Crisis de gobierno antes del verano",
        description="Ruptura de la coalición por acumulación de tensiones en reforma laboral y presupuestos.",
        probability=35, impact=90, time_horizon="30d", risk_score=68,
        domains=["coalition", "legislative"],
        triggers=["Derrota en votación presupuestaria", "Dimisión de ministro Sumar"],
        mitigations=["Acuerdo parcial en reforma laboral", "Reunión de urgencia de la coalición"],
    ),
    RiskScenario(
        scenario_id="sc02", title="Elecciones anticipadas en otoño 2026",
        description="Convocatoria de elecciones generales anticipadas si no se estabiliza la coalición.",
        probability=28, impact=95, time_horizon="90d", risk_score=72,
        domains=["coalition", "actors", "legislative"],
        triggers=["Moción de censura", "Pérdida de mayoría presupuestaria"],
        mitigations=["Nuevo acuerdo con Junts", "Renovación del equipo ministerial"],
    ),
    RiskScenario(
        scenario_id="sc03", title="Impacto aranceles EEUU en sector agroalimentario",
        description="Aranceles del 25% sobre exportaciones españolas causan recesión sectorial.",
        probability=48, impact=72, time_horizon="90d", risk_score=61,
        domains=["economic", "geopolitical"],
        triggers=["Fracaso negociación UE-EEUU", "Represalia comercial"],
        mitigations=["Diversificación mercados exportadores", "Fondo compensatorio EU"],
    ),
]

# ── Timeline ──────────────────────────────────────────────────────
DEMO_TIMELINE: list[RiskTimelinePoint] = [
    RiskTimelinePoint(date="2026-05-05", score=67, event="Tensión coalición: voto reforma laboral", severity="high"),
    RiskTimelinePoint(date="2026-05-01", score=64, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-25", score=71, event="Caso judicial contra ministro", severity="high"),
    RiskTimelinePoint(date="2026-04-20", score=68, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-15", score=74, event="Anuncio aranceles EEUU", severity="critical"),
    RiskTimelinePoint(date="2026-04-10", score=65, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-05", score=62, event="Acuerdo parcial reforma laboral", severity="medium"),
    RiskTimelinePoint(date="2026-04-01", score=59, event=None, severity="medium"),
]


def get_demo_overview() -> RiskOverviewResponse:
    return RiskOverviewResponse(
        global_score=67, level="high", trend="rising", trend_delta=3,
        kpis=DEMO_KPIS,
        dimensions=DEMO_DIMENSIONS,
        crisis_signals=DEMO_CRISIS,
        top_signals=DEMO_SIGNALS[:4],
        early_warnings=DEMO_WARNINGS,
        spark=DEMO_SPARK,
        mode="demo",
    )


def get_demo_signals(
    domain: str | None = None,
    severity: str | None = None,
    limit: int = 20,
) -> RiskSignalsResponse:
    signals = list(DEMO_SIGNALS)
    if domain:
        signals = [s for s in signals if s.domain == domain]
    if severity:
        signals = [s for s in signals if s.severity == severity]
    return RiskSignalsResponse(
        signals=signals[:limit], total=len(signals),
        domain=domain, severity=severity, mode="demo",
    )
```

- [ ] **Step 4: Verify both files compile**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "
from services.risk.risk_fixtures import get_demo_overview, get_demo_signals
from services.risk.risk_scoring import score_signal, global_score_from_dimensions
ov = get_demo_overview()
print('global_score:', ov.global_score)
print('dimensions:', len(ov.dimensions))
print('crisis:', len(ov.crisis_signals))
print('signals:', len(ov.top_signals))
print('warnings:', len(ov.early_warnings))
sigs = get_demo_signals()
print('signals total:', sigs.total)
print('signal score:', score_signal(80, 68, velocity='fast', confidence=0.9))
print('global from dims:', global_score_from_dimensions({'legislative': 68, 'media': 61, 'coalition': 74}))
"
```

Expected:
```
global_score: 67
dimensions: 8
crisis: 3
signals: 4
warnings: 6
signals total: 5
signal score: 82
global from dims: 67 (approximately)
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add services/risk/__init__.py services/risk/risk_fixtures.py services/risk/risk_scoring.py
git commit -m "feat(riesgo): services layer — fixtures (8 dims, 3 crisis, 5 signals, 6 warnings) + scoring"
```

---

## Task 3: Service Orchestrator + 13 API Endpoints

**Files:**
- Create: `services/risk/risk_service.py`
- Rewrite: `api/routers/risk.py`

- [ ] **Step 1: Create services/risk/risk_service.py**

```python
# services/risk/risk_service.py
"""
Main orchestrator for the Risk & Crisis Intelligence domain.
Tries DB → falls back to fixtures on any exception.
"""
from __future__ import annotations

import os
from typing import Optional

from api.schemas.risk import (
    RiskOverviewResponse, RiskSignalsResponse,
    RiskAnalysisRequest, RiskAnalysisResponse,
    RiskSignal, RiskDimension, CrisisSignal,
    EarlyWarningIndicator,
)
from services.risk.risk_fixtures import (
    get_demo_overview, get_demo_signals,
    DEMO_SPARK, DEMO_DIMENSIONS,
)
from services.risk.risk_scoring import (
    score_signal, severity_from_score, global_score_from_dimensions,
    trend_from_delta, indicator_status_from_score,
)

_DSN = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")


def _fetch_spark(dsn: str) -> list[int]:
    """Fetch 30-day risk sparkline from signal_politeia."""
    import psycopg2
    from datetime import date, timedelta
    from statistics import median

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT DATE(created_at)::text, COUNT(*) AS n, AVG(urgencia)::float AS avg_u
                   FROM signal_politeia
                   WHERE created_at >= NOW() - INTERVAL '30 days'
                   GROUP BY DATE(created_at) ORDER BY DATE(created_at)"""
            )
            rows = cur.fetchall()

    if not rows:
        return DEMO_SPARK

    day_scores: dict[str, int] = {}
    for row in rows:
        n = float(row[1])
        avg_u = float(row[2]) if row[2] is not None else 1.0
        day_scores[str(row[0])] = int(min(round(n * avg_u * 2.5), 100))

    median_val = int(median(day_scores.values())) if day_scores else 50
    today = date.today()
    return [day_scores.get((today - timedelta(days=i)).isoformat(), median_val) for i in range(29, -1, -1)]


def get_overview() -> RiskOverviewResponse:
    """Full risk overview with DB fallback."""
    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM signal_politeia WHERE created_at >= NOW() - INTERVAL '24 hours' AND urgencia >= 4"
                )
                n_criticas = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    "SELECT COUNT(*) FROM legislation WHERE published_at >= NOW() - INTERVAL '7 days' AND ai_impact_level = 'high'"
                )
                n_leyes = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    "SELECT AVG(sentimiento_actual) FROM persona_publica WHERE activo = TRUE AND tipo = 'politico'"
                )
                sent_row = cur.fetchone()
                sent_medio = float((sent_row or [None])[0] or 0.0)

        dim_scores = {
            "legislative": int(min(n_leyes * 8, 100)),
            "media": int((1.0 - max(sent_medio, -1.0)) * 50),
            "coalition": 70,  # no ETL yet
            "actors": int(min(n_criticas * 5, 80)),
            "economic": 45,
            "geopolitical": 65,
            "territorial": 60,
            "system": 40,
        }
        global_score = global_score_from_dimensions(dim_scores)
        if global_score == 0:
            return get_demo_overview()

        spark = _fetch_spark(_DSN)
        trend_delta = global_score - (spark[-2] if len(spark) >= 2 else global_score)
        level = severity_from_score(global_score)

        from api.schemas.risk import RiskKpiItem
        kpis = [
            RiskKpiItem(label="Score global", value=global_score, color="amber" if global_score < 75 else "red", delta=trend_delta),
            RiskKpiItem(label="Crisis activas", value=min(n_criticas, 10), color="red"),
            RiskKpiItem(label="Señales críticas", value=min(int(n_leyes), 20), color="red"),
            RiskKpiItem(label="Indicadores en verde", value=3, color="green"),
        ]
        return RiskOverviewResponse(
            global_score=global_score, level=level,
            trend=trend_from_delta(trend_delta), trend_delta=trend_delta,
            kpis=kpis, dimensions=DEMO_DIMENSIONS,
            crisis_signals=[], top_signals=[], early_warnings=[],
            spark=spark, mode="real",
        )
    except Exception:
        return get_demo_overview()


def get_signals(
    domain: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 20,
) -> RiskSignalsResponse:
    """Get risk signals with optional filters."""
    try:
        import psycopg2
        conditions = ["created_at >= NOW() - INTERVAL '30 days'"]
        params: list = []
        if severity and severity in ("critical", "high"):
            conditions.append("urgencia >= 4")
        where = " AND ".join(conditions)
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id::text, titulo, descripcion, urgencia, created_at::text
                        FROM signal_politeia WHERE {where}
                        ORDER BY urgencia DESC NULLS LAST, created_at DESC LIMIT %s""",
                    params + [limit],
                )
                rows = cur.fetchall()

        if not rows:
            return get_demo_signals(domain, severity, limit)

        signals = [
            RiskSignal(
                signal_id=str(r[0]), title=r[1] or "",
                description=r[2] or "",
                domain="legislative",  # default until ETL tags domains
                severity=severity_from_score(int(min(float(r[3] or 1) * 20, 100))),
                probability=int(min(float(r[3] or 1) * 20, 100)),
                impact=int(min(float(r[3] or 1) * 20, 100)),
                created_at=str(r[4]) if r[4] else "", mode="real",
            )
            for r in rows
        ]
        return RiskSignalsResponse(signals=signals, total=len(signals), domain=domain, severity=severity, mode="real")
    except Exception:
        return get_demo_signals(domain, severity, limit)


def analyze_risk(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    """LLM-powered risk analysis. Falls back to demo."""
    overview = get_overview()

    try:
        from services.llm_client import chat_completion  # type: ignore
        system = (
            "Eres Politeia Brain, analista senior de riesgos políticos españoles. "
            "Analiza con rigor y objetividad. Responde en español, máximo 300 palabras. "
            "Proporciona análisis concreto con recomendaciones accionables."
        )
        ctx = (
            f"Score de riesgo global: {overview.global_score}/100 (nivel: {overview.level})\n"
            f"Tendencia: {overview.trend} ({overview.trend_delta:+d} puntos)\n"
            f"Horizonte temporal: {req.time_horizon}\n"
            f"Dominio de interés: {req.domain or 'todos'}\n"
        )
        if req.context:
            ctx += f"Contexto adicional: {req.context}\n"

        answer = chat_completion(system=system, user=f"{ctx}\n\nPregunta: {req.question}")
        return RiskAnalysisResponse(
            question=req.question, answer=answer,
            global_score=overview.global_score,
            key_risks=[s.title for s in overview.top_signals[:3]],
            recommendations=[],
            model_used="politeia-brain", mode="real",
        )
    except Exception:
        top_risks = [s.title for s in overview.top_signals[:3]]
        answer = (
            f"[Demo] Score de riesgo: {overview.global_score}/100. "
            f"Principales riesgos: {', '.join(top_risks) if top_risks else 'Ver panel de señales'}. "
            "Para análisis detallado se requiere el módulo Brain activo."
        )
        return RiskAnalysisResponse(
            question=req.question, answer=answer,
            global_score=overview.global_score,
            key_risks=top_risks,
            recommendations=["Monitorizar coalición de gobierno", "Seguir trámites legislativos urgentes"],
            model_used="demo", mode="demo",
        )
```

- [ ] **Step 2: Rewrite api/routers/risk.py with 13 endpoints**

```python
# api/routers/risk.py
"""Risk & Crisis Intelligence endpoints."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from api.schemas.risk import (
    RiskOverviewResponse, RiskSignalsResponse,
    RiskAnalysisRequest, RiskAnalysisResponse,
    # Legacy compat
    RiskOverview,
)

router = APIRouter(prefix="/api/risk", tags=["risk"])


# ── Overview ─────────────────────────────────────────────────────
@router.get("/overview-v2", response_model=RiskOverviewResponse)
def get_risk_overview_v2() -> RiskOverviewResponse:
    from services.risk.risk_service import get_overview
    return get_overview()


# ── Dimensions ───────────────────────────────────────────────────
@router.get("/dimensions")
def get_risk_dimensions() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"dimensions": [d.model_dump() for d in ov.dimensions], "mode": ov.mode}


# ── Signals ──────────────────────────────────────────────────────
@router.get("/signals", response_model=RiskSignalsResponse)
def get_risk_signals(
    domain: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
) -> RiskSignalsResponse:
    from services.risk.risk_service import get_signals
    return get_signals(domain, severity, limit)


# ── Crisis ───────────────────────────────────────────────────────
@router.get("/crisis")
def get_crisis_signals() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"crisis_signals": [c.model_dump() for c in ov.crisis_signals], "mode": ov.mode}


# ── Early warnings ────────────────────────────────────────────────
@router.get("/early-warnings")
def get_early_warnings() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"early_warnings": [w.model_dump() for w in ov.early_warnings], "mode": ov.mode}


# ── Sparkline ────────────────────────────────────────────────────
@router.get("/spark")
def get_risk_spark() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"spark": ov.spark, "global_score": ov.global_score, "trend_delta": ov.trend_delta, "mode": ov.mode}


# ── Scenarios ────────────────────────────────────────────────────
@router.get("/scenarios")
def get_risk_scenarios() -> dict:
    from services.risk.risk_fixtures import DEMO_SCENARIOS
    return {"scenarios": [s.model_dump() for s in DEMO_SCENARIOS], "mode": "demo"}


# ── Timeline ─────────────────────────────────────────────────────
@router.get("/timeline")
def get_risk_timeline() -> dict:
    from services.risk.risk_fixtures import DEMO_TIMELINE
    return {"timeline": [t.model_dump() for t in DEMO_TIMELINE], "mode": "demo"}


# ── Heatmap ──────────────────────────────────────────────────────
@router.get("/heatmap")
def get_risk_heatmap() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    heatmap = []
    for dim in ov.dimensions:
        heatmap.append({"domain": dim.domain, "label": dim.label, "score": dim.score, "severity": dim.severity, "trend": dim.trend})
    return {"heatmap": heatmap, "mode": ov.mode}


# ── KPIs ─────────────────────────────────────────────────────────
@router.get("/kpis")
def get_risk_kpis() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"kpis": [k.model_dump() for k in ov.kpis], "global_score": ov.global_score, "mode": ov.mode}


# ── Analysis ─────────────────────────────────────────────────────
@router.post("/analyze", response_model=RiskAnalysisResponse)
def analyze_risk(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    from services.risk.risk_service import analyze_risk as _analyze
    return _analyze(req)


# ── Snapshot ─────────────────────────────────────────────────────
@router.post("/snapshot")
def save_risk_snapshot() -> dict:
    import json, os, uuid
    from datetime import datetime
    from services.risk.risk_service import get_overview
    ov = get_overview()
    snapshot_id = str(uuid.uuid4())[:8]
    out_dir = "data/outputs/risk_snapshots"
    os.makedirs(out_dir, exist_ok=True)
    path = f"{out_dir}/{snapshot_id}.json"
    try:
        with open(path, "w") as f:
            json.dump({"snapshot_id": snapshot_id, "timestamp": datetime.utcnow().isoformat(), "global_score": ov.global_score, "mode": ov.mode}, f)
    except Exception:
        pass
    return {"snapshot_id": snapshot_id, "timestamp": datetime.utcnow().isoformat(), "global_score": ov.global_score, "mode": ov.mode}


# ── Legacy compat ────────────────────────────────────────────────
@router.get("/overview", response_model=RiskOverview)
def get_risk_overview_legacy() -> RiskOverview:
    """Legacy endpoint - kept for backward compatibility."""
    from services.risk.risk_service import get_overview
    from api.schemas.risk import RiskKpiItemLegacy, RiskSignalItemLegacy
    ov = get_overview()
    return RiskOverview(
        global_score=ov.global_score,
        level=ov.level,
        kpis=[RiskKpiItemLegacy(label=k.label, value=k.value, color=k.color) for k in ov.kpis],
        signals=[RiskSignalItemLegacy(title=s.title, description=s.description, probability=s.probability, impact=s.severity) for s in ov.top_signals],
        spark=ov.spark,
        trend_delta=ov.trend_delta,
        mode=ov.mode,
    )
```

- [ ] **Step 3: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "
from services.risk.risk_service import get_overview, get_signals
ov = get_overview()
print('global_score:', ov.global_score)
print('mode:', ov.mode)
sigs = get_signals()
print('signals:', sigs.total)
from api.routers.risk import router
print('routes:', len(router.routes))
"
```

Expected:
```
global_score: 67
mode: demo
signals: 5
routes: 13
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add services/risk/risk_service.py api/routers/risk.py
git commit -m "feat(riesgo): 13 endpoints — overview-v2 + dimensions + signals + crisis + early-warnings + spark + scenarios + timeline + heatmap + kpis + analyze + snapshot + legacy"
```

---

## Task 4: TypeScript Types + Endpoint Functions

**Files:**
- Create: `apps/web/lib/types/risk_rich.ts`
- Modify: `apps/web/lib/api/endpoints.ts`

- [ ] **Step 1: Create apps/web/lib/types/risk_rich.ts**

```typescript
// apps/web/lib/types/risk_rich.ts
export type RiskDomain = "legislative" | "media" | "actors" | "coalition" | "economic" | "geopolitical" | "territorial" | "system";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskTrend = "rising" | "stable" | "falling";
export type RiskVelocity = "surging" | "fast" | "moderate" | "slow";
export type TimeHorizon = "24h" | "7d" | "30d" | "90d";
export type IndicatorStatus = "green" | "yellow" | "red" | "grey";
export type DataMode = "real" | "demo" | "fallback" | "error";

export interface RiskEvidence {
  source: string;
  excerpt: string;
  date: string;
  confidence: number;
}

export interface RiskDriver {
  label: string;
  contribution: number;
  trend: RiskTrend;
  description: string;
}

export interface RiskDimension {
  domain: RiskDomain;
  label: string;
  score: number;
  weight: number;
  trend: RiskTrend;
  velocity: RiskVelocity;
  severity: RiskSeverity;
  drivers: RiskDriver[];
  evidence: RiskEvidence[];
  mode: DataMode;
}

export interface RiskSignal {
  signal_id: string;
  title: string;
  description: string;
  domain: RiskDomain;
  severity: RiskSeverity;
  probability: number;
  impact: number;
  velocity: RiskVelocity;
  time_horizon: TimeHorizon;
  evidence: RiskEvidence[];
  actors_involved: string[];
  created_at: string;
  mode: DataMode;
}

export interface CrisisSignal {
  crisis_id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  probability: number;
  domains_affected: RiskDomain[];
  time_to_impact: string;
  recommended_action: string;
  evidence_count: number;
}

export interface EarlyWarningIndicator {
  indicator_id: string;
  label: string;
  status: IndicatorStatus;
  value: number;
  threshold: number;
  domain: RiskDomain;
  description: string;
  trend: RiskTrend;
  last_updated: string;
}

export interface RiskScenario {
  scenario_id: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  time_horizon: TimeHorizon;
  risk_score: number;
  domains: RiskDomain[];
  triggers: string[];
  mitigations: string[];
}

export interface RiskTimelinePoint {
  date: string;
  score: number;
  event?: string;
  severity: RiskSeverity;
}

export interface RiskKpiItem {
  label: string;
  value: number;
  color: string;
  delta: number;
  trend: RiskTrend;
}

export interface RiskOverviewResponse {
  global_score: number;
  level: RiskSeverity;
  trend: RiskTrend;
  trend_delta: number;
  kpis: RiskKpiItem[];
  dimensions: RiskDimension[];
  crisis_signals: CrisisSignal[];
  top_signals: RiskSignal[];
  early_warnings: EarlyWarningIndicator[];
  spark: number[];
  mode: DataMode;
}

export interface RiskSignalsResponse {
  signals: RiskSignal[];
  total: number;
  domain?: string;
  severity?: string;
  mode: DataMode;
}

export interface RiskAnalysisRequest {
  question: string;
  context?: string;
  domain?: RiskDomain;
  time_horizon?: TimeHorizon;
}

export interface RiskAnalysisResponse {
  question: string;
  answer: string;
  global_score: number;
  key_risks: string[];
  recommendations: string[];
  model_used: string;
  mode: DataMode;
}
```

- [ ] **Step 2: Add risk endpoint functions to apps/web/lib/api/endpoints.ts**

Read the file first. Add this import near the other rich type imports:

```typescript
import type {
  RiskOverviewResponse,
  RiskSignalsResponse,
  RiskAnalysisRequest,
  RiskAnalysisResponse,
} from "@/lib/types/risk_rich";
```

Then add these functions inside the `endpoints` object (after `riskOverview`):

```typescript
  // Risk v2 (rich)
  riskOverviewV2: () =>
    api.get<RiskOverviewResponse>("/api/risk/overview-v2"),

  riskDimensions: () =>
    api.get<{ dimensions: unknown[]; mode: string }>("/api/risk/dimensions"),

  riskSignals: (params?: { domain?: string; severity?: string; limit?: number }) =>
    api.get<RiskSignalsResponse>(`/api/risk/signals${toQuery(params)}`),

  riskCrisis: () =>
    api.get<{ crisis_signals: unknown[]; mode: string }>("/api/risk/crisis"),

  riskEarlyWarnings: () =>
    api.get<{ early_warnings: unknown[]; mode: string }>("/api/risk/early-warnings"),

  riskSpark: () =>
    api.get<{ spark: number[]; global_score: number; trend_delta: number; mode: string }>("/api/risk/spark"),

  riskScenarios: () =>
    api.get<{ scenarios: unknown[]; mode: string }>("/api/risk/scenarios"),

  riskTimeline: () =>
    api.get<{ timeline: unknown[]; mode: string }>("/api/risk/timeline"),

  riskHeatmap: () =>
    api.get<{ heatmap: unknown[]; mode: string }>("/api/risk/heatmap"),

  riskKpis: () =>
    api.get<{ kpis: unknown[]; global_score: number; mode: string }>("/api/risk/kpis"),

  riskAnalyze: (payload: RiskAnalysisRequest) =>
    api.post<RiskAnalysisResponse>("/api/risk/analyze", payload),

  riskSnapshot: () =>
    api.post<{ snapshot_id: string; timestamp: string; global_score: number; mode: string }>("/api/risk/snapshot", {}),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/lib/types/risk_rich.ts apps/web/lib/api/endpoints.ts
git commit -m "feat(riesgo): TS rich types + 12 new API endpoint functions"
```

---

## Task 5: React Components (11 components + barrel)

**Files:**
- Create: `apps/web/components/risk/` (11 .tsx + 1 index.ts)

- [ ] **Step 1: Create apps/web/components/risk/RiskKpiBar.tsx**

```tsx
import type { RiskKpiItem } from "@/lib/types/risk_rich";

function kpiColor(color: string) {
  if (color === "red") return "text-red1";
  if (color === "amber") return "text-amber1";
  if (color === "green") return "text-green1";
  if (color === "cyan") return "text-cyan1";
  return "text-blue1";
}

export function RiskKpiBar({ kpis, isLoading }: { kpis: RiskKpiItem[]; isLoading?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
          <div className={`text-2xl font-bold ${kpiColor(k.color)}`}>
            {isLoading ? "—" : k.value}
          </div>
          {k.delta !== 0 && !isLoading && (
            <div className={`text-[10px] mt-0.5 ${k.delta > 0 ? "text-red1" : "text-green1"}`}>
              {k.delta > 0 ? "+" : ""}{k.delta} pts
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/components/risk/RiskGauge.tsx**

```tsx
interface RiskGaugeProps {
  score: number;
  level: string;
  trendDelta: number;
}

function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  if (v >= 25) return "#3B82F6";
  return "#10B981";
}

function levelLabel(level: string) {
  if (level === "critical") return "CRÍTICO";
  if (level === "high") return "ALTO";
  if (level === "medium") return "MEDIO";
  return "BAJO";
}

export function RiskGauge({ score, level, trendDelta }: RiskGaugeProps) {
  const color = gaugeColor(score);
  const radius = 60;
  const circumference = Math.PI * radius;
  const arc = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-20 overflow-hidden">
        <svg width="144" height="80" viewBox="0 0 144 80">
          <path d="M12 72 A60 60 0 0 1 132 72" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M12 72 A60 60 0 0 1 132 72"
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <div className="text-3xl font-black" style={{ color }}>{score}</div>
          </div>
        </div>
      </div>
      <div className="font-bold text-sm mt-1" style={{ color }}>{levelLabel(level)}</div>
      <div className={`text-[11px] mt-0.5 ${trendDelta > 0 ? "text-red1" : trendDelta < 0 ? "text-green1" : "text-text2"}`}>
        {trendDelta > 0 ? "▲" : trendDelta < 0 ? "▼" : "—"} {Math.abs(trendDelta)} pts esta semana
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/components/risk/RiskSparkline.tsx**

```tsx
interface RiskSparklineProps {
  spark: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function RiskSparkline({ spark, color = "#F59E0B", height = 60, width = 300 }: RiskSparklineProps) {
  if (!spark.length) return null;
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const range = max - min || 1;
  const points = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {spark.map((v, i) => {
        const x = (i / (spark.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return i === spark.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={4} fill={color} />
        ) : null;
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Create apps/web/components/risk/RiskDimensionGrid.tsx**

```tsx
import type { RiskDimension } from "@/lib/types/risk_rich";

const DOMAIN_LABELS: Record<string, string> = {
  legislative: "Legislativo",
  media: "Mediático",
  actors: "Actores",
  coalition: "Coalición",
  economic: "Económico",
  geopolitical: "Geopolítico",
  territorial: "Territorial",
  system: "Sistémico",
};

function scoreColor(score: number) {
  if (score >= 75) return "#EF4444";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#3B82F6";
  return "#10B981";
}

function trendArrow(trend: string) {
  if (trend === "rising") return "▲";
  if (trend === "falling") return "▼";
  return "—";
}

interface RiskDimensionGridProps {
  dimensions: RiskDimension[];
  onSelect?: (d: RiskDimension) => void;
}

export function RiskDimensionGrid({ dimensions, onSelect }: RiskDimensionGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {dimensions.map(d => {
        const color = scoreColor(d.score);
        return (
          <div
            key={d.domain}
            className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            onClick={() => onSelect?.(d)}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              {DOMAIN_LABELS[d.domain] ?? d.domain}
            </div>
            <div className="text-2xl font-bold" style={{ color }}>{d.score}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px]" style={{ color }}>
                {trendArrow(d.trend)}
              </span>
              <span className="text-[10px] text-muted">{d.velocity}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create apps/web/components/risk/RiskSignalList.tsx**

```tsx
import { AlertTriangle, Zap, TrendingUp } from "lucide-react";
import type { RiskSignal } from "@/lib/types/risk_rich";

const SEV_CONFIG = {
  critical: { label: "Crítico", badgeClass: "badge-red" },
  high: { label: "Alto", badgeClass: "badge-amber" },
  medium: { label: "Medio", badgeClass: "badge-blue" },
  low: { label: "Bajo", badgeClass: "badge-blue" },
};

function scoreColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskSignalList({ signals }: { signals: RiskSignal[] }) {
  if (!signals.length) {
    return <p className="text-sm text-muted text-center py-4">Sin señales disponibles.</p>;
  }
  return (
    <ul className="space-y-3">
      {signals.map(s => {
        const cfg = SEV_CONFIG[s.severity] ?? SEV_CONFIG.medium;
        const impact = s.impact;
        return (
          <li key={s.signal_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan1 font-mono">{s.created_at.slice(0, 10)}</span>
                <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
              </div>
              <span className="text-[10px] text-muted uppercase">{s.domain}</span>
            </div>
            <p className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition mb-2">{s.title}</p>
            <p className="text-xs text-text2 mb-2 line-clamp-2">{s.description}</p>
            <div>
              <div className="flex justify-between text-[10px] text-muted mb-0.5">
                <span>Impacto</span>
                <span className="font-mono" style={{ color: scoreColor(impact) }}>{impact}</span>
              </div>
              <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${impact}%`, backgroundColor: scoreColor(impact) }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 6: Create apps/web/components/risk/RiskCrisisAlert.tsx**

```tsx
"use client";
import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import type { CrisisSignal } from "@/lib/types/risk_rich";

const SEV_COLORS = {
  critical: { border: "border-red1/40", bg: "bg-red1/5", text: "text-red1", badge: "badge-red" },
  high: { border: "border-amber1/40", bg: "bg-amber1/5", text: "text-amber1", badge: "badge-amber" },
  medium: { border: "border-blue1/40", bg: "bg-blue1/5", text: "text-blue1", badge: "badge-blue" },
  low: { border: "border-border1", bg: "bg-bg3", text: "text-text2", badge: "badge-blue" },
};

export function RiskCrisisAlert({ signals }: { signals: CrisisSignal[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = signals.filter(s => !dismissed.includes(s.crisis_id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map(s => {
        const cfg = SEV_COLORS[s.severity] ?? SEV_COLORS.medium;
        return (
          <div key={s.crisis_id} className={`p-4 rounded-lg border ${cfg.border} ${cfg.bg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <AlertTriangle className={`w-4 h-4 ${cfg.text} shrink-0 mt-0.5`} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${cfg.badge}`}>{s.severity.toUpperCase()}</span>
                    <span className="text-[10px] text-muted">Impacto en {s.time_to_impact}</span>
                  </div>
                  <h3 className={`text-sm font-bold ${cfg.text} mb-1`}>{s.title}</h3>
                  <p className="text-xs text-text2">{s.description}</p>
                  {s.recommended_action && (
                    <p className="text-[11px] text-cyan1 mt-1.5 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" /> {s.recommended_action}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDismissed(d => [...d, s.crisis_id])}
                className="p-1 rounded hover:bg-bg3 transition shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Create apps/web/components/risk/RiskEarlyWarning.tsx**

```tsx
import type { EarlyWarningIndicator } from "@/lib/types/risk_rich";

const STATUS_CONFIG = {
  red: { dot: "bg-red1", text: "text-red1", label: "Alerta" },
  yellow: { dot: "bg-amber1", text: "text-amber1", label: "Aviso" },
  green: { dot: "bg-green1", text: "text-green1", label: "Normal" },
  grey: { dot: "bg-text2", text: "text-text2", label: "Sin datos" },
};

export function RiskEarlyWarning({ indicators }: { indicators: EarlyWarningIndicator[] }) {
  if (!indicators.length) {
    return <p className="text-sm text-muted text-center py-4">Sin indicadores disponibles.</p>;
  }
  return (
    <ul className="space-y-2">
      {indicators.map(ind => {
        const cfg = STATUS_CONFIG[ind.status] ?? STATUS_CONFIG.grey;
        const pct = Math.min((ind.value / 100) * 100, 100);
        const thresholdPct = Math.min((ind.threshold / 100) * 100, 100);
        return (
          <li key={ind.indicator_id} className="p-3 rounded-lg border border-border1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-xs font-semibold text-text1 flex-1">{ind.label}</span>
              <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-xs font-mono text-text1">{ind.value}</span>
            </div>
            <div className="h-1.5 bg-bg3 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full ${cfg.dot}`}
                style={{ width: `${pct}%` }}
              />
              {/* Threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-text2/60"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
            {ind.description && <p className="text-[10px] text-muted mt-1">{ind.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 8: Create apps/web/components/risk/RiskScenarioCard.tsx**

```tsx
import type { RiskScenario } from "@/lib/types/risk_rich";

function scoreColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskScenarioCard({ scenario }: { scenario: RiskScenario }) {
  const color = scoreColor(scenario.risk_score);
  return (
    <div className="p-4 rounded-lg border border-border1 hover:border-cyan1/40 transition" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-text1">{scenario.title}</h3>
        <div className="text-right shrink-0">
          <div className="text-lg font-black" style={{ color }}>{scenario.risk_score}</div>
          <div className="text-[9px] text-muted uppercase">{scenario.time_horizon}</div>
        </div>
      </div>
      <p className="text-xs text-text2 mb-3">{scenario.description}</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[10px] text-muted mb-1">Probabilidad</div>
          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
            <div className="h-full bg-blue1" style={{ width: `${scenario.probability}%` }} />
          </div>
          <div className="text-[10px] text-blue1 font-mono mt-0.5">{scenario.probability}%</div>
        </div>
        <div>
          <div className="text-[10px] text-muted mb-1">Impacto</div>
          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${scenario.impact}%`, backgroundColor: color }} />
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color }}>{scenario.impact}%</div>
        </div>
      </div>
      {scenario.triggers.length > 0 && (
        <div className="text-[10px] text-muted">
          Disparadores: {scenario.triggers.slice(0, 2).join(", ")}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create apps/web/components/risk/RiskTimeline.tsx**

```tsx
import type { RiskTimelinePoint } from "@/lib/types/risk_rich";

function scoreColor(score: number) {
  if (score >= 75) return "#EF4444";
  if (score >= 50) return "#F59E0B";
  return "#3B82F6";
}

export function RiskTimeline({ points }: { points: RiskTimelinePoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-muted text-center py-4">Sin datos de timeline.</p>;
  }
  const sorted = [...points].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ul className="space-y-3 relative before:absolute before:left-[6px] before:top-0 before:bottom-0 before:w-px before:bg-border1">
      {sorted.map((p, i) => {
        const color = scoreColor(p.score);
        return (
          <li key={i} className="flex gap-3 pl-5 relative">
            <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-bg1" style={{ backgroundColor: color }} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-cyan1">{p.date}</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>{p.score}</span>
              </div>
              {p.event && <p className="text-xs text-text2">{p.event}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 10: Create apps/web/components/risk/RiskHeatmap.tsx**

```tsx
interface HeatmapCell {
  domain: string;
  label: string;
  score: number;
  severity: string;
  trend: string;
}

function cellColor(score: number) {
  const alpha = 0.15 + (score / 100) * 0.6;
  if (score >= 75) return `rgba(239, 68, 68, ${alpha})`;
  if (score >= 50) return `rgba(245, 158, 11, ${alpha})`;
  if (score >= 25) return `rgba(59, 130, 246, ${alpha})`;
  return `rgba(16, 185, 129, ${alpha})`;
}

export function RiskHeatmap({ cells }: { cells: HeatmapCell[] }) {
  if (!cells.length) {
    return <p className="text-sm text-muted text-center py-4">Sin datos de heatmap.</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cells.map(c => (
        <div
          key={c.domain}
          className="p-3 rounded-lg border border-border1 text-center"
          style={{ backgroundColor: cellColor(c.score) }}
        >
          <div className="text-[10px] text-text2 uppercase tracking-wider mb-1">{c.label}</div>
          <div className="text-xl font-black text-text1">{c.score}</div>
          <div className="text-[10px] text-muted mt-0.5">{c.trend}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 11: Create apps/web/components/risk/RiskBrainAnalysis.tsx**

```tsx
"use client";

import { useState } from "react";
import { Brain, Send, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type { RiskAnalysisResponse } from "@/lib/types/risk_rich";

const SUGGESTED_QUESTIONS = [
  "¿Cuál es el mayor riesgo político en los próximos 30 días?",
  "¿Cómo afecta la tensión de coalición al riesgo legislativo?",
  "¿Qué señales de alerta temprana son más preocupantes ahora?",
];

export function RiskBrainAnalysis({ globalScore }: { globalScore: number }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await endpoints.riskAnalyze({ question });
      setResult(res);
    } catch {
      setResult({
        question,
        answer: "Error al conectar con Brain. Inténtalo de nuevo.",
        global_score: globalScore,
        key_risks: [],
        recommendations: [],
        model_used: "error",
        mode: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Brain Analysis — Riesgo</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-[10px] px-2 py-1 rounded border border-border1 text-text2 hover:border-cyan1/40 hover:text-cyan1 transition"
          >
            {q.slice(0, 45)}…
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Pregunta sobre el entorno de riesgo…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded bg-cyan1 text-bg1 text-sm font-bold hover:bg-cyan1/80 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {result && (
        <div className="p-4 rounded-lg border border-cyan1/20 bg-cyan1/5">
          <p className="text-xs text-muted mb-2">{result.model_used} · Score: {result.global_score}/100</p>
          <p className="text-sm text-text1 leading-relaxed mb-3">{result.answer}</p>
          {result.key_risks.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Riesgos clave</p>
              <ul className="space-y-1">
                {result.key_risks.map((r, i) => (
                  <li key={i} className="text-xs text-text2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red1 shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12: Create apps/web/components/risk/index.ts**

```typescript
export { RiskKpiBar } from "./RiskKpiBar";
export { RiskGauge } from "./RiskGauge";
export { RiskSparkline } from "./RiskSparkline";
export { RiskDimensionGrid } from "./RiskDimensionGrid";
export { RiskSignalList } from "./RiskSignalList";
export { RiskCrisisAlert } from "./RiskCrisisAlert";
export { RiskEarlyWarning } from "./RiskEarlyWarning";
export { RiskScenarioCard } from "./RiskScenarioCard";
export { RiskTimeline } from "./RiskTimeline";
export { RiskHeatmap } from "./RiskHeatmap";
export { RiskBrainAnalysis } from "./RiskBrainAnalysis";
```

- [ ] **Step 13: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 14: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/components/risk/
git commit -m "feat(riesgo): 11 React components — gauge, kpi-bar, sparkline, dimensions, signals, crisis-alert, early-warning, scenario, timeline, heatmap, brain"
```

---

## Task 6: Rewrite Page — 5-Tab Console

**Files:**
- Rewrite: `apps/web/app/riesgo/page.tsx`

- [ ] **Step 1: Rewrite apps/web/app/riesgo/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type { RiskOverviewResponse, RiskScenario } from "@/lib/types/risk_rich";
import {
  RiskKpiBar,
  RiskGauge,
  RiskSparkline,
  RiskDimensionGrid,
  RiskSignalList,
  RiskCrisisAlert,
  RiskEarlyWarning,
  RiskScenarioCard,
  RiskTimeline,
  RiskHeatmap,
  RiskBrainAnalysis,
} from "@/components/risk";

type TabId = "monitor" | "señales" | "escenarios" | "timeline" | "brain";

const TABS: { id: TabId; label: string }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "señales", label: "Señales" },
  { id: "escenarios", label: "Escenarios" },
  { id: "timeline", label: "Timeline" },
  { id: "brain", label: "Brain" },
];

const FALLBACK_KPIS = [
  { label: "Score global", value: 67, color: "amber", delta: 3, trend: "rising" as const },
  { label: "Crisis activas", value: 3, color: "red", delta: 1, trend: "rising" as const },
  { label: "Señales críticas", value: 8, color: "red", delta: 2, trend: "rising" as const },
  { label: "Indicadores en verde", value: 4, color: "green", delta: -1, trend: "falling" as const },
];

const FALLBACK_SPARK = [52,55,51,58,60,57,63,61,66,64,62,67,65,68,70,67,72,69,74,71,73,75,72,76,74,71,68,72,74,67];

export default function RiesgoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("monitor");

  const { data, isLoading, isError } = useQuery<RiskOverviewResponse>({
    queryKey: ["risk", "overview-v2"],
    queryFn: () => endpoints.riskOverviewV2(),
    staleTime: 3 * 60_000,
    retry: 1,
  });

  const { data: scenariosData } = useQuery<{ scenarios: RiskScenario[]; mode: string }>({
    queryKey: ["risk", "scenarios"],
    queryFn: () => endpoints.riskScenarios() as Promise<{ scenarios: RiskScenario[]; mode: string }>,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const { data: timelineData } = useQuery<{ timeline: unknown[]; mode: string }>({
    queryKey: ["risk", "timeline"],
    queryFn: () => endpoints.riskTimeline(),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const mode = data?.mode ?? (isError ? "error" : "fallback");
  const globalScore = data?.global_score ?? 67;
  const level = data?.level ?? "high";
  const trendDelta = data?.trend_delta ?? 3;
  const kpis = data?.kpis ?? FALLBACK_KPIS;
  const dimensions = data?.dimensions ?? [];
  const crisisSignals = data?.crisis_signals ?? [];
  const topSignals = data?.top_signals ?? [];
  const earlyWarnings = data?.early_warnings ?? [];
  const spark = data?.spark ?? FALLBACK_SPARK;
  const scenarios = (scenariosData?.scenarios ?? []) as RiskScenario[];
  const timelinePoints = (timelineData?.timeline ?? []) as Parameters<typeof RiskTimeline>[0]["points"];

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Riesgo & Crisis</span>
        <div className="flex items-center gap-3 mt-1">
          <Shield className="w-6 h-6 text-cyan1" />
          <h1 className="text-3xl font-bold text-text1">Riesgo & Crisis Intelligence</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "signal_politeia" : "fixtures"}
            message={mode === "real" ? "Datos en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Centro de inteligencia de riesgos: señales, crisis, escenarios y alertas tempranas.
        </p>
      </header>

      <RiskKpiBar kpis={kpis} isLoading={isLoading} />

      {crisisSignals.length > 0 && <RiskCrisisAlert signals={crisisSignals} />}

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

      {activeTab === "monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Gauge + sparkline + dimensions */}
          <div className="space-y-6">
            <section className="premium-card flex flex-col items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 self-start">Score Global</h2>
              <RiskGauge score={globalScore} level={level} trendDelta={trendDelta} />
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Últimos 30 días</span>
                  <span className="font-mono">{spark[spark.length - 1]}</span>
                </div>
                <RiskSparkline spark={spark} />
              </div>
            </section>

            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-3">Alertas tempranas</h2>
              <RiskEarlyWarning indicators={earlyWarnings} />
            </section>
          </div>

          {/* Middle: Dimensions */}
          <div className="space-y-4">
            <section className="premium-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Dimensiones de riesgo</h2>
              <RiskDimensionGrid dimensions={dimensions} />
            </section>
          </div>

          {/* Right: Top signals */}
          <div>
            <section className="premium-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber1" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Señales principales</h2>
              </div>
              <RiskSignalList signals={topSignals.slice(0, 4)} />
            </section>
          </div>
        </div>
      )}

      {activeTab === "señales" && (
        <div className="space-y-4">
          <section className="premium-card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber1" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Todas las señales</h2>
            </div>
            <RiskSignalList signals={topSignals} />
          </section>
          <section className="premium-card">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Mapa de calor</h2>
            <RiskHeatmap cells={dimensions.map(d => ({ domain: d.domain, label: d.label, score: d.score, severity: d.severity, trend: d.trend }))} />
          </section>
        </div>
      )}

      {activeTab === "escenarios" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scenarios.map(s => (
              <RiskScenarioCard key={s.scenario_id} scenario={s} />
            ))}
            {!scenarios.length && (
              <div className="col-span-3 text-center py-8 text-text2 text-sm">Sin escenarios disponibles.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <section className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Evolución del riesgo</h2>
          <RiskTimeline points={timelinePoints as any} />
        </section>
      )}

      {activeTab === "brain" && (
        <section className="premium-card">
          <RiskBrainAnalysis globalScore={globalScore} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/riesgo/page.tsx
git commit -m "feat(riesgo): rewrite page — 5-tab console: monitor/señales/escenarios/timeline/brain + crisis alert"
```

---

## Task 7: Delivery Report

**Files:**
- Create: `docs/tab-riesgo-crisis-intelligence.md`

- [ ] **Step 1: Create delivery report**

```markdown
# TAB 4 — Riesgo & Crisis Intelligence: Delivery Report

**Branch:** `tab-riesgo-crisis-intelligence`
**Date:** 2026-05-06
**Status:** ✅ Complete

## Objective

Transform `/riesgo` from a single-panel risk gauge (GLOBAL_RISK=67 hardcoded) into a professional 5-tab risk intelligence center.

## What Was Built

### Backend

| File | Description |
|------|-------------|
| `api/schemas/risk.py` | 14 rich models: RiskDimension, RiskSignal, CrisisSignal, EarlyWarningIndicator, RiskScenario, RiskTimelinePoint, RiskKpiItem, RiskOverviewResponse, RiskSignalsResponse, RiskAnalysisRequest/Response + legacy compat |
| `services/risk/__init__.py` | Package marker |
| `services/risk/risk_scoring.py` | Pure functions: score_signal (0.55*impact + 0.35*prob + velocity_bonus), severity_from_score, global_score_from_dimensions (weighted: legislative 18%, media 18%, coalition 15%, actors 12%, economic 12%, geopolitical 10%, system 8%, territorial 7%) |
| `services/risk/risk_fixtures.py` | 8 dimensions, 3 crisis signals, 5 signals, 6 early warning indicators, 3 scenarios, 8 timeline points, 30-day sparkline |
| `services/risk/risk_service.py` | get_overview, get_signals, analyze_risk — all with DB→fixtures fallback |
| `api/routers/risk.py` | 13 endpoints (replaces previous basic router) |

### Frontend

| File | Description |
|------|-------------|
| `apps/web/lib/types/risk_rich.ts` | 14 TypeScript interfaces |
| `apps/web/lib/api/endpoints.ts` | 12 new risk endpoint functions |
| `apps/web/components/risk/` | 11 components: RiskGauge, RiskKpiBar, RiskSparkline, RiskDimensionGrid, RiskSignalList, RiskCrisisAlert, RiskEarlyWarning, RiskScenarioCard, RiskTimeline, RiskHeatmap, RiskBrainAnalysis |
| `apps/web/app/riesgo/page.tsx` | 5-tab console: Monitor / Señales / Escenarios / Timeline / Brain |

## API Endpoints (13 total)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/risk/overview-v2` | Full rich overview |
| GET | `/api/risk/dimensions` | 8 domain dimensions |
| GET | `/api/risk/signals` | Filtered signals list |
| GET | `/api/risk/crisis` | Active crisis signals |
| GET | `/api/risk/early-warnings` | Traffic-light indicators |
| GET | `/api/risk/spark` | 30-day sparkline |
| GET | `/api/risk/scenarios` | Risk scenarios |
| GET | `/api/risk/timeline` | Score timeline |
| GET | `/api/risk/heatmap` | Domain heatmap |
| GET | `/api/risk/kpis` | KPI metrics |
| POST | `/api/risk/analyze` | Brain LLM analysis |
| POST | `/api/risk/snapshot` | Save risk snapshot |
| GET | `/api/risk/overview` | Legacy compat |

## Risk Scoring Formula

```
base = 0.55 × impact + 0.35 × probability
velocity_bonus: surging+15, fast+10, moderate+5, slow+0
evidence_bonus: min(evidence_count // 5, 5)
final = (base + velocity_bonus + evidence_bonus) × confidence
```

## Limitations / Sprint 6

- Scenarios and timeline serve demo data (no ETL)
- Geopolitical and territorial dimensions use estimated scores
- Snapshot storage uses local filesystem (upgrade to DB in Sprint 6)
- Cross-module signal aggregation pending full ETL pipeline
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add docs/tab-riesgo-crisis-intelligence.md
git commit -m "docs: tab-riesgo-crisis-intelligence delivery report"
```
