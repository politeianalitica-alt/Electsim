# TAB 3 — Actores & Ontología Política Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/actores` from a basic grid of hardcoded actor cards into a professional actor intelligence layer with dossiers, ontology graph, positions, relationships, contradictions, media exposure, legislative activity, and Brain analysis.

**Architecture:** Three-tier fallback (DB → ETL → fixtures); every API response carries `mode: real|demo|fallback|error`; services layer (`services/actors/`) isolates business logic from routers; React components are composable and receive typed props.

**Tech Stack:** FastAPI + Pydantic v2, psycopg2 (NOT SQLAlchemy), React Query v5, Next.js 14 App Router (`"use client"`), Tailwind v3 dark theme, TypeScript strict.

**Branch:** `tab-actores-ontologia`

**Root:** `/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2`

---

## File Map

**Backend (new/rewritten):**
- `api/schemas/actors.py` — Rewrite with 14 rich models
- `services/actors/__init__.py` — Package marker
- `services/actors/actor_fixtures.py` — Rich demo fixtures
- `services/actors/actor_scoring.py` — Pure scoring functions
- `services/actors/actor_service.py` — Main orchestrator
- `services/actors/actor_graph.py` — Graph builder
- `api/routers/actors.py` — Rewrite with 10 endpoints

**Frontend (new/rewritten):**
- `apps/web/lib/types/actors_rich.ts` — 14 rich TypeScript interfaces
- `apps/web/lib/api/endpoints.ts` — Add 10 new actor endpoint functions
- `apps/web/components/actors/ActorKpiBar.tsx`
- `apps/web/components/actors/ActorCard.tsx`
- `apps/web/components/actors/ActorDossierPanel.tsx`
- `apps/web/components/actors/ActorPositionList.tsx`
- `apps/web/components/actors/ActorRelationshipGraph.tsx`
- `apps/web/components/actors/ActorTimeline.tsx`
- `apps/web/components/actors/ActorContradictions.tsx`
- `apps/web/components/actors/ActorMediaExposure.tsx`
- `apps/web/components/actors/ActorLegislativeActivity.tsx`
- `apps/web/components/actors/ActorFilters.tsx`
- `apps/web/components/actors/ActorTopExposure.tsx`
- `apps/web/components/actors/ActorPartySummary.tsx`
- `apps/web/components/actors/ActorBrainAnalysis.tsx`
- `apps/web/components/actors/index.ts`
- `apps/web/app/actores/page.tsx` — Rewrite as 4-tab console

---

## Task 1: Rich Backend Schemas

**Files:**
- Rewrite: `api/schemas/actors.py`

- [ ] **Step 1: Rewrite api/schemas/actors.py with all 14 models**

```python
# api/schemas/actors.py
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field
from api.schemas.status import DataMode

# ── Literal aliases ──────────────────────────────────────────────
ActorType = Literal["politico", "cargo_publico", "empresario", "periodista", "activista", "otro"]
ActorStatus = Literal["active", "inactive", "unknown"]
RelationshipType = Literal["aliado", "rival", "coalicion", "oposicion", "mentor", "pupilo", "neutral"]
PositionStance = Literal["favor", "contra", "abstencion", "sin_posicion"]
TimelineEventType = Literal["declaracion", "voto", "cargo", "escandalo", "logro", "otro"]
MediaChannel = Literal["tv", "digital", "radio", "redes", "prensa"]


# ── Core actor model ─────────────────────────────────────────────
class PoliticalActor(BaseModel):
    id: str
    name: str
    normalized_name: str = ""
    aliases: list[str] = Field(default_factory=list)
    actor_type: ActorType = "politico"
    party: str = ""
    party_id: Optional[str] = None
    party_color: str = "#94A3B8"
    institution: str = ""
    role: str = ""
    territory: str = "Nacional"
    bio: str = ""
    image_url: Optional[str] = None
    current_office: str = ""
    previous_offices: list[str] = Field(default_factory=list)
    status: ActorStatus = "active"
    topics: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    evidence_count: int = 0
    confidence: float = Field(default=1.0, ge=0, le=1)
    # Metrics
    exposure: int = Field(default=0, ge=0, le=100)
    approval: int = Field(default=50, ge=0, le=100)
    sentiment: Literal["up", "down", "stable"] = "stable"
    influence_score: int = Field(default=0, ge=0, le=100)
    mode: DataMode = "demo"


class ActorMetric(BaseModel):
    label: str
    value: int       # 0-100
    delta: int = 0   # change in last 7 days
    trend: Literal["up", "down", "stable"] = "stable"
    color: str = "blue"


class ActorPosition(BaseModel):
    topic: str
    sector: str = ""
    stance: PositionStance
    summary: str
    evidence_quote: str = ""
    source: str = ""
    date: str = ""
    confidence: float = Field(default=1.0, ge=0, le=1)


class ActorRelationship(BaseModel):
    target_id: str
    target_name: str
    target_party: str = ""
    target_color: str = "#94A3B8"
    relationship_type: RelationshipType
    strength: int = Field(default=50, ge=0, le=100)  # 0=weak, 100=strong
    description: str = ""
    since: str = ""
    evidence_count: int = 0


class ActorTimelineEvent(BaseModel):
    event_id: str
    date: str
    event_type: TimelineEventType
    title: str
    description: str = ""
    outcome: Optional[str] = None   # "positive" | "negative" | "neutral"
    source: str = ""
    impact: int = Field(default=50, ge=0, le=100)


class ActorContradiction(BaseModel):
    contradiction_id: str
    topic: str
    statement_a: str
    date_a: str
    statement_b: str
    date_b: str
    severity: Literal["low", "medium", "high"] = "medium"
    source_a: str = ""
    source_b: str = ""


class ActorDossier(PoliticalActor):
    """Full actor dossier extending PoliticalActor with relational data."""
    metrics: list[ActorMetric] = Field(default_factory=list)
    positions: list[ActorPosition] = Field(default_factory=list)
    relationships: list[ActorRelationship] = Field(default_factory=list)
    timeline: list[ActorTimelineEvent] = Field(default_factory=list)
    contradictions: list[ActorContradiction] = Field(default_factory=list)
    top_media_stories: list[dict] = Field(default_factory=list)
    legislative_items: list[dict] = Field(default_factory=list)
    narratives: list[str] = Field(default_factory=list)
    analysis_note: str = ""
    warnings: list[str] = Field(default_factory=list)


# ── Graph models ─────────────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    name: str
    party: str = ""
    party_color: str = "#94A3B8"
    actor_type: ActorType = "politico"
    influence_score: int = 0
    x: float = 0.0
    y: float = 0.0


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship_type: RelationshipType
    strength: int = 50
    label: str = ""


class ActorGraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    mode: DataMode


# ── List / Overview responses ────────────────────────────────────
class ActorKpiItem(BaseModel):
    label: str
    value: int
    color: str = "blue"
    delta: int = 0


class ActorsOverviewResponse(BaseModel):
    kpis: list[ActorKpiItem] = Field(default_factory=list)
    top_exposure: list[PoliticalActor] = Field(default_factory=list)
    party_distribution: list[dict] = Field(default_factory=list)   # [{party, color, count}]
    recent_events: list[ActorTimelineEvent] = Field(default_factory=list)
    mode: DataMode


class ActorsListResponse(BaseModel):
    actors: list[PoliticalActor] = Field(default_factory=list)
    total: int
    page: int = 1
    page_size: int = 30
    mode: DataMode


# ── Analysis ────────────────────────────────────────────────────
class ActorAnalysisRequest(BaseModel):
    actor_id: str
    question: str
    context: str = ""


class ActorAnalysisResponse(BaseModel):
    actor_id: str
    actor_name: str
    question: str
    answer: str
    model_used: str = "demo"
    mode: DataMode


# ── Legacy compat (kept for backward compat with existing router) ─
class ActorItem(BaseModel):
    id: str
    name: str
    party: str = ""
    party_color: str = "#94A3B8"
    role: str = ""
    bio: str = ""
    exposure: int = 0
    approval: int = 50
    sentiment: str = "stable"


class ActorsResponse(BaseModel):
    actors: list[ActorItem] = Field(default_factory=list)
    total: int
    mode: DataMode
```

- [ ] **Step 2: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "from api.schemas.actors import ActorDossier, ActorGraphResponse, ActorsOverviewResponse, ActorsListResponse, ActorAnalysisRequest, ActorAnalysisResponse; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/schemas/actors.py
git commit -m "feat(actores): rich schema system — 14 models for actor intelligence"
```

---

## Task 2: Services Layer — Fixtures + Scoring

**Files:**
- Create: `services/actors/__init__.py`
- Create: `services/actors/actor_fixtures.py`
- Create: `services/actors/actor_scoring.py`

- [ ] **Step 1: Create services/actors/__init__.py**

```python
# services/actors/__init__.py
```

- [ ] **Step 2: Create services/actors/actor_fixtures.py**

```python
# services/actors/actor_fixtures.py
"""
Rich demo fixtures for the Actors & Ontología module.
All items use mode="demo" and contain realistic Spanish political data.
"""
from __future__ import annotations
from api.schemas.actors import (
    PoliticalActor, ActorMetric, ActorPosition, ActorRelationship,
    ActorTimelineEvent, ActorContradiction, ActorDossier, ActorKpiItem,
    ActorsOverviewResponse, ActorsListResponse, ActorGraphResponse,
    GraphNode, GraphEdge,
)

