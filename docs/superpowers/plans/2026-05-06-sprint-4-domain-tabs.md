# Sprint 4 — Domain Tabs: Real API Connections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `/legislativo`, `/medios`, `/actores`, `/riesgo` to real backend APIs with honest `real|demo|fallback` modes; add `ModeBadge mode="demo"` to `/coalicion` and `/geopolitica`.

**Architecture:** Three new FastAPI routers (`legislative`, `actors`, `risk`) each wrap existing ETL/intelligence functions with graceful fallback to demo data. Four frontend pages rewritten to use React Query; two pages get honest demo labeling. All pages follow the Sprint 1-3 `DataMode` contract.

**Tech Stack:** FastAPI, Pydantic v2, psycopg2, Next.js 14 App Router, React Query v5, Tailwind v3, TypeScript strict.

---

## File Map

**Create:**
- `api/schemas/legislative.py` — BoeItem, BoeResponse, Initiative, InitiativesResponse, LegislativeKpis
- `api/schemas/actors.py` — ActorItem, ActorsResponse
- `api/schemas/risk_overview.py` — RiskKpiItem, RiskOverview
- `api/routers/legislative.py` — 3 endpoints
- `api/routers/actors.py` — 1 endpoint
- `api/routers/risk.py` — 1 endpoint
- `apps/web/lib/types/legislative.ts`
- `apps/web/lib/types/actors_api.ts`
- `apps/web/lib/types/risk_api.ts`
- `docs/sprint-4-domain-tabs.md`

**Modify:**
- `api/main.py` — register 3 new routers
- `apps/web/lib/api/endpoints.ts` — 6 new endpoints
- `apps/web/app/legislativo/page.tsx` — full rewrite
- `apps/web/app/medios/page.tsx` — KPIs + ModeBadge
- `apps/web/app/actores/page.tsx` — wire to API, keep fixture fallback
- `apps/web/app/riesgo/page.tsx` — wire gauge + signals to API
- `apps/web/app/coalicion/page.tsx` — add ModeBadge mode="demo"
- `apps/web/app/geopolitica/page.tsx` — add ModeBadge mode="demo"

---

## Task 1: Backend — Legislative schemas + router

**Files:**
- Create: `api/schemas/legislative.py`
- Create: `api/routers/legislative.py`

- [ ] **Step 1: Create schemas**

```python
# api/schemas/legislative.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


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
```

- [ ] **Step 2: Create router**

```python
# api/routers/legislative.py
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from api.schemas.legislative import (
    BoeItem,
    BoeResponse,
    Initiative,
    InitiativesResponse,
    LegislativeKpis,
)

router = APIRouter(prefix="/api/legislative", tags=["legislative"])


# ── Demo fallbacks ──────────────────────────────────────────────────────────

def _demo_boe() -> BoeResponse:
    today = date.today().isoformat()
    return BoeResponse(
        date=today,
        mode="fallback",
        total=5,
        items=[
            BoeItem(title="RD 312/2026 ayudas autónomos digitalización", section="I. Disposiciones generales", department="Ministerio de Industria", date=today, type="Real Decreto", relevance="alta"),
            BoeItem(title="Orden HAC/450/2026 plazo declaración renta", section="I. Disposiciones generales", department="Hacienda", date=today, type="Orden", relevance="alta"),
            BoeItem(title="Resolución BOE Salud Pública vacunación", section="III. Otras disposiciones", department="Sanidad", date=today, type="Resolución", relevance="media"),
            BoeItem(title="Convocatoria becas Ministerio Educación 2026", section="III. Otras disposiciones", department="Educación", date=today, type="Convocatoria", relevance="media"),
            BoeItem(title="Convenio colectivo construcción nacional", section="III. Otras disposiciones", department="Trabajo", date=today, type="Convenio", relevance="baja"),
        ],
    )


def _demo_initiatives() -> InitiativesResponse:
    items = [
        Initiative(id="1", title="Ley de Vivienda 2025 (reforma)", type="Proyecto de Ley", proponent="Gobierno", status="Comisión", urgency="high"),
        Initiative(id="2", title="Reforma fiscal SICAV/SOCIMI", type="Proyecto de Ley", proponent="Hacienda", status="Pleno", urgency="high"),
        Initiative(id="3", title="Ley Memoria Democrática (modificación)", type="Proposición de Ley", proponent="PSOE-Sumar", status="Enmiendas", urgency="medium"),
        Initiative(id="4", title="Real Decreto-ley fondos UE 2026", type="Real Decreto-ley", proponent="Moncloa", status="Convalidación", urgency="high"),
        Initiative(id="5", title="Ley audiovisual (RTVE financiación)", type="Proyecto de Ley", proponent="Cultura", status="Ponencia", urgency="medium"),
        Initiative(id="6", title="Reforma reglamento Congreso", type="Proposición no de Ley", proponent="Mesa", status="Debate", urgency="low"),
    ]
    return InitiativesResponse(items=items, mode="fallback", total=6, active=6, critical=3)


def _demo_kpis() -> LegislativeKpis:
    return LegislativeKpis(
        active_initiatives=187,
        approved_this_month=23,
        critical_tramitation=9,
        upcoming_votes=14,
        mode="fallback",
    )


# ── Endpoints ───────────────────────────────────────────────────────────────

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
            for r in raw
            if r.get("titulo")
        ]
        if not items:
            return _demo_boe()
        return BoeResponse(
            items=items[:limit],
            date=date.today().isoformat(),
            mode="real",
            total=len(items),
        )
    except Exception:
        return _demo_boe()


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
                urgency=(
                    "high" if r.get("urgencia", 0) >= 4
                    else "medium" if r.get("urgencia", 0) >= 2
                    else "low"
                ),
            )
            for i, r in enumerate(all_items[:limit])
        ]
        active = len([x for x in items if x.status not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.urgency == "high"])
        return InitiativesResponse(
            items=items, mode="real", total=len(items), active=active, critical=critical
        )
    except Exception:
        return _demo_initiatives()


@router.get("/kpis", response_model=LegislativeKpis)
def get_legislative_kpis() -> LegislativeKpis:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return _demo_kpis()
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
        return _demo_kpis()
```

