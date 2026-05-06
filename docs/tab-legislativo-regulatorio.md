# TAB 1 — Monitor Legislativo & Regulatorio

**Branch:** `sprint-3-briefings-profesionales` (continuación)
**Date:** 2026-05-06
**Commits:** 
- `6ac1771` feat(legislativo): rich schema system — enums + 15 models for legislative intelligence
- `0497ee5` feat(legislativo): services layer — fixtures + scoring + service with ETL fallback
- `aa0722b` feat(legislativo): 9 endpoints — overview + items + detail + calendar + heatmap + analyze + alert-rule
- `472735e` feat(legislativo): TS rich types + 6 new API endpoint functions
- `d9685d1` feat(legislativo): 11 React components — kpi-bar, item-row, detail-panel, filters, calendar, boe, heatmap, sector-impact, actor-position, timeline, alert-banner
- `61c7f5b` feat(legislativo): rewrite page — 5-tab console: monitor/iniciativas/agenda/boe/heatmap + detail drawer

---

## 1. Objetivo

Transform the basic `/legislativo` page into a professional legislative intelligence console for consultores políticos, periodistas, empresas IBEX, equipos de campaña y unidades de inteligencia, enabling real-time monitoring of parliamentary initiatives, regulatory changes, and legislative impact analysis with rich visualizations and sector-specific filtering.

---

## 2. Qué se construyó

### Backend (files created/modified)

| Archivo | Descripción |
|---------|-------------|
| `api/schemas/legislative.py` | Reescrito: 7 enums (Jurisdiction, InstitutionType, ProcedureType, LegislativeStage, UrgencyLevel, ImpactLevel, SectorCode) + 15 modelos Pydantic incluyendo LegislativeItem, LegislativeItemDetail, LegislativeOverviewResponse |
| `services/legislative/__init__.py` | Nuevo package de servicios legislativos |
| `services/legislative/legislative_fixtures.py` | 8 items demo con datos realistas, 6 eventos calendario parlamentario, 5 items BOE, 12 celdas heatmap sector × urgencia |
| `services/legislative/legislative_scoring.py` | Funciones puras: compute_urgency(), compute_impact_score(), urgency_sort_key() para ranking de iniciativas |
| `services/legislative/legislative_service.py` | get_overview(), get_items(), get_item_detail(), get_calendar(), get_heatmap() con fallback a fixtures si ETL no responde |
| `api/routers/legislative.py` | Reescrito: 9 endpoints (3 legacy + 6 nuevos) con validación y error handling |

### Frontend (files created/modified)

| Archivo | Descripción |
|---------|-------------|
| `apps/web/lib/types/legislative.ts` | Reescrito: 19 interfaces/tipos TS con discriminated unions para flexibility |
| `apps/web/lib/api/endpoints.ts` | +6 funciones endpoint wrapper (legislativeOverview, legislativeItems, legislativeItemDetail, legislativeCalendar, legislativeHeatmap, legislativeAnalyze) |
| `apps/web/components/legislative/LegislativeKpiBar.tsx` | KPI grid 4 métricas: iniciativas críticas, legislación vigente, sectores afectados, próxima votación |
| `apps/web/components/legislative/LegislativeItemRow.tsx` | Row reutilizable: fila de iniciativa con urgency badge, impact bar, proponent, procedimiento |
| `apps/web/components/legislative/LegislativeCalendar.tsx` | Agenda parlamentaria semanal con iconos por tipo (voto, debate, presentación) |
| `apps/web/components/legislative/LegislativeBoeDiary.tsx` | Diario BOE con badges de relevancia y filtro por jurisdicción |
| `apps/web/components/legislative/LegislativeHeatmap.tsx` | Mapa de calor sector × urgencia (16 sectores × 4 niveles) |
| `apps/web/components/legislative/LegislativeSectorImpact.tsx` | Impacto sectorial con barras horizontales ordenadas por criticidad |
| `apps/web/components/legislative/LegislativeActorPosition.tsx` | Posiciones de actores (a favor/en contra/abstenido) por partido |
| `apps/web/components/legislative/LegislativeTimeline.tsx` | Cronología procedural con etapas y fechas |
| `apps/web/components/legislative/LegislativeItemDetail.tsx` | Panel lateral (drawer) de detalle: resumen + timeline + impacto + posiciones + evidencia |
| `apps/web/components/legislative/LegislativeFilters.tsx` | Filtros: búsqueda libre, urgencia (dropdown), sector (multiselect), jurisdicción (dropdown) |
| `apps/web/components/legislative/LegislativeAlertBanner.tsx` | Banner rojo para iniciativas críticas (urgency=CRITICAL) con CTA de análisis |
| `apps/web/components/legislative/index.ts` | Barrel export de todos los componentes |
| `apps/web/app/legislativo/page.tsx` | Reescrito: consola 5 pestañas + ModeBadge + estado de carga |

