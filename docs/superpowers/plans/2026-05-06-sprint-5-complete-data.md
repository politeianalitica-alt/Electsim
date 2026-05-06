# Sprint 5 — Complete Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `/geopolitica` and `/coalicion` to real ETL/DB, replace the risk sparkline fixture with 30-day DB history, and add a source health writer that persists RSS feed status to `media_source_health`.

**Architecture:** Four new API endpoints (geopolitica overview, coalition overview, risk sparkline, source health sync) backed by existing ETL modules (`etl/sources/geopolitics/`, `etl/electoral_math.py`) and DB tables (`eventos_acled`, `riesgo_pais`, `elecciones`, `resultados_electorales`, `signal_politeia`, `media_source_health`). All endpoints follow the established `real|demo|fallback` DataMode pattern. Two frontend pages (`/geopolitica`, `/coalicion`) are rewritten to use React Query instead of static fixtures.

**Tech Stack:** FastAPI + Pydantic v2, psycopg2 cursor pattern, React Query v5, TypeScript strict, Next.js 14 App Router, Tailwind v3

---

## File Map

**New backend files:**
- `api/schemas/geopolitica.py` — GeoEventItem, CountryRiskItem, PresenceItem, GeoKpiItem, GeoOverview
- `api/schemas/coalition.py` — PartySeatItem, CoalitionScenario, CoalitionOverview
- `api/routers/geopolitica.py` — GET /api/geopolitica/overview
- `api/routers/coalition.py` — GET /api/coalition/overview
- `services/sources/health_writer.py` — write_health_to_db(), check_rss_health()

**Modified backend files:**
- `api/routers/risk.py` — replace _DEMO_SPARK with real 30-day DB query
- `api/routers/sources.py` — add POST /api/sources/health-sync
- `api/main.py` — register geopolitica_router, coalition_router

**New frontend files:**
- `apps/web/lib/types/geopolitica_api.ts` — GeoEventItem, CountryRiskItem, PresenceItem, GeoKpiItem, GeoOverview
- `apps/web/lib/types/coalition_api.ts` — PartySeatItem, CoalitionScenario, CoalitionOverview

**Modified frontend files:**
- `apps/web/lib/api/endpoints.ts` — +2 endpoints: geopoliticaOverview, coalitionOverview
- `apps/web/app/geopolitica/page.tsx` — React Query, ModeBadge dynamic
- `apps/web/app/coalicion/page.tsx` — React Query, ModeBadge dynamic

**New docs:**
- `docs/sprint-5-complete-data.md` — delivery report

---

## Task 1: Geopolitica API — schemas + router

**Files:**
- Create: `api/schemas/geopolitica.py`
- Create: `api/routers/geopolitica.py`

**Context:** The geopolitics ETL has 15 modules in `etl/sources/geopolitics/`. Key functions:
- `etl/sources/geopolitics/acled_client.py::fetch_acled_events(countries, limit)` → `list[GeoEvent]` (has demo fallback if no ACLED_API_KEY)
- `etl/sources/geopolitics/country_risk_provider.py::list_risk_profiles(min_score, limit)` → `list[CountryRiskProfile]` (in-memory cache + DB `geo_country_risk` table)
- `etl/sources/geopolitics/spanish_presence_provider.py::get_spanish_presence(country_iso3)` → `list[SpanishPresence]` (has static seed data)

The DB has `eventos_acled` (pais, pais_nombre, fecha, tipo_evento, fatalities, relevancia_es, notas) and `riesgo_pais` (pais, nombre, score_total, interes_espana, riesgo_tendencia) tables.

ISO3→ISO2 mapping is needed for display (12 key countries). severity from ACLED maps: CRITICAL→"war", HIGH→"tense", MEDIUM→"watch", LOW→"stable".

- [ ] **Step 1: Create schemas**

```python
# api/schemas/geopolitica.py
from __future__ import annotations
from pydantic import BaseModel


class GeoEventItem(BaseModel):
    event_id: str
    country: str
    country_iso3: str = ""
    event_date: str            # "YYYY-MM-DD"
    event_type: str
    severity: str              # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    description: str
    fatalities: int = 0
    impact: int = 0            # 0-100 relevance score


class CountryRiskItem(BaseModel):
    code: str                  # ISO2 for display (e.g. "UA")
    iso3: str = ""             # ISO3 (e.g. "UKR")
    name: str
    risk: int                  # 0-100
    status: str                # "war" | "tense" | "watch" | "stable"
    trend: str = "stable"      # "rising" | "stable" | "falling"


class PresenceItem(BaseModel):
    territory: str
    status: str
    level: str                 # "high" | "medium" | "low"
    category: str = "diplomatic"


class GeoKpiItem(BaseModel):
    label: str
    value: int
    color: str


class GeoOverview(BaseModel):
    kpis: list[GeoKpiItem]
    events: list[GeoEventItem]
    countries: list[CountryRiskItem]
    presence: list[PresenceItem]
    mode: str                  # "real" | "fallback" | "demo"
```

- [ ] **Step 2: Verify schemas compile**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from api.schemas.geopolitica import GeoOverview; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Create geopolitica router**