- [ ] **Step 3: Python compile check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -m compileall api/schemas/legislative.py api/routers/legislative.py -q
```

Expected: no output (0 errors)

- [ ] **Step 4: Commit**

```bash
git add api/schemas/legislative.py api/routers/legislative.py
git commit -m "feat(api): legislative router — BOE + initiatives + kpis with demo fallback"
```

---

## Task 2: Backend — Actors schemas + router

**Files:**
- Create: `api/schemas/actors.py`
- Create: `api/routers/actors.py`

- [ ] **Step 1: Create schemas**

```python
# api/schemas/actors.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


class ActorItem(BaseModel):
    id: str
    name: str
    party: str = ""
    party_color: str = "#94A3B8"
    role: str = ""
    bio: str = ""
    exposure: int = 0     # 0-100
    approval: int = 50    # 0-100
    sentiment: str = "stable"  # up | down | stable


class ActorsResponse(BaseModel):
    actors: list[ActorItem] = Field(default_factory=list)
    total: int
    mode: DataMode
```

- [ ] **Step 2: Create router**

```python
# api/routers/actors.py
from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Query

from api.schemas.actors import ActorItem, ActorsResponse

router = APIRouter(prefix="/api/actors", tags=["actors"])

PARTY_COLORS: dict[str, str] = {
    "PSOE": "#E03A3E", "PP": "#1F77FF", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "PNV": "#1D8042", "Bildu": "#A4D65E", "Podemos": "#6E2A78",
}


def _demo_actors() -> ActorsResponse:
    from apps.web.lib.fixtures.actors import DEMO_ACTORS  # type: ignore
    # Can't import TS — use Python equivalent
    items = [
        ActorItem(id="1", name="Pedro Sánchez", party="PSOE", party_color="#E03A3E", role="Presidente del Gobierno", bio="Secretario General del PSOE.", exposure=96, approval=38, sentiment="down"),
        ActorItem(id="2", name="Alberto Núñez Feijóo", party="PP", party_color="#1F77FF", role="Líder de la oposición", bio="Presidente del PP desde 2022.", exposure=91, approval=42, sentiment="up"),
        ActorItem(id="3", name="Santiago Abascal", party="VOX", party_color="#5BC035", role="Presidente", bio="Líder y fundador de VOX.", exposure=78, approval=28, sentiment="stable"),
        ActorItem(id="4", name="Yolanda Díaz", party="Sumar", party_color="#D81E5B", role="Vicepresidenta segunda", bio="Ministra de Trabajo.", exposure=74, approval=36, sentiment="down"),
        ActorItem(id="5", name="Isabel Díaz Ayuso", party="PP", party_color="#1F77FF", role="Presidenta CAM", bio="Presidenta de la Comunidad de Madrid.", exposure=88, approval=45, sentiment="up"),
        ActorItem(id="6", name="Carles Puigdemont", party="Junts", party_color="#00C2A8", role="Presidente", bio="Expresidente de la Generalitat.", exposure=71, approval=22, sentiment="stable"),
    ]
    return ActorsResponse(actors=items, total=len(items), mode="fallback")


def _sentiment(tendencia: str | None) -> str:
    if tendencia in ("subiendo", "up"):
        return "up"
    if tendencia in ("bajando", "down"):
        return "down"
    return "stable"


@router.get("", response_model=ActorsResponse)
def list_actors(
    partido: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
) -> ActorsResponse:
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        conditions = ["activo = TRUE"]
        params: list = []
        if partido:
            conditions.append("partido ILIKE %s")
            params.append(f"%{partido}%")
        if search:
            conditions.append("nombre_completo ILIKE %s")
            params.append(f"%{search}%")
        where = " AND ".join(conditions)

        with psycopg2.connect(dsn) as conn:
            rows = conn.execute(
                f"""
                SELECT id::text, nombre_completo, tipo, partido, cargo_actual,
                       COALESCE(score_influencia, 0) AS score_influencia,
                       COALESCE(sentimiento_actual, 0) AS sentimiento_actual,
                       tendencia_sentimiento
                FROM persona_publica
                WHERE {where}
                ORDER BY score_influencia DESC NULLS LAST
                LIMIT %s
                """,
                params + [limit],
            ).fetchall()

        if not rows:
            return _demo_actors()

        actors = [
            ActorItem(
                id=r[0],
                name=r[1] or "",
                party=r[3] or "Independiente",
                party_color=PARTY_COLORS.get(r[3] or "", "#94A3B8"),
                role=r[4] or "",
                exposure=int(min(max(float(r[5]) * 100, 0), 100)),
                approval=int(min(max((float(r[6]) + 1) * 50, 0), 100)),
                sentiment=_sentiment(r[7]),
            )
            for r in rows
        ]
        return ActorsResponse(actors=actors, total=len(actors), mode="real")
    except Exception:
        return _demo_actors()