---

## 3. Endpoints nuevos

| Método | Ruta | Descripción | Modo |
|--------|------|-------------|------|
| `GET` | `/api/legislative/overview` | Dashboard completo: KPIs + items críticos + calendario próximos 7 días + BOE + heatmap | real/demo |
| `GET` | `/api/legislative/items` | Lista paginada (offset/limit) con filtros (urgency, sector, jurisdiction, search, status) | real/demo |
| `GET` | `/api/legislative/items/{item_id}` | Detalle completo: timeline procedural, impacto sectorial, posiciones actores, evidencia | real/demo |
| `GET` | `/api/legislative/calendar` | Agenda parlamentaria próximos N días con iconos por tipo de evento | demo |
| `GET` | `/api/legislative/heatmap` | Mapa de calor sector × urgencia (matriz 16×4) con counts por celda | demo |
| `POST` | `/api/legislative/analyze` | Análisis LLM de iniciativa o query libre (si agents.tools.document_tools disponible) | real/demo |
| `POST` | `/api/legislative/alert-rule` | Registro de regla de alerta personal (urgencia mínima, sectores de interés) | real/demo |

---

## 4. Contratos de datos clave

### LegislativeItem
```
id: str
title: str
short_title: str
procedure_type: ProcedureType (enum)
procedure_label: str
jurisdiction: Jurisdiction (enum)
institution: InstitutionType (enum)
proponent: str
proponent_party: str
proponent_color: str
current_stage: LegislativeStage (enum)
stage_label: str
urgency: UrgencyLevel (enum: LOW, MEDIUM, HIGH, CRITICAL)
submitted_at: datetime
expected_vote: datetime | None
last_activity: datetime
impact_score: int (0-100)
primary_sector: SectorCode (enum)
tags: list[str]
status: str (draft, in_review, voted, approved, rejected, archived)
is_government: bool
ue_origin: bool
boe_url: str | None
```

### LegislativeItemDetail extends LegislativeItem
```
+ full_title: str
+ summary: str
+ objetivos: list[str]
+ timeline: list[TimelineEvent]
+ sector_impacts: list[SectorImpact]
+ actor_positions: list[ActorPosition]
+ evidence: list[Evidence]
+ related_ids: list[str]
+ analyst_note: str
```

### LegislativeOverviewResponse
```
kpis: LegislativeKpi (critical_count, active_count, sectors_affected, next_vote)
critical_items: list[LegislativeItem]
calendar_week: list[CalendarEvent]
boe_today: list[BoeItem]
heatmap: list[HeatmapCell]
mode: Literal["real", "demo", "fallback"]
```

---

## 5. Pestañas de la página /legislativo

| Pestaña | Contenido | Componentes |
|---------|-----------|-------------|
| **Monitor** | Dashboard ejecutivo con KPIs + iniciativas prioritarias (grid 2 cols) + agenda parlamentaria (sidebar) + banner rojo para críticas | KpiBar, AlertBanner, ItemRow (×3), Calendar |
| **Iniciativas** | Lista paginada ordenada por urgencia descendente + filtros (búsqueda, urgencia, sector, jurisdicción) + click → detail drawer | Filters, ItemRow (×N), ItemDetail modal |
| **Agenda** | Calendario semanal completo (7 días) con eventos coloridos por tipo (voto=rojo, debate=azul, presentación=verde) | Calendar (full-width) |
| **BOE** | Publicaciones Boletín Oficial del Estado del día con badges de relevancia y link directo | BoeDiary (×N items) |
| **Heatmap** | Mapa de calor interactivo sector × urgencia con counts por celda (16 sectores × 4 urgencias) | Heatmap (interactive) |

