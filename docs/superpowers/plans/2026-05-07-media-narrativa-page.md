# Media & Narrativa Intelligence Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal medios page with a full Media & Narrative Intelligence dashboard matching the old Streamlit D7/D11 quality — unified feed with bias filters, political bias spectrum, sentiment heatmap by party, live narrative clustering, and a three-level SVG narrative map (world → Europe → Spain CCAA).

**Architecture:** New FastAPI router `api/routers/media_intel.py` with service `services/media/media_intel_service.py` doing real SQLAlchemy queries against noticias_prensa + news_articles + medios_comunicacion + sentimiento_prensa_diario. Frontend is a full rewrite of `apps/web/app/medios/page.tsx` with five extracted components in `apps/web/components/media/`.

**Tech Stack:** FastAPI + SQLAlchemy (backend), Next.js 14 App Router + TanStack Query + Tailwind CSS (frontend), pure SVG maps (no new npm packages).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `services/media/media_intel_service.py` | CREATE | All DB queries for media intel |
| `services/media/__init__.py` | CREATE | Package marker |
| `api/routers/media_intel.py` | CREATE | FastAPI endpoints /api/media-intel/* |
| `api/main.py` | MODIFY | Register new router |
| `apps/web/app/medios/page.tsx` | REWRITE | Full page layout, tab routing |
| `apps/web/components/media/MediaFeed.tsx` | CREATE | Filterable unified news feed |
| `apps/web/components/media/BiasSpectrum.tsx` | CREATE | Left-right spectrum visualization |
| `apps/web/components/media/SentimentHeatmap.tsx` | CREATE | Daily sentiment by party |
| `apps/web/components/media/NarrativePanel.tsx` | CREATE | Narrative clusters with velocity |
| `apps/web/components/media/NarrativeMap.tsx` | CREATE | World/Europe/Spain SVG map |
| `apps/web/lib/api/endpoints.ts` | MODIFY | Add media-intel endpoint calls |

---

### Task 1: Backend service — media_intel_service.py

**Files:**
- Create: `services/media/__init__.py`
- Create: `services/media/media_intel_service.py`

- [ ] Create package init and full service file with these functions:
  - `get_kpis()` → article counts, active sources, international count
  - `get_feed(category, bias, partido, scope, page, page_size)` → unified feed with bias join
  - `get_bias_spectrum()` → medios with ideology + recent article count
  - `get_sentiment_heatmap()` → sentimiento_prensa_diario last 30 days
  - `get_narratives()` → keyword-scored narrative clusters from noticias_prensa
  - `get_map_world()` → news_articles grouped by country with coords
  - `get_map_europe()` → news_articles filtered to europe region
  - `get_map_spain_ccaa()` → noticias by fuente joined to medios_comunicacion.ccaa_id

### Task 2: FastAPI router — media_intel.py

**Files:**
- Create: `api/routers/media_intel.py`
- Modify: `api/main.py`

- [ ] Create router with all GET endpoints, register in main.py

### Task 3: Frontend endpoints.ts additions

**Files:**
- Modify: `apps/web/lib/api/endpoints.ts`

- [ ] Add mediaIntel* endpoint calls

### Task 4: NarrativeMap component (SVG world/europe/spain)

**Files:**
- Create: `apps/web/components/media/NarrativeMap.tsx`

- [ ] Build SVG map with three views using hardcoded country/CCAA paths

### Task 5: Remaining components

**Files:**
- Create: `apps/web/components/media/MediaFeed.tsx`
- Create: `apps/web/components/media/BiasSpectrum.tsx`
- Create: `apps/web/components/media/SentimentHeatmap.tsx`
- Create: `apps/web/components/media/NarrativePanel.tsx`

### Task 6: Page rewrite

**Files:**
- Rewrite: `apps/web/app/medios/page.tsx`

- [ ] Assemble all components into tabbed layout