```python
# api/routers/geopolitica.py
"""
Geopolitica API — Sprint 5.

GET /api/geopolitica/overview — Eventos, riesgo país, presencia española.

Datos reales desde: eventos_acled (DB), riesgo_pais (DB), spanish_presence_provider (static seeds).
Fallback: acled_client demo events + hardcoded presence seed.
"""
from __future__ import annotations

import logging
import os
from datetime import date, timedelta

from fastapi import APIRouter

from api.schemas.geopolitica import (
    CountryRiskItem,
    GeoEventItem,
    GeoKpiItem,
    GeoOverview,
    PresenceItem,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/geopolitica", tags=["geopolitica"])

# ISO3 → ISO2 lookup (top countries tracked)
_ISO3_TO_ISO2: dict[str, str] = {
    "UKR": "UA", "RUS": "RU", "PSE": "PS", "ISR": "IL", "SYR": "SY",
    "IRQ": "IQ", "IRN": "IR", "MAR": "MA", "DZA": "DZ", "LBY": "LY",
    "MLI": "ML", "BFA": "BF", "NER": "NE", "NGA": "NG", "TCD": "TD",
    "VEN": "VE", "MEX": "MX", "COL": "CO", "CHN": "CN", "TWN": "TW",
    "TUR": "TR", "LBN": "LB", "YEM": "YE", "SAU": "SA", "SDN": "SD",
}

_SEVERITY_TO_STATUS = {
    "CRITICAL": "war", "HIGH": "tense", "MEDIUM": "watch", "LOW": "stable"
}

_DEMO_EVENTS: list[GeoEventItem] = [
    GeoEventItem(event_id="d1", country="Ucrania", country_iso3="UKR", event_date=str(date.today()), event_type="Conflicto", severity="CRITICAL", description="Ofensiva en frente este — actividad artillera intensa", fatalities=12, impact=88),
    GeoEventItem(event_id="d2", country="Gaza/Palestina", country_iso3="PSE", event_date=str(date.today()), event_type="Conflicto", severity="CRITICAL", description="Operación terrestre continúa — negociaciones suspendidas", fatalities=47, impact=92),
    GeoEventItem(event_id="d3", country="Marruecos", country_iso3="MAR", event_date=str(date.today() - timedelta(days=1)), event_type="Diplomático", severity="MEDIUM", description="Movimientos navales en aguas próximas a Ceuta", fatalities=0, impact=64),
    GeoEventItem(event_id="d4", country="Venezuela", country_iso3="VEN", event_date=str(date.today() - timedelta(days=1)), event_type="Crisis", severity="MEDIUM", description="Protestas post-electorales; oposición denuncia represión", fatalities=3, impact=52),
]

_DEMO_COUNTRIES: list[CountryRiskItem] = [
    CountryRiskItem(code="UA", iso3="UKR", name="Ucrania", risk=92, status="war", trend="stable"),
    CountryRiskItem(code="PS", iso3="PSE", name="Gaza/Palestina", risk=95, status="war", trend="rising"),
    CountryRiskItem(code="RU", iso3="RUS", name="Rusia", risk=88, status="war", trend="stable"),
    CountryRiskItem(code="IR", iso3="IRN", name="Irán", risk=76, status="tense", trend="rising"),
    CountryRiskItem(code="ML", iso3="MLI", name="Sahel (Mali)", risk=84, status="war", trend="stable"),
    CountryRiskItem(code="MA", iso3="MAR", name="Marruecos", risk=58, status="tense", trend="stable"),
    CountryRiskItem(code="VE", iso3="VEN", name="Venezuela", risk=68, status="tense", trend="stable"),
    CountryRiskItem(code="CN", iso3="CHN", name="China", risk=62, status="watch", trend="rising"),
    CountryRiskItem(code="TR", iso3="TUR", name="Turquía", risk=51, status="watch", trend="stable"),
]

_DEMO_PRESENCE: list[PresenceItem] = [
    PresenceItem(territory="Sáhara Occidental", status="Disputa diplomática activa", level="high", category="diplomatic"),
    PresenceItem(territory="Gibraltar", status="Acuerdo post-Brexit en negociación", level="medium", category="diplomatic"),
    PresenceItem(territory="Ceuta y Melilla", status="Presión migratoria estable", level="medium", category="territorial"),
    PresenceItem(territory="Argelia — Medgaz", status="8 Gm³/año — contrato vigente", level="high", category="energy"),
    PresenceItem(territory="Líbano — UNIFIL", status="~600 efectivos militares españoles", level="high", category="military"),
    PresenceItem(territory="OTAN flanco sur", status="Compromiso 2% PIB defensa pendiente", level="medium", category="defense"),
]


def _demo_overview() -> GeoOverview:
    n_events = len(_DEMO_EVENTS)
    critical = sum(1 for e in _DEMO_EVENTS if e.severity in ("CRITICAL", "HIGH"))
    return GeoOverview(
        kpis=[
            GeoKpiItem(label="Eventos críticos 24h", value=critical, color="text-red1"),
            GeoKpiItem(label="Países en conflicto", value=3, color="text-amber1"),
            GeoKpiItem(label="Conflictos activos", value=n_events, color="text-red1"),
            GeoKpiItem(label="Sanctions afectan ES", value=8, color="text-cyan1"),
        ],
        events=_DEMO_EVENTS,
        countries=_DEMO_COUNTRIES,
        presence=_DEMO_PRESENCE,
        mode="demo",
    )


@router.get("/overview", response_model=GeoOverview)
def get_geo_overview() -> GeoOverview:
    """
    Inteligencia geopolítica consolidada.
    Fuentes: eventos_acled (DB), riesgo_pais (DB), spanish_presence_provider (estático).
    """
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        events: list[GeoEventItem] = []
        countries: list[CountryRiskItem] = []

        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                # Events from eventos_acled — last 7 days
                cutoff = (date.today() - timedelta(days=7)).isoformat()
                cur.execute(
                    """
                    SELECT
                        id::text, pais, pais_nombre, fecha::text,
                        tipo_evento, fatalities, relevancia_es, notas
                    FROM eventos_acled
                    WHERE fecha >= %s
                    ORDER BY relevancia_es DESC, fecha DESC
                    LIMIT 20
                    """,
                    (cutoff,),
                )
                rows = cur.fetchall()
                for r in rows:
                    iso3 = r[1] or ""
                    sev = "CRITICAL" if r[5] and r[5] > 50 else "HIGH" if r[5] and r[5] > 10 else "MEDIUM"
                    events.append(GeoEventItem(
                        event_id=r[0],
                        country=r[2] or iso3,
                        country_iso3=iso3,
                        event_date=r[3] or str(date.today()),
                        event_type=r[4] or "Desconocido",
                        severity=sev,
                        description=r[7] or r[4] or "",
                        fatalities=int(r[5] or 0),
                        impact=int((r[6] or 0) * 100),
                    ))

                # Country risk from riesgo_pais
                cur.execute(
                    """
                    SELECT pais, nombre, score_total, interes_espana, riesgo_tendencia
                    FROM riesgo_pais
                    ORDER BY score_total DESC
                    LIMIT 15
                    """,
                )
                crows = cur.fetchall()
                for cr in crows:
                    iso3 = cr[0] or ""
                    score = int(cr[2] or 0)
                    status = "war" if score >= 75 else "tense" if score >= 50 else "watch" if score >= 30 else "stable"
                    trend = cr[4] or "stable"
                    if trend not in ("rising", "stable", "falling"):
                        trend = "stable"
                    countries.append(CountryRiskItem(
                        code=_ISO3_TO_ISO2.get(iso3, iso3[:2]),
                        iso3=iso3,
                        name=cr[1] or iso3,
                        risk=score,
                        status=status,
                        trend=trend,
                    ))

        if not events and not countries:
            # DB tables empty — try ETL fallback
            raise ValueError("DB empty — fallback to ETL")

        # Spanish presence — static seeds always available
        presence: list[PresenceItem] = []
        try:
            from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence  # type: ignore
            raw_presence = get_spanish_presence(country_iso3=None)
            for p in raw_presence[:8]:
                level = "high" if (p.relevance or 0) >= 0.8 else "medium" if (p.relevance or 0) >= 0.5 else "low"
                presence.append(PresenceItem(
                    territory=f"{p.country_name} — {p.actor_name}",
                    status=p.description or "",
                    level=level,
                    category=p.category or "diplomatic",
                ))
        except Exception:
            presence = _DEMO_PRESENCE

        if not events:
            events = _DEMO_EVENTS
        if not countries:
            countries = _DEMO_COUNTRIES

        critical_count = sum(1 for e in events if e.severity in ("CRITICAL", "HIGH"))
        war_count = sum(1 for c in countries if c.status == "war")

        mode = "real" if (len(crows) > 0 or len(rows) > 0) else "fallback"
        return GeoOverview(
            kpis=[
                GeoKpiItem(label="Eventos críticos 24h", value=critical_count, color="text-red1"),
                GeoKpiItem(label="Países en conflicto", value=war_count, color="text-amber1"),
                GeoKpiItem(label="Eventos esta semana", value=len(events), color="text-red1"),
                GeoKpiItem(label="Presencias activas", value=len(presence), color="text-cyan1"),
            ],
            events=events[:8],
            countries=countries[:12],
            presence=presence or _DEMO_PRESENCE,
            mode=mode,
        )

    except Exception as exc:
        logger.warning("get_geo_overview fallback: %s", exc)
        # ETL fallback — use acled_client demo events
        try:
            from etl.sources.geopolitics.acled_client import fetch_acled_events  # type: ignore
            raw_events = fetch_acled_events(limit=10)
            events_fallback: list[GeoEventItem] = []
            for ev in raw_events[:8]:
                events_fallback.append(GeoEventItem(
                    event_id=ev.event_id,
                    country=ev.location_name or ev.country,
                    country_iso3=ev.country_iso3 or "",
                    event_date=str(ev.event_date),
                    event_type=ev.event_type,
                    severity=ev.severity,
                    description=ev.raw_payload.get("notes", ev.event_type),
                    fatalities=ev.fatalities or 0,
                    impact=min(int((ev.fatalities or 0) * 2 + 20), 100),
                ))
            if events_fallback:
                return GeoOverview(
                    kpis=_demo_overview().kpis,
                    events=events_fallback,
                    countries=_DEMO_COUNTRIES,
                    presence=_DEMO_PRESENCE,
                    mode="fallback",
                )
        except Exception:
            pass
        return _demo_overview()
```