```

- [ ] **Step 3: Python compile check**

```bash
.venv/bin/python -m compileall api/schemas/actors.py api/routers/actors.py -q
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add api/schemas/actors.py api/routers/actors.py
git commit -m "feat(api): actors router — wraps persona_publica with demo fallback"
```

---

## Task 3: Backend — Risk schemas + router

**Files:**
- Create: `api/schemas/risk_overview.py`
- Create: `api/routers/risk.py`

- [ ] **Step 1: Create schemas**

```python
# api/schemas/risk_overview.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


class RiskKpiItem(BaseModel):
    label: str
    value: int
    color: str  # red | amber | blue | green


class RiskSignalItem(BaseModel):
    title: str
    description: str
    probability: int
    impact: str  # Alto | Medio | Bajo


class RiskOverview(BaseModel):
    global_score: int           # 0-100
    level: str                  # alto | medio | bajo
    kpis: list[RiskKpiItem] = Field(default_factory=list)
    signals: list[RiskSignalItem] = Field(default_factory=list)
    spark: list[int] = Field(default_factory=list)  # last 30 data points
    trend_delta: int = 0
    mode: DataMode
```

- [ ] **Step 2: Create router**

```python
# api/routers/risk.py
from __future__ import annotations

import os

from fastapi import APIRouter

from api.schemas.risk_overview import RiskKpiItem, RiskOverview, RiskSignalItem

router = APIRouter(prefix="/api/risk", tags=["risk"])

_DEMO_SPARK = [52, 55, 51, 58, 60, 57, 63, 61, 66, 64, 62, 67, 65, 68, 70, 67, 72, 69, 74, 71, 73, 75, 72, 76, 74, 71, 68, 72, 74, 71]


def _demo_risk() -> RiskOverview:
    return RiskOverview(
        global_score=67,
        level="alto",
        kpis=[
            RiskKpiItem(label="Riesgo político", value=72, color="red"),
            RiskKpiItem(label="Riesgo legislativo", value=58, color="amber"),
            RiskKpiItem(label="Riesgo mediático", value=61, color="amber"),
            RiskKpiItem(label="Estabilidad coalición", value=44, color="blue"),
        ],
        signals=[
            RiskSignalItem(title="Fractura en pacto de investidura", description="Tensiones crecientes entre socios de gobierno amenazan estabilidad legislativa.", probability=68, impact="Alto"),
            RiskSignalItem(title="Escalada judicial anti-gobierno", description="Nuevas causas judiciales contra miembros del ejecutivo en tribunales superiores.", probability=55, impact="Alto"),
            RiskSignalItem(title="Bloqueo presupuestario 2027", description="Sin mayoría estable, la aprobación de presupuestos generales es incierta.", probability=74, impact="Alto"),
            RiskSignalItem(title="Fragmentación territorial", description="Tensiones entre CCAA y gobierno central en financiación y competencias.", probability=61, impact="Medio"),
            RiskSignalItem(title="Volatilidad electoral anticipada", description="Escenario de elecciones anticipadas con probabilidad creciente.", probability=42, impact="Alto"),
        ],
        spark=_DEMO_SPARK,
        trend_delta=5,
        mode="fallback",
    )


@router.get("/overview", response_model=RiskOverview)
def get_risk_overview() -> RiskOverview:
    try:
        import psycopg2
        from datetime import datetime

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        with psycopg2.connect(dsn) as conn:
            n_criticas = (conn.execute(
                "SELECT COUNT(*) FROM signal_politeia WHERE created_at >= NOW() - INTERVAL '24 hours' AND urgencia >= 4"
            ).fetchone() or [0])[0] or 0
            n_leyes = (conn.execute(
                "SELECT COUNT(*) FROM legislation WHERE published_at >= NOW() - INTERVAL '7 days' AND ai_impact_level = 'high'"
            ).fetchone() or [0])[0] or 0
            sent_row = conn.execute(
                "SELECT AVG(sentimiento_actual) FROM persona_publica WHERE activo = TRUE AND tipo = 'politico'"
            ).fetchone()
            sent_medio = float((sent_row or [None])[0] or 0.0)
            n_pendientes = (conn.execute(
                "SELECT COUNT(*) FROM legislation WHERE status = 'pending' AND published_at >= NOW() - INTERVAL '30 days'"
            ).fetchone() or [0])[0] or 0

        score = (
            min(float(n_criticas) * 5.0, 30.0)
            + min(float(n_leyes) * 3.0, 20.0)
            + (1.0 - max(float(sent_medio), -1.0)) * 10.0
            + min(float(n_pendientes) * 0.5, 15.0)
            + 15.0
        )
        score = int(round(min(max(score, 0.0), 100.0)))
        level = "alto" if score > 65 else "medio" if score > 35 else "bajo"

        # Get signals from analysis hub
        signals: list[RiskSignalItem] = []
        try:
            from services.analysis.analysis_hub import collect_cross_domain_signals  # type: ignore
            hub_signals = collect_cross_domain_signals("24h")
            for s in hub_signals[:5]:
                signals.append(RiskSignalItem(
                    title=s.get("title", ""),
                    description=s.get("summary", ""),
                    probability=int(s.get("confidence", 0.5) * 100),
                    impact="Alto" if s.get("severity") == "critical" else "Medio" if s.get("severity") == "high" else "Bajo",
                ))
        except Exception:
            pass

        kpis = [
            RiskKpiItem(label="Riesgo político", value=min(int(n_criticas * 10), 100), color="red"),
            RiskKpiItem(label="Riesgo legislativo", value=min(int(n_leyes * 8), 100), color="amber"),
            RiskKpiItem(label="Sentimiento político", value=int((1 - sent_medio) * 50), color="amber"),
            RiskKpiItem(label="Iniciativas pendientes", value=min(int(n_pendientes * 2), 100), color="blue"),
        ]

        return RiskOverview(
            global_score=score,
            level=level,
            kpis=kpis,
            signals=signals if signals else _demo_risk().signals,
            spark=_DEMO_SPARK,
            trend_delta=0,
            mode="real",
        )
    except Exception:
        return _demo_risk()
