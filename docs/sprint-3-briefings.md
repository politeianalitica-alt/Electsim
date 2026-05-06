# Sprint 3 — Briefings Profesionales

**Branch:** `sprint-2-sources-analysis-hub` (continuación)  
**Date:** 2026-05-06  

---

## 1. Objetivo

Convertir Sources + Analysis Hub + Brain en briefings profesionales exportables.

El sistema ya tenía datos (Sprint 2). Ahora produce entregables: documentos estructurados,
trazables, exportables a Markdown/PDF, archivables en disco, con modo real/demo/fallback
honesto en cada sección.

Seis tipos de briefing cubriendo los casos de uso principales de la plataforma:
`morning`, `client`, `legislative`, `crisis`, `media`, `geopolitical`.

---

## 2. Arquitectura del Briefing Engine

```
BriefingRequest
       │
       ▼
briefing_engine.py
  ├── _collect_signals()    → build_analysis_hub()         (Sprint 2)
  ├── _get_legacy_morning() → build_morning_briefing()     (B1-B4)
  ├── _generate_ai_summary()→ Ollama briefing task         (Sprint 1)
  │                         → deterministic fallback
  └── _build_sections()    → type-specific section builder
       │
       ▼
BriefingDocument
  ├── briefing_store.py → data/outputs/briefings/{id}.json
  └── briefing_renderer.py → Markdown / plaintext
       │
       ▼
api/routers/briefings.py (6 endpoints)
       │
       ▼
apps/web/app/briefings/page.tsx
  ├── BriefingGeneratePanel
  ├── BriefingViewer
  ├── BriefingSectionCard
  ├── ExportPanel
  └── BriefingHistory
```

---

## 3. Tipos de briefing

| Tipo | Audiencia típica | Secciones características |
|------|-----------------|--------------------------|
| `morning` | Consultor político, analista | Resumen ejecutivo, alertas activas, radar legislativo, narrativas |
| `client` | Cliente IBEX, directivo | Contexto sectorial, riesgos, oportunidades, recomendaciones |
| `legislative` | Juristas, policy teams | Radar normativo BOE/BOCG, iniciativas, calendarios |
| `crisis` | Gabinete de crisis | Señales de alta severidad, cronología, acciones urgentes |
| `media` | Comunicación, PR | Narrativas mediáticas, cobertura por medio, contranarrativas |
| `geopolitical` | Inteligencia, relaciones internacionales | Eventos ACLED/GDELT, presencia española, riesgo país |

---

## 4. Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/briefings/generate` | Genera y archiva briefing completo |
| `POST` | `/api/briefings/preview` | Preview sin archivar (dry-run) |
| `GET`  | `/api/briefings/v2` | Lista de briefings archivados (`workspace_id`, `limit`) |
| `GET`  | `/api/briefings/{id}/detail` | Briefing completo por ID |
| `GET`  | `/api/briefings/{id}/markdown` | Export Markdown del briefing |
| `GET`  | `/api/briefings/{id}/pdf-v2` | Export PDF (fallback a Markdown si reportlab no instalado) |

Los endpoints legacy de politeia_v3.py (`/api/briefings/morning`, etc.) siguen
funcionando. El frontend muestra el briefing matinal legacy como "teaser" en el
estado vacío.

---

## 5. Contratos de datos

### BriefingRequest

```python
class BriefingRequest(BaseModel):
    briefing_type: BriefingType = "morning"
    audience: BriefingAudience = "general"
    workspace_id: str = "default"
    client_id: str | None = None
    sector: str | None = None
    topic: str | None = None
    period: str = "24h"             # 24h | 7d | 30d
    force_refresh: bool = False
    include_methodology: bool = True
    include_evidence: bool = True
    language: str = "es"
```

### BriefingDocument

```python
class BriefingDocument(BaseModel):
    id: str                          # UUID
    title: str
    briefing_type: BriefingType
    audience: BriefingAudience
    workspace_id: str
    generated_at: datetime
    mode: DataMode                   # real | demo | fallback | error
    model_used: str | None           # "politeia-brain:latest" o None
    latency_ms: float | None
    executive_summary: str
    sections: list[BriefingSection]
    source_ids: list[str]
    signal_ids: list[str]
    warnings: list[str]
    methodology_note: str | None
```

### BriefingSection

```python
class BriefingSection(BaseModel):
    id: str
    type: str                        # executive | alerts | legislative | media | ...
    title: str
    body: str
    bullets: list[str]
    signals: list[AnalysisSignal]
    evidence: list[BriefingEvidence]
    recommended_action: str | None
    target_route: str | None         # ruta Next.js para drill-down
    confidence: float                # 0.0 – 1.0
    mode: DataMode
```

---

## 6. Cómo se usa Analysis Hub

`briefing_engine.py` llama a `build_analysis_hub()` (de Sprint 2) para obtener:

- `top_signals` → secciones de alertas y señales
- `risks` / `opportunities` → sección de riesgos/oportunidades del cliente
- `source_health_summary` → advertencias en `warnings[]`
- `executive_summary` del hub → input adicional al LLM

El hub ya aplica heurística de scoring y modo. El engine toma el resultado y lo
re-estructura en secciones específicas del tipo de briefing.

---

## 7. Cómo se usa Brain

`_generate_ai_summary()` en `briefing_engine.py`:

1. Construye un prompt con los signals del hub + morning briefing legacy
2. Llama a `generate_with_task(prompt, task_type="briefing")` en `llm_router.py`
3. Si Ollama responde: `mode="real"`, `model_used="politeia-brain:latest"`
4. Si Ollama falla o timeout: cae al fallback determinista (ver sección 8)