# ── Core actor list ──────────────────────────────────────────────
DEMO_ACTORS: list[PoliticalActor] = [
    PoliticalActor(
        id="ps01", name="Pedro Sánchez", normalized_name="pedro sanchez",
        aliases=["Pedro", "PSOE-Sánchez"],
        actor_type="politico", party="PSOE", party_color="#E03A3E",
        institution="Gobierno de España", role="Presidente del Gobierno",
        territory="Nacional", bio="Secretario General del PSOE y Presidente del Gobierno desde 2018.",
        current_office="Presidente del Gobierno",
        previous_offices=["Secretario General PSOE", "Diputado por Madrid"],
        status="active",
        topics=["economía", "cohesión territorial", "política exterior", "vivienda"],
        sectors=["gobierno", "partidos"],
        evidence_count=342, confidence=0.97,
        exposure=96, approval=38, sentiment="down", influence_score=98, mode="demo",
    ),
    PoliticalActor(
        id="pp01", name="Alberto Núñez Feijóo", normalized_name="alberto nunez feijoo",
        aliases=["Feijóo", "PP-Feijóo"],
        actor_type="politico", party="PP", party_color="#1F77FF",
        institution="Congreso de los Diputados", role="Líder de la oposición",
        territory="Nacional", bio="Presidente del PP desde 2022. Ex-Presidente de la Xunta de Galicia.",
        current_office="Presidente del PP",
        previous_offices=["Presidente Xunta de Galicia", "Senador"],
        status="active",
        topics=["economía", "seguridad", "sanidad", "educación"],
        sectors=["oposición", "partidos"],
        evidence_count=298, confidence=0.95,
        exposure=91, approval=42, sentiment="up", influence_score=92, mode="demo",
    ),
    PoliticalActor(
        id="vx01", name="Santiago Abascal", normalized_name="santiago abascal",
        aliases=["Abascal", "VOX-Abascal"],
        actor_type="politico", party="VOX", party_color="#5BC035",
        institution="Congreso de los Diputados", role="Presidente de VOX",
        territory="Nacional", bio="Líder y cofundador de VOX. Diputado nacional.",
        current_office="Presidente de VOX",
        previous_offices=["Diputado Congreso", "Político del PP"],
        status="active",
        topics=["inmigración", "seguridad", "identidad nacional", "economía"],
        sectors=["oposición", "partidos"],
        evidence_count=187, confidence=0.93,
        exposure=78, approval=28, sentiment="stable", influence_score=74, mode="demo",
    ),
    PoliticalActor(
        id="su01", name="Yolanda Díaz", normalized_name="yolanda diaz",
        aliases=["Yolanda", "Sumar-Díaz"],
        actor_type="politico", party="Sumar", party_color="#D81E5B",
        institution="Gobierno de España", role="Vicepresidenta segunda y Ministra de Trabajo",
        territory="Nacional", bio="Vicepresidenta segunda del Gobierno. Líder de Sumar.",
        current_office="Ministra de Trabajo",
        previous_offices=["Líder de Unidas Podemos"],
        status="active",
        topics=["trabajo", "derechos sociales", "salario mínimo", "jornada laboral"],
        sectors=["gobierno", "partidos"],
        evidence_count=211, confidence=0.94,
        exposure=74, approval=36, sentiment="down", influence_score=71, mode="demo",
    ),
    PoliticalActor(
        id="pp02", name="Isabel Díaz Ayuso", normalized_name="isabel diaz ayuso",
        aliases=["Ayuso", "PP-Ayuso"],
        actor_type="politico", party="PP", party_color="#1F77FF",
        institution="Comunidad de Madrid", role="Presidenta de la Comunidad de Madrid",
        territory="Madrid", bio="Presidenta de la Comunidad de Madrid desde 2021.",
        current_office="Presidenta CAM",
        previous_offices=["Diputada por Madrid"],
        status="active",
        topics=["fiscalidad", "libertad", "sanidad", "educación"],
        sectors=["CCAA", "oposición"],
        evidence_count=256, confidence=0.96,
        exposure=88, approval=45, sentiment="up", influence_score=85, mode="demo",
    ),
    PoliticalActor(
        id="jn01", name="Carles Puigdemont", normalized_name="carles puigdemont",
        aliases=["Puigdemont", "Junts-Puigdemont"],
        actor_type="politico", party="Junts", party_color="#00C2A8",
        institution="Junts per Catalunya", role="Presidente de Junts",
        territory="Cataluña", bio="Expresidente de la Generalitat de Catalunya. En el exilio desde 2017.",
        current_office="Presidente de Junts",
        previous_offices=["Presidente Generalitat Catalunya", "Eurodiputado"],
        status="active",
        topics=["independencia", "amnistía", "financiación autonómica"],
        sectors=["partidos", "CCAA"],
        evidence_count=178, confidence=0.91,
        exposure=71, approval=22, sentiment="stable", influence_score=79, mode="demo",
    ),
    PoliticalActor(
        id="ps02", name="María Jesús Montero", normalized_name="maria jesus montero",
        aliases=["Montero", "Ministra Hacienda"],
        actor_type="politico", party="PSOE", party_color="#E03A3E",
        institution="Gobierno de España", role="Ministra de Hacienda",
        territory="Nacional", bio="Ministra de Hacienda y portavoz del Gobierno.",
        current_office="Ministra de Hacienda",
        previous_offices=["Consejera de Salud Andalucía"],
        status="active",
        topics=["presupuestos", "fiscalidad", "deuda pública", "financiación autonómica"],
        sectors=["gobierno", "partidos"],
        evidence_count=143, confidence=0.93,
        exposure=68, approval=34, sentiment="stable", influence_score=72, mode="demo",
    ),
    PoliticalActor(
        id="pp03", name="Jorge Fernández Díaz", normalized_name="jorge fernandez diaz",
        aliases=["Fernández Díaz"],
        actor_type="politico", party="PP", party_color="#1F77FF",
        institution="Congreso de los Diputados", role="Diputado",
        territory="Cataluña", bio="Ex-Ministro del Interior. Diputado por Barcelona.",
        current_office="Diputado",
        previous_offices=["Ministro del Interior", "Delegado Gobierno Cataluña"],
        status="active",
        topics=["interior", "seguridad", "Cataluña"],
        sectors=["oposición", "partidos"],
        evidence_count=89, confidence=0.88,
        exposure=42, approval=31, sentiment="down", influence_score=38, mode="demo",
    ),
]

# ── KPIs ─────────────────────────────────────────────────────────
DEMO_KPIS: list[ActorKpiItem] = [
    ActorKpiItem(label="Actores monitorizados", value=247, color="blue", delta=3),
    ActorKpiItem(label="Con alta exposición", value=18, color="amber", delta=-2),
    ActorKpiItem(label="Contradicciones detectadas", value=34, color="red", delta=5),
    ActorKpiItem(label="Relaciones mapeadas", value=892, color="cyan", delta=12),
]

# ── Recent events ────────────────────────────────────────────────
DEMO_EVENTS: list[ActorTimelineEvent] = [
    ActorTimelineEvent(
        event_id="ev01", date="2026-05-05", event_type="declaracion",
        title="Sánchez defiende el presupuesto en el Congreso",
        description="El presidente presentó el marco de gasto ante la oposición.",
        outcome="neutral", source="El País", impact=72,
    ),
    ActorTimelineEvent(
        event_id="ev02", date="2026-05-04", event_type="voto",
        title="PP rechaza enmienda sobre vivienda",
        description="El PP votó en contra de la enmienda de Sumar sobre alquileres sociales.",
        outcome="negative", source="El Mundo", impact=61,
    ),
    ActorTimelineEvent(
        event_id="ev03", date="2026-05-03", event_type="escandalo",
        title="Filtración de conversaciones de Puigdemont",
        description="Medios publican mensajes privados del líder de Junts.",
        outcome="negative", source="La Vanguardia", impact=78,
    ),
]

# ── Party distribution ───────────────────────────────────────────
DEMO_PARTY_DIST: list[dict] = [
    {"party": "PSOE", "color": "#E03A3E", "count": 72},
    {"party": "PP", "color": "#1F77FF", "count": 68},
    {"party": "VOX", "color": "#5BC035", "count": 33},
    {"party": "Sumar", "color": "#D81E5B", "count": 28},
    {"party": "Junts", "color": "#00C2A8", "count": 18},
    {"party": "ERC", "color": "#F4B400", "count": 15},
    {"party": "PNV", "color": "#1D8042", "count": 13},
    {"party": "Otros", "color": "#94A3B8", "count": 0},
]

