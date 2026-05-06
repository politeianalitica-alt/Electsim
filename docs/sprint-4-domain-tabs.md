# Sprint 4 — Domain Tabs: Real API Connections

**Branch:** `sprint-3-briefings-profesionales` (continuación)  
**Date:** 2026-05-06  
**Commits:** 9 (`bd92806` → `abf17b9`)

---

## 1. Objetivo

Conectar las pestañas de dominio del dashboard al estándar `real|demo|fallback` establecido en Sprints 1-3. Cada página muestra un `<ModeBadge>` honesto que refleja el origen real de sus datos.

Páginas con API real wired: `/legislativo`, `/medios`, `/actores`, `/riesgo`  
Páginas con ModeBadge honesto (demo): `/coalicion`, `/geopolitica`

---

## 2. Qué se construyó

### Backend (6 archivos nuevos, 1 modificado)

| Archivo | Descripción |
|---------|-------------|
| `api/schemas/legislative.py` | `BoeItem`, `BoeResponse`, `Initiative`, `InitiativesResponse`, `LegislativeKpis` |
| `api/schemas/actors.py` | `ActorItem`, `ActorsResponse` |
| `api/schemas/risk_overview.py` | `RiskKpiItem`, `RiskSignalItem`, `RiskOverview` |
| `api/routers/legislative.py` | 3 endpoints: `/api/legislative/boe`, `/initiatives`, `/kpis` |
| `api/routers/actors.py` | 1 endpoint: `GET /api/actors` |
| `api/routers/risk.py` | 1 endpoint: `GET /api/risk/overview` |
| `api/main.py` | Registra los 3 nuevos routers |

### Frontend (3 tipos de archivos nuevos, 6 páginas modificadas)

| Archivo | Descripción |
|---------|-------------|
| `apps/web/lib/types/legislative.ts` | Interfaces TypeScript para dominio legislativo |
| `apps/web/lib/types/actors_api.ts` | `ActorItem`, `ActorsResponse` (diferente de fixtures/actors.ts) |
| `apps/web/lib/types/risk_api.ts` | `RiskKpiItem`, `RiskSignalItem`, `RiskOverview` |
| `apps/web/lib/api/endpoints.ts` | +5 endpoints: `legislativeBoe`, `legislativeInitiatives`, `legislativeKpis`, `actorsList`, `riskOverview` |
| `apps/web/app/legislativo/page.tsx` | Reescrita completa — React Query, 3 queries, ModeBadge |
| `apps/web/app/medios/page.tsx` | KPIs desde API real, ModeBadge dinámico |
| `apps/web/app/actores/page.tsx` | API wired, mapping a Actor shape, fallback a fixtures |
| `apps/web/app/riesgo/page.tsx` | Gauge + KPIs + signals desde API, heatmap como fixture |
| `apps/web/app/coalicion/page.tsx` | ModeBadge mode="demo" (sin ETL disponible) |
| `apps/web/app/geopolitica/page.tsx` | ModeBadge mode="demo" (ETL en Sprint 5) |

---

## 3. Endpoints nuevos

| Método | Ruta | Descripción | Fuente |
|--------|------|-------------|--------|
| `GET` | `/api/legislative/boe` | Publicaciones BOE del día | `etl/institucional/boe_rss.py` |
| `GET` | `/api/legislative/initiatives` | Iniciativas parlamentarias | `etl/institucional/congreso_iniciativas.py` |
| `GET` | `/api/legislative/kpis` | KPIs legislativos (activas, aprobadas, críticas, votaciones) | ETL → fallback |
| `GET` | `/api/actors` | Actores políticos ordenados por influencia | `persona_publica` DB |
| `GET` | `/api/risk/overview` | Score de riesgo + KPIs + señales + sparkline | `signal_politeia` DB + analysis hub |

---

## 4. Contratos de datos

### LegislativeKpis
```
active_initiatives, approved_this_month, critical_tramitation, upcoming_votes, mode
```

### ActorItem (API)
```
id, name, party, party_color, role, bio, exposure (0-100), approval (0-100), sentiment (up|down|stable)
```

Mapeado a Actor fixture: `party_color → partyColor`

### RiskOverview
```
global_score (0-100), level (alto|medio|bajo), kpis[], signals[], spark[], trend_delta, mode
```

---

## 5. Modos real/demo/fallback por componente