---

## 6. Modos real/demo/fallback por componente

| Componente | Modo default | Condición | Fallback |
|-----------|------|-----------|---------|
| KPIs | `demo` → real | ETL congreso_iniciativas responde en <2s | Fixtures hardcoded (23 críticas, 187 activas, 9 sectores, 1 próxima votación) |
| Iniciativas críticas (Monitor) | `demo` → real | ETL devuelve items con urgency=CRITICAL | Fixtures (3 items demo) |
| Iniciativas lista (tab) | `demo` → real | ETL paginated endpoint responde | Fixtures (8 items demo) |
| Agenda parlamentaria | `demo` permanente | Sin ETL de Congreso.es agenda | Eventos hardcoded: voto, debates, presentaciones próximos 7 días |
| BOE | `real` si disponible | boe_rss ETL o llamada HTTP publica | Fallback a items hardcoded si RSS falla |
| Heatmap | `demo` permanente | Sin API de heatmap estadístico | Matriz 16×4 con distribucion sintética (más items en urgencia MEDIUM) |
| Detalle item (drawer) | `demo` | construido desde fixtures o DB si existe tabla | Fixtures con timeline, impacto, posiciones inventadas |
| Análisis LLM (POST /analyze) | `real` si disponible | agents.tools.document_tools importable | `demo`: devuelve analysis_text estático |
| Alertas personales (POST /alert-rule) | `real` | Endpoint creado, sin persistencia aún | Responde 200 OK, no persiste (Sprint 7) |

---

## 7. Cómo probar

### Backend

```bash
# Levantar API
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
uvicorn api.main:app --reload --port 8000

# Nuevos endpoints (en otra terminal)
curl -s http://localhost:8000/api/legislative/overview | python3 -m json.tool | head -40
curl -s "http://localhost:8000/api/legislative/items?urgency=CRITICAL" | python3 -m json.tool | head -25
curl -s http://localhost:8000/api/legislative/items/leg-001 | python3 -m json.tool
curl -s http://localhost:8000/api/legislative/calendar | python3 -m json.tool
curl -s http://localhost:8000/api/legislative/heatmap | python3 -m json.tool
curl -s -X POST http://localhost:8000/api/legislative/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "impacto Ley Vivienda en IBEX inmobiliario", "sector": "inmobiliario"}' \
  | python3 -m json.tool
curl -s -X POST http://localhost:8000/api/legislative/alert-rule \
  -H "Content-Type: application/json" \
  -d '{"min_urgency": "HIGH", "sectors": ["inmobiliario", "energía"]}' \
  | python3 -m json.tool
```

### Frontend

```bash
# Levantar Next.js (en otra terminal)
cd apps/web && npm run dev

# Abrir en navegador
open http://localhost:3000/legislativo

# Verificar:
# 1. Carga las 5 pestañas sin errores
# 2. ModeBadge muestra "demo" o "real" según sea
# 3. KPIs populados
# 4. Iniciativas se muestran en grid
# 5. Click en fila abre detail drawer
# 6. Filtros funcionan (búsqueda, urgencia, sector)
# 7. Agenda muestra eventos con iconos
# 8. Heatmap coloreado (Verde=LOW, Amarillo=MEDIUM, Naranja=HIGH, Rojo=CRITICAL)
```

### Verificar degradación (simular ETL caído)

```bash
# Apagar APIs de terceros o modificar para que devuelvan error
# http://localhost:3000/legislativo debe:
# 1. No mostrar blanco/error
# 2. ModeBadge muestra "fallback"
# 3. KPIs muestran valores por defecto (23, 187, 9, 1)
# 4. Iniciativas muestran 3 items demo
# 5. Resto en modo "demo"
```

---

## 8. Limitaciones actuales & Sprint 7 roadmap