El prompt usa el system prompt de Politeia Brain:
```
Eres Politeia Brain, analista de inteligencia política española.
Tu misión: producir briefings factuales, sin inventar datos.
Siempre indica el nivel de confianza. Nunca hagas predicciones no respaldadas.
```

---

## 8. Cómo funciona el fallback determinista

Cuando Ollama no está disponible o devuelve error:

```python
# Usa top_signals[:3], risks[:2], opportunities[:2], source_health_summary
summary = f"Análisis de {period}: {len(top_signals)} señales detectadas. "
if risks:
    summary += f"Riesgos principales: {risks[0].title}"
if opportunities:
    summary += f"Oportunidades: {opportunities[0].title}"
```

El modo del documento queda `mode="fallback"` y aparece `<ModeBadge mode="fallback">`
en el header del viewer. Los bullets de cada sección se construyen directamente desde
los campos de `AnalysisSignal` y `BriefingEvidence` sin pasar por LLM.

Nunca se inventa contenido. Si no hay señales, el briefing tiene `warnings[]` explicando
el motivo y el executive_summary describe el estado del sistema, no los datos.

---

## 9. Export Markdown / PDF

### Markdown

`briefing_renderer.py` genera Markdown estructurado:

```markdown
# [Título del briefing]
**Generado:** 2026-05-06T08:30:00Z | **Modo:** FALLBACK | **Audiencia:** Consultor político

> ⚠️ Advertencia: Fuente X no disponible

## Resumen ejecutivo
[executive_summary]

## [Sección 1]
[body]
- bullet 1
- bullet 2

### Acción recomendada
→ [recommended_action]

---
*Nota metodológica: ...*
```

Endpoint: `GET /api/briefings/{id}/markdown` → `text/plain; charset=utf-8`

### PDF

`GET /api/briefings/{id}/pdf-v2`:
- Si `reportlab` instalado: genera PDF binario con título, metadatos, secciones
- Si no instalado: devuelve el Markdown con header `Content-Type: text/plain`
  y aviso en body: `"PDF no disponible — reportlab no instalado. Exportando Markdown."`

Frontend detecta el fallback y muestra el contenido como texto con aviso al usuario.

Instalar PDF real:
```bash
pip install reportlab>=4.0
```

---

## 10. Cómo probar

```bash
# Backend
uvicorn api.main:app --reload --port 8000

# Generar briefing matinal
curl -s -X POST http://localhost:8000/api/briefings/generate \
  -H "Content-Type: application/json" \
  -d '{"briefing_type":"morning","audience":"general","period":"24h"}' \
  | python3 -m json.tool | head -60

# Ver lista de briefings archivados
curl -s http://localhost:8000/api/briefings/v2 | python3 -m json.tool

# Export Markdown (usar ID del paso anterior)
curl -s http://localhost:8000/api/briefings/{id}/markdown

# Preview (no archiva)
curl -s -X POST http://localhost:8000/api/briefings/preview \
  -H "Content-Type: application/json" \
  -d '{"briefing_type":"legislative","period":"7d"}' \
  | python3 -m json.tool

# Frontend
# http://localhost:3000/briefings
```

**Verificar degradación** (apagar Ollama):
- El briefing debe generarse con `mode: "fallback"` 
- El executive_summary debe ser determinista (no vacío)
- El frontend debe mostrar `<ModeBadge mode="fallback">` en el header

**Verificar degradación total** (apagar backend):
- `/briefings` debe mostrar error controlado, no pantalla blanca
- El estado vacío muestra el briefing legacy de `/api/briefings/morning`

---

## 11. Limitaciones actuales

| Limitación | Impacto |
|-----------|---------|
| Store en JSON-on-disk (`data/outputs/briefings/`) | No escala a multi-tenant; suficiente para dev |
| Sin paginación en `/api/briefings/v2` | `limit=50` hardcoded; suficiente para dev |
| PDF depende de `reportlab` no instalado en venv | Fallback a Markdown automático |
| Tipos `client`, `crisis`, `geopolitical` usan secciones genéricas | Requieren lógica específica en `_build_sections()` |
| Sin caché de briefings generados | Cada generate es un request nuevo al LLM |
| Sin control de acceso por workspace | Todos los briefings son accesibles sin auth |
| Sin diff entre briefings | No hay comparación automática respecto al briefing anterior |

---

## 12. Recomendación Sprint 4

Con la columna vertebral de datos (Sprint 2) y los entregables (Sprint 3) funcionando,
Sprint 4 puede abordar las pestañas de dominio con contexto real:

**Opción A — Migrar pestañas al estándar real/demo/fallback:**
- `/legislativo` → `GET /api/legislative/boe` + `GET /api/legislative/initiatives`
- `/medios` → `GET /api/media/source-health` + `GET /api/media/narratives`
- `/actores` → `GET /api/actors` (cuando la BD esté poblada)
- `/riesgo` → `GET /api/risk/overview`

Cada pestaña recibe señales del Analysis Hub como contexto. El usuario puede ir
de un signal card en `/analisis` directamente a la pestaña de dominio (campo
`target_route` en `AnalysisSignal`).

**Opción B — Wiring de health real + executor de pipeline:**
- Escribir health data desde scrapers a `media_source_health` vía `source_health.py`
- Endpoint `POST /api/sources/run` con `dry_run=false` + job tracking

**Recomendación:** Opción A primero. Las pestañas de dominio son el valor percibido
por el usuario. Health real y pipeline executor son infraestructura que puede ir en
paralelo o en Sprint 5.