# ── Full dossier for Pedro Sánchez ───────────────────────────────
def _sanchez_dossier() -> ActorDossier:
    base = DEMO_ACTORS[0]
    return ActorDossier(
        **base.model_dump(),
        metrics=[
            ActorMetric(label="Exposición mediática", value=96, delta=2, trend="up", color="cyan"),
            ActorMetric(label="Aprobación pública", value=38, delta=-3, trend="down", color="red"),
            ActorMetric(label="Influencia parlamentaria", value=84, delta=0, trend="stable", color="blue"),
            ActorMetric(label="Cohesión de coalición", value=51, delta=-5, trend="down", color="amber"),
        ],
        positions=[
            ActorPosition(
                topic="Vivienda", sector="social",
                stance="favor",
                summary="Defiende la intervención pública en el mercado de alquiler.",
                evidence_quote="'El derecho a la vivienda es irrenunciable y el Estado debe garantizarlo.'",
                source="El País", date="2026-04-10", confidence=0.95,
            ),
            ActorPosition(
                topic="Financiación autonómica", sector="territorial",
                stance="favor",
                summary="Propone nuevo modelo de financiación que beneficia a Cataluña.",
                evidence_quote="'Debemos modernizar el sistema de financiación autonómica.'",
                source="La Moncloa", date="2026-03-22", confidence=0.92,
            ),
            ActorPosition(
                topic="Déficit presupuestario", sector="economía",
                stance="contra",
                summary="Se opone a recortes de gasto como solución al déficit.",
                evidence_quote="'No vamos a recortar en sanidad ni educación para cuadrar el déficit.'",
                source="RTVE", date="2026-02-15", confidence=0.89,
            ),
        ],
        relationships=[
            ActorRelationship(
                target_id="su01", target_name="Yolanda Díaz",
                target_party="Sumar", target_color="#D81E5B",
                relationship_type="coalicion", strength=68,
                description="Socios de gobierno en coalición progresista.",
                since="2023-11-17", evidence_count=45,
            ),
            ActorRelationship(
                target_id="pp01", target_name="Alberto Núñez Feijóo",
                target_party="PP", target_color="#1F77FF",
                relationship_type="rival", strength=92,
                description="Principal adversario político en el Congreso.",
                since="2022-04-01", evidence_count=123,
            ),
            ActorRelationship(
                target_id="jn01", target_name="Carles Puigdemont",
                target_party="Junts", target_color="#00C2A8",
                relationship_type="neutral", strength=44,
                description="Relación transaccional clave para la investidura.",
                since="2023-09-01", evidence_count=87,
            ),
        ],
        timeline=[
            ActorTimelineEvent(
                event_id="t01", date="2026-05-05", event_type="declaracion",
                title="Discurso sobre el estado de la nación",
                description="Presentó los logros del gobierno y objetivos para 2027.",
                outcome="neutral", source="La Moncloa", impact=80,
            ),
            ActorTimelineEvent(
                event_id="t02", date="2026-04-20", event_type="logro",
                title="Aprobación de RDL de vivienda",
                description="El Congreso aprobó el Real Decreto-Ley de medidas de vivienda.",
                outcome="positive", source="BOE", impact=74,
            ),
            ActorTimelineEvent(
                event_id="t03", date="2026-03-15", event_type="escandalo",
                title="Caso Koldo: comparecencia en el Senado",
                description="Comparecencia ante el Senado por el caso de corrupción.",
                outcome="negative", source="El Confidencial", impact=68,
            ),
        ],
        contradictions=[
            ActorContradiction(
                contradiction_id="c01", topic="Amnistía",
                statement_a="'La amnistía es inconstitucional y nunca la apoyaré.'",
                date_a="2019-02-10",
                statement_b="'La Ley de Amnistía es necesaria para la concordia territorial.'",
                date_b="2023-10-03",
                severity="high", source_a="El País", source_b="La Moncloa",
            ),
        ],
        narratives=["Líder del 'gobierno más progresista'", "Figura divisoria de la política española", "Defensor del diálogo territorial"],
        analysis_note="Pedro Sánchez mantiene alta exposición mediática pero con aprobación baja y tendencia negativa. La coalición con Sumar muestra signos de tensión (-5 en cohesión). El acuerdo con Junts es el principal factor de riesgo para la estabilidad del gobierno.",
        warnings=["Aprobación por debajo del umbral de riesgo (40%)", "Coalición con tensión interna creciente"],
    )


DEMO_DOSSIERS: dict[str, ActorDossier] = {
    "ps01": _sanchez_dossier(),
}


def get_demo_overview() -> ActorsOverviewResponse:
    return ActorsOverviewResponse(
        kpis=DEMO_KPIS,
        top_exposure=DEMO_ACTORS[:5],
        party_distribution=DEMO_PARTY_DIST,
        recent_events=DEMO_EVENTS,
        mode="demo",
    )


def get_demo_list(
    page: int = 1,
    page_size: int = 30,
    party: str | None = None,
    actor_type: str | None = None,
    search: str | None = None,
) -> ActorsListResponse:
    actors = list(DEMO_ACTORS)
    if party:
        actors = [a for a in actors if a.party.lower() == party.lower()]
    if actor_type:
        actors = [a for a in actors if a.actor_type == actor_type]
    if search:
        q = search.lower()
        actors = [a for a in actors if q in a.name.lower() or any(q in alias.lower() for alias in a.aliases)]
    total = len(actors)
    start = (page - 1) * page_size
    return ActorsListResponse(
        actors=actors[start:start + page_size],
        total=total,
        page=page,
        page_size=page_size,
        mode="demo",
    )


def get_demo_dossier(actor_id: str) -> ActorDossier | None:
    if actor_id in DEMO_DOSSIERS:
        return DEMO_DOSSIERS[actor_id]
    # Generate minimal dossier for any known actor
    actor = next((a for a in DEMO_ACTORS if a.id == actor_id), None)
    if actor is None:
        return None
    return ActorDossier(
        **actor.model_dump(),
        metrics=[
            ActorMetric(label="Exposición mediática", value=actor.exposure, trend="stable", color="cyan"),
            ActorMetric(label="Aprobación pública", value=actor.approval, trend=actor.sentiment, color="blue"),
        ],
        analysis_note=f"Datos de demostración para {actor.name}. Sin datos reales disponibles.",
        mode="demo",
    )


def get_demo_graph() -> ActorGraphResponse:
    nodes = [
        GraphNode(id=a.id, name=a.name, party=a.party, party_color=a.party_color,
                  actor_type=a.actor_type, influence_score=a.influence_score)
        for a in DEMO_ACTORS[:6]
    ]
    edges = [
        GraphEdge(source="ps01", target="su01", relationship_type="coalicion", strength=68, label="Coalición"),
        GraphEdge(source="ps01", target="pp01", relationship_type="rival", strength=92, label="Oposición"),
        GraphEdge(source="ps01", target="jn01", relationship_type="neutral", strength=44, label="Transaccional"),
        GraphEdge(source="pp01", target="pp02", relationship_type="aliado", strength=76, label="Partido"),
        GraphEdge(source="pp01", target="vx01", relationship_type="rival", strength=55, label="Competencia"),
    ]
    return ActorGraphResponse(nodes=nodes, edges=edges, mode="demo")
```

- [ ] **Step 3: Create services/actors/actor_scoring.py**

```python
# services/actors/actor_scoring.py
"""
Pure scoring functions for the Actors module.
No DB or network dependencies — importable anywhere.
"""
from __future__ import annotations

_PARTY_COLORS: dict[str, str] = {
    "PSOE": "#E03A3E", "PP": "#1F77FF", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "PNV": "#1D8042", "Bildu": "#A4D65E", "Podemos": "#6E2A78",
    "BNG": "#0080FF", "CUP": "#FFCC00", "CC": "#FF8C00",
}


def party_color(party: str) -> str:
    """Return hex color for a party code. Falls back to neutral grey."""
    return _PARTY_COLORS.get(party, "#94A3B8")


def sentiment_from_score(score: float) -> str:
    """Convert a numeric sentiment score (-1 to 1) to up/down/stable."""
    if score > 0.15:
        return "up"
    if score < -0.15:
        return "down"
    return "stable"


def exposure_from_count(mention_count: int, max_mentions: int = 200) -> int:
    """Normalize mention count to 0-100 exposure score."""
    if max_mentions <= 0:
        return 0
    return int(min(round(mention_count / max_mentions * 100), 100))


def approval_from_sentiment(sentiment_score: float) -> int:
    """Convert sentiment score (-1 to 1) to approval percentage (0-100)."""
    return int(round((sentiment_score + 1) / 2 * 100))