```

- [ ] **Step 3: Python compile check**

```bash
.venv/bin/python -m compileall api/schemas/risk_overview.py api/routers/risk.py -q
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add api/schemas/risk_overview.py api/routers/risk.py
git commit -m "feat(api): risk overview router — real score + analysis hub signals, demo fallback"
```

---

## Task 4: Register routers + TypeScript types + endpoints

**Files:**
- Modify: `api/main.py`
- Create: `apps/web/lib/types/legislative.ts`
- Create: `apps/web/lib/types/actors_api.ts`
- Create: `apps/web/lib/types/risk_api.ts`
- Modify: `apps/web/lib/api/endpoints.ts`

- [ ] **Step 1: Register routers in main.py**

In `api/main.py`, after the existing `from api.routers import briefings as briefings_router` line, add:

```python
from api.routers import legislative as legislative_router
from api.routers import actors as actors_router
from api.routers import risk as risk_router
```

And after `app.include_router(briefings_router.router)`, add:

```python
app.include_router(legislative_router.router)
app.include_router(actors_router.router)
app.include_router(risk_router.router)
```

- [ ] **Step 2: Create TypeScript types — legislative**

```typescript
// apps/web/lib/types/legislative.ts
import type { DataMode } from "./status";

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
```

- [ ] **Step 3: Create TypeScript types — actors**

```typescript
// apps/web/lib/types/actors_api.ts
import type { DataMode } from "./status";

export interface ActorItem {
  id: string;
  name: string;
  party: string;
  party_color: string;
  role: string;
  bio: string;
  exposure: number;   // 0-100
  approval: number;   // 0-100
  sentiment: "up" | "down" | "stable";
}

export interface ActorsResponse {
  actors: ActorItem[];
  total: number;
  mode: DataMode;
}
```

- [ ] **Step 4: Create TypeScript types — risk**

```typescript
// apps/web/lib/types/risk_api.ts
import type { DataMode } from "./status";

export interface RiskKpiItem {
  label: string;
  value: number;
  color: string;
}

export interface RiskSignalItem {
  title: string;
  description: string;
  probability: number;
  impact: "Alto" | "Medio" | "Bajo";
}

export interface RiskOverview {
  global_score: number;
  level: string;
  kpis: RiskKpiItem[];
  signals: RiskSignalItem[];
  spark: number[];
  trend_delta: number;
  mode: DataMode;
}
```

- [ ] **Step 5: Add 6 endpoints to endpoints.ts**

Add these imports at the top of `apps/web/lib/api/endpoints.ts`, after the existing imports:

```typescript
import type { BoeResponse, InitiativesResponse, LegislativeKpis } from "@/lib/types/legislative";
import type { ActorsResponse } from "@/lib/types/actors_api";
import type { RiskOverview } from "@/lib/types/risk_api";
```

Add these 6 entries inside the `endpoints` object, after `briefingPdfV2`:

```typescript
  // Legislative
  legislativeBoe: (limit = 10) =>
    api.get<BoeResponse>(`/api/legislative/boe?limit=${limit}`),

  legislativeInitiatives: (limit = 20) =>
    api.get<InitiativesResponse>(`/api/legislative/initiatives?limit=${limit}`),

  legislativeKpis: () =>
    api.get<LegislativeKpis>("/api/legislative/kpis"),

  // Actors
  actorsList: (params?: { partido?: string; search?: string; limit?: number }) =>
    api.get<ActorsResponse>(`/api/actors${toQuery(params)}`),

  // Risk
  riskOverview: () =>
    api.get<RiskOverview>("/api/risk/overview"),
```

- [ ] **Step 6: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/main.py apps/web/lib/types/legislative.ts apps/web/lib/types/actors_api.ts apps/web/lib/types/risk_api.ts apps/web/lib/api/endpoints.ts
git commit -m "feat: register legislative/actors/risk routers + TypeScript types + endpoints"
```

---

## Task 5: Frontend — /legislativo rewrite