- [ ] **Step 4: Verify router compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from api.routers.geopolitica import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/schemas/geopolitica.py api/routers/geopolitica.py
git commit -m "feat(sprint-5): geopolitica API — schemas + router with DB/ETL fallback"
```

---

## Task 2: Coalition API — schemas + router

**Files:**
- Create: `api/schemas/coalition.py`
- Create: `api/routers/coalition.py`

**Context:** DB tables:
- `partidos` (id, siglas, nombre_completo, ideologia, eje_izda_dcha)
- `elecciones` (id, tipo, fecha, es_activa) — tipo enum includes 'congreso'
- `resultados_electorales` (eleccion_id, partido_id, escanos, porcentaje) — summed across provincias
- `analisis_coaliciones` (eleccion_id, partidos_coalicion TEXT, escanos_totales, score_viabilidad, distancia_ideologica)

All use psycopg2 cursor pattern. If DB tables are empty, fall back to hardcoded 2023 election results.

Party colors (siglas → hex):
PP=#1F77FF, PSOE=#E03A3E, VOX=#5BC035, Sumar=#D81E5B, Junts=#00C2A8, ERC=#F4B400, Bildu=#A4D65E, PNV=#1D8042, BNG=#7AC143, Otros=#94A3B8

- [ ] **Step 1: Create coalition schemas**

```python
# api/schemas/coalition.py
from __future__ import annotations
from pydantic import BaseModel


class PartySeatItem(BaseModel):
    code: str          # siglas, e.g. "PP"
    name: str          # nombre_completo
    seats: int
    color: str         # hex color
    pct_vote: float = 0.0


class CoalitionScenario(BaseModel):
    members: list[str]          # party codes
    total: int                  # total seats
    majority: bool              # total > 175
    distance: int               # 0-100 ideological distance
    probability: int            # 0-100 viability score
    conflicts: list[str]        # known friction points


class CoalitionOverview(BaseModel):
    parties: list[PartySeatItem]
    coalitions: list[CoalitionScenario]
    election_date: str | None = None    # ISO date if from DB
    total_seats: int = 350
    majority_threshold: int = 176
    mode: str                           # "real" | "fallback" | "demo"
```

- [ ] **Step 2: Verify schemas compile**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from api.schemas.coalition import CoalitionOverview; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Create coalition router**

```python
# api/routers/coalition.py
"""
Coalition API — Sprint 5.

GET /api/coalition/overview — Composición del Congreso y coaliciones viables.

Datos reales desde: partidos + elecciones + resultados_electorales (DB).
Fallback: resultados 2023 hardcoded.
"""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter

from api.schemas.coalition import CoalitionOverview, CoalitionScenario, PartySeatItem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coalition", tags=["coalition"])

# Party colors (código → hex)
_PARTY_COLORS: dict[str, str] = {
    "PP": "#1F77FF", "PSOE": "#E03A3E", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "Bildu": "#A4D65E", "PNV": "#1D8042", "BNG": "#7AC143",
    "Otros": "#94A3B8", "Cs": "#F97316", "UP": "#6B21A8",
}
_DEFAULT_COLOR = "#94A3B8"

# Fallback — resultado elecciones generales julio 2023
_FALLBACK_PARTIES: list[PartySeatItem] = [
    PartySeatItem(code="PP",    name="Partido Popular",              seats=137, color="#1F77FF", pct_vote=33.0),
    PartySeatItem(code="PSOE",  name="Partido Socialista",           seats=121, color="#E03A3E", pct_vote=31.7),
    PartySeatItem(code="VOX",   name="VOX",                          seats=33,  color="#5BC035", pct_vote=12.4),
    PartySeatItem(code="Sumar", name="Sumar",                        seats=27,  color="#D81E5B", pct_vote=12.3),
    PartySeatItem(code="Junts", name="Junts per Catalunya",          seats=7,   color="#00C2A8", pct_vote=1.6),
    PartySeatItem(code="ERC",   name="Esquerra Republicana",         seats=7,   color="#F4B400", pct_vote=2.0),
    PartySeatItem(code="Bildu", name="EH Bildu",                     seats=6,   color="#A4D65E", pct_vote=1.4),
    PartySeatItem(code="PNV",   name="Partido Nacionalista Vasco",   seats=5,   color="#1D8042", pct_vote=1.0),
    PartySeatItem(code="BNG",   name="Bloque Nacionalista Galego",   seats=1,   color="#7AC143", pct_vote=0.6),
    PartySeatItem(code="Otros", name="Otros",                        seats=6,   color="#94A3B8", pct_vote=3.0),
]

# Known coalition scenarios with meta-analysis
_KNOWN_SCENARIOS: list[dict] = [
    {"members": ["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"], "distance": 28, "probability": 62, "conflicts": ["Memoria democrática", "Financiación CCAA"]},
    {"members": ["PP", "VOX"], "distance": 18, "probability": 71, "conflicts": ["Política UE", "Agenda climática"]},
    {"members": ["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"], "distance": 38, "probability": 48, "conflicts": ["Catalunya independencia", "Reforma fiscal"]},
    {"members": ["PP", "VOX", "Junts"], "distance": 52, "probability": 22, "conflicts": ["Idioma", "Inmigración", "Modelo Estado"]},
    {"members": ["PP", "PSOE"], "distance": 45, "probability": 12, "conflicts": ["Coalición improbable", "Bloqueo electoral"]},
]


def _build_coalitions(parties: list[PartySeatItem], majority: int) -> list[CoalitionScenario]:
    seat_map = {p.code: p.seats for p in parties}
    coalitions: list[CoalitionScenario] = []
    for sc in _KNOWN_SCENARIOS:
        total = sum(seat_map.get(m, 0) for m in sc["members"])
        coalitions.append(CoalitionScenario(
            members=sc["members"],
            total=total,
            majority=total >= majority,
            distance=sc["distance"],
            probability=sc["probability"],
            conflicts=sc["conflicts"],
        ))
    # Sort by probability desc
    return sorted(coalitions, key=lambda c: c.probability, reverse=True)


def _demo_overview() -> CoalitionOverview:
    majority = 176
    return CoalitionOverview(
        parties=_FALLBACK_PARTIES,
        coalitions=_build_coalitions(_FALLBACK_PARTIES, majority),
        election_date=None,
        total_seats=350,
        majority_threshold=majority,
        mode="demo",
    )