def influence_from_metrics(exposure: int, approval: int, evidence_count: int) -> int:
    """Composite influence score (0-100)."""
    evidence_bonus = min(evidence_count // 10, 20)
    raw = 0.5 * exposure + 0.3 * approval + evidence_bonus
    return int(round(min(raw, 100)))


def classify_actor_type(tipo_db: str | None) -> str:
    """Map DB tipo string to ActorType literal."""
    mapping = {
        "politico": "politico",
        "político": "politico",
        "cargo_publico": "cargo_publico",
        "cargo público": "cargo_publico",
        "empresario": "empresario",
        "periodista": "periodista",
        "activista": "activista",
    }
    return mapping.get((tipo_db or "").lower(), "otro")
```

- [ ] **Step 4: Verify both new files compile**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "
from services.actors.actor_fixtures import get_demo_overview, get_demo_list, get_demo_graph
from services.actors.actor_scoring import party_color, influence_from_metrics
print('overview:', get_demo_overview().mode)
print('list:', get_demo_list().total)
print('graph nodes:', len(get_demo_graph().nodes))
print('color:', party_color('PSOE'))
print('influence:', influence_from_metrics(80, 60, 100))
"
```

Expected output:
```
overview: demo
list: 8
graph nodes: 6
color: #E03A3E
influence: 78
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add services/actors/__init__.py services/actors/actor_fixtures.py services/actors/actor_scoring.py
git commit -m "feat(actores): services layer — fixtures (8 actors, dossier, graph) + scoring"
```

---

## Task 3: Service Orchestrator + API Endpoints

**Files:**
- Create: `services/actors/actor_service.py`
- Rewrite: `api/routers/actors.py`

- [ ] **Step 1: Create services/actors/actor_service.py**

```python
# services/actors/actor_service.py
"""
Main orchestrator for the Actors domain.
Tries DB → falls back to fixtures on any exception.
"""
from __future__ import annotations

import os
from typing import Optional

from api.schemas.actors import (
    PoliticalActor, ActorDossier, ActorGraphResponse,
    ActorsOverviewResponse, ActorsListResponse,
    ActorAnalysisRequest, ActorAnalysisResponse,
)
from services.actors.actor_fixtures import (
    get_demo_overview, get_demo_list, get_demo_dossier,
    get_demo_graph, DEMO_ACTORS,
)
from services.actors.actor_scoring import (
    party_color, sentiment_from_score, exposure_from_count,
    approval_from_sentiment, influence_from_metrics, classify_actor_type,
)

_DSN = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")


def _map_row_to_actor(row: tuple) -> PoliticalActor:
    """Map a DB row from persona_publica to PoliticalActor."""
    # row: (id, nombre_completo, tipo, partido, cargo_actual, score_influencia,
    #        sentimiento_actual, tendencia_sentimiento, biography)
    actor_id = str(row[0])
    name = row[1] or ""
    tipo = row[2] or ""
    party = row[3] or "Independiente"
    role = row[4] or ""
    influence_raw = float(row[5] or 0.0)
    sentiment_raw = float(row[6] or 0.0)
    tendencia = row[7] or ""
    bio = row[8] if len(row) > 8 else ""

    exposure = int(min(max(influence_raw * 100, 0), 100))
    approval = approval_from_sentiment(sentiment_raw)
    sentiment = sentiment_from_score(sentiment_raw)
    influence = influence_from_metrics(exposure, approval, 0)
    color = party_color(party)
    actor_type = classify_actor_type(tipo)

    return PoliticalActor(
        id=actor_id, name=name, normalized_name=name.lower(),
        actor_type=actor_type,
        party=party, party_color=color,
        role=role, bio=bio or "",
        exposure=exposure, approval=approval,
        sentiment=sentiment, influence_score=influence,
        mode="real",
    )


def get_overview() -> ActorsOverviewResponse:
    """Return actors overview: KPIs + top exposure + party dist + recent events."""
    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT id::text, nombre_completo, tipo, partido, cargo_actual,
                              COALESCE(score_influencia, 0),
                              COALESCE(sentimiento_actual, 0),
                              tendencia_sentimiento
                       FROM persona_publica WHERE activo = TRUE
                       ORDER BY score_influencia DESC NULLS LAST LIMIT 5"""
                )
                top_rows = cur.fetchall()

                cur.execute("SELECT COUNT(*) FROM persona_publica WHERE activo = TRUE")
                total_actors = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    """SELECT partido, COUNT(*) FROM persona_publica
                       WHERE activo = TRUE AND partido IS NOT NULL
                       GROUP BY partido ORDER BY COUNT(*) DESC LIMIT 10"""
                )
                party_rows = cur.fetchall()

        if not top_rows:
            return get_demo_overview()

        from api.schemas.actors import ActorKpiItem, ActorsOverviewResponse
        kpis = [
            ActorKpiItem(label="Actores monitorizados", value=int(total_actors), color="blue"),
            ActorKpiItem(label="Con alta exposición", value=min(len(top_rows), 5), color="amber"),
            ActorKpiItem(label="Contradicciones detectadas", value=0, color="red"),
            ActorKpiItem(label="Relaciones mapeadas", value=0, color="cyan"),
        ]
        top_exposure = [_map_row_to_actor(r) for r in top_rows]
        party_dist = [
            {"party": r[0], "color": party_color(r[0]), "count": int(r[1])}
            for r in party_rows
        ]
        return ActorsOverviewResponse(
            kpis=kpis, top_exposure=top_exposure,
            party_distribution=party_dist, recent_events=[], mode="real",
        )
    except Exception:
        return get_demo_overview()


def get_actors_list(
    page: int = 1,
    page_size: int = 30,
    party: Optional[str] = None,
    actor_type: Optional[str] = None,
    search: Optional[str] = None,
) -> ActorsListResponse:
    """Return paginated list of actors."""
    try:
        import psycopg2
        conditions = ["activo = TRUE"]
        params: list = []
        if party:
            conditions.append("partido ILIKE %s")
            params.append(f"%{party}%")
        if actor_type:
            conditions.append("tipo = %s")
            params.append(actor_type)
        if search:
            conditions.append("nombre_completo ILIKE %s")
            params.append(f"%{search}%")

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT COUNT(*) FROM persona_publica WHERE {where}""",
                    params,
                )
                total = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    f"""SELECT id::text, nombre_completo, tipo, partido, cargo_actual,
                               COALESCE(score_influencia, 0), COALESCE(sentimiento_actual, 0),
                               tendencia_sentimiento
                        FROM persona_publica WHERE {where}
                        ORDER BY score_influencia DESC NULLS LAST
                        LIMIT %s OFFSET %s""",
                    params + [page_size, offset],
                )
                rows = cur.fetchall()

        if not rows:
            return get_demo_list(page, page_size, party, actor_type, search)

        actors = [_map_row_to_actor(r) for r in rows]
        return ActorsListResponse(actors=actors, total=total, page=page, page_size=page_size, mode="real")
    except Exception:
        return get_demo_list(page, page_size, party, actor_type, search)


def get_dossier(actor_id: str) -> ActorDossier | None:
    """Return full dossier for an actor. Falls back to demo."""
    # Try to get enriched DB data; for now fall back to fixtures
    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT id::text, nombre_completo, tipo, partido, cargo_actual,
                              COALESCE(score_influencia, 0), COALESCE(sentimiento_actual, 0),
                              tendencia_sentimiento, biography
                       FROM persona_publica WHERE id::text = %s AND activo = TRUE""",
                    [actor_id],
                )
                row = cur.fetchone()

        if row:
            actor = _map_row_to_actor(row)
            # Return minimal dossier from DB data
            return ActorDossier(
                **actor.model_dump(),
                analysis_note=f"Datos reales desde base de datos para {actor.name}.",
            )
    except Exception:
        pass

    return get_demo_dossier(actor_id)


def get_graph() -> ActorGraphResponse:
    """Return actor relationship graph."""
    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT id::text, nombre_completo, tipo, partido,
                              COALESCE(score_influencia, 0)
                       FROM persona_publica WHERE activo = TRUE
                       ORDER BY score_influencia DESC NULLS LAST LIMIT 20"""
                )
                rows = cur.fetchall()

        if not rows:
            return get_demo_graph()

        from api.schemas.actors import GraphNode, ActorGraphResponse
        nodes = [
            GraphNode(
                id=str(r[0]), name=r[1] or "", party=r[3] or "",
                party_color=party_color(r[3] or ""),
                actor_type=classify_actor_type(r[2]),
                influence_score=int(min(float(r[4]) * 100, 100)),
            )
            for r in rows
        ]
        return ActorGraphResponse(nodes=nodes, edges=[], mode="real")
    except Exception:
        return get_demo_graph()


def analyze_actor(req: ActorAnalysisRequest) -> ActorAnalysisResponse:
    """Use Brain LLM to analyze an actor. Falls back to demo answer."""
    dossier = get_dossier(req.actor_id)
    actor_name = dossier.name if dossier else req.actor_id

    try:
        from services.llm_client import chat_completion  # type: ignore
        system = (
            "Eres Politeia Brain, analista senior de actores políticos españoles. "
            "Analiza con rigor, sin sesgos partidistas, citando evidencia concreta. "
            "Responde en español, máximo 300 palabras."
        )
        dossier_ctx = ""
        if dossier:
            dossier_ctx = (
                f"Actor: {dossier.name} ({dossier.party})\n"
                f"Cargo: {dossier.role}\n"
                f"Bio: {dossier.bio}\n"
                f"Exposición: {dossier.exposure}/100, Aprobación: {dossier.approval}/100\n"
            )
            if dossier.positions:
                dossier_ctx += "Posiciones conocidas: " + "; ".join(
                    f"{p.topic}: {p.stance}" for p in dossier.positions[:3]
                ) + "\n"

        answer = chat_completion(
            system=system,
            user=f"{dossier_ctx}\n\nPregunta: {req.question}\nContexto adicional: {req.context}",
        )
        return ActorAnalysisResponse(
            actor_id=req.actor_id, actor_name=actor_name,
            question=req.question, answer=answer,
            model_used="politeia-brain", mode="real",
        )
    except Exception:
        return ActorAnalysisResponse(
            actor_id=req.actor_id, actor_name=actor_name,
            question=req.question,
            answer=f"[Demo] Análisis de {actor_name}: Actor con alta influencia política. Para análisis detallado se requiere el módulo Brain activo.",
            model_used="demo", mode="demo",
        )
```

- [ ] **Step 2: Rewrite api/routers/actors.py with 10 endpoints**

```python
# api/routers/actors.py
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from api.schemas.actors import (
    ActorsOverviewResponse, ActorsListResponse, ActorDossier,
    ActorGraphResponse, ActorAnalysisRequest, ActorAnalysisResponse,
    # Legacy compat
    ActorItem, ActorsResponse,
)

router = APIRouter(prefix="/api/actors", tags=["actors"])


# ── Overview ─────────────────────────────────────────────────────
@router.get("/overview", response_model=ActorsOverviewResponse)
def get_actors_overview() -> ActorsOverviewResponse:
    from services.actors.actor_service import get_overview
    return get_overview()


# ── List ─────────────────────────────────────────────────────────
@router.get("/list", response_model=ActorsListResponse)
def list_actors_rich(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    party: Optional[str] = None,
    actor_type: Optional[str] = None,
    search: Optional[str] = None,
) -> ActorsListResponse:
    from services.actors.actor_service import get_actors_list
    return get_actors_list(page, page_size, party, actor_type, search)


# ── Dossier ──────────────────────────────────────────────────────
@router.get("/dossier/{actor_id}", response_model=ActorDossier)
def get_actor_dossier(actor_id: str) -> ActorDossier:
    from services.actors.actor_service import get_dossier
    result = get_dossier(actor_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return result


# ── Positions ────────────────────────────────────────────────────
@router.get("/dossier/{actor_id}/positions")
def get_actor_positions(actor_id: str) -> dict:
    from services.actors.actor_service import get_dossier
    dossier = get_dossier(actor_id)
    if dossier is None:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return {"actor_id": actor_id, "actor_name": dossier.name, "positions": [p.model_dump() for p in dossier.positions], "mode": dossier.mode}


# ── Timeline ─────────────────────────────────────────────────────
@router.get("/dossier/{actor_id}/timeline")
def get_actor_timeline(actor_id: str) -> dict:
    from services.actors.actor_service import get_dossier
    dossier = get_dossier(actor_id)
    if dossier is None:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return {"actor_id": actor_id, "actor_name": dossier.name, "timeline": [e.model_dump() for e in dossier.timeline], "mode": dossier.mode}


# ── Relationships ────────────────────────────────────────────────
@router.get("/dossier/{actor_id}/relationships")
def get_actor_relationships(actor_id: str) -> dict:
    from services.actors.actor_service import get_dossier
    dossier = get_dossier(actor_id)
    if dossier is None:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return {"actor_id": actor_id, "actor_name": dossier.name, "relationships": [r.model_dump() for r in dossier.relationships], "mode": dossier.mode}


# ── Graph ────────────────────────────────────────────────────────
@router.get("/graph", response_model=ActorGraphResponse)
def get_actor_graph() -> ActorGraphResponse:
    from services.actors.actor_service import get_graph
    return get_graph()


# ── Analysis ─────────────────────────────────────────────────────
@router.post("/analyze", response_model=ActorAnalysisResponse)
def analyze_actor(req: ActorAnalysisRequest) -> ActorAnalysisResponse:
    from services.actors.actor_service import analyze_actor as _analyze
    return _analyze(req)


# ── Briefing ─────────────────────────────────────────────────────
@router.get("/briefing/{actor_id}")
def get_actor_briefing(actor_id: str) -> dict:
    from services.actors.actor_service import get_dossier
    dossier = get_dossier(actor_id)
    if dossier is None:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return {
        "actor_id": actor_id,
        "actor_name": dossier.name,
        "party": dossier.party,
        "role": dossier.role,
        "exposure": dossier.exposure,
        "approval": dossier.approval,
        "analysis_note": dossier.analysis_note,
        "warnings": dossier.warnings,
        "mode": dossier.mode,
    }


# ── Legacy compat ────────────────────────────────────────────────
@router.get("", response_model=ActorsResponse)
def list_actors_legacy(
    partido: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
) -> ActorsResponse:
    """Legacy endpoint kept for backward compatibility."""
    from services.actors.actor_service import get_actors_list
    result = get_actors_list(page=1, page_size=limit, party=partido, search=search)
    legacy_items = [
        ActorItem(
            id=a.id, name=a.name, party=a.party, party_color=a.party_color,
            role=a.role, bio=a.bio, exposure=a.exposure, approval=a.approval,
            sentiment=a.sentiment,
        )
        for a in result.actors
    ]
    return ActorsResponse(actors=legacy_items, total=result.total, mode=result.mode)
```

- [ ] **Step 3: Verify Python compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "
from services.actors.actor_service import get_overview, get_actors_list, get_dossier, get_graph
print('overview mode:', get_overview().mode)
print('list total:', get_actors_list().total)
print('dossier name:', get_dossier('ps01').name)
print('graph nodes:', len(get_graph().nodes))
"
```

Expected:
```
overview mode: demo
list total: 8
dossier name: Pedro Sánchez
graph nodes: 6
```

- [ ] **Step 4: Check router imports**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
python3 -c "from api.routers.actors import router; print('routes:', len(router.routes))"
```

Expected: `routes: 10` (or similar count ≥ 9)

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add services/actors/actor_service.py api/routers/actors.py
git commit -m "feat(actores): 10 endpoints — overview + list + dossier + positions + timeline + relationships + graph + analyze + briefing + legacy"
```

---

## Task 4: TypeScript Types + Endpoint Functions

**Files:**
- Create: `apps/web/lib/types/actors_rich.ts`
- Modify: `apps/web/lib/api/endpoints.ts`

- [ ] **Step 1: Create apps/web/lib/types/actors_rich.ts**

```typescript
// apps/web/lib/types/actors_rich.ts
export type ActorType = "politico" | "cargo_publico" | "empresario" | "periodista" | "activista" | "otro";
export type ActorStatus = "active" | "inactive" | "unknown";
export type RelationshipType = "aliado" | "rival" | "coalicion" | "oposicion" | "mentor" | "pupilo" | "neutral";
export type PositionStance = "favor" | "contra" | "abstencion" | "sin_posicion";
export type TimelineEventType = "declaracion" | "voto" | "cargo" | "escandalo" | "logro" | "otro";
export type DataMode = "real" | "demo" | "fallback" | "error";

export interface PoliticalActor {
  id: string;
  name: string;
  normalized_name: string;
  aliases: string[];
  actor_type: ActorType;
  party: string;
  party_id?: string;
  party_color: string;
  institution: string;
  role: string;
  territory: string;
  bio: string;
  image_url?: string;
  current_office: string;
  previous_offices: string[];
  status: ActorStatus;
  topics: string[];
  sectors: string[];
  source_ids: string[];
  evidence_count: number;
  confidence: number;
  exposure: number;     // 0-100
  approval: number;     // 0-100
  sentiment: "up" | "down" | "stable";
  influence_score: number; // 0-100
  mode: DataMode;
}

export interface ActorMetric {
  label: string;
  value: number;
  delta: number;
  trend: "up" | "down" | "stable";
  color: string;
}

export interface ActorPosition {
  topic: string;
  sector: string;
  stance: PositionStance;
  summary: string;
  evidence_quote: string;
  source: string;
  date: string;
  confidence: number;
}

export interface ActorRelationship {
  target_id: string;
  target_name: string;
  target_party: string;
  target_color: string;
  relationship_type: RelationshipType;
  strength: number;
  description: string;
  since: string;
  evidence_count: number;
}

export interface ActorTimelineEvent {
  event_id: string;
  date: string;
  event_type: TimelineEventType;
  title: string;
  description: string;
  outcome?: "positive" | "negative" | "neutral";
  source: string;
  impact: number;
}

export interface ActorContradiction {
  contradiction_id: string;
  topic: string;
  statement_a: string;
  date_a: string;
  statement_b: string;
  date_b: string;
  severity: "low" | "medium" | "high";
  source_a: string;
  source_b: string;
}

export interface ActorDossier extends PoliticalActor {
  metrics: ActorMetric[];
  positions: ActorPosition[];
  relationships: ActorRelationship[];
  timeline: ActorTimelineEvent[];
  contradictions: ActorContradiction[];
  top_media_stories: Record<string, unknown>[];
  legislative_items: Record<string, unknown>[];
  narratives: string[];
  analysis_note: string;
  warnings: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  party: string;
  party_color: string;
  actor_type: ActorType;
  influence_score: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship_type: RelationshipType;
  strength: number;
  label: string;
}

export interface ActorGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: DataMode;
}