| Componente | Modo | Condición |
|-----------|------|-----------|
| `/legislativo` KPIs | `real` si congreso_iniciativas responde, `fallback` si no | ETL via HTTP |
| `/legislativo` BOE | `real` si boe_rss responde, `fallback` si no | RSS fetch |
| `/legislativo` Calendar | `demo` — no hay API (hardcoded) | — |
| `/medios` KPIs | `real` si media_intelligence responde, `fallback` si no | — |
| `/medios` Top stories | `real` si editorial_selector responde, `fallback` inline | — |
| `/medios` Narrativas | `real` si narrative_pipeline responde, `fallback` inline | — |
| `/actores` | `real` si persona_publica tiene datos, `fallback` a DEMO_ACTORS | DB |
| `/riesgo` gauge + KPIs + signals | `real` si signal_politeia/legislation tienen datos, `fallback` | DB |
| `/riesgo` Heatmap | `demo` permanente — no hay API (fixture) | — |
| `/coalicion` | `demo` — sin ETL electoral | Sprint 5 |
| `/geopolitica` | `demo` — sin ETL geopolítico | Sprint 5 |

---

## 6. Cómo probar

```bash
# Backend
uvicorn api.main:app --reload --port 8000

# Legislative
curl -s http://localhost:8000/api/legislative/boe | python3 -m json.tool | head -20
curl -s http://localhost:8000/api/legislative/initiatives | python3 -m json.tool | head -20
curl -s http://localhost:8000/api/legislative/kpis | python3 -m json.tool

# Actors
curl -s http://localhost:8000/api/actors | python3 -m json.tool | head -20
curl -s "http://localhost:8000/api/actors?partido=PSOE&limit=5" | python3 -m json.tool

# Risk
curl -s http://localhost:8000/api/risk/overview | python3 -m json.tool

# Frontend
# http://localhost:3000/legislativo  → ModeBadge real|fallback (BOE via RSS)
# http://localhost:3000/medios       → ModeBadge real|fallback (source health)
# http://localhost:3000/actores      → ModeBadge real|fallback (persona_publica)
# http://localhost:3000/riesgo       → ModeBadge real|fallback (signal_politeia)
# http://localhost:3000/coalicion    → ModeBadge DEMO (hardcoded, honesto)
# http://localhost:3000/geopolitica  → ModeBadge DEMO (hardcoded, honesto)
```

**Verificar degradación** (apagar backend):
- Todas las páginas muestran datos de fallback/demo, no pantalla blanca
- KPIs conservan valores razonables (no 0 ni NaN)

---

## 7. Limitaciones actuales

| Limitación | Impacto | Sprint |
|-----------|---------|--------|
| `/legislativo` calendar — sin API | Días de la semana son estáticos | Sprint 5 |
| `/riesgo` heatmap — sin API | Matriz es fixture (DEMO_DIMENSIONS/HEATMAP) | Sprint 5 |
| `/actores` bio — no en DB | Campo bio siempre vacío desde API | Sprint 5 |
| `/coalicion` — sin ETL | Composición del Congreso hardcoded | Sprint 5 |
| `/geopolitica` — sin ETL | Eventos y países hardcoded | Sprint 5 |
| `/api/actors` — sin cache | Cada request hace query a DB | Sprint 5 |
| `/api/risk/overview` — sin histórico spark | Sparkline siempre es fixture fija | Sprint 5 |

---

## 8. Validación Sprint 4

```
Next.js build: 25 rutas, 0 errores
TypeScript: 0 errores (comprobado en cada tarea)
Python compile: 0 errores en todos los archivos nuevos
```

---

## 9. Recomendación Sprint 5

Con las 4 pestañas principales conectadas, Sprint 5 puede completar:

**A. Datos reales faltantes:**
- Wiring `health data` desde scrapers → `media_source_health` tabla
- Sparkline de riesgo desde DB (30 días históricos de `signal_politeia`)
- Heatmap de riesgo desde análisis multi-dimensional real
- Calendario parlamentario desde API del Congreso

**B. Páginas sin ETL:**
- `/coalicion` → resultados electorales reales desde `interior_resultados`
- `/geopolitica` → events desde ACLED/GDELT (ETL ya existe en `etl/sources/geopolitics/`)

**C. Pipeline executor:**
- `POST /api/sources/run` con `dry_run=false` + job tracking
- Pantalla de estado de ingesta en `/fuentes`