@router.get("/overview", response_model=CoalitionOverview)
def get_coalition_overview() -> CoalitionOverview:
    """
    Composición del Congreso y escenarios de coalición.
    Fuentes: partidos + elecciones + resultados_electorales (DB).
    """
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                # Most recent congreso election
                cur.execute(
                    """
                    SELECT id, fecha::text
                    FROM elecciones
                    WHERE tipo = 'congreso'
                    ORDER BY fecha DESC
                    LIMIT 1
                    """
                )
                elec_row = cur.fetchone()
                if not elec_row:
                    raise ValueError("No elections in DB")

                elec_id, elec_date = elec_row

                # Sum escanos by partido across all provincias
                cur.execute(
                    """
                    SELECT p.siglas, p.nombre_completo, SUM(r.escanos)::int, AVG(r.porcentaje)::float
                    FROM resultados_electorales r
                    JOIN partidos p ON p.id = r.partido_id
                    WHERE r.eleccion_id = %s
                    GROUP BY p.id, p.siglas, p.nombre_completo
                    HAVING SUM(r.escanos) > 0
                    ORDER BY SUM(r.escanos) DESC
                    """,
                    (elec_id,),
                )
                party_rows = cur.fetchall()

        if not party_rows:
            raise ValueError("No seat data in DB")

        parties: list[PartySeatItem] = []
        for row in party_rows:
            siglas = row[0] or "Otros"
            parties.append(PartySeatItem(
                code=siglas,
                name=row[1] or siglas,
                seats=int(row[2] or 0),
                color=_PARTY_COLORS.get(siglas, _DEFAULT_COLOR),
                pct_vote=round(float(row[3] or 0), 1),
            ))

        total_seats = sum(p.seats for p in parties)
        majority = (total_seats // 2) + 1

        return CoalitionOverview(
            parties=parties,
            coalitions=_build_coalitions(parties, majority),
            election_date=elec_date,
            total_seats=total_seats,
            majority_threshold=majority,
            mode="real",
        )

    except Exception as exc:
        logger.warning("get_coalition_overview fallback: %s", exc)
        return _demo_overview()
```

- [ ] **Step 4: Verify router compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from api.routers.coalition import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/schemas/coalition.py api/routers/coalition.py
git commit -m "feat(sprint-5): coalition API — schemas + router with DB/fallback"
```

---

## Task 3: Risk sparkline from DB + register new routers

**Files:**
- Modify: `api/routers/risk.py` — replace _DEMO_SPARK with real DB query
- Modify: `api/main.py` — register geopolitica and coalition routers

**Context:** `signal_politeia` table columns: `id (UUID)`, `tipo (TEXT)`, `urgencia (SMALLINT 1-5)`, `titulo (TEXT)`, `created_at (TIMESTAMPTZ)`. Query groups by day for last 30 days. Score = `LEAST(ROUND(COUNT * AVG(urgencia) * 2.5), 100)`. Fill missing days with linear interpolation between neighbors.

The existing `api/routers/risk.py` has `_DEMO_SPARK` at line 10. Replace the fallback list and add real DB query.

- [ ] **Step 1: Add real sparkline query to risk router**

In `api/routers/risk.py`, replace the section after `_DEMO_SPARK = [...]` and before `def _demo_risk()` with:

```python
_DEMO_SPARK = [52, 55, 51, 58, 60, 57, 63, 61, 66, 64, 62, 67, 65, 68, 70, 67, 72, 69, 74, 71, 73, 75, 72, 76, 74, 71, 68, 72, 74, 71]


def _fetch_sparkline(dsn: str) -> list[int]:
    """Query signal_politeia for 30-day daily risk score."""
    import psycopg2
    from datetime import date, timedelta

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS n,
                    AVG(urgencia)::float AS avg_u
                FROM signal_politeia
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
                """
            )
            rows = cur.fetchall()

    if not rows:
        return _DEMO_SPARK

    # Build day → score map
    day_scores: dict[str, int] = {}
    for row in rows:
        d = str(row[0])
        score = int(min(round(float(row[1]) * float(row[2] or 1) * 2.5), 100))
        day_scores[d] = score

    # Fill all 30 days with fallback = median(known) for missing
    today = date.today()
    known_values = list(day_scores.values())
    median_val = sorted(known_values)[len(known_values) // 2] if known_values else 50
    result: list[int] = []
    for i in range(29, -1, -1):
        d = str(today - timedelta(days=i))
        result.append(day_scores.get(d, median_val))
    return result
```

Then in `get_risk_overview()`, before the `return RiskOverview(...)` call at the end of the happy path (after all DB queries), add:

```python
        # Real sparkline
        try:
            real_spark = _fetch_sparkline(dsn)
        except Exception:
            real_spark = _DEMO_SPARK
```

And change the `return RiskOverview(...)` to use `spark=real_spark` instead of `spark=_DEMO_SPARK`.

- [ ] **Step 2: Register new routers in main.py**

In `api/main.py`, add two imports after `from api.routers import risk as risk_router`:

```python
from api.routers import geopolitica as geopolitica_router
from api.routers import coalition as coalition_router
```

And add two `include_router` calls after `app.include_router(risk_router.router)`:

```python
app.include_router(geopolitica_router.router)
app.include_router(coalition_router.router)
```

- [ ] **Step 3: Verify main.py compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from api.main import app; print('routers OK:', len(app.routes))"
```

Expected: `routers OK: <N>` (some number > 50)

- [ ] **Step 4: Test new endpoints**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/uvicorn api.main:app --port 8000 &
sleep 3
curl -s http://localhost:8000/api/geopolitica/overview | python3 -m json.tool | grep '"mode"'
curl -s http://localhost:8000/api/coalition/overview | python3 -m json.tool | grep '"mode"'
curl -s http://localhost:8000/api/risk/overview | python3 -m json.tool | grep '"spark"' | head -2
kill %1
```

Expected: mode field present in all three responses, spark is an array of 30 ints

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add api/routers/risk.py api/main.py
git commit -m "feat(sprint-5): real risk sparkline from signal_politeia + register geo/coalition routers"
```

---

## Task 4: Source health writer

**Files:**
- Create: `services/sources/health_writer.py`
- Modify: `api/routers/sources.py` — add POST /api/sources/health-sync

**Context:** `media_source_health` table columns: `source_id (VARCHAR 32 PK)`, `source_name`, `rss_url`, `status`, `last_success_at`, `last_failure_at`, `http_status`, `error_type`, `error_message`, `articles_last_24h`, `quality_score`, `updated_at`, `created_at`. The `source_registry.py` has `list_source_definitions()` which returns sources with `health` field. Each source has `source_id`, `name`, `rss_url`, `domain`.

The health writer checks each RSS URL (HTTP HEAD request, timeout 5s), writes result to `media_source_health` via upsert.

- [ ] **Step 1: Create health_writer service**

```python
# services/sources/health_writer.py
"""
Health Writer — Sprint 5.

Pings RSS feeds and persists status to media_source_health table.
Nunca lanza — siempre try/except.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_NOW = lambda: datetime.now(timezone.utc).isoformat()


def check_rss_health(source_id: str, source_name: str, rss_url: str) -> dict:
    """
    Checks a single RSS feed via HTTP HEAD.
    Returns a dict matching media_source_health columns.
    """
    result: dict = {
        "source_id": source_id[:32],
        "source_name": source_name[:200],
        "rss_url": rss_url,
        "status": "unknown",
        "http_status": None,
        "error_type": None,
        "error_message": None,
        "updated_at": _NOW(),
    }
    if not rss_url:
        result["status"] = "disabled"
        return result
    try:
        try:
            import requests
            resp = requests.head(rss_url, timeout=5, allow_redirects=True)
            result["http_status"] = resp.status_code
            if resp.status_code < 400:
                result["status"] = "active"
                result["last_success_at"] = _NOW()
            else:
                result["status"] = "degraded"
                result["last_failure_at"] = _NOW()
                result["error_type"] = "http_error"
                result["error_message"] = f"HTTP {resp.status_code}"
        except Exception:
            import urllib.request
            req = urllib.request.Request(rss_url, method="HEAD")
            with urllib.request.urlopen(req, timeout=5) as resp:
                result["http_status"] = resp.status
                result["status"] = "active"
                result["last_success_at"] = _NOW()
    except Exception as exc:
        result["status"] = "down"
        result["last_failure_at"] = _NOW()
        result["error_type"] = type(exc).__name__
        result["error_message"] = str(exc)[:200]
    return result


def write_health_to_db(health_records: list[dict]) -> int:
    """
    Upserts health records into media_source_health.
    Returns number of records written.
    """
    if not health_records:
        return 0
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        written = 0
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                for rec in health_records:
                    cur.execute(
                        """
                        INSERT INTO media_source_health (
                            source_id, source_name, rss_url, status,
                            http_status, error_type, error_message,
                            updated_at, created_at
                        ) VALUES (
                            %(source_id)s, %(source_name)s, %(rss_url)s, %(status)s,
                            %(http_status)s, %(error_type)s, %(error_message)s,
                            %(updated_at)s, %(updated_at)s
                        )
                        ON CONFLICT (source_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            http_status = EXCLUDED.http_status,
                            error_type = EXCLUDED.error_type,
                            error_message = EXCLUDED.error_message,
                            updated_at = EXCLUDED.updated_at
                        """,
                        rec,
                    )
                    written += 1
            conn.commit()
        return written
    except Exception as exc:
        logger.error("write_health_to_db error: %s", exc)
        return 0


def sync_all_sources() -> dict:
    """
    Checks all registered sources and writes results to DB.
    Returns summary: {checked, written, active, degraded, down}.
    """
    try:
        from services.sources.source_registry import list_source_definitions  # type: ignore
        sources = list_source_definitions()
    except Exception as exc:
        logger.warning("sync_all_sources: cannot load source_registry: %s", exc)
        return {"checked": 0, "written": 0, "active": 0, "degraded": 0, "down": 0, "error": str(exc)}

    records: list[dict] = []
    for src in sources:
        src_id = getattr(src, "source_id", None) or getattr(src, "id", "unknown")
        src_name = getattr(src, "name", str(src_id))
        rss_url = getattr(src, "rss_url", None) or ""
        rec = check_rss_health(str(src_id), str(src_name), str(rss_url))
        records.append(rec)

    written = write_health_to_db(records)
    return {
        "checked": len(records),
        "written": written,
        "active": sum(1 for r in records if r["status"] == "active"),
        "degraded": sum(1 for r in records if r["status"] == "degraded"),
        "down": sum(1 for r in records if r["status"] == "down"),
    }
```

- [ ] **Step 2: Add health-sync endpoint to sources router**

In `api/routers/sources.py`, add after the last existing endpoint:

```python
@router.post("/api/sources/health-sync")
async def sources_health_sync():
    """
    Pings all registered RSS sources and writes results to media_source_health table.
    Returns sync summary.
    """
    try:
        from services.sources.health_writer import sync_all_sources  # type: ignore
        summary = sync_all_sources()
        return {"ok": True, "summary": summary, "mode": "real"}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "mode": "error"}
```

- [ ] **Step 3: Verify health_writer compiles**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "from services.sources.health_writer import check_rss_health, write_health_to_db, sync_all_sources; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Smoke test health check on one URL**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
.venv/bin/python -c "
from services.sources.health_writer import check_rss_health
r = check_rss_health('test', 'El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada')
print(r['status'], r.get('http_status'))
"
```

Expected: `active 200` or `degraded 4xx` or `down <error>` — just not a Python exception

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add services/sources/health_writer.py api/routers/sources.py
git commit -m "feat(sprint-5): source health writer — RSS ping + DB persist + health-sync endpoint"
```

---

## Task 5: Frontend types + endpoints

**Files:**
- Create: `apps/web/lib/types/geopolitica_api.ts`
- Create: `apps/web/lib/types/coalition_api.ts`
- Modify: `apps/web/lib/api/endpoints.ts`

**Context:** These types mirror the Pydantic schemas from Tasks 1-2. The existing `endpoints.ts` already imports from `@/lib/types/risk_api`, `@/lib/types/actors_api`, etc. Pattern: add two new imports and two new endpoint functions following the same style.

- [ ] **Step 1: Create geopolitica_api.ts**

```typescript
// apps/web/lib/types/geopolitica_api.ts

export interface GeoEventItem {
  event_id: string;
  country: string;
  country_iso3: string;
  event_date: string;          // "YYYY-MM-DD"
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  fatalities: number;
  impact: number;              // 0-100
}

export interface CountryRiskItem {
  code: string;                // ISO2
  iso3: string;                // ISO3
  name: string;
  risk: number;                // 0-100
  status: "war" | "tense" | "watch" | "stable";
  trend: "rising" | "stable" | "falling";
}

export interface PresenceItem {
  territory: string;
  status: string;
  level: "high" | "medium" | "low";
  category: string;
}

export interface GeoKpiItem {
  label: string;
  value: number;
  color: string;
}

export interface GeoOverview {
  kpis: GeoKpiItem[];
  events: GeoEventItem[];
  countries: CountryRiskItem[];
  presence: PresenceItem[];
  mode: string;
}
```

- [ ] **Step 2: Create coalition_api.ts**

```typescript
// apps/web/lib/types/coalition_api.ts

export interface PartySeatItem {
  code: string;
  name: string;
  seats: number;
  color: string;
  pct_vote: number;
}

export interface CoalitionScenario {
  members: string[];
  total: number;
  majority: boolean;
  distance: number;
  probability: number;
  conflicts: string[];
}

export interface CoalitionOverview {
  parties: PartySeatItem[];
  coalitions: CoalitionScenario[];
  election_date: string | null;
  total_seats: number;
  majority_threshold: number;
  mode: string;
}
```

- [ ] **Step 3: Add endpoints to endpoints.ts**

Add imports at the top of `apps/web/lib/api/endpoints.ts` (after existing imports):

```typescript
import type { GeoOverview } from "@/lib/types/geopolitica_api";
import type { CoalitionOverview } from "@/lib/types/coalition_api";
```

Add two new entries inside the `endpoints` object (after `riskOverview`):

```typescript
  // Geopolitica
  geopoliticaOverview: () =>
    api.get<GeoOverview>("/api/geopolitica/overview"),

  // Coalition
  coalitionOverview: () =>
    api.get<CoalitionOverview>("/api/coalition/overview"),
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/lib/types/geopolitica_api.ts apps/web/lib/types/coalition_api.ts apps/web/lib/api/endpoints.ts
git commit -m "feat(sprint-5): TS types + endpoints for geopolitica and coalition"
```

---

## Task 6: Frontend /geopolitica wired to API

**Files:**
- Modify: `apps/web/app/geopolitica/page.tsx`

**Context:** Current page uses static constants `KPIS`, `COUNTRIES`, `EVENTS`, `PRESENCE`. Replace with React Query + `endpoints.geopoliticaOverview()`. Keep the same visual layout — just wire the data. ModeBadge receives `mode` from API response. Fallback: show static data while loading or on error.

The existing patterns (from `/actores/page.tsx`, `/riesgo/page.tsx`) are:
```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { ModeBadge } from "@/components/status/mode-badge";
// ...
const { data, isLoading } = useQuery({
  queryKey: ["geopoliticaOverview"],
  queryFn: () => endpoints.geopoliticaOverview(),
  staleTime: 5 * 60_000,
});
const overview = data ?? null; // null = loading, show fallback
```

- [ ] **Step 1: Rewrite geopolitica/page.tsx**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe2, AlertTriangle, Flag, Anchor } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type { GeoEventItem, CountryRiskItem, PresenceItem, GeoOverview } from "@/lib/types/geopolitica_api";

// ── Fallback data (shown while loading or on error) ───────────────────────────

const FALLBACK_KPIS = [
  { label: "Eventos críticos 24h", value: 18, color: "text-red1" },
  { label: "Países con escalada", value: 7, color: "text-amber1" },
  { label: "Conflictos activos", value: 23, color: "text-red1" },
  { label: "Sanctions afectan ES", value: 12, color: "text-cyan1" },
];

const FALLBACK_COUNTRIES: CountryRiskItem[] = [
  { code: "UA", iso3: "UKR", name: "Ucrania", risk: 92, status: "war", trend: "stable" },
  { code: "PS", iso3: "PSE", name: "Gaza/Palestina", risk: 95, status: "war", trend: "rising" },
  { code: "TW", iso3: "TWN", name: "Taiwán", risk: 71, status: "tense", trend: "rising" },
  { code: "ML", iso3: "MLI", name: "Sahel (Mali)", risk: 84, status: "war", trend: "stable" },
  { code: "VE", iso3: "VEN", name: "Venezuela", risk: 68, status: "tense", trend: "stable" },
  { code: "MA", iso3: "MAR", name: "Marruecos", risk: 58, status: "tense", trend: "stable" },
  { code: "US", iso3: "USA", name: "EE.UU.", risk: 49, status: "watch", trend: "stable" },
  { code: "CN", iso3: "CHN", name: "China", risk: 62, status: "watch", trend: "rising" },
  { code: "RU", iso3: "RUS", name: "Rusia", risk: 88, status: "war", trend: "stable" },
  { code: "IR", iso3: "IRN", name: "Irán", risk: 76, status: "tense", trend: "rising" },
  { code: "TR", iso3: "TUR", name: "Turquía", risk: 51, status: "watch", trend: "stable" },
  { code: "MX", iso3: "MEX", name: "México", risk: 44, status: "watch", trend: "stable" },
];

const FALLBACK_EVENTS: GeoEventItem[] = [
  { event_id: "f1", date: "5 may", country: "Ucrania", country_iso3: "UKR", event_date: "2026-05-05", event_type: "Conflicto", severity: "CRITICAL", description: "Ofensiva rusa en Donbass amplía línea de frente 8km", fatalities: 12, impact: 78 },
  { event_id: "f2", date: "5 may", country: "Israel-Gaza", country_iso3: "PSE", event_date: "2026-05-05", event_type: "Conflicto", severity: "CRITICAL", description: "Negociación rehenes se rompe; expansión operación terrestre", fatalities: 47, impact: 72 },
  { event_id: "f3", date: "4 may", country: "EE.UU.", country_iso3: "USA", event_date: "2026-05-04", event_type: "Política", severity: "HIGH", description: "Trump anuncia aranceles 25% importaciones UE selectivas", fatalities: 0, impact: 81 },
  { event_id: "f4", date: "4 may", country: "Marruecos", country_iso3: "MAR", event_date: "2026-05-04", event_type: "Diplomático", severity: "MEDIUM", description: "Movimientos navales en aguas Sáhara generan tensión bilateral", fatalities: 0, impact: 64 },
];

const FALLBACK_PRESENCE: PresenceItem[] = [
  { territory: "Sáhara Occidental", status: "Disputa diplomática activa", level: "high", category: "diplomatic" },
  { territory: "Gibraltar", status: "Acuerdo post-Brexit en negociación", level: "medium", category: "diplomatic" },
  { territory: "Ceuta y Melilla", status: "Presión migratoria estable", level: "medium", category: "territorial" },
  { territory: "Latinoamérica (cumbres)", status: "Tensión Venezuela y Argentina-España", level: "high", category: "diplomatic" },
  { territory: "OTAN flanco sur", status: "Compromiso 2% PIB defensa pendiente", level: "medium", category: "defense" },
  { territory: "UE Comisión 2026", status: "Posicionamiento agenda climática y migratoria", level: "low", category: "diplomatic" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(r: number) {
  if (r >= 80) return "#EF4444";
  if (r >= 60) return "#F59E0B";
  if (r >= 40) return "#3B82F6";
  return "#10B981";
}

function statusLabel(s: string) {
  if (s === "war") return "Guerra";
  if (s === "tense") return "Tenso";
  if (s === "watch") return "Vigilar";
  return "Estable";
}

function statusBadge(s: string) {
  if (s === "war") return "badge-red";
  if (s === "tense") return "badge-amber";
  return "badge-blue";
}

function levelBadge(l: string) {
  if (l === "high") return "badge-red";
  if (l === "medium") return "badge-amber";
  return "badge-blue";
}

function levelLabel(l: string) {
  if (l === "high") return "Alta";
  if (l === "medium") return "Media";
  return "Baja";
}

function formatEventDate(item: GeoEventItem): string {
  if (item.event_date) {
    const d = new Date(item.event_date);
    return `${d.getDate()} ${d.toLocaleString("es", { month: "short" })}`;
  }
  return "";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GeopoliticaPage() {
  const { data, isLoading, isError } = useQuery<GeoOverview>({
    queryKey: ["geopoliticaOverview"],
    queryFn: () => endpoints.geopoliticaOverview(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mode = data?.mode ?? (isError ? "error" : "demo");
  const kpis = data?.kpis ?? FALLBACK_KPIS;
  const events = data?.events ?? FALLBACK_EVENTS;
  const countries = data?.countries ?? FALLBACK_COUNTRIES;
  const presence = data?.presence ?? FALLBACK_PRESENCE;

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Geopolítica</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Geopolítica & RRII</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "eventos_acled" : "fixtures"}
            message={mode === "real" ? "Datos ACLED/GDELT en tiempo real" : mode === "fallback" ? "ETL disponible, BD sin datos aún" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">Eventos internacionales, riesgo país e impacto sobre los intereses españoles.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wider text-text2 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{isLoading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Country grid */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Mapa de riesgo país</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {countries.map(c => (
            <div
              key={c.code}
              className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer"
              style={{ borderLeftColor: riskColor(c.risk), borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Flag className="w-3.5 h-3.5 text-text2" />
                <span className="text-[10px] uppercase tracking-wider text-muted font-mono">{c.code}</span>
              </div>
              <div className="text-sm font-bold text-text1 leading-tight mb-1.5">{c.name}</div>
              <div className="flex items-center justify-between">
                <span className={`badge ${statusBadge(c.status)}`}>{statusLabel(c.status)}</span>
                <span className="font-mono text-xs" style={{ color: riskColor(c.risk) }}>{c.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Eventos esta semana</h2>
          </div>
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.event_id} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan1 font-mono">{formatEventDate(e)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{e.country}</span>
                  </div>
                  <span className="badge badge-cyan">{e.event_type}</span>
                </div>
                <p className="text-sm text-text1 group-hover:text-cyan1 transition leading-snug mb-2">{e.description}</p>
                <div>
                  <div className="flex justify-between text-[10px] text-muted mb-0.5">
                    <span>Impacto sobre España</span>
                    <span className="font-mono" style={{ color: riskColor(e.impact) }}>{e.impact}</span>
                  </div>
                  <div className="h-1 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${e.impact}%`, backgroundColor: riskColor(e.impact) }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Presence */}
        <section className="premium-card">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-4 h-4 text-cyan1" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Presencia española en el exterior</h2>
          </div>
          <ul className="space-y-3">
            {presence.map((p, i) => (
              <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-text1">{p.territory}</h3>
                  <span className={`badge ${levelBadge(p.level)} shrink-0`}>{levelLabel(p.level)}</span>
                </div>
                <p className="text-xs text-text2 leading-relaxed">{p.status}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/geopolitica/page.tsx
git commit -m "feat(sprint-5): /geopolitica wired to real API with React Query + ModeBadge"
```

---

## Task 7: Frontend /coalicion wired to API

**Files:**
- Modify: `apps/web/app/coalicion/page.tsx`

**Context:** Current page has static `PARTIES`, `COALITIONS`, `VOTES`. The hemicycle SVG generation (`hemicycleSeats()`) depends on party seats — must be recalculated from API data. `CoalitionOverview.parties` matches the shape `{code, name, seats, color}` needed. `CoalitionOverview.coalitions` matches `{members, total, majority, distance, probability, conflicts}` — rename `majority` to boolean check instead of `✓/✗` strings. The kingmaker is computed: the party with the smallest seats that appears in the most coalitions. VOTES matrix stays as static fixture (no API for voting history yet).

- [ ] **Step 1: Rewrite coalicion/page.tsx**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Users2, AlertCircle } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type { PartySeatItem, CoalitionOverview } from "@/lib/types/coalition_api";

// ── Static voting matrix (no API yet) ────────────────────────────────────────

const VOTES = [
  { topic: "Reforma fiscal", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "A" } },
  { topic: "Ley Vivienda", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "N", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "RDL fondos UE", votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Memoria Democrática", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Reforma reglamento", votes: { PSOE: "S", PP: "S", VOX: "N", Sumar: "S", Junts: "A", ERC: "A", Bildu: "A", PNV: "S" } },
  { topic: "Salario mínimo", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Defensa OTAN", votes: { PSOE: "S", PP: "S", VOX: "S", Sumar: "N", Junts: "A", ERC: "N", Bildu: "N", PNV: "S" } },
  { topic: "Ley audiovisual", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "A", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Sanidad pública", votes: { PSOE: "S", PP: "A", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "S" } },
  { topic: "Ley Amnistía", votes: { PSOE: "S", PP: "N", VOX: "N", Sumar: "S", Junts: "S", ERC: "S", Bildu: "S", PNV: "A" } },
];

const VOTE_PARTIES = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "Bildu", "PNV"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function voteCell(v: string) {
  if (v === "S") return "bg-green1/30 text-green1";
  if (v === "N") return "bg-red1/30 text-red1";
  return "bg-amber1/20 text-amber1";
}

function hemicycleSeats(parties: PartySeatItem[]) {
  const seats: { x: number; y: number; color: string; idx: number }[] = [];
  const ideoOrder = ["Sumar", "Bildu", "ERC", "BNG", "PSOE", "PNV", "Junts", "Otros", "PP", "VOX", "Cs"];
  const sorted = ideoOrder
    .map(c => parties.find(p => p.code === c))
    .filter(Boolean) as PartySeatItem[];
  // Add any parties not in ideoOrder
  const seen = new Set(ideoOrder);
  for (const p of parties) if (!seen.has(p.code)) sorted.push(p);

  const allColors: string[] = [];
  sorted.forEach(p => { for (let i = 0; i < p.seats; i++) allColors.push(p.color); });

  const total = allColors.length;
  if (total === 0) return seats;

  const rings = 8;
  const cx = 250, cy = 230;
  let totalWeights = 0;
  for (let r = 0; r < rings; r++) totalWeights += r + 1;
  const ringSeats: number[] = [];
  for (let r = 0; r < rings; r++) ringSeats.push(Math.round(((r + 1) / totalWeights) * total));
  const diff = total - ringSeats.reduce((a, b) => a + b, 0);
  ringSeats[rings - 1] += diff;

  let placed = 0;
  for (let r = 0; r < rings; r++) {
    const radius = 70 + r * 22;
    const count = ringSeats[r];
    for (let s = 0; s < count; s++) {
      const angle = Math.PI - (s / Math.max(count - 1, 1)) * Math.PI;
      seats.push({ x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle), color: allColors[placed] || "#94A3B8", idx: placed });
      placed++;
    }
  }
  return seats;
}

function findKingmaker(parties: PartySeatItem[], coalitions: CoalitionOverview["coalitions"]) {
  const memberCount: Record<string, number> = {};
  for (const c of coalitions) {
    for (const m of c.members) memberCount[m] = (memberCount[m] || 0) + 1;
  }
  // Small party (< 20 seats) with highest coalition count
  const candidates = parties
    .filter(p => p.seats < 20 && p.seats > 0)
    .sort((a, b) => (memberCount[b.code] || 0) - (memberCount[a.code] || 0));
  return candidates[0] ?? null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoalicionPage() {
  const { data, isLoading, isError } = useQuery<CoalitionOverview>({
    queryKey: ["coalitionOverview"],
    queryFn: () => endpoints.coalitionOverview(),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const mode = data?.mode ?? (isError ? "error" : "demo");
  const parties = data?.parties ?? [];
  const coalitions = data?.coalitions ?? [];
  const totalSeats = data?.total_seats ?? 350;
  const majority = data?.majority_threshold ?? 176;

  const seats = hemicycleSeats(parties);
  const kingmaker = findKingmaker(parties, coalitions);

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Gobierno & Coalición</span>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-text1">Gobierno & Coalición</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "resultados_electorales" : "fixtures"}
            message={
              mode === "real"
                ? `Elecciones ${data?.election_date ?? ""} — datos reales`
                : "Datos electorales de ejemplo"
            }
          />
        </div>
        <p className="text-text2 text-sm mt-1">Composición del Congreso, escenarios de coalición viables y patrones de voto.</p>
      </header>

      {isLoading && (
        <div className="premium-card text-center text-text2 py-8">Cargando datos del Congreso...</div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hemicycle */}
          <section className="premium-card lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text1 mb-4">Composición del Congreso ({totalSeats})</h2>
            <svg viewBox="0 0 500 270" className="w-full">
              {seats.map(s => (
                <circle key={s.idx} cx={s.x} cy={s.y} r="4.5" fill={s.color} stroke="#0D1320" strokeWidth="0.8" />
              ))}
              <text x="250" y="265" textAnchor="middle" className="fill-text2 text-[10px]">Mayoría absoluta: {majority}</text>
            </svg>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {parties.map(p => (
                <div key={p.code} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                  <span className="text-text1 font-semibold">{p.code}</span>
                  <span className="text-muted font-mono">{p.seats}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Coalitions */}
          <section className="premium-card">
            <div className="flex items-center gap-2 mb-4">
              <Users2 className="w-4 h-4 text-cyan1" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Coaliciones viables</h2>
            </div>
            <ul className="space-y-3">
              {coalitions.map((c, i) => (
                <li key={i} className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted">
                      {c.total} escaños {c.majority ? "✓" : "✗"}
                    </div>
                    <span className="text-cyan1 font-mono text-sm">{c.probability}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.members.map(m => {
                      const p = parties.find(x => x.code === m);
                      return (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style={{ backgroundColor: p?.color || "#94A3B8" }}>
                          {m}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted mb-1">Distancia ideológica</div>
                  <div className="h-1 bg-bg3 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-green1 to-red1" style={{ width: `${c.distance}%` }} />
                  </div>
                  {c.conflicts.length > 0 && (
                    <div className="text-[11px] text-amber1">Tensiones: {c.conflicts.join(", ")}</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Kingmaker */}
      {kingmaker && (
        <section className="premium-card border-l-4" style={{ borderLeftColor: "#F4B400" }}>
          <div className="flex items-start gap-3">
            <Crown className="w-6 h-6 text-amber1 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber1 mb-1">Kingmaker / Partido pivotal</div>
              <h3 className="text-lg font-bold text-text1">{kingmaker.name}</h3>
              <p className="text-sm text-text2 mt-1">
                Con {kingmaker.seats} escaños y posición pivotal en varias coaliciones, {kingmaker.code} mantiene capacidad de bloqueo estructural.
              </p>
              <div className="mt-3 flex gap-4 text-xs">
                <span className="text-text2">Escaños: <span className="text-cyan1 font-mono">{kingmaker.seats}</span></span>
                <span className="text-text2">Voto %: <span className="text-cyan1 font-mono">{kingmaker.pct_vote}%</span></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Voting matrix — static fixture (no API yet) */}
      <section className="premium-card">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-cyan1" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Patrón de voto — últimas 10 votaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted font-normal">Iniciativa</th>
                {VOTE_PARTIES.map(p => {
                  const party = parties.find(x => x.code === p);
                  return (
                    <th key={p} className="p-2 text-center">
                      <span className="text-text1 font-semibold" style={{ color: party?.color || "#94A3B8" }}>{p}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {VOTES.map((v, i) => (
                <tr key={i} className="border-t border-border1">
                  <td className="p-2 text-text1">{v.topic}</td>
                  {VOTE_PARTIES.map(p => (
                    <td key={p} className="p-1 text-center">
                      <span className={`inline-block w-7 py-0.5 rounded text-[10px] font-bold ${voteCell((v.votes as Record<string, string>)[p])}`}>
                        {(v.votes as Record<string, string>)[p]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-muted">
          <span><span className="inline-block w-3 h-3 rounded-sm bg-green1/30 mr-1 align-middle" />Sí</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-red1/30 mr-1 align-middle" />No</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-amber1/20 mr-1 align-middle" />Abstención</span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

- [ ] **Step 3: Next.js build check**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/apps/web"
npx next build 2>&1 | tail -10
```

Expected: build succeeds, route count ≥ 25, 0 errors

- [ ] **Step 4: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add apps/web/app/coalicion/page.tsx
git commit -m "feat(sprint-5): /coalicion wired to real API with React Query + hemicycle from DB"
```

---

## Task 8: Sprint 5 delivery report

**Files:**
- Create: `docs/sprint-5-complete-data.md`

- [ ] **Step 1: Write delivery report**

```markdown
# Sprint 5 — Complete Data: Geopolitica, Coalition & Real Sparkline

**Branch:** `sprint-3-briefings-profesionales` (continuación)
**Date:** 2026-05-06

---

## 1. Objetivo

Conectar `/geopolitica` y `/coalicion` a ETL/BD real, reemplazar el sparkline de riesgo estático
por historia real de `signal_politeia`, y añadir el health writer que persiste estado de fuentes RSS.

---

## 2. Qué se construyó

### Backend (4 archivos nuevos, 2 modificados)

| Archivo | Descripción |
|---------|-------------|
| `api/schemas/geopolitica.py` | GeoEventItem, CountryRiskItem, PresenceItem, GeoKpiItem, GeoOverview |
| `api/schemas/coalition.py` | PartySeatItem, CoalitionScenario, CoalitionOverview |
| `api/routers/geopolitica.py` | GET /api/geopolitica/overview — DB + ETL fallback |
| `api/routers/coalition.py` | GET /api/coalition/overview — resultados_electorales + partidos DB |
| `services/sources/health_writer.py` | check_rss_health() + write_health_to_db() + sync_all_sources() |
| `api/routers/risk.py` | +_fetch_sparkline() desde signal_politeia (30 días) |
| `api/routers/sources.py` | +POST /api/sources/health-sync |
| `api/main.py` | Registra geopolitica_router, coalition_router |

### Frontend (2 archivos nuevos, 3 modificados)

| Archivo | Descripción |
|---------|-------------|
| `apps/web/lib/types/geopolitica_api.ts` | Interfaces TS para dominio geopolítico |
| `apps/web/lib/types/coalition_api.ts` | Interfaces TS para composición Congreso |
| `apps/web/lib/api/endpoints.ts` | +geopoliticaOverview, +coalitionOverview |
| `apps/web/app/geopolitica/page.tsx` | React Query + ModeBadge dinámico |
| `apps/web/app/coalicion/page.tsx` | React Query + hemicycle dinámico + ModeBadge |

---

## 3. Endpoints nuevos

| Método | Ruta | Descripción | Fuente |
|--------|------|-------------|--------|
| `GET` | `/api/geopolitica/overview` | Eventos, riesgo país, presencia española | `eventos_acled` + `riesgo_pais` DB / acled_client fallback |
| `GET` | `/api/coalition/overview` | Composición Congreso + coaliciones | `resultados_electorales` + `partidos` DB |
| `POST` | `/api/sources/health-sync` | Ping RSS + write media_source_health | HTTP HEAD → DB upsert |

---

## 4. Modos real/demo/fallback por componente (Sprint 5)

| Componente | Modo | Condición |
|-----------|------|-----------|
| `/geopolitica` | `real` si eventos_acled tiene datos | DB |
| `/geopolitica` | `fallback` si DB vacía | acled_client demo data |
| `/coalicion` | `real` si elecciones + resultados_electorales tienen datos | DB |
| `/coalicion` | `demo` si DB vacía | 2023 election hardcoded |
| `/riesgo` sparkline | `real` si signal_politeia tiene datos 30d | DB aggregate |
| `/riesgo` sparkline | `fallback` si sin señales | _DEMO_SPARK fixture |

---

## 5. Cómo probar

```bash
# Backend
uvicorn api.main:app --reload --port 8000

# Geopolitica
curl -s http://localhost:8000/api/geopolitica/overview | python3 -m json.tool | grep '"mode"'

# Coalition
curl -s http://localhost:8000/api/coalition/overview | python3 -m json.tool | grep '"mode"'

# Risk sparkline
curl -s http://localhost:8000/api/risk/overview | python3 -m json.tool | grep '"spark"' | head -2

# Source health sync
curl -s -X POST http://localhost:8000/api/sources/health-sync | python3 -m json.tool

# Frontend
# http://localhost:3000/geopolitica  → ModeBadge real|fallback|demo
# http://localhost:3000/coalicion    → ModeBadge real|demo + hemicycle dinámico
```

---

## 6. Limitaciones actuales

| Limitación | Impacto | Sprint |
|-----------|---------|--------|
| `eventos_acled` / `riesgo_pais` — sin ETL automático | Geopolitica en modo fallback hasta que corran scrapers ACLED | Sprint 6 |
| `resultados_electorales` — puede estar vacía | Coalicion en modo demo si no hay datos cargados | Sprint 6 |
| Voting matrix — fixture estático | 10 votaciones hardcoded | Sprint 6 |
| Sparkline `signal_politeia` — vacía sin señales | Sparkline fallback hasta que haya señales en DB | Sprint 6 |
| `/riesgo` heatmap — sigue siendo fixture | `DEMO_DIMENSIONS`/`DEMO_HEATMAP` sin wiring | Sprint 6 |
| health-sync — sin job scheduling | Hay que llamar manualmente al endpoint | Sprint 6 |

---

## 7. Validación Sprint 5

```
Next.js build: ≥25 rutas, 0 errores
TypeScript: 0 errores
Python compile: 0 errores en todos los archivos nuevos
```
```

- [ ] **Step 2: Commit everything**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
git add docs/sprint-5-complete-data.md
git commit -m "docs: sprint-5 delivery report — geopolitica, coalition, sparkline, health writer"
```

---

## Self-Review

**Spec coverage check:**
- `/geopolitica` API → Task 1 ✓
- `/coalicion` API → Task 2 ✓
- Risk sparkline from DB → Task 3 ✓
- Register new routers → Task 3 ✓
- Source health writer → Task 4 ✓
- TS types + endpoints → Task 5 ✓
- Frontend `/geopolitica` wired → Task 6 ✓
- Frontend `/coalicion` wired → Task 7 ✓
- Sprint doc → Task 8 ✓

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `GeoOverview.kpis` → `list[GeoKpiItem]` (Python) matches `GeoOverview.kpis: GeoKpiItem[]` (TS) ✓
- `CoalitionOverview.parties` → `list[PartySeatItem]` matches `PartySeatItem[]` ✓
- `endpoints.geopoliticaOverview()` returns `GeoOverview` and page imports `GeoOverview` ✓
- `endpoints.coalitionOverview()` returns `CoalitionOverview` and page imports `CoalitionOverview` ✓
- `hemicycleSeats(parties: PartySeatItem[])` — receives `data?.parties ?? []` which is `PartySeatItem[]` ✓
- `findKingmaker(parties, coalitions)` — `coalitions` typed as `CoalitionOverview["coalitions"]` = `CoalitionScenario[]` ✓
- `_fetch_sparkline(dsn)` added before `_demo_risk()` in risk.py, called inside happy path ✓
- `PresenceItem` in Python has `relevance: float | None` from `SpanishPresence` schema — but the Python router accesses `p.relevance` which is from the ETL schema, not our API schema. Fix: add `relevance: float | None = None` to the static SpanishPresence mapping. Actually the router maps `(p.relevance or 0)` safely ✓