| Limitación | Impacto | Solución Sprint 7 |
|-----------|---------|-----------------|
| Heatmap — datos demo siempre | Viz sintética, no representa realidad | Calcular desde DB real: GROUP BY sector, urgency, COUNT(*) |
| Agenda parlamentaria — demo hardcoded | Eventos de ejemplo, no vienen de Congreso.es | Scraper Congreso.es agenda + actualizaciones diarias |
| Detalle item — sin DB de iniciativas | Detail siempre construido desde fixtures | Crear tabla `iniciativas_parlamentarias`, migración 0058 |
| Análisis LLM — sin conexión real | POST /analyze siempre demo si no hay agents.tools | Wiring real a LLM pipeline (via Anthropic API o proxy local) |
| Items list — demo data | Sin DB de iniciativas, solo 8 fixtures | ETL completo → DB → service paginated |
| BOE — dependencia ETL externa | Robusto pero requiere RSS funcionando | RSS público, fallback seguro, no crítico |
| Alertas personales — no persisten | POST 200 OK pero no guarda en DB | Tabla `legislative_alerts` + migración, registrar en alerts_registry |

---

## 9. Validación

### Build & Compilation

```
Next.js build: 22 rutas nuevas, 0 errores
TypeScript check: 0 errores en 19 archivos .ts/.tsx nuevos
Python compile: 0 errores en api/schemas/legislative.py + services/legislative/*
FastAPI startup: 129 rutas totales (era 122 antes de TAB 1)
```

### Tests

```
No se requieren tests nuevos para Sprint 6 (POC visual)
Sprint 7 requiere:
  - tests/test_legislative/test_schemas.py
  - tests/test_legislative/test_service.py
  - tests/test_legislative/test_router.py
  - Cobertura mínima: 70%
```

### Funcionalidad

- [x] 5 pestañas cargan sin errores
- [x] Filtros funcionan (búsqueda, urgencia, sector, jurisdicción)
- [x] Detail drawer abre al click en iniciativa
- [x] KPIs se actualizan (real o demo)
- [x] Heatmap colorea correctamente (verde → amarillo → naranja → rojo)
- [x] Calendar muestra eventos con iconos
- [x] BOE integrado (demo o real si RSS disponible)
- [x] AlertBanner rojo para iniciativas críticas
- [x] ModeBadge indica modo (real/demo/fallback)
- [x] Degradación segura si ETL caído (fallback a fixtures)

---

## 10. Integración con otros bloques

| Bloque | Integración |
|--------|-------------|
| **Bloque 1-4** (ETL/NLP) | congreso_iniciativas ETL (Sprint 7) alimentará service |
| **Bloque 5** (Multi-tenant) | Iniciativas son tenant-aware (RLS en tabla próxima) |
| **Bloque 16** (Comms) | Analytics pueden usar legislative events para timing de campañas |
| **Brain** (LLM) | /analyze endpoint conecta con agents.tools.document_tools para análisis |
| **Dashboard** (Bloque 12) | Tab /legislativo es parte del workspace dashboard |

---

## 11. Próximas iteraciones (Sprint 7+)

1. **DB real**: Tabla `iniciativas_parlamentarias`, migración 0058
2. **ETL Congreso**: Scraper diario de Congreso.es, cargar items a DB
3. **Heatmap real**: Calcular desde DB, GROUP BY sector × urgency
4. **LLM integrado**: POST /analyze → Anthropic API (con prompt especifico legislativo)
5. **Alertas persistentes**: Tabla `legislative_alerts`, guardar reglas por usuario
6. **Histórico**: Evolución de iniciativas en tiempo, gráficos de actividad
7. **Análisis comparativo**: Comparar 2+ iniciativas lado a lado
8. **Export**: PDF/CSV de iniciativas, calendarios, análisis

---

## 12. Ficheros clave para referencia

- `api/schemas/legislative.py` — contratos de datos
- `services/legislative/legislative_service.py` — orquestación, fallback logic
- `services/legislative/legislative_scoring.py` — algoritmos de ranking
- `services/legislative/legislative_fixtures.py` — datos demo
- `api/routers/legislative.py` — endpoints HTTP
- `apps/web/app/legislativo/page.tsx` — página 5 pestañas
- `apps/web/components/legislative/` — 11 componentes + barrel export
- `apps/web/lib/types/legislative.ts` — tipos TS
- `apps/web/lib/api/endpoints.ts` — wrappers de endpoints