export interface ActorKpiItem {
  label: string;
  value: number;
  color: string;
  delta: number;
}

export interface ActorsOverviewResponse {
  kpis: ActorKpiItem[];
  top_exposure: PoliticalActor[];
  party_distribution: Array<{ party: string; color: string; count: number }>;
  recent_events: ActorTimelineEvent[];
  mode: DataMode;
}

export interface ActorsListResponse {
  actors: PoliticalActor[];
  total: number;
  page: number;
  page_size: number;
  mode: DataMode;
}

export interface ActorAnalysisRequest {
  actor_id: string;
  question: string;
  context?: string;
}

export interface ActorAnalysisResponse {
  actor_id: string;
  actor_name: string;
  question: string;
  answer: string;
  model_used: string;
  mode: DataMode;
}
```

- [ ] **Step 2: Add 10 actor endpoints to apps/web/lib/api/endpoints.ts**

Open `apps/web/lib/api/endpoints.ts`. After the existing `// Coalition` block (around line 249), add the new import at the top and new endpoints. First, add this import near the other actor imports:

```typescript
import type {
  ActorsOverviewResponse,
  ActorsListResponse,
  ActorDossier,
  ActorGraphResponse,
  ActorAnalysisRequest,
  ActorAnalysisResponse,
} from "@/lib/types/actors_rich";
```

Then add these endpoint functions inside the `endpoints` object (replace the existing `actorsList` entry or add alongside it):

```typescript
  // Actors v2 (rich)
  actorsOverview: () =>
    api.get<ActorsOverviewResponse>("/api/actors/overview"),

  actorsListRich: (params?: { page?: number; page_size?: number; party?: string; actor_type?: string; search?: string }) =>
    api.get<ActorsListResponse>(`/api/actors/list${toQuery(params)}`),

  actorDossier: (actorId: string) =>
    api.get<ActorDossier>(`/api/actors/dossier/${actorId}`),

  actorPositions: (actorId: string) =>
    api.get<{ actor_id: string; actor_name: string; positions: unknown[]; mode: string }>(`/api/actors/dossier/${actorId}/positions`),

  actorTimeline: (actorId: string) =>
    api.get<{ actor_id: string; actor_name: string; timeline: unknown[]; mode: string }>(`/api/actors/dossier/${actorId}/timeline`),

  actorRelationships: (actorId: string) =>
    api.get<{ actor_id: string; actor_name: string; relationships: unknown[]; mode: string }>(`/api/actors/dossier/${actorId}/relationships`),

  actorsGraph: () =>
    api.get<ActorGraphResponse>("/api/actors/graph"),

  actorAnalyze: (payload: ActorAnalysisRequest) =>
    api.post<ActorAnalysisResponse>("/api/actors/analyze", payload),

  actorBriefing: (actorId: string) =>
    api.get<{ actor_id: string; actor_name: string; party: string; role: string; exposure: number; approval: number; analysis_note: string; warnings: string[]; mode: string }>(`/api/actors/briefing/${actorId}`),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/lib/types/actors_rich.ts apps/web/lib/api/endpoints.ts
git commit -m "feat(actores): TS rich types (14 interfaces) + 9 new API endpoint functions"
```

---

## Task 5: React Components (12 components + barrel)

**Files:**
- Create: `apps/web/components/actors/ActorKpiBar.tsx`
- Create: `apps/web/components/actors/ActorCard.tsx`
- Create: `apps/web/components/actors/ActorTopExposure.tsx`
- Create: `apps/web/components/actors/ActorFilters.tsx`
- Create: `apps/web/components/actors/ActorDossierPanel.tsx`
- Create: `apps/web/components/actors/ActorPositionList.tsx`
- Create: `apps/web/components/actors/ActorRelationshipGraph.tsx`
- Create: `apps/web/components/actors/ActorTimeline.tsx`
- Create: `apps/web/components/actors/ActorContradictions.tsx`
- Create: `apps/web/components/actors/ActorMediaExposure.tsx`
- Create: `apps/web/components/actors/ActorPartySummary.tsx`
- Create: `apps/web/components/actors/ActorBrainAnalysis.tsx`
- Create: `apps/web/components/actors/index.ts`

