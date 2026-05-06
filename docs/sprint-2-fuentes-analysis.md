# Sprint 2 — Fuentes & Ingesta + Analysis Hub

**Branch:** `sprint-2-sources-analysis-hub`  
**Date:** 2026-05-06  
**Commits:** 2 (`4a28680` → `[frontend commit]`)

---

## 1. Objetivo

Construir la columna vertebral de datos antes de migrar pestañas individuales.  
Dos piezas transversales que alimentarán todo el dashboard:

- **Fuentes & Ingesta (`/fuentes`)** — consola operativa de fuentes de datos
- **Analysis Hub (`/analisis`)** — inteligencia cross-domain priorizada

---

## 2. Arquitectura

```
Sources & Ingestion                   Analysis Hub
─────────────────────                 ─────────────────────
etl/sources/config_fuentes.py         services/intelligence/alert_engine.py
media_intelligence/source_health.py   services/intelligence/live_ticker.py
services/sources/source_registry.py   services/analysis/analysis_hub.py
services/sources/ingestion_service.py agents/brain/llm_router.py (summary)
api/routers/sources.py                api/routers/analysis.py
apps/web/app/fuentes/                 apps/web/app/analisis/
```

El Analysis Hub reúne señales de:
1. `cargar_alertas()` — alertas del sistema desde DB
2. `get_sources_with_health()` — señales de fuentes caídas/degradadas
3. Señales baseline del sistema (Ollama disponible/no, etc.)
4. Resumen ejecutivo via Ollama `briefing` task o plantilla determinista

---

## 3. Backend creado

| Archivo | Descripción |
|---------|-------------|
| `api/schemas/sources.py` | `SourceDefinition`, `SourceHealth`, `SourceWithHealth`, `IngestionRunRequest`, `IngestionRunResult` |
| `api/schemas/analysis.py` | `AnalysisSignal`, `AnalysisHubResponse` |
| `services/sources/__init__.py` | Paquete |
| `services/sources/source_registry.py` | 26 fuentes canónicas en 11 dominios; health via `media_intelligence.source_health`; fallback gracioso a `unknown` |
| `services/sources/ingestion_service.py` | Dry-run wrapper; 12 pipelines mapeados; sin ejecución masiva automática |
| `services/analysis/__init__.py` | Paquete |
| `services/analysis/analysis_hub.py` | `build_analysis_hub()`, `collect_cross_domain_signals()`, scoring heurístico, resumen IA o determinista |
| `api/routers/sources.py` | 6 endpoints (ver sección 5) |
| `api/routers/analysis.py` | 3 endpoints (ver sección 5) |
| `api/main.py` | Ambos routers registrados |

---

## 4. Frontend creado

| Archivo | Descripción |
|---------|-------------|
| `apps/web/lib/types/sources.ts` | `SourceDefinition`, `SourceHealth`, `SourceWithHealth`, respuestas API |
| `apps/web/lib/types/analysis.ts` | `AnalysisSignal`, `AnalysisHubResponse`, `AnalysisSignalsResponse` |
| `apps/web/lib/api/endpoints.ts` | +9 endpoints: sources (6) + analysis (3); helper `toQuery()` |
| `apps/web/app/fuentes/page.tsx` | KPIs, cobertura por dominio, tabla filtrable, dry-run por fuente, historial de runs |
| `apps/web/app/analisis/page.tsx` | Resumen ejecutivo, top signals grid, cambios del periodo, riesgos, oportunidades, salud de datos, acciones |
| `apps/web/components/layout/sidebar.tsx` | `/analisis` en grupo Inteligencia; `/fuentes` en grupo Laboratorio |

---

## 5. Endpoints

### Sources (prefix `/api`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/sources/catalog` | Lista de definiciones (filter: `domain`, `include_disabled`) |
| `GET` | `/api/sources/health` | Fuentes con health (filter: `domain`, `status`, `include_disabled`) |
| `GET` | `/api/sources/coverage` | Cobertura por dominio |
| `GET` | `/api/sources/runs` | Últimos runs de ingesta (`limit`) |
| `POST` | `/api/sources/run` | Dry-run de fuente individual (`{source_id, dry_run: true, limit}`) |
| `POST` | `/api/sources/run-all-dry` | Inventario de fuentes con pipeline vs sin pipeline |