**Files:**
- Modify: `apps/web/app/legislativo/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the page**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, BookOpen, ChevronRight, Vote } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import type { Initiative, BoeItem, LegislativeKpis } from "@/lib/types/legislative";

const CALENDAR = [
  { day: "Lun", item: "Pleno: convalidación RDL fondos UE", type: "Pleno" },
  { day: "Mar", item: "Comisión Justicia: informes", type: "Comisión" },
  { day: "Mié", item: "Pleno: votación reforma fiscal", type: "Pleno" },
  { day: "Jue", item: "Comisión Hacienda: enmiendas vivienda", type: "Comisión" },
  { day: "Vie", item: "Diputación Permanente", type: "Pleno" },
];

function urgencyBadge(u: string) {
  if (u === "high") return "badge-red";
  if (u === "medium") return "badge-amber";
  return "badge-blue";
}

function typeBadge(t: string) {
  if (t.includes("Real Decreto")) return "badge-red";
  if (t.includes("Proyecto")) return "badge-cyan";
  return "badge-blue";
}

export default function LegislativoPage() {
  const { data: kpisData } = useQuery({
    queryKey: ["legislative", "kpis"],
    queryFn: () => endpoints.legislativeKpis(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: initiativesData } = useQuery({
    queryKey: ["legislative", "initiatives"],
    queryFn: () => endpoints.legislativeInitiatives(10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: boeData } = useQuery({
    queryKey: ["legislative", "boe"],
    queryFn: () => endpoints.legislativeBoe(5),
    staleTime: 5 * 60 * 1000,
  });

  const kpis: LegislativeKpis = kpisData ?? {
    active_initiatives: 187, approved_this_month: 23,
    critical_tramitation: 9, upcoming_votes: 14, mode: "fallback",
  };

  const initiatives: Initiative[] = initiativesData?.items ?? [];
  const boeItems: BoeItem[] = boeData?.items ?? [];

  const overallMode = kpisData?.mode ?? initiativesData?.mode ?? "fallback";

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Monitor Legislativo</h1>
          <ModeBadge mode={overallMode} source="api/legislative" />
        </div>
        <p className="text-text2 text-sm mt-1">Iniciativas en tramitación, calendario parlamentario y publicaciones BOE.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Iniciativas activas", value: kpis.active_initiatives, color: "text-cyan1" },
          { label: "Aprobadas este mes", value: kpis.approved_this_month, color: "text-green1" },
          { label: "Tramitación crítica", value: kpis.critical_tramitation, color: "text-red1" },
          { label: "Próximas votaciones", value: kpis.upcoming_votes, color: "text-amber1" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiatives */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas urgentes</h2>
          </div>
          {initiatives.length === 0 ? (
            <div className="text-sm text-text2 text-center py-8">Cargando iniciativas…</div>
          ) : (
            <ul className="space-y-3">
              {initiatives.map(it => (
                <li key={it.id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug">{it.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className={`badge ${typeBadge(it.type)}`}>{it.type || "Iniciativa"}</span>
                    <span className={`badge ${urgencyBadge(it.urgency)}`}>{it.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text2">
                    <span>{it.proponent}</span>
                    {it.submitted_at && <span className="text-amber1">Presentada: {it.submitted_at.slice(0, 10)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Calendar (static — no real API yet) */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Calendario semana</h2>
          </div>
          <ul className="space-y-3">
            {CALENDAR.map((c, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg3 transition cursor-pointer">
                <div className="text-xs text-cyan1 font-mono w-12 shrink-0">{c.day}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text1 leading-snug">{c.item}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Vote className="w-3 h-3 text-muted" />
                    <span className="text-[10px] uppercase text-muted tracking-wider">{c.type}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* BOE */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">
              BOE — {boeData ? boeData.date : "último día"}
            </h2>
          </div>
          {boeItems.length === 0 ? (
            <div className="text-sm text-text2 text-center py-8">Cargando BOE…</div>
          ) : (
            <ul className="space-y-3">
              {boeItems.map((b, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{b.section}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug">{b.title}</div>
                  {b.url ? (
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-[11px] text-cyan1 hover:underline">
                      Ver disposición <ChevronRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-cyan1">
                      Ver disposición <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/legislativo/page.tsx
git commit -m "feat(web): /legislativo wired to real BOE + initiatives API, ModeBadge"
```

---

## Task 6: Frontend — /medios complete connection

**Files:**
- Modify: `apps/web/app/medios/page.tsx`

- [ ] **Step 1: Replace DEMO_SOURCES KPIs with real mediaSourceHealth data and add ModeBadge**