- [ ] **Step 1: Create ActorKpiBar.tsx**

```tsx
// apps/web/components/actors/ActorKpiBar.tsx
import type { ActorKpiItem } from "@/lib/types/actors_rich";

function kpiColor(color: string) {
  if (color === "red") return "text-red1";
  if (color === "amber") return "text-amber1";
  if (color === "cyan") return "text-cyan1";
  if (color === "green") return "text-green1";
  return "text-blue1";
}

export function ActorKpiBar({ kpis, isLoading }: { kpis: ActorKpiItem[]; isLoading?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
          <div className={`text-2xl font-bold ${kpiColor(k.color)}`}>
            {isLoading ? "—" : k.value}
          </div>
          {k.delta !== 0 && !isLoading && (
            <div className={`text-[10px] mt-0.5 ${k.delta > 0 ? "text-green1" : "text-red1"}`}>
              {k.delta > 0 ? "+" : ""}{k.delta} esta semana
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ActorCard.tsx**

```tsx
// apps/web/components/actors/ActorCard.tsx
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PoliticalActor } from "@/lib/types/actors_rich";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function SentimentIcon({ s }: { s: "up" | "down" | "stable" }) {
  if (s === "up") return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (s === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

interface ActorCardProps {
  actor: PoliticalActor;
  onClick?: (actor: PoliticalActor) => void;
}

export function ActorCard({ actor, onClick }: ActorCardProps) {
  return (
    <div
      className="premium-card hover:border-cyan1/40 transition cursor-pointer group"
      style={{ borderLeftColor: actor.party_color, borderLeftWidth: 3 }}
      onClick={() => onClick?.(actor)}
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: `linear-gradient(135deg, ${actor.party_color}, #3B82F6)` }}
        >
          {initials(actor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-text1 group-hover:text-cyan1 transition truncate">{actor.name}</div>
          <div className="text-[10px] uppercase text-muted">{actor.party}</div>
        </div>
        <SentimentIcon s={actor.sentiment} />
      </div>

      <div className="text-xs text-text2 mb-1 line-clamp-1">{actor.role}</div>
      {actor.bio && <div className="text-[11px] text-muted mb-3 line-clamp-1">{actor.bio}</div>}

      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-[10px] text-muted mb-0.5">
            <span>Exposición</span>
            <span className="text-cyan1 font-mono">{actor.exposure}</span>
          </div>
          <div className="h-1 bg-bg3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${actor.exposure}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text2">Aprobación: <span className="text-text1 font-mono">{actor.approval}%</span></span>
          <span className="text-cyan1 flex items-center gap-0.5 text-[10px]">
            Ver dossier <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ActorTopExposure.tsx**

```tsx
// apps/web/components/actors/ActorTopExposure.tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PoliticalActor } from "@/lib/types/actors_rich";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export function ActorTopExposure({ actors, onSelect }: { actors: PoliticalActor[]; onSelect?: (a: PoliticalActor) => void }) {
  return (
    <section className="premium-card">
      <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">
        Actores con mayor exposición esta semana
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {actors.map(a => (
          <div
            key={a.id}
            className="p-3 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/40 transition cursor-pointer"
            onClick={() => onSelect?.(a)}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
              style={{ background: `linear-gradient(135deg, ${a.party_color}, #00D4FF)` }}
            >
              {initials(a.name)}
            </div>
            <div className="text-sm font-semibold text-text1 leading-tight">{a.name}</div>
            <div className="text-[10px] uppercase text-muted mt-0.5">{a.party}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-cyan1 font-mono text-xs">{a.exposure}</span>
              {a.sentiment === "up" ? <TrendingUp className="w-3 h-3 text-green1" /> :
               a.sentiment === "down" ? <TrendingDown className="w-3 h-3 text-red1" /> :
               <Minus className="w-3 h-3 text-text2" />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create ActorFilters.tsx**

```tsx
// apps/web/components/actors/ActorFilters.tsx
import { Search } from "lucide-react";

const ACTOR_TYPES = [
  { value: "", label: "Todos los tipos" },
  { value: "politico", label: "Político" },
  { value: "cargo_publico", label: "Cargo público" },
  { value: "empresario", label: "Empresario" },
  { value: "periodista", label: "Periodista" },
  { value: "activista", label: "Activista" },
];

interface ActorFiltersProps {
  search: string;
  party: string;
  actorType: string;
  parties: Array<{ party: string; color: string; count: number }>;
  selectedParties: string[];
  onSearch: (v: string) => void;
  onActorType: (v: string) => void;
  onToggleParty: (p: string) => void;
}

export function ActorFilters({
  search, actorType, parties, selectedParties,
  onSearch, onActorType, onToggleParty,
}: ActorFiltersProps) {
  return (
    <section className="premium-card">
      <div className="flex items-center gap-3 mb-3">
        <Search className="w-4 h-4 text-cyan1 shrink-0" />
        <input
          type="text"
          placeholder="Buscar actor..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="flex-1 bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
        />
        <select
          value={actorType}
          onChange={e => onActorType(e.target.value)}
          className="bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1"
        >
          {ACTOR_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {parties.map(p => (
          <button
            key={p.party}
            onClick={() => onToggleParty(p.party)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              selectedParties.includes(p.party)
                ? "border-cyan1 bg-cyan1/10 text-cyan1"
                : "border-border1 text-text2 hover:border-cyan1/40"
            }`}
            style={selectedParties.includes(p.party) ? {} : { borderLeftColor: p.color, borderLeftWidth: 3 }}
          >
            {p.party}
            <span className="ml-1 text-muted font-mono">{p.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create ActorPartySummary.tsx**

```tsx
// apps/web/components/actors/ActorPartySummary.tsx
export function ActorPartySummary({
  distribution,
}: {
  distribution: Array<{ party: string; color: string; count: number }>;
}) {
  const total = distribution.reduce((s, p) => s + p.count, 0);
  return (
    <div className="premium-card">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Resumen por partido</h3>
      <ul className="space-y-2">
        {distribution.map(p => (
          <li key={p.party} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-text1 flex-1">{p.party}</span>
            <span className="text-muted text-[10px] font-mono">{p.count}</span>
            <div className="w-16 h-1 bg-bg3 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%`, backgroundColor: p.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Create ActorTimeline.tsx**

```tsx
// apps/web/components/actors/ActorTimeline.tsx
import type { ActorTimelineEvent } from "@/lib/types/actors_rich";

const TYPE_LABELS: Record<string, string> = {
  declaracion: "Declaración",
  voto: "Voto",
  cargo: "Cargo",
  escandalo: "Escándalo",
  logro: "Logro",
  otro: "Evento",
};

function outcomeColor(outcome?: string) {
  if (outcome === "positive") return "bg-green1";
  if (outcome === "negative") return "bg-red1";
  return "bg-text2";
}

export function ActorTimeline({ events }: { events: ActorTimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted text-center py-4">Sin eventos registrados.</p>;
  }
  return (
    <ul className="space-y-4 relative before:absolute before:left-[6px] before:top-0 before:bottom-0 before:w-px before:bg-border1">
      {events.map(e => (
        <li key={e.event_id} className="flex gap-3 pl-5 relative">
          <span className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-bg1 ${outcomeColor(e.outcome)}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-cyan1">{e.date}</span>
              <span className="badge badge-blue text-[9px]">{TYPE_LABELS[e.event_type] ?? e.event_type}</span>
            </div>
            <p className="text-sm font-semibold text-text1">{e.title}</p>
            {e.description && <p className="text-xs text-text2 mt-0.5">{e.description}</p>}
            {e.source && <p className="text-[10px] text-muted mt-1">Fuente: {e.source}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Create ActorPositionList.tsx**

```tsx
// apps/web/components/actors/ActorPositionList.tsx
import type { ActorPosition } from "@/lib/types/actors_rich";

const STANCE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  favor: { label: "A favor", badgeClass: "badge-green" },
  contra: { label: "En contra", badgeClass: "badge-red" },
  abstencion: { label: "Abstención", badgeClass: "badge-amber" },
  sin_posicion: { label: "Sin posición", badgeClass: "badge-blue" },
};

export function ActorPositionList({ positions }: { positions: ActorPosition[] }) {
  if (!positions.length) {
    return <p className="text-sm text-muted text-center py-4">Sin posiciones registradas.</p>;
  }
  return (
    <ul className="space-y-3">
      {positions.map((p, i) => {
        const cfg = STANCE_CONFIG[p.stance] ?? { label: p.stance, badgeClass: "badge-blue" };
        return (
          <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-text1">{p.topic}</span>
              <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-text2 mb-1.5">{p.summary}</p>
            {p.evidence_quote && (
              <blockquote className="text-[11px] italic text-muted border-l-2 border-cyan1/40 pl-2">
                {p.evidence_quote}
              </blockquote>
            )}
            {p.source && <p className="text-[10px] text-muted mt-1">Fuente: {p.source} · {p.date}</p>}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 8: Create ActorRelationshipGraph.tsx**

```tsx
// apps/web/components/actors/ActorRelationshipGraph.tsx
import type { ActorRelationship } from "@/lib/types/actors_rich";

const REL_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  aliado: { label: "Aliado", badgeClass: "badge-green" },
  rival: { label: "Rival", badgeClass: "badge-red" },
  coalicion: { label: "Coalición", badgeClass: "badge-cyan" },
  oposicion: { label: "Oposición", badgeClass: "badge-red" },
  mentor: { label: "Mentor", badgeClass: "badge-blue" },
  pupilo: { label: "Pupilo", badgeClass: "badge-blue" },
  neutral: { label: "Neutral", badgeClass: "badge-amber" },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export function ActorRelationshipGraph({ relationships }: { relationships: ActorRelationship[] }) {
  if (!relationships.length) {
    return <p className="text-sm text-muted text-center py-4">Sin relaciones mapeadas.</p>;
  }
  return (
    <ul className="space-y-3">
      {relationships.map((r, i) => {
        const cfg = REL_CONFIG[r.relationship_type] ?? { label: r.relationship_type, badgeClass: "badge-blue" };
        return (
          <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${r.target_color}, #3B82F6)` }}
            >
              {initials(r.target_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text1 truncate">{r.target_name}</span>
                <span className={`badge ${cfg.badgeClass} shrink-0`}>{cfg.label}</span>
              </div>
              {r.description && <p className="text-xs text-text2 mt-0.5 line-clamp-1">{r.description}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted">Intensidad</div>
              <div className="text-sm font-mono text-cyan1">{r.strength}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 9: Create ActorContradictions.tsx**

```tsx
// apps/web/components/actors/ActorContradictions.tsx
import { AlertTriangle } from "lucide-react";
import type { ActorContradiction } from "@/lib/types/actors_rich";

const SEVERITY_CONFIG = {
  high: { label: "Alta", badgeClass: "badge-red" },
  medium: { label: "Media", badgeClass: "badge-amber" },
  low: { label: "Baja", badgeClass: "badge-blue" },
};

export function ActorContradictions({ contradictions }: { contradictions: ActorContradiction[] }) {
  if (!contradictions.length) {
    return <p className="text-sm text-muted text-center py-4">Sin contradicciones detectadas.</p>;
  }
  return (
    <ul className="space-y-4">
      {contradictions.map(c => {
        const cfg = SEVERITY_CONFIG[c.severity] ?? SEVERITY_CONFIG.medium;
        return (
          <li key={c.contradiction_id} className="p-4 rounded-lg border border-amber1/30 bg-amber1/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber1" />
                <span className="text-sm font-bold text-text1">{c.topic}</span>
              </div>
              <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-bg3 border border-border1">
                <div className="text-[10px] text-muted mb-1">{c.date_a} · {c.source_a}</div>
                <blockquote className="text-xs italic text-text2">{c.statement_a}</blockquote>
              </div>
              <div className="p-2 rounded bg-bg3 border border-border1">
                <div className="text-[10px] text-muted mb-1">{c.date_b} · {c.source_b}</div>
                <blockquote className="text-xs italic text-text2">{c.statement_b}</blockquote>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 10: Create ActorMediaExposure.tsx**

```tsx
// apps/web/components/actors/ActorMediaExposure.tsx
import type { ActorMetric } from "@/lib/types/actors_rich";

function metricColor(color: string) {
  if (color === "red") return { bar: "bg-red1", text: "text-red1" };
  if (color === "amber") return { bar: "bg-amber1", text: "text-amber1" };
  if (color === "green") return { bar: "bg-green1", text: "text-green1" };
  if (color === "cyan") return { bar: "bg-cyan1", text: "text-cyan1" };
  return { bar: "bg-blue1", text: "text-blue1" };
}

export function ActorMediaExposure({ metrics }: { metrics: ActorMetric[] }) {
  if (!metrics.length) {
    return <p className="text-sm text-muted text-center py-4">Sin métricas disponibles.</p>;
  }
  return (
    <ul className="space-y-3">
      {metrics.map((m, i) => {
        const colors = metricColor(m.color);
        return (
          <li key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text2">{m.label}</span>
              <div className="flex items-center gap-2">
                {m.delta !== 0 && (
                  <span className={`text-[10px] ${m.delta > 0 ? "text-green1" : "text-red1"}`}>
                    {m.delta > 0 ? "+" : ""}{m.delta}
                  </span>
                )}
                <span className={`font-mono text-sm ${colors.text}`}>{m.value}</span>
              </div>
            </div>
            <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
              <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${m.value}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 11: Create ActorBrainAnalysis.tsx**

```tsx
// apps/web/components/actors/ActorBrainAnalysis.tsx
"use client";

import { useState } from "react";
import { Brain, Send, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import type { ActorAnalysisResponse } from "@/lib/types/actors_rich";

const SUGGESTED_QUESTIONS = [
  "¿Cuál es la principal amenaza para este actor en los próximos 3 meses?",
  "¿Cuáles son sus principales fortalezas y debilidades políticas?",
  "¿Cómo puede este actor mejorar su aprobación pública?",
];

export function ActorBrainAnalysis({ actorId, actorName }: { actorId: string; actorName: string }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ActorAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await endpoints.actorAnalyze({ actor_id: actorId, question });
      setResult(res);
    } catch {
      setResult({
        actor_id: actorId,
        actor_name: actorName,
        question,
        answer: "Error al conectar con Brain. Inténtalo de nuevo.",
        model_used: "error",
        mode: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Brain Analysis</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-[10px] px-2 py-1 rounded border border-border1 text-text2 hover:border-cyan1/40 hover:text-cyan1 transition"
          >
            {q.slice(0, 40)}…
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={`Pregunta sobre ${actorName}…`}
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
          <p className="text-xs text-muted mb-2">
            {result.model_used} · Modo: {result.mode}
          </p>
          <p className="text-sm text-text1 leading-relaxed">{result.answer}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12: Create ActorDossierPanel.tsx**

```tsx
// apps/web/components/actors/ActorDossierPanel.tsx
"use client";

import { useState } from "react";
import { X, Users, FileText, Network, Clock, AlertTriangle, BarChart2, Brain } from "lucide-react";
import type { ActorDossier } from "@/lib/types/actors_rich";
import { ActorTimeline } from "./ActorTimeline";
import { ActorPositionList } from "./ActorPositionList";
import { ActorRelationshipGraph } from "./ActorRelationshipGraph";
import { ActorContradictions } from "./ActorContradictions";
import { ActorMediaExposure } from "./ActorMediaExposure";
import { ActorBrainAnalysis } from "./ActorBrainAnalysis";

type DossierTab = "overview" | "posiciones" | "relaciones" | "timeline" | "contradicciones" | "brain";

const DOSSIER_TABS: { id: DossierTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Resumen", icon: BarChart2 },
  { id: "posiciones", label: "Posiciones", icon: FileText },
  { id: "relaciones", label: "Relaciones", icon: Network },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "contradicciones", label: "Contradicciones", icon: AlertTriangle },
  { id: "brain", label: "Brain", icon: Brain },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

interface ActorDossierPanelProps {
  dossier: ActorDossier;
  onClose: () => void;
}

export function ActorDossierPanel({ dossier, onClose }: ActorDossierPanelProps) {
  const [tab, setTab] = useState<DossierTab>("overview");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-bg1 border-l border-border1 flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border1 shrink-0"
          style={{ borderLeftColor: dossier.party_color, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: `linear-gradient(135deg, ${dossier.party_color}, #00D4FF)` }}
            >
              {initials(dossier.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text1">{dossier.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted uppercase">{dossier.party}</span>
                <span className="text-[10px] text-text2">·</span>
                <span className="text-xs text-text2">{dossier.role}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg3 transition">
            <X className="w-5 h-5 text-text2" />
          </button>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 px-4 border-b border-border1 shrink-0 overflow-x-auto">
          {DOSSIER_TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition whitespace-nowrap ${
                  tab === t.id
                    ? "text-cyan1 border-b-2 border-cyan1"
                    : "text-text2 hover:text-text1"
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && (
            <div className="space-y-4">
              {dossier.warnings.length > 0 && (
                <div className="p-3 rounded-lg border border-red1/30 bg-red1/5">
                  {dossier.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-red1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
              {dossier.metrics.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-3">Métricas</h3>
                  <ActorMediaExposure metrics={dossier.metrics} />
                </div>
              )}
              {dossier.analysis_note && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-2">Nota de análisis</h3>
                  <p className="text-sm text-text2 leading-relaxed">{dossier.analysis_note}</p>
                </div>
              )}
              {dossier.narratives.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text1 mb-2">Narrativas</h3>
                  <div className="flex flex-wrap gap-2">
                    {dossier.narratives.map((n, i) => (
                      <span key={i} className="badge badge-cyan">{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "posiciones" && <ActorPositionList positions={dossier.positions} />}
          {tab === "relaciones" && <ActorRelationshipGraph relationships={dossier.relationships} />}
          {tab === "timeline" && <ActorTimeline events={dossier.timeline} />}
          {tab === "contradicciones" && <ActorContradictions contradictions={dossier.contradictions} />}
          {tab === "brain" && <ActorBrainAnalysis actorId={dossier.id} actorName={dossier.name} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Create index.ts barrel**

```typescript
// apps/web/components/actors/index.ts
export { ActorKpiBar } from "./ActorKpiBar";
export { ActorCard } from "./ActorCard";
export { ActorTopExposure } from "./ActorTopExposure";
export { ActorFilters } from "./ActorFilters";
export { ActorPartySummary } from "./ActorPartySummary";
export { ActorTimeline } from "./ActorTimeline";
export { ActorPositionList } from "./ActorPositionList";
export { ActorRelationshipGraph } from "./ActorRelationshipGraph";
export { ActorContradictions } from "./ActorContradictions";
export { ActorMediaExposure } from "./ActorMediaExposure";
export { ActorBrainAnalysis } from "./ActorBrainAnalysis";
export { ActorDossierPanel } from "./ActorDossierPanel";
```

- [ ] **Step 14: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 15: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/components/actors/
git commit -m "feat(actores): 12 React components — kpi-bar, card, top-exposure, filters, dossier-panel, timeline, positions, relationships, contradictions, metrics, brain, party-summary"
```

---

## Task 6: Rewrite Page — 4-Tab Console

**Files:**
- Rewrite: `apps/web/app/actores/page.tsx`

- [ ] **Step 1: Rewrite apps/web/app/actores/page.tsx**

```tsx
// apps/web/app/actores/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Network } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type { ActorsOverviewResponse, ActorsListResponse, PoliticalActor, ActorDossier } from "@/lib/types/actors_rich";
import {
  ActorKpiBar,
  ActorTopExposure,
  ActorFilters,
  ActorCard,
  ActorPartySummary,
  ActorDossierPanel,
} from "@/components/actors";

type TabId = "mapa" | "directorio" | "relaciones" | "analisis";

const TABS: { id: TabId; label: string }[] = [
  { id: "mapa", label: "Mapa" },
  { id: "directorio", label: "Directorio" },
  { id: "relaciones", label: "Relaciones" },
  { id: "analisis", label: "Análisis" },
];

const FALLBACK_KPIS = [
  { label: "Actores monitorizados", value: 247, color: "blue", delta: 0 },
  { label: "Con alta exposición", value: 18, color: "amber", delta: 0 },
  { label: "Contradicciones detectadas", value: 34, color: "red", delta: 0 },
  { label: "Relaciones mapeadas", value: 892, color: "cyan", delta: 0 },
];

export default function ActoresPage() {
  const [activeTab, setActiveTab] = useState<TabId>("mapa");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [actorType, setActorType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDossier, setSelectedDossier] = useState<ActorDossier | null>(null);

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery<ActorsOverviewResponse>({
    queryKey: ["actors", "overview"],
    queryFn: () => endpoints.actorsOverview(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const { data: listData, isLoading: listLoading } = useQuery<ActorsListResponse>({
    queryKey: ["actors", "list", selectedParties.join(","), actorType, search],
    queryFn: () => endpoints.actorsListRich({
      page: 1,
      page_size: 50,
      party: selectedParties.length === 1 ? selectedParties[0] : undefined,
      actor_type: actorType || undefined,
      search: search || undefined,
    }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mode = overview?.mode ?? (overviewError ? "error" : "fallback");
  const kpis = overview?.kpis ?? FALLBACK_KPIS;
  const topExposure = overview?.top_exposure ?? [];
  const partyDistribution = overview?.party_distribution ?? [];
  const actors = listData?.actors ?? topExposure;

  function handleActorClick(actor: PoliticalActor) {
    endpoints.actorDossier(actor.id)
      .then(dossier => setSelectedDossier(dossier))
      .catch(() => {
        // Create minimal dossier from PoliticalActor
        setSelectedDossier({
          ...actor,
          metrics: [],
          positions: [],
          relationships: [],
          timeline: [],
          contradictions: [],
          top_media_stories: [],
          legislative_items: [],
          narratives: [],
          analysis_note: `Datos de demostración para ${actor.name}.`,
          warnings: [],
        });
      });
  }

  function toggleParty(p: string) {
    setSelectedParties(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Actores & Ontología</span>
        <div className="flex items-center gap-3 mt-1">
          <Users className="w-6 h-6 text-cyan1" />
          <h1 className="text-3xl font-bold text-text1">Actores & Ontología Política</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "persona_publica" : "fixtures"}
            message={mode === "real" ? "Datos en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Capa de conocimiento sobre actores: dossiers, posiciones, relaciones, contradicciones y análisis Brain.
        </p>
      </header>

      <ActorKpiBar kpis={kpis} isLoading={overviewLoading} />

      <ActorTopExposure actors={topExposure.slice(0, 5)} onSelect={handleActorClick} />

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

      {activeTab === "mapa" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ActorFilters
              search={search}
              party=""
              actorType={actorType}
              parties={partyDistribution}
              selectedParties={selectedParties}
              onSearch={setSearch}
              onActorType={setActorType}
              onToggleParty={toggleParty}
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {overviewLoading ? (
                <div className="col-span-3 text-center py-8 text-text2 text-sm">Cargando actores…</div>
              ) : (
                actors.map(a => (
                  <ActorCard key={a.id} actor={a} onClick={handleActorClick} />
                ))
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <ActorPartySummary distribution={partyDistribution} />
            <div className="premium-card">
              <Users className="w-4 h-4 text-cyan1 mb-2" />
              <div className="text-2xl font-bold text-text1">{listData?.total ?? actors.length}</div>
              <div className="text-[11px] text-muted">Actores monitorizados</div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "directorio" && (
        <div className="space-y-4">
          <ActorFilters
            search={search}
            party=""
            actorType={actorType}
            parties={partyDistribution}
            selectedParties={selectedParties}
            onSearch={setSearch}
            onActorType={setActorType}
            onToggleParty={toggleParty}
          />
          <div className="text-xs text-muted">{listData?.total ?? 0} actores</div>
          {listLoading ? (
            <div className="text-center py-8 text-text2 text-sm">Cargando directorio…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(listData?.actors ?? actors).map(a => (
                <ActorCard key={a.id} actor={a} onClick={handleActorClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "relaciones" && (
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Red de relaciones</h2>
          </div>
          <div className="flex items-center justify-center py-16 text-text2 text-sm">
            Selecciona un actor del Mapa para ver su red de relaciones.
          </div>
        </section>
      )}

      {activeTab === "analisis" && (
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Análisis comparativo</h2>
          </div>
          <div className="flex items-center justify-center py-16 text-text2 text-sm">
            Selecciona actores del Directorio para comparar métricas y posiciones.
          </div>
        </section>
      )}

      {selectedDossier && (
        <ActorDossierPanel dossier={selectedDossier} onClose={() => setSelectedDossier(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/actores/page.tsx
git commit -m "feat(actores): rewrite page — 4-tab console: mapa/directorio/relaciones/analisis + dossier drawer"
```

---

## Task 7: Delivery Report

**Files:**
- Create: `docs/tab-actores-ontologia.md`

- [ ] **Step 1: Create delivery report**

```markdown
# TAB 3 — Actores & Ontología Política: Delivery Report

**Branch:** `tab-actores-ontologia`
**Date:** 2026-05-06
**Status:** ✅ Complete

## Objective

Transform `/actores` from a basic actor grid into a professional actor intelligence layer with dossiers, ontology graph, positions, relationships, contradictions, media exposure, and Brain analysis.

## What Was Built

### Backend

| File | Description |
|------|-------------|
| `api/schemas/actors.py` | Rewritten with 14 rich models: PoliticalActor, ActorMetric, ActorPosition, ActorRelationship, ActorTimelineEvent, ActorContradiction, ActorDossier, GraphNode, GraphEdge, ActorGraphResponse, ActorsOverviewResponse, ActorsListResponse, ActorAnalysisRequest/Response + legacy compat |
| `services/actors/__init__.py` | Package marker |
| `services/actors/actor_fixtures.py` | 8 DEMO actors (Sánchez, Feijóo, Abascal, Y. Díaz, Ayuso, Puigdemont, Montero, J.F.Díaz), KPIs, events, party distribution, full dossier for Sánchez |
| `services/actors/actor_scoring.py` | Pure functions: party_color, sentiment_from_score, exposure_from_count, approval_from_sentiment, influence_from_metrics, classify_actor_type |
| `services/actors/actor_service.py` | Orchestrator: get_overview, get_actors_list, get_dossier, get_graph, analyze_actor — all with DB→fixtures fallback |
| `api/routers/actors.py` | 10 endpoints: overview, list, dossier, positions, timeline, relationships, graph, analyze, briefing + legacy compat |

### Frontend

| File | Description |
|------|-------------|
| `apps/web/lib/types/actors_rich.ts` | 14 TypeScript interfaces matching backend schemas |
| `apps/web/lib/api/endpoints.ts` | 9 new actor endpoint functions |
| `apps/web/components/actors/` | 12 components: KpiBar, Card, TopExposure, Filters, PartySummary, Timeline, PositionList, RelationshipGraph, Contradictions, MediaExposure, BrainAnalysis, DossierPanel |
| `apps/web/app/actores/page.tsx` | 4-tab console: Mapa / Directorio / Relaciones / Análisis with dossier slide-over |

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/actors/overview` | KPIs + top exposure + party distribution + recent events |
| GET | `/api/actors/list` | Paginated list with party/type/search filters |
| GET | `/api/actors/dossier/{id}` | Full actor dossier with all sub-entities |
| GET | `/api/actors/dossier/{id}/positions` | Actor's known positions on issues |
| GET | `/api/actors/dossier/{id}/timeline` | Actor's event timeline |
| GET | `/api/actors/dossier/{id}/relationships` | Mapped relationships |
| GET | `/api/actors/graph` | Full relationship graph (nodes + edges) |
| POST | `/api/actors/analyze` | Brain LLM analysis of an actor |
| GET | `/api/actors/briefing/{id}` | Quick executive briefing |
| GET | `/api/actors` | Legacy compat endpoint |

## DataMode by Component

| Component | Mode | Condition |
|-----------|------|-----------|
| Overview KPIs | `real` if persona_publica has data, `demo` otherwise | DB |
| Actor list | `real` if DB returns rows, `demo` otherwise | DB |
| Dossier | `real` if actor found in DB with enrichment, `demo` for fixtures | DB |
| Graph | `real` if DB returns actors, `demo` otherwise | DB |
| Brain analysis | `real` if LLM available, `demo` otherwise | LLM client |

## Test Instructions

```bash
# Backend
uvicorn api.main:app --reload --port 8000

curl http://localhost:8000/api/actors/overview | python3 -m json.tool
curl http://localhost:8000/api/actors/list?page=1 | python3 -m json.tool
curl http://localhost:8000/api/actors/dossier/ps01 | python3 -m json.tool
curl http://localhost:8000/api/actors/graph | python3 -m json.tool

# Frontend
# http://localhost:3000/actores → 4-tab console
# Click any actor → dossier slide-over opens
# Click "Brain" tab in dossier → ask questions
```

## Limitations / Sprint 6

- Dossier positions/relationships/timeline/contradictions — populated from fixtures for demo actors; real data pending CRM/NLP pipeline
- Relationship graph visualization — placeholder tab (full D3/SVG graph in Sprint 6)
- Comparative analysis tab — placeholder (Sprint 6)
- Actor images — no image_url populated (Sprint 6)
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add docs/tab-actores-ontologia.md
git commit -m "docs: tab-actores-ontologia delivery report"
```