### Analysis (prefix `/api`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/analysis/hub` | Hub completo (`period`, `workspace_id`) |
| `GET` | `/api/analysis/signals` | Señales filtradas (`domain`, `severity`, `period`, `limit`) |
| `POST` | `/api/analysis/refresh` | Forzar recálculo del análisis |

---

## 6. Contratos de datos

### DataMode (de Sprint 1)
```
real      → datos en tiempo real verificados
demo      → datos de ejemplo (fixtures)
fallback  → datos de respaldo (fuente principal no disponible)
error     → error al obtener datos
```

Todo response incluye `mode`. Toda UI con modo no-real muestra `<ModeBadge>`.

### Source Registry
26 fuentes canónicas en 11 dominios: electoral, legislative, media, economic, regulatory, geopolitical, osint, territorial, contracts, workspace, system.

### Scoring de señales (heurístico, marcado como fallback)
```
score = severity_weight[severity] + trend_bonus[trend] + min(evidence_count, 10)
```

---

## 7. Modos real/demo/fallback/error

| Componente | Modo cuando no hay DB |
|-----------|----------------------|
| `sources/catalog` | `real` (datos declarativos siempre disponibles) |
| `sources/health` | `fallback` (status=unknown para todas las fuentes) |
| `sources/coverage` | `real` (calculado del catálogo) |
| `sources/runs` | `fallback` (lista vacía si no hay scraping_log) |
| `analysis/hub` | `fallback` (señales sistema, resumen determinista) |
| Analysis Hub summary | `real` si Ollama responde, `fallback` si no |

---

## 8. Cómo ejecutar

```bash
# Backend
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
uvicorn api.main:app --reload --port 8000

# Frontend
cd apps/web && npm run dev
```

---

## 9. Cómo probar

```bash
# API manual
curl -s http://localhost:8000/api/sources/catalog | python3 -m json.tool | head -40
curl -s http://localhost:8000/api/sources/health | python3 -m json.tool | head -40
curl -s http://localhost:8000/api/sources/coverage | python3 -m json.tool
curl -s http://localhost:8000/api/sources/runs | python3 -m json.tool

curl -s -X POST http://localhost:8000/api/sources/run \
  -H "Content-Type: application/json" \
  -d '{"source_id":"boe","dry_run":true,"limit":25}' | python3 -m json.tool

curl -s http://localhost:8000/api/analysis/hub | python3 -m json.tool

# UI
# http://localhost:3000/fuentes
# http://localhost:3000/analisis
```

**Verificar degradación correcta** (apagar backend):
- `/fuentes` debe mostrar mensaje de error controlado, no pantalla blanca
- `/analisis` debe mostrar mensaje de error controlado en rojo

---

## 10. Límites actuales

- `sources/health` devuelve `unknown` para la mayoría de fuentes hasta que `media_intelligence/source_health.py` tenga datos históricos en DB
- La ingesta individual (dry-run) solo reporta si hay pipeline mapeado, no lo ejecuta
- `sources/run-all-dry` es un inventario, no una ejecución
- El resumen ejecutivo del Analysis Hub usa Ollama si está disponible; si no, es un template determinista
- No hay paginación en la tabla de fuentes (suficiente para 26 fuentes actuales)
- No hay WebSocket/SSE para actualización en tiempo real de runs

---

## 11. Qué queda para Sprint 3

- **Briefings reales** — migrar D1_Briefings.py usando `services/intelligence/morning_briefing_engine.py` + Source Registry + Analysis Hub como contexto
- **Wiring de health real** — escribir health data desde scrapers existentes a `media_source_health` tabla via `media_intelligence/source_health.py`
- **Legislativo real** — conectar `/legislativo` a `GET /api/legislative/boe` + `GET /api/legislative/initiatives`
- **Ejecutor de pipeline** — endpoint `POST /api/sources/run` con `dry_run=false` y job tracking
- **Tests** — pytest para `source_registry.py`, `ingestion_service.py`, `analysis_hub.py`
