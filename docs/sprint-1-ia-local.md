# Sprint 1 — IA Local / Ollama Stabilization

**Branch:** `sprint-1-ia-local-stabilization`  
**Date:** 2026-05-06  
**Commits:** 4 (`06526e5` → `0c2a601`)

---

## Objetivo

Sentar una base real, auditable y sin datos falsos ocultos para el resto del desarrollo.
El sprint elimina hardcodes que pasaban por datos reales, expone el estado de Ollama en
la UI, y establece los patrones de transparencia de datos (`real | demo | fallback | error`).

---

## Entorno verificado

| Componente | Estado |
|-----------|--------|
| Node.js | v24.14.1 |
| Python | 3.13.13 |
| Ollama | Activo en `http://localhost:11434` |
| Modelos Ollama | `politeia-brain:latest`, `nomic-embed-text:latest`, `qwen2.5:7b`, `llama3.2:3b` |
| Next.js build | ✅ 22 rutas, 0 errores |
| TypeScript typecheck | ✅ 0 errores |
| Python compile | ✅ 0 errores |

---

## Archivos creados/modificados

### Backend Python

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `api/schemas/__init__.py` | Nuevo | Paquete de schemas |
| `api/schemas/status.py` | Nuevo | `DataMode`, `ModeMeta`, `ApiEnvelope[T]` Pydantic genérico |
| `agents/brain/service.py` | Nuevo | `get_brain_status()`, `test_brain()`, `test_embedding()`, `get_model_routing()` |
| `agents/brain/llm_router.py` | Modificado | `get_routing_config()` expone `_TASK_CONFIG`, `_SPEED_MODELS`, stats, ollama status |
| `api/routers/politeia_v3.py` | Modificado | `GET /api/brain/status` (structured), `POST /api/brain/test`, `POST /api/brain/embed-test`, `/api/system/status` llm info dinámico |

### Frontend TypeScript

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `apps/web/lib/types/status.ts` | Nuevo | `DataMode`, `ModeMeta`, `ApiEnvelope<T>`, tipos Brain*/Embed* |
| `apps/web/lib/types/actors.ts` | Nuevo | `Actor`, `Party` interfaces |
| `apps/web/lib/types/risk.ts` | Nuevo | `RiskKpi`, `RiskSignal`, `RiskHeatmapEntry` interfaces |
| `apps/web/lib/utils/status.ts` | Nuevo | `getModeLabel/Description/ClassName()`, `isNonRealMode()` |
| `apps/web/lib/fixtures/actors.ts` | Nuevo | `DEMO_ACTORS` (24), `DEMO_PARTIES` (9) extraídos de actores/page.tsx |
| `apps/web/lib/fixtures/risk.ts` | Nuevo | `DEMO_GLOBAL_RISK`, `DEMO_KPIS`, `DEMO_SIGNALS`, etc. extraídos de riesgo/page.tsx |
| `apps/web/components/status/mode-badge.tsx` | Nuevo | `<ModeBadge mode source message />` |
| `apps/web/lib/api/endpoints.ts` | Modificado | `brainStatus()`, `brainTest()`, `brainEmbedTest()` añadidos |
| `apps/web/app/sistema/ia/page.tsx` | Nuevo | Página diagnóstico IA Local completa |
| `apps/web/components/layout/sidebar.tsx` | Modificado | Entrada "IA Local" → `/sistema/ia` |
| `apps/web/app/actores/page.tsx` | Modificado | Usa `DEMO_ACTORS/PARTIES` + `<ModeBadge mode="demo">` |
| `apps/web/app/riesgo/page.tsx` | Modificado | Usa `DEMO_*` fixtures + `<ModeBadge mode="demo">` |

---

## Patrón de transparencia de datos

Todo response del backend incluye un campo `mode`:

```
real      → datos en tiempo real verificados
demo      → datos de ejemplo (fixtures)
fallback  → datos de respaldo (fuente principal caída)
error     → error al obtener datos
```

Toda página que muestre datos no-reales muestra un `<ModeBadge>` visible en el header.

```tsx
// Backend (Python)
return {"mode": "demo", "data": {...}, "updated_at": "..."}

// Frontend (TypeScript)
<ModeBadge mode="demo" source="fixtures" message="API en desarrollo" />
```

---

## Nueva ruta: `/sistema/ia`

Página de diagnóstico completa para el motor IA Local:

- **Header** con `ModeBadge` indicando estado real/fallback/error
- **KPI cards**: Ollama activo, Brain disponible, modelo activo
- **Tabla de entorno**: variables clave (redactadas)
- **Tabla de routing**: 10 tipos de tarea → modelo → timeout → TTL caché
- **Test de prompt**: formulario con selector de tipo de tarea, respuesta en tiempo real
- **Test de embedding**: formulario, resultado con modelo y latencia
- Polling automático cada 30s vía React Query

---

## Endpoints nuevos/actualizados

| Método | Endpoint | Descripción |
|--------|---------|-------------|
| `GET` | `/api/brain/status` | Estado estructurado (Ollama, modelos, routing, env vars) |
| `POST` | `/api/brain/test` | Test de prompt con `{prompt, task_type}` |
| `POST` | `/api/brain/embed-test` | Test de embedding con `{text}` |
| `GET` | `/api/system/status` | Ahora incluye `llm.ollama_available`, `llm.brain_available`, `llm.active_model` dinámicos |

---

## Pendiente (fuera de scope Sprint 1)

- Tests unitarios para `agents/brain/service.py` (pytest)
- Tests de contrato para los 3 nuevos endpoints
- Migrar actores/riesgo de fixtures → endpoints reales cuando la BD esté poblada
- Autenticación JWT en `/sistema/ia` (acceso restringido a admins)
- Cache stats en tiempo real en la UI

---

## Comandos de verificación

```bash
# TypeScript
cd apps/web && npx tsc --noEmit    # 0 errors

# Next.js build
cd apps/web && npm run build       # 22 routes, 0 errors

# Python compile
.venv/bin/python -m compileall api/schemas/ agents/brain/ api/routers/politeia_v3.py -q
```