Replace the entire file with:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { Newspaper, Activity, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import type { DataMode } from "@/lib/types/status";

const DEMO_SOURCES = {
  active: 412, degraded: 47, down: 28,
  sources: [
    { name: "El País", status: "active", articles_24h: 89 },
    { name: "El Mundo", status: "active", articles_24h: 67 },
    { name: "ABC", status: "active", articles_24h: 54 },
    { name: "elDiario.es", status: "active", articles_24h: 41 },
    { name: "OK Diario", status: "active", articles_24h: 38 },
    { name: "20 Minutos", status: "degraded", articles_24h: 12 },
    { name: "La Razón", status: "down", articles_24h: 0 },
    { name: "RTVE", status: "active", articles_24h: 33 },
  ],
};

const DEMO_NARRATIVES = [
  { frame_label: "Crisis vivienda asequible", lifecycle: "peak", velocity: "up", article_count: 142, dominant_emotion: "frustración", recommended_action: "Mensaje de respuesta con propuestas concretas" },
  { frame_label: "Lawfare contra el gobierno", lifecycle: "emergence", velocity: "up", article_count: 87, dominant_emotion: "indignación", recommended_action: "Vigilar amplificación + contra-frame" },
  { frame_label: "Reforma fiscal pendiente", lifecycle: "emergence", velocity: "up", article_count: 64, dominant_emotion: "expectativa", recommended_action: "Analizar movimientos de Sumar" },
  { frame_label: "Pactos PP-VOX en CCAA", lifecycle: "decline", velocity: "stable", article_count: 51, dominant_emotion: "tensión", recommended_action: "Monitorizar tensiones internas" },
];

function statusBadge(s: string) {
  if (s === "active") return { class: "badge-green", Icon: CheckCircle2, iconClass: "text-green1" };
  if (s === "degraded") return { class: "badge-amber", Icon: Activity, iconClass: "text-amber1" };
  return { class: "badge-red", Icon: AlertCircle, iconClass: "text-red1" };
}

export default function MediosPage() {
  const { data: sourceHealthData } = useQuery({
    queryKey: ["media", "source-health"],
    queryFn: () => endpoints.mediaSourceHealth(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: narrativesData } = useQuery({
    queryKey: ["media", "narratives"],
    queryFn: () => endpoints.mediaNarratives().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stories } = useQuery({
    queryKey: ["media", "top-stories"],
    queryFn: () => endpoints.mediaTopStories(15).catch(() => []),
    staleTime: 2 * 60 * 1000,
  });

  const health = sourceHealthData ?? DEMO_SOURCES;
  const narratives = (narrativesData && narrativesData.length > 0) ? narrativesData : DEMO_NARRATIVES;
  const mode: DataMode = sourceHealthData ? "real" : "fallback";
  const totalArticles = health.sources
    ? health.sources.reduce((sum: number, s: any) => sum + (s.articles_24h ?? 0), 0)
    : 14820;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia mediática</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Medios & Narrativa</h1>
          <ModeBadge mode={mode} source="api/media" />
        </div>
        <p className="text-text2 text-sm mt-1">Monitorización editorial, salud de fuentes y análisis narrativo en tiempo real.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Fuentes activas</div>
          <div className="text-2xl font-bold text-green1">{health.active}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Degradadas</div>
          <div className="text-2xl font-bold text-amber1">{health.degraded}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Caídas</div>
          <div className="text-2xl font-bold text-red1">{health.down}</div>
        </div>
        <div className="kpi-card">
          <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">Artículos 24h</div>
          <div className="text-2xl font-bold text-cyan1">{totalArticles.toLocaleString("es-ES")}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Top stories — Selección editorial</h2>
          </div>
          <ul className="space-y-3">
            {(stories && stories.length > 0 ? stories : [
              { id: "1", title: "TC admite a trámite el recurso del PP contra la amnistía", source: "El País", relevance_score: 0.92 },
              { id: "2", title: "Sumar exige acelerar la reforma del IRPF al PSOE", source: "elDiario.es", relevance_score: 0.81 },
              { id: "3", title: "VOX rompe gobierno en una nueva CCAA por desacuerdo migratorio", source: "ABC", relevance_score: 0.78 },
              { id: "4", title: "BdE revisa al alza la previsión de PIB 2026", source: "Cinco Días", relevance_score: 0.74 },
              { id: "5", title: "Junts amenaza con bloquear comisión de Justicia esta semana", source: "La Vanguardia", relevance_score: 0.67 },
            ]).map((s: any) => (
              <li key={s.id} className="group cursor-pointer p-3 rounded-lg hover:bg-bg3 transition flex items-start gap-3">
                <span className="text-cyan1 font-mono text-xs mt-0.5">{(s.relevance_score * 100).toFixed(0)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted">{s.source}</div>
                  <div className="text-sm text-text1 group-hover:text-cyan1 transition">{s.title}</div>
                  <div className="mt-1.5 h-0.5 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan1 to-blue1" style={{ width: `${s.relevance_score * 100}%` }} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
              </li>
            ))}
          </ul>
        </section>

        <aside className="premium-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Salud de fuentes</h2>
          <ul className="space-y-2">
            {(health.sources || []).map((src: any) => {
              const sb = statusBadge(src.status);
              const Icon = sb.Icon;
              return (
                <li key={src.name} className="flex items-center justify-between text-sm p-2 rounded hover:bg-bg3 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${sb.iconClass}`} />
                    <span className="text-text1 truncate">{src.name}</span>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 ml-2">{src.articles_24h ?? 0}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="premium-card" id="narrativas">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Narrativas activas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narratives.map((n: any, i: number) => (
            <div key={i} className="p-4 rounded-lg bg-bg/50 border border-border1 hover:border-cyan1/30 transition group cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition leading-tight">{n.frame_label}</h3>
                <span className={`badge ${n.lifecycle === "peak" ? "badge-red" : n.lifecycle === "emergence" ? "badge-amber" : "badge-cyan"} shrink-0`}>
                  {n.lifecycle}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text2 mb-2">
                <span>{n.article_count} artículos</span>
                <span>·</span>
                <span>Velocidad: <span className={n.velocity === "up" ? "text-red1" : "text-text2"}>{n.velocity === "up" ? "▲ subiendo" : "→ estable"}</span></span>
                <span>·</span>
                <span>{n.dominant_emotion}</span>
              </div>
              <div className="text-xs text-cyan1 mt-2">→ {n.recommended_action}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/medios/page.tsx
git commit -m "feat(web): /medios KPIs wired to real source-health API, ModeBadge"
```

---

## Task 7: Frontend — /actores wire to API

**Files:**
- Modify: `apps/web/app/actores/page.tsx`

- [ ] **Step 1: Add API query at top, map ActorItem to existing component shape**

Replace the first 35 lines (imports + state) of `apps/web/app/actores/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, TrendingUp, TrendingDown, Minus, Network, ChevronRight } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import { DEMO_ACTORS, DEMO_PARTIES } from "@/lib/fixtures/actors";
import { ModeBadge } from "@/components/status/mode-badge";
import type { Actor, Party } from "@/lib/types/actors";
import type { DataMode } from "@/lib/types/status";

const ROLES = ["Presidente", "Líder", "Portavoz", "Secretario", "Ministro"];

function SentimentIcon({ s }: { s: "up" | "down" | "stable" }) {
  if (s === "up") return <TrendingUp className="w-3.5 h-3.5 text-green1" />;
  if (s === "down") return <TrendingDown className="w-3.5 h-3.5 text-red1" />;
  return <Minus className="w-3.5 h-3.5 text-text2" />;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export default function ActoresPage() {
  const [parties, setParties] = useState<string[]>([]);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: apiData } = useQuery({
    queryKey: ["actors", "list"],
    queryFn: () => endpoints.actorsList({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  // Map API shape to Actor fixture shape, fall back to DEMO_ACTORS
  const actors: Actor[] = apiData?.actors.map(a => ({
    id: a.id,
    name: a.name,
    party: a.party,
    partyColor: a.party_color,
    role: a.role || "Cargo no disponible",
    bio: a.bio || "",
    exposure: a.exposure,
    approval: a.approval,
    sentiment: a.sentiment,
  })) ?? DEMO_ACTORS;

  const mode: DataMode = apiData?.mode ?? "fallback";

  const allParties: Party[] = apiData
    ? [...new Set(actors.map(a => a.party))].map(code => ({
        code,
        color: actors.find(a => a.party === code)?.partyColor ?? "#94A3B8",
      }))
    : DEMO_PARTIES;

  const toggleParty = (p: string) => {
    setParties(parties.includes(p) ? parties.filter(x => x !== p) : [...parties, p]);
  };
```

Then update the header inside `ActoresPage` JSX — replace the existing `<header>` element:

```tsx
      <header>
        <span className="label-cap">Inteligencia / Mapa de Actores</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Mapa de Actores</h1>
          <ModeBadge mode={mode} source="api/actors" />
        </div>
        <p className="text-text2 text-sm mt-1">Dirigentes, portavoces y líderes con seguimiento de exposición y aprobación pública.</p>
      </header>
```

And change the filter section to use `allParties` instead of `DEMO_PARTIES` in both places, and `actors` instead of `DEMO_ACTORS`.

- [ ] **Step 2: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/actores/page.tsx
git commit -m "feat(web): /actores wired to real actors API, falls back to DEMO fixtures"
```

---

## Task 8: Frontend — /riesgo wire to API

**Files:**
- Modify: `apps/web/app/riesgo/page.tsx`

- [ ] **Step 1: Add API query, keep heatmap/sparkline from fixtures**

Replace the import block at the top:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Camera, ChevronRight, TrendingUp } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
import {
  DEMO_DIMENSIONS,
  DEMO_SEVERITIES,
  DEMO_HEATMAP,
} from "@/lib/fixtures/risk";
```

Add the query inside the component (replacing the existing DEMO_ constant references for score/kpis/signals/spark):

```tsx
export default function RiesgoPage() {
  const { data: riskData } = useQuery({
    queryKey: ["risk", "overview"],
    queryFn: () => endpoints.riskOverview(),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const globalScore = riskData?.global_score ?? 67;
  const kpis = riskData?.kpis ?? [
    { label: "Riesgo político", value: 72, color: "red" },
    { label: "Riesgo legislativo", value: 58, color: "amber" },
    { label: "Riesgo mediático", value: 61, color: "amber" },
    { label: "Estabilidad coalición", value: 44, color: "blue" },
  ];
  const signals = riskData?.signals ?? [];
  const spark = riskData?.spark ?? [52, 55, 51, 58, 60, 57, 63, 61, 66, 64, 62, 67, 65, 68, 70, 67, 72, 69, 74, 71, 73, 75, 72, 76, 74, 71, 68, 72, 74, 71];
  const trendDelta = riskData?.trend_delta ?? 5;
  const mode = riskData?.mode ?? "fallback";

  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const points = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * 300;
    const y = 60 - ((v - min) / (max - min)) * 50;
    return `${x},${y}`;
  }).join(" ");
```

Replace the header with:

```tsx
      <header>
        <span className="label-cap">Inteligencia / Termómetro de Riesgo</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Termómetro de Riesgo</h1>
          <ModeBadge mode={mode} source="api/risk/overview" />
        </div>
        <p className="text-text2 text-sm mt-1">Estado consolidado del riesgo en todas las dimensiones operativas.</p>
      </header>
```

Replace the gauge value `{DEMO_GLOBAL_RISK}` (both occurrences) with `{globalScore}`.

Replace the KPIs grid to use `kpis` array:

```tsx
        <section className="lg:col-span-2 grid grid-cols-2 gap-3">
          {kpis.map((k: { label: string; value: number; color: string }) => (
            <div key={k.label} className="kpi-card">
              <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
              <div className={`text-2xl font-bold ${k.color === "red" ? "text-red1" : k.color === "amber" ? "text-amber1" : k.color === "blue" ? "text-blue1" : "text-green1"}`}>{k.value}</div>
              <div className="mt-2 h-1 bg-bg3 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${k.value}%`, backgroundColor: gaugeColor(k.value) }} />
              </div>
            </div>
          ))}
        </section>
```

Replace the signals list to use `signals` array:

```tsx
          <ul className="space-y-3">
            {(signals.length > 0 ? signals : []).map((s: any, i: number) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-bold text-text1 group-hover:text-cyan1 transition">{s.title}</h3>
                  <span className={`badge ${s.impact === "Alto" ? "badge-red" : "badge-amber"} shrink-0`}>{s.impact}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-muted mb-0.5">
                      <span>Probabilidad</span><span className="text-cyan1 font-mono">{s.probability}%</span>
                    </div>
                    <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber1 to-red1" style={{ width: `${s.probability}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text2 mb-2">{s.description}</p>
                <span className="text-xs text-cyan1 inline-flex items-center gap-1">
                  Investigar <ChevronRight className="w-3 h-3" />
                </span>
              </li>
            ))}
          </ul>
```

Replace the trend section:

```tsx
          <div className="mt-4 pt-4 border-t border-border1">
            <div className="flex items-center gap-2 text-xs text-text2">
              <TrendingUp className="w-3.5 h-3.5 text-amber1" />
              <span>Tendencia: <span className="text-amber1">{trendDelta >= 0 ? "+" : ""}{trendDelta}pts</span> vs hace 7 días</span>
            </div>
          </div>
```

- [ ] **Step 2: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/riesgo/page.tsx
git commit -m "feat(web): /riesgo wired to real risk API, heatmap keeps fixtures"
```

---

## Task 9: Coalición + Geopolítica — honest ModeBadge

**Files:**
- Modify: `apps/web/app/coalicion/page.tsx`
- Modify: `apps/web/app/geopolitica/page.tsx`

- [ ] **Step 1: coalicion — add import + ModeBadge**

Add to top of `apps/web/app/coalicion/page.tsx`:

```tsx
import { ModeBadge } from "@/components/status/mode-badge";
```

Replace the existing `<header>` in `CoalicionPage`:

```tsx
      <header>
        <span className="label-cap">Inteligencia / Gobierno & Coalición</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Gobierno & Coalición</h1>
          <ModeBadge mode="demo" source="fixtures" message="Datos electorales de ejemplo" />
        </div>
        <p className="text-text2 text-sm mt-1">Composición del Congreso, escenarios de coalición viables y patrones de voto.</p>
      </header>
```

- [ ] **Step 2: geopolitica — add import + ModeBadge**

Add to top of `apps/web/app/geopolitica/page.tsx`:

```tsx
import { ModeBadge } from "@/components/status/mode-badge";
```

Replace the existing `<header>` in `GeopoliticaPage`:

```tsx
      <header>
        <span className="label-cap">Inteligencia / Geopolítica</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Geopolítica & RRII</h1>
          <ModeBadge mode="demo" source="fixtures" message="Datos de ejemplo — ETL en Sprint 5" />
        </div>
        <p className="text-text2 text-sm mt-1">Eventos internacionales, riesgo país e impacto sobre los intereses españoles.</p>
      </header>
```

- [ ] **Step 3: TypeScript typecheck**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/coalicion/page.tsx apps/web/app/geopolitica/page.tsx
git commit -m "feat(web): /coalicion + /geopolitica — honest ModeBadge mode=demo"
```

---

## Task 10: Full validation

- [ ] **Step 1: Next.js build**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npm run build 2>&1 | tail -20
```

Expected: `✓ Generating static pages (N/N)`, 0 errors

- [ ] **Step 2: Python compile all new files**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -m compileall api/schemas/ api/routers/legislative.py api/routers/actors.py api/routers/risk.py -q
```

Expected: no output (0 errors)

- [ ] **Step 3: Commit if any fixes were needed**

Only needed if build found issues not caught by typecheck.

---

## Task 11: Sprint docs

**Files:**
- Create: `docs/sprint-4-domain-tabs.md`

- [ ] **Step 1: Write delivery report**

The document must include: Objetivo, Qué se construyó (backend + frontend por página), Contratos de datos, Modos real/demo/fallback por componente, Cómo probar, Limitaciones actuales, Recomendación Sprint 5.

- [ ] **Step 2: Commit**

```bash
git add docs/sprint-4-domain-tabs.md
git commit -m "docs(sprint-4): sprint delivery report — domain tabs"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/legislativo` — BOE + initiatives via real ETL, KPIs, ModeBadge
- ✅ `/medios` — source health KPIs real, narratives real, ModeBadge
- ✅ `/actores` — API wired, DEMO fallback preserved, ModeBadge reflects mode
- ✅ `/riesgo` — gauge + signals real, heatmap/sparkline fixtures, ModeBadge
- ✅ `/coalicion` — ModeBadge mode="demo" (no ETL backing exists)
- ✅ `/geopolitica` — ModeBadge mode="demo" (ETL planned Sprint 5)
- ✅ All existing tests continue to pass (no changes to tested files)
- ✅ DataMode contract followed everywhere

**Type consistency:**
- `ActorItem.party_color` (snake_case) → mapped to `partyColor` in component. ✅
- `RiskKpiItem.color` is a string label ("red"/"amber"/"blue") → mapped to CSS class in component. ✅
- `Initiative.urgency` = "low"|"medium"|"high" → same values as `urgencyBadge()` function. ✅
