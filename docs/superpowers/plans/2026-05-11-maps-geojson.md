# Maps GeoJSON Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-rolled SVG path maps in three visual-oscar components with real GeoJSON + d3-geo projections.

**Architecture:** Download two GeoJSON files (spain-ccaa, world-countries) into `public/geodata/`; install d3-geo + d3-scale; create shared color utilities and loading skeleton; then rewrite LegislationMap, RegionalNewsMaps, and NarrativeMap. All existing props, API calls, filters, and non-map state are preserved verbatim. MapaProvincias (tile cartogram) is left untouched.

**Tech Stack:** Next.js 14 App Router (`'use client'`), d3-geo ^3.1.0, d3-scale ^4.0.2, TypeScript strict, browser `fetch()` for GeoJSON assets.

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/visual-oscar/public/geodata/spain-ccaa.geojson` |
| Create | `apps/visual-oscar/public/geodata/world-countries.geojson` |
| Create | `apps/visual-oscar/lib/map-colors.ts` |
| Create | `apps/visual-oscar/components/maps/MapSkeleton.tsx` |
| Create | `apps/visual-oscar/components/maps/MapLegend.tsx` |
| Rewrite | `apps/visual-oscar/components/LegislationMap.tsx` |
| Rewrite | `apps/visual-oscar/components/RegionalNewsMaps.tsx` |
| Rewrite | `apps/visual-oscar/components/media/NarrativeMap.tsx` |
| Modify | `apps/visual-oscar/package.json` |

---

## Task 1: Install deps & download GeoJSON assets

**Files:**
- Modify: `apps/visual-oscar/package.json`
- Create: `apps/visual-oscar/public/geodata/spain-ccaa.geojson`
- Create: `apps/visual-oscar/public/geodata/world-countries.geojson`

- [ ] **Step 1.1: Install d3-geo and d3-scale**

```bash
cd "apps/visual-oscar" && npm install d3-geo@^3.1.0 d3-scale@^4.0.2
```

Expected: `package.json` dependencies now include `"d3-geo": "^3.1.0"` and `"d3-scale": "^4.0.2"`. No `@types/*` needed — both packages ship their own TypeScript declarations.

- [ ] **Step 1.2: Download GeoJSON files**

```bash
mkdir -p "apps/visual-oscar/public/geodata"

curl -fL "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-communities.geojson" \
  -o "apps/visual-oscar/public/geodata/spain-ccaa.geojson"

curl -fL "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson" \
  -o "apps/visual-oscar/public/geodata/world-countries.geojson"
```

Expected: two files exist, spain-ccaa.geojson > 100 KB, world-countries.geojson > 100 KB.

- [ ] **Step 1.3: Verify GeoJSON property names (critical — informs all later tasks)**

```bash
node -e "
const s = require('./apps/visual-oscar/public/geodata/spain-ccaa.geojson')
console.log('Spain feature count:', s.features.length)
console.log('First feature props:', JSON.stringify(s.features[0].properties))
console.log('All names:', s.features.map(x => x.properties.name).join(' | '))
"

node -e "
const w = require('./apps/visual-oscar/public/geodata/world-countries.geojson')
console.log('World feature count:', w.features.length)
const spain = w.features.find(x => x.id === 'ESP' || (x.properties && x.properties.name === 'Spain'))
console.log('Spain entry id:', spain?.id, 'name:', spain?.properties?.name)
"
```

Expected for spain-ccaa: 17 features with a `name` property like `"Andalucía"`, `"Comunidad de Madrid"`, `"Cataluña"`, `"Illes Balears"`, `"Principado de Asturias"`, `"Islas Canarias"` etc.

Expected for world: 170+ features; Spain found with `id = "ESP"`.

> **Important:** The exact `name` values from this output determine the CCAA lookup tables in Tasks 4–6. If names differ from the lookup tables in the code below, update the lookup tables to match.

- [ ] **Step 1.4: Commit**

```bash
git add apps/visual-oscar/package.json apps/visual-oscar/package-lock.json apps/visual-oscar/public/geodata/
git commit -m "feat(maps): install d3-geo/d3-scale, add GeoJSON assets"
```

---

## Task 2: lib/map-colors.ts

**Files:**
- Create: `apps/visual-oscar/lib/map-colors.ts`

- [ ] **Step 2.1: Create the file**

Create `apps/visual-oscar/lib/map-colors.ts`:

```typescript
/** Linear interpolation between two hex colors. t ∈ [0, 1]. */
function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}

/**
 * dark-navy (#1e293b) → sky-blue (#38bdf8). For article counts / positive metrics.
 * Usage: const colorFn = positiveColorScale([0, maxArticles]); fill = colorFn(value)
 */
export function positiveColorScale(domain: [number, number]): (value: number) => string {
  const [min, max] = domain
  return (value: number) => {
    const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
    return lerpHex('#1e293b', '#38bdf8', t)
  }
}

/**
 * green (#22c55e) → amber (#f59e0b) → red (#ef4444). For risk / negativity (0 = safe, 1 = critical).
 * Usage: const colorFn = riskColorScale([0, 100]); fill = colorFn(riskValue)
 */
export function riskColorScale(domain: [number, number]): (value: number) => string {
  const [min, max] = domain
  return (value: number) => {
    const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
    return t < 0.5
      ? lerpHex('#22c55e', '#f59e0b', t * 2)
      : lerpHex('#f59e0b', '#ef4444', (t - 0.5) * 2)
  }
}

/** Fixed palette for the 9 narrative categories used across all Spain maps. */
export function categoricalColor(category: string): string {
  const PALETTE: Record<string, string> = {
    politica:    '#4a90e2',
    economia:    '#27ae60',
    justicia:    '#e74c3c',
    vivienda:    '#e67e22',
    sanidad:     '#9b59b6',
    inmigracion: '#c0392b',
    energia:     '#f39c12',
    educacion:   '#2ecc71',
    generalista: '#6c7480',
  }
  return PALETTE[category] ?? '#6c7480'
}
```

- [ ] **Step 2.2: Verify TypeScript**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep "map-colors" | head -10
```

Expected: no output (no errors from the new file).

- [ ] **Step 2.3: Commit**

```bash
git add apps/visual-oscar/lib/map-colors.ts
git commit -m "feat(maps): add positiveColorScale / riskColorScale / categoricalColor"
```

---

## Task 3: MapSkeleton + MapLegend

**Files:**
- Create: `apps/visual-oscar/components/maps/MapSkeleton.tsx`
- Create: `apps/visual-oscar/components/maps/MapLegend.tsx`

- [ ] **Step 3.1: Create MapSkeleton**

```bash
mkdir -p apps/visual-oscar/components/maps
```

Create `apps/visual-oscar/components/maps/MapSkeleton.tsx`:

```tsx
'use client'

interface Props { height?: number }

export default function MapSkeleton({ height = 400 }: Props) {
  return (
    <div
      role="status"
      aria-label="Cargando mapa…"
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        background: 'linear-gradient(90deg, #f0f3f8 25%, #e4e8ef 50%, #f0f3f8 75%)',
        backgroundSize: '200% 100%',
        animation: '_mapPulse 1.5s ease-in-out infinite',
      }}
    >
      <style>{`@keyframes _mapPulse{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )
}
```

- [ ] **Step 3.2: Create MapLegend**

Create `apps/visual-oscar/components/maps/MapLegend.tsx`:

```tsx
'use client'

interface Props {
  /** Color scale — maps a number to a CSS color string (output of positiveColorScale / riskColorScale). */
  scale: (value: number) => string
  min: number
  max: number
  unit?: string
  steps?: number
}

export default function MapLegend({ scale, min, max, unit = '', steps = 6 }: Props) {
  const colors = Array.from({ length: steps }, (_, i) =>
    scale(min + (max - min) * (i / (steps - 1)))
  )
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`
  const fmt = (n: number) => Math.round(n).toLocaleString('es-ES')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <span style={{ fontSize: 10, color: '#6e6e73' }}>{fmt(min)}</span>
      <div
        role="img"
        aria-label={`Escala: ${fmt(min)}–${fmt(max)}${unit ? ' ' + unit : ''}`}
        style={{ flex: 1, height: 8, borderRadius: 4, background: gradient, border: '1px solid rgba(0,0,0,0.06)' }}
      />
      <span style={{ fontSize: 10, color: '#6e6e73' }}>
        {fmt(max)}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}
```

- [ ] **Step 3.3: Verify TypeScript**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep -E "MapSkeleton|MapLegend" | head -10
```

Expected: no output.

- [ ] **Step 3.4: Commit**

```bash
git add apps/visual-oscar/components/maps/
git commit -m "feat(maps): add MapSkeleton loading placeholder and MapLegend gradient strip"
```

---

## Task 4: Rewrite LegislationMap.tsx

**Files:**
- Rewrite: `apps/visual-oscar/components/LegislationMap.tsx`

**What stays:** all state variables, `useApi` call, `DEMO_ITEMS` fallback (14 items), filter logic, breakdown stats, the bottom two-column section (top items + breakdown), tooltip, selected-detail panel, refresh button, filter controls.

**What changes:** remove `SPAIN_PATH`, `PORTUGAL_PATH`, `CCAA_LABELS`, linear `project()`, Portugal path render. Add GeoJSON `useEffect` fetch, `geoConicConformal` path render for CCAA fills, dots positioned via d3 projection, Canarias as separate inset SVG.

**Canarias split:** `map_lat < 30` → inset. `map_lat >= 36` → main map. (Baleares lat ~39.5 goes in main.)

- [ ] **Step 4.1: Replace the full file**

Replace `apps/visual-oscar/components/LegislationMap.tsx` with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import MapSkeleton from '@/components/maps/MapSkeleton'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature {
  type: 'Feature'
  properties: Record<string, unknown> | null
  geometry: unknown
}
interface GeoFC {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// ─── Data types ────────────────────────────────────────────────────────────────
interface LegItem {
  id?: string | number
  titulo?: string
  nivel?: string
  region?: string
  ai_impact_level?: string
  ai_relevance?: number
  ai_category?: string
  sectores_afectados?: string[]
  map_lat?: number
  map_lon?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SVG_W = 720
const SVG_H = 400
const INS_W = 160
const INS_H = 90

function dotColor(impact?: string): string {
  if (impact === 'high')   return '#c42c2c'
  if (impact === 'medium') return '#b25000'
  return '#1F4E8C'
}

function isCanarias(lat: number | undefined) { return typeof lat === 'number' && lat < 30 }
function isMainland(lat: number | undefined) { return typeof lat === 'number' && lat >= 36 }

// ─── Demo fallback ─────────────────────────────────────────────────────────────
const DEMO_ITEMS: LegItem[] = [
  { id: 1,  titulo: 'Real Decreto-ley energía renovable',  nivel: 'nacional',  region: 'Madrid',         ai_impact_level: 'high',   ai_relevance: 9, sectores_afectados: ['Energía', 'Industria'], map_lat: 40.42, map_lon: -3.70 },
  { id: 2,  titulo: 'Ley de Vivienda andaluza',            nivel: 'regional',  region: 'Andalucía',      ai_impact_level: 'high',   ai_relevance: 8, sectores_afectados: ['Vivienda'],             map_lat: 37.39, map_lon: -5.99 },
  { id: 3,  titulo: 'Decreto fiscalidad turismo',          nivel: 'regional',  region: 'Baleares',       ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Turismo'],              map_lat: 39.57, map_lon:  2.65 },
  { id: 4,  titulo: 'Reforma sanidad pública',             nivel: 'regional',  region: 'Cataluña',       ai_impact_level: 'high',   ai_relevance: 9, sectores_afectados: ['Salud'],                map_lat: 41.39, map_lon:  2.17 },
  { id: 5,  titulo: 'Plan industrial automoción',          nivel: 'regional',  region: 'Galicia',        ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Industria'],            map_lat: 42.88, map_lon: -8.55 },
  { id: 6,  titulo: 'PNL apoyo agricultura',               nivel: 'nacional',  region: 'Aragón',         ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agro'],                 map_lat: 41.65, map_lon: -0.89 },
  { id: 7,  titulo: 'Ordenanza tasas portuarias',          nivel: 'local',     region: 'Valencia',       ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Logística'],            map_lat: 39.47, map_lon: -0.38 },
  { id: 8,  titulo: 'Decreto migración Canarias',          nivel: 'nacional',  region: 'Canarias',       ai_impact_level: 'high',   ai_relevance: 8, sectores_afectados: ['Inmigración'],          map_lat: 28.46, map_lon:-16.25 },
  { id: 9,  titulo: 'Ley educativa autonómica',            nivel: 'regional',  region: 'País Vasco',     ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Educación'],            map_lat: 43.26, map_lon: -2.93 },
  { id: 10, titulo: 'Reforma laboral autonómica',          nivel: 'regional',  region: 'Asturias',       ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Empleo'],               map_lat: 43.36, map_lon: -5.85 },
  { id: 11, titulo: 'Plan vivienda Murcia',                nivel: 'regional',  region: 'Murcia',         ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Vivienda'],             map_lat: 37.99, map_lon: -1.13 },
  { id: 12, titulo: 'Decreto turismo Castilla',            nivel: 'regional',  region: 'Castilla y León',ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Turismo'],              map_lat: 41.65, map_lon: -4.72 },
  { id: 13, titulo: 'Ordenanza energética Bilbao',         nivel: 'local',     region: 'País Vasco',     ai_impact_level: 'low',    ai_relevance: 4, sectores_afectados: ['Energía'],              map_lat: 43.26, map_lon: -2.93 },
  { id: 14, titulo: 'Plan agua Extremadura',               nivel: 'regional',  region: 'Extremadura',    ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agua', 'Agro'],         map_lat: 39.47, map_lon: -6.37 },
]

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props { sourcePath?: string }

export default function LegislationMap({ sourcePath = '/api/intelligence/legislation/impact' }: Props) {
  // GeoJSON
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  // UI state
  const [level, setLevel] = useState('')
  const [minRelevance, setMinRelevance] = useState(6)
  const [daysBack, setDaysBack] = useState(30)
  const [hovered, setHovered] = useState<LegItem | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<LegItem | null>(null)

  // API
  const qs = new URLSearchParams({ min_relevance: String(minRelevance), days_back: String(daysBack), limit: '60' })
  if (level) qs.set('level', level)
  const { data, loading, refresh, source } = useApi<LegItem[]>(`${sourcePath}?${qs.toString()}`, { refreshInterval: 0 })
  const apiItems: LegItem[] = Array.isArray(data) ? data : []
  const baseItems = apiItems.length > 0 ? apiItems : DEMO_ITEMS

  const legislation = baseItems.filter(l => {
    if (level && l.nivel !== level) return false
    if (minRelevance > 0 && (l.ai_relevance ?? 0) < minRelevance) return false
    return true
  })

  const geoItems = legislation.filter(l => typeof l.map_lat === 'number' && typeof l.map_lon === 'number' && l.map_lat !== 0)
  const mainItems     = geoItems.filter(l => isMainland(l.map_lat))
  const canariasItems = geoItems.filter(l => isCanarias(l.map_lat))
  const topItems = [...legislation].sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0)).slice(0, 5)
  const breakdown = {
    high:   legislation.filter(l => l.ai_impact_level === 'high').length,
    medium: legislation.filter(l => l.ai_impact_level === 'medium').length,
    low:    legislation.filter(l => l.ai_impact_level === 'low').length,
  }

  // Build projections from GeoJSON (only once geoData is loaded)
  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProjection = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([SVG_W, SVG_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canariasProjection = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null

  const mainPathGen     = mainProjection     ? geoPath(mainProjection)     : null
  const canariasPathGen = canariasProjection ? geoPath(canariasProjection) : null

  function projectMain(lat: number, lon: number): [number, number] | null {
    return mainProjection ? mainProjection([lon, lat]) : null
  }
  function projectCanarias(lat: number, lon: number): [number, number] | null {
    return canariasProjection ? canariasProjection([lon, lat]) : null
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '24px 28px', marginBottom: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Mapa legislativo · Impacto territorial</h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
            {legislation.length} normas · {geoItems.length} geolocalizadas · {source === 'mock' || apiItems.length === 0 ? 'datos demo' : 'datos en vivo'}
          </p>
        </div>
        <button onClick={() => refresh()} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff', fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }}>
        <select value={level} onChange={e => setLevel(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">Todos niveles</option>
          <option value="nacional">Nacional</option>
          <option value="regional">Regional</option>
          <option value="local">Local</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#6e6e73', fontSize: 11 }}>Rel min</span>
          <input type="range" min={1} max={10} value={minRelevance} onChange={e => setMinRelevance(parseInt(e.target.value))} style={{ width: 100 }} />
          <span style={{ fontWeight: 700, fontSize: 12, width: 16 }}>{minRelevance}</span>
        </div>
        <select value={daysBack} onChange={e => setDaysBack(parseInt(e.target.value))}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {/* Map area */}
      {geoError ? (
        <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c42c2c', fontSize: 13, border: '1px solid #fde8e8', borderRadius: 14, marginBottom: 16 }}>
          Error cargando mapa: {geoError}
        </div>
      ) : !geoData ? (
        <div style={{ marginBottom: 16 }}><MapSkeleton height={420} /></div>
      ) : (
        <div style={{ position: 'relative', background: 'linear-gradient(180deg, #f6f8fb 0%, #f0f3f8 100%)', borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 420 }}>
          {/* Main SVG — peninsula + Baleares */}
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Mapa de España con impacto legislativo por región"
          >
            {/* CCAA fills (neutral — dots carry the data) */}
            {peninsulaFC && mainPathGen && peninsulaFC.features.map((f, i) => {
              const d = mainPathGen(f as unknown as GeoPermissibleObjects)
              if (!d) return null
              return (
                <path
                  key={i}
                  d={d}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                  aria-label={String(f.properties?.name ?? '')}
                />
              )
            })}

            {/* Impact dots — mainland */}
            {mainItems.map((item, i) => {
              const pos = projectMain(item.map_lat!, item.map_lon!)
              if (!pos) return null
              const [x, y] = pos
              const r = item.ai_impact_level === 'high' ? 9 : item.ai_impact_level === 'medium' ? 7 : 5.5
              const color = dotColor(item.ai_impact_level)
              return (
                <g
                  key={item.id ?? i}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.region ?? ''}: impacto ${item.ai_impact_level ?? 'bajo'}`}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                >
                  <circle cx={x} cy={y} r={r + 5} fill={color} fillOpacity={0.12}>
                    <animate attributeName="r" values={`${r + 3};${r + 8};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={x} cy={y} r={r}
                    fill={color} fillOpacity={0.92}
                    stroke="white" strokeWidth={1.6}
                    onMouseEnter={e => {
                      setHovered(item)
                      const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                      if (rect) setHoverPos({ x: (x / SVG_W) * rect.width, y: (y / SVG_H) * rect.height })
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(item)}
                  />
                </g>
              )
            })}
          </svg>

          {/* Canarias inset — bottom-left */}
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            width: INS_W + 4,
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 8, border: '1px solid #cbd5e1', padding: 2,
          }}>
            <div style={{ fontSize: 8, color: '#6e6e73', textAlign: 'center', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 1 }}>Canarias</div>
            <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
              {canariasFC && canariasPathGen && canariasFC.features.map((f, i) => {
                const d = canariasPathGen(f as unknown as GeoPermissibleObjects)
                if (!d) return null
                return <path key={i} d={d} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
              })}
              {canariasItems.map((item, i) => {
                const pos = projectCanarias(item.map_lat!, item.map_lon!)
                if (!pos) return null
                const [x, y] = pos
                const r = item.ai_impact_level === 'high' ? 7 : item.ai_impact_level === 'medium' ? 5.5 : 4
                return (
                  <circle
                    key={item.id ?? i}
                    cx={x} cy={y} r={r}
                    fill={dotColor(item.ai_impact_level)} fillOpacity={0.9}
                    stroke="white" strokeWidth={1.2}
                    style={{ cursor: 'pointer' }}
                    aria-label={`${item.region ?? ''}: impacto ${item.ai_impact_level ?? 'bajo'}`}
                    onClick={() => setSelected(item)}
                    onMouseEnter={() => setHovered(item)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
            </svg>
          </div>

          {/* Impact legend */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #e8e8ed', borderRadius: 12, padding: '10px 14px',
            fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73' }}>Impacto</div>
            {([{ c: '#c42c2c', l: 'Alto', n: breakdown.high }, { c: '#b25000', l: 'Medio', n: breakdown.medium }, { c: '#1F4E8C', l: 'Bajo', n: breakdown.low }] as const).map(x => (
              <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', minWidth: 100 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: x.c }} />{x.l}
                </span>
                <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{x.n}</span>
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hovered && (
            <div style={{
              position: 'absolute', pointerEvents: 'none',
              left: Math.min(hoverPos.x + 14, 520), top: Math.max(hoverPos.y - 30, 8),
              background: '#fff', border: '1px solid #e8e8ed', borderRadius: 10,
              padding: '10px 14px', boxShadow: '0 6px 22px rgba(0,0,0,0.10)', maxWidth: 280, fontSize: 12,
            }}>
              <p style={{ fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px', lineHeight: 1.3 }}>{hovered.titulo}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: dotColor(hovered.ai_impact_level), background: `${dotColor(hovered.ai_impact_level)}18` }}>
                  {hovered.ai_impact_level ?? '—'}
                </span>
                {hovered.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>{hovered.region}</span>}
                {hovered.ai_relevance != null && <span style={{ color: '#1F4E8C', fontWeight: 700, fontSize: 11.5 }}>R{hovered.ai_relevance}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected detail */}
      {selected && (
        <div style={{ marginBottom: 16, background: '#f5f9ff', border: '1px solid #cfe0f3', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{selected.titulo}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: '#424245', flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  color: dotColor(selected.ai_impact_level), background: `${dotColor(selected.ai_impact_level)}18` }}>
                  {selected.ai_impact_level ?? '—'}
                </span>
                {selected.nivel   && <span>Nivel: <strong>{selected.nivel}</strong></span>}
                {selected.region  && <span>Región: <strong>{selected.region}</strong></span>}
                {selected.ai_relevance != null && <span style={{ color: '#1F4E8C', fontWeight: 700 }}>R{selected.ai_relevance}</span>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: '#6e6e73', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              cerrar
            </button>
          </div>
          {(selected.sectores_afectados?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.sectores_afectados!.map(s => (
                <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom: top items + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div>
          <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>Normas con mayor relevancia</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topItems.length === 0
              ? <p style={{ fontSize: 12, color: '#6e6e73', margin: '8px 0' }}>Sin normas en el periodo seleccionado.</p>
              : topItems.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                }} onClick={() => setSelected(it)}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    color: it.nivel === 'nacional' ? '#c42c2c' : it.nivel === 'regional' ? '#b25000' : '#1F4E8C',
                    background: it.nivel === 'nacional' ? 'rgba(196,44,44,0.12)' : it.nivel === 'regional' ? 'rgba(178,80,0,0.12)' : 'rgba(31,78,140,0.12)',
                  }}>{it.nivel ?? '—'}</span>
                  <span style={{ flex: 1, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.titulo}</span>
                  {it.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>{it.region}</span>}
                  <span style={{ color: '#1F4E8C', fontWeight: 700, fontSize: 11.5 }}>R{it.ai_relevance ?? 0}</span>
                </div>
              ))}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>Por impacto</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[{ label: 'Alto', count: breakdown.high, color: '#c42c2c' }, { label: 'Medio', count: breakdown.medium, color: '#b25000' }, { label: 'Bajo', count: breakdown.low, color: '#1F4E8C' }].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color }} />
                <span style={{ fontSize: 12, color: '#1d1d1f', flex: 1 }}>{b.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{b.count}</span>
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: '#6e6e73', textAlign: 'center', margin: '4px 0 0' }}>
              Total: <strong style={{ color: '#1d1d1f' }}>{legislation.length}</strong> normas
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4.2: Verify TypeScript**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep "LegislationMap" | head -20
```

Expected: no errors from LegislationMap.tsx.

- [ ] **Step 4.3: Commit**

```bash
git add apps/visual-oscar/components/LegislationMap.tsx
git commit -m "feat(maps): rewrite LegislationMap with real GeoJSON + d3-geo projections"
```

---

## Task 5: Rewrite RegionalNewsMaps.tsx

**Files:**
- Rewrite: `apps/visual-oscar/components/RegionalNewsMaps.tsx`

**What stays:** `view` toggle state, `selected` state, `useApi` call, `CCAADetail`/`CountryDetail`/`Stat` sub-components (unchanged), the layout grid, header.

**What changes:**
- `SpainCCAAMap`: replace CCAA_GRID flex layout with real SVG GeoJSON choropleth. Fetch spain-ccaa.geojson. Fill = `positiveColorScale(n_articles)`. Hover widens stroke. Click calls `onSelect`. Canarias inset. MapLegend below.
- `EuropeMap`: keep bubble approach but replace linear `project()` with `geoMercator().fitExtent([[20,20],[500,360]], europeBbox)`. All 22 country positions recalculated. Graticule kept.

**CCAA name lookup** (API name → GeoJSON `name` property). Run Step 1.3 first to verify exact GeoJSON names. The table below uses the most common codeforgermany values — adjust if Step 1.3 shows different names:

```
API name          →  GeoJSON name
"Madrid"          →  "Comunidad de Madrid"
"Cataluña"        →  "Cataluña"
"Andalucía"       →  "Andalucía"
"Galicia"         →  "Galicia"
"Castilla y León" →  "Castilla y León"
"Castilla-La Mancha" → "Castilla-La Mancha"
"C. Valenciana"   →  "Comunitat Valenciana"
"País Vasco"      →  "País Vasco"
"Aragón"          →  "Aragón"
"Asturias"        →  "Principado de Asturias"
"Cantabria"       →  "Cantabria"
"La Rioja"        →  "La Rioja"
"Navarra"         →  "Comunidad Foral de Navarra"
"Extremadura"     →  "Extremadura"
"Murcia"          →  "Región de Murcia"
"Baleares"        →  "Illes Balears"
"Canarias"        →  "Islas Canarias"
```

- [ ] **Step 5.1: Replace the full file**

Replace `apps/visual-oscar/components/RegionalNewsMaps.tsx` with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import MapSkeleton from '@/components/maps/MapSkeleton'
import MapLegend from '@/components/maps/MapLegend'
import { positiveColorScale } from '@/lib/map-colors'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

// ─── API data types ────────────────────────────────────────────────────────────
interface CCAARegion  { n: number; pos: number; neg: number; neu: number; sent_score: number; top_topics: string[] }
interface EuropeCountry { n: number; pos: number; neg: number; spain_imp: number; sample_titles: string[] }

// API name → GeoJSON name lookup (adjust if Step 1.3 shows different names)
const API_TO_GEO: Record<string, string> = {
  'Madrid':               'Comunidad de Madrid',
  'Cataluña':             'Cataluña',
  'Andalucía':            'Andalucía',
  'Galicia':              'Galicia',
  'Castilla y León':      'Castilla y León',
  'Castilla-La Mancha':   'Castilla-La Mancha',
  'C. Valenciana':        'Comunitat Valenciana',
  'País Vasco':           'País Vasco',
  'Aragón':               'Aragón',
  'Asturias':             'Principado de Asturias',
  'Cantabria':            'Cantabria',
  'La Rioja':             'La Rioja',
  'Navarra':              'Comunidad Foral de Navarra',
  'Extremadura':          'Extremadura',
  'Murcia':               'Región de Murcia',
  'Baleares':             'Illes Balears',
  'Canarias':             'Islas Canarias',
}
// Reverse: GeoJSON name → API name
const GEO_TO_API: Record<string, string> = Object.fromEntries(Object.entries(API_TO_GEO).map(([a, g]) => [g, a]))

const EUROPE_COUNTRIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Spain',          lat: 40.4, lon:  -3.7 },
  { name: 'France',         lat: 46.6, lon:   2.4 },
  { name: 'United Kingdom', lat: 51.5, lon:  -0.1 },
  { name: 'Germany',        lat: 51.2, lon:  10.5 },
  { name: 'Italy',          lat: 41.9, lon:  12.5 },
  { name: 'Portugal',       lat: 38.7, lon:  -9.1 },
  { name: 'Belgium',        lat: 50.8, lon:   4.4 },
  { name: 'Netherlands',    lat: 52.4, lon:   4.9 },
  { name: 'Greece',         lat: 38.0, lon:  23.7 },
  { name: 'Poland',         lat: 52.2, lon:  21.0 },
  { name: 'Switzerland',    lat: 46.8, lon:   8.2 },
  { name: 'Austria',        lat: 48.2, lon:  16.4 },
  { name: 'Sweden',         lat: 59.3, lon:  18.1 },
  { name: 'Norway',         lat: 59.9, lon:  10.7 },
  { name: 'Denmark',        lat: 55.7, lon:  12.6 },
  { name: 'Ireland',        lat: 53.3, lon:  -6.2 },
  { name: 'Czech Republic', lat: 50.1, lon:  14.4 },
  { name: 'Hungary',        lat: 47.5, lon:  19.0 },
  { name: 'Romania',        lat: 44.4, lon:  26.1 },
  { name: 'Ukraine',        lat: 50.4, lon:  30.5 },
  { name: 'Russia',         lat: 55.8, lon:  37.6 },
  { name: 'Turkey',         lat: 41.0, lon:  28.9 },
]

// ─── Main export ───────────────────────────────────────────────────────────────
export default function RegionalNewsMaps() {
  const [view, setView] = useState<'spain' | 'europe'>('spain')
  const [selected, setSelected] = useState<string | null>(null)

  const { data, source, updatedAt } = useApi<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(
    '/api/narratives/by-region?hours_back=72',
    { refreshInterval: 180_000 },
  )
  const spain  = data?.spain_ccaa ?? {}
  const europe = data?.europe ?? {}

  return (
    <section style={{ marginTop: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
            Geografía de los debates
          </h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {view === 'spain'
              ? <><CountUp value={Object.values(spain).reduce((s, v) => s + v.n, 0)} /> noticias regionales</>
              : <><CountUp value={Object.values(europe).reduce((s, v) => s + v.n, 0)} /> noticias europeas</>}
          </p>
        </div>
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {(['spain', 'europe'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setSelected(null) }} style={{
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? '#1d1d1f' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '5px 14px',
              fontSize: 11.5, fontWeight: view === v ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 160ms',
            }}>
              {v === 'spain' ? 'España (CCAA)' : 'Europa'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18 }}>
        {/* Map */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {view === 'spain'
            ? <SpainCCAAMap spain={spain} selected={selected} onSelect={setSelected} />
            : <EuropeMap europe={europe} selected={selected} onSelect={setSelected} />}
        </div>

        {/* Detail panel */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {selected
            ? view === 'spain'
              ? <CCAADetail name={selected} data={spain[selected]} />
              : <CountryDetail name={selected} data={europe[selected]} />
            : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                  {view === 'spain' ? 'Top CCAA por volumen' : 'Top países por volumen'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(view === 'spain'
                    ? Object.entries(spain).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                    : Object.entries(europe).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                  ).map(([name, info]) => {
                    const total = info.pos + info.neg + ((info as CCAARegion).neu ?? 0)
                    const polarity = total > 0 ? (info.pos - info.neg) / total : 0
                    return (
                      <button key={name} onClick={() => setSelected(name)} style={{
                        display: 'grid', gridTemplateColumns: '1fr 50px 70px', gap: 8, alignItems: 'center',
                        padding: '7px 10px', background: '#FAFAFB', border: '1px solid #ECECEF',
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-2)' }}><CountUp value={info.n} /></span>
                        <span style={{ fontSize: 10, color: polarity > 0.1 ? '#16A34A' : polarity < -0.1 ? '#DC2626' : 'var(--ink-4)', fontWeight: 600, textAlign: 'right' }}>
                          {polarity > 0 ? '+' : ''}{polarity.toFixed(2)} sent
                        </span>
                      </button>
                    )
                  })}
                  {(view === 'spain' ? Object.keys(spain) : Object.keys(europe)).length === 0 && (
                    <Skeleton width="100%" height={200} radius={8} />
                  )}
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 'auto', paddingTop: 12, fontStyle: 'italic' }}>
                  Click en una región del mapa para ver el detalle.
                </p>
              </div>
            )}
        </div>
      </div>
    </section>
  )
}

// ── SpainCCAAMap — real GeoJSON choropleth ─────────────────────────────────────
function SpainCCAAMap({ spain, selected, onSelect }: { spain: Record<string, CCAARegion>; selected: string | null; onSelect: (n: string) => void }) {
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [hoverName, setHoverName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  const maxN = Math.max(1, ...Object.values(spain).map(v => v.n))
  const colorFn = positiveColorScale([0, maxN])

  const SVG_W = 500, SVG_H = 320, INS_W = 110, INS_H = 62

  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([SVG_W, SVG_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  function getApiName(geoName: string): string {
    return GEO_TO_API[geoName] ?? geoName
  }

  if (geoError) return <div style={{ color: '#c42c2c', fontSize: 12 }}>Error: {geoError}</div>
  if (!geoData)  return <MapSkeleton height={340} />

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de España · click para detalle
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="Mapa CCAA España — volumen de noticias"
        >
          {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
            const d = mainPath(f as unknown as GeoPermissibleObjects)
            if (!d) return null
            const geoName  = String(f.properties?.name ?? '')
            const apiName  = getApiName(geoName)
            const region   = spain[apiName]
            const n        = region?.n ?? 0
            const isSelected = selected === apiName
            const isHover    = hoverName === geoName
            return (
              <path
                key={i}
                d={d}
                fill={n > 0 ? colorFn(n) : '#e2e8f0'}
                stroke={isSelected ? '#1F4E8C' : isHover ? '#94a3b8' : '#cbd5e1'}
                strokeWidth={isSelected ? 2 : isHover ? 1.5 : 0.8}
                style={{ cursor: 'pointer', transition: 'stroke 120ms' }}
                tabIndex={0}
                role="button"
                aria-label={`${apiName}: ${n} artículos`}
                onMouseEnter={() => setHoverName(geoName)}
                onMouseLeave={() => setHoverName(null)}
                onClick={() => onSelect(apiName)}
                onKeyDown={e => e.key === 'Enter' && onSelect(apiName)}
              >
                <title>{`${apiName} · ${n} artículos · sentimiento ${region?.sent_score?.toFixed(2) ?? '—'}`}</title>
              </path>
            )
          })}
        </svg>

        {/* Canarias inset */}
        {canariasFC && canPath && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            background: 'rgba(255,255,255,0.92)', borderRadius: 6, border: '1px solid #cbd5e1', padding: 2,
          }}>
            <div style={{ fontSize: 8, color: '#6e6e73', textAlign: 'center', fontWeight: 600, marginBottom: 1 }}>Canarias</div>
            <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
              {canariasFC.features.map((f, i) => {
                const d = canPath(f as unknown as GeoPermissibleObjects)
                if (!d) return null
                const geoName = String(f.properties?.name ?? '')
                const apiName = getApiName(geoName)
                const n = spain[apiName]?.n ?? 0
                return (
                  <path
                    key={i} d={d}
                    fill={n > 0 ? colorFn(n) : '#e2e8f0'}
                    stroke={selected === apiName ? '#1F4E8C' : '#cbd5e1'}
                    strokeWidth={selected === apiName ? 1.5 : 0.6}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(apiName)}
                  >
                    <title>{`${apiName} · ${n} artículos`}</title>
                  </path>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      <MapLegend scale={colorFn} min={0} max={maxN} unit="arts." />
    </div>
  )
}

// ── EuropeMap — bubbles with d3 Mercator projection ────────────────────────────
function EuropeMap({ europe, selected, onSelect }: { europe: Record<string, EuropeCountry>; selected: string | null; onSelect: (n: string) => void }) {
  const W = 500, H = 360

  // Europe bounding box as a GeoJSON Polygon for fitExtent reference
  const europeBbox = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[-25, 34], [45, 34], [45, 72], [-25, 72], [-25, 34]]],
    },
    properties: {},
  }
  const proj = geoMercator().fitExtent([[20, 20], [W - 20, H - 20]], europeBbox as unknown as ExtendedFeatureCollection)
  const max  = Math.max(1, ...Object.values(europe).map(v => v.n))

  function px(lat: number, lon: number): [number, number] {
    return proj([lon, lat]) ?? [0, 0]
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de Europa · click para detalle
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#FAFAFB', borderRadius: 12 }} role="img" aria-label="Mapa Europa">
        {/* Graticule */}
        {[40, 50, 60].map(lat => { const [,y] = px(lat, 0); return <line key={lat} x1={0} x2={W} y1={y} y2={y} stroke="#ECECEF" strokeWidth={0.5} /> })}
        {[-10, 0, 10, 20, 30, 40].map(lon => { const [x] = px(0, lon); return <line key={lon} y1={0} y2={H} x1={x} x2={x} stroke="#ECECEF" strokeWidth={0.5} /> })}

        {/* Spain reference ring */}
        {(() => { const [x,y] = px(40.4, -3.7); return <circle cx={x} cy={y} r={28} fill="#1F4E8C0F" stroke="#1F4E8C" strokeWidth={1} strokeDasharray="3 3" /> })()}

        {/* Country bubbles */}
        {EUROPE_COUNTRIES.map(c => {
          const data = europe[c.name]
          const [x, y] = px(c.lat, c.lon)
          if (!data || data.n === 0) return <circle key={c.name} cx={x} cy={y} r={2.5} fill="#D1D5DB" opacity={0.4} />
          const r = 5 + Math.sqrt(data.n / max) * 22
          const polarity = data.pos - data.neg
          const fill = polarity > 0 ? '#16A34A' : polarity < 0 ? '#DC2626' : '#6E6E73'
          const isSel = selected === c.name
          return (
            <g key={c.name} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.name)}>
              <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.55} stroke={isSel ? '#1d1d1f' : fill} strokeWidth={isSel ? 2 : 0.8} />
              {data.spain_imp > 0 && <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#DC2626" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />}
              <title>{`${c.name} · ${data.n} arts · pos ${data.pos} / neg ${data.neg}`}</title>
              {r > 10 && <text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'var(--font-display)', fill: '#fff', fontWeight: 600, pointerEvents: 'none' }}>{data.n}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Detail panels (unchanged logic from original) ──────────────────────────────
function CCAADetail({ name, data }: { name: string; data?: CCAARegion }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  const total = data.pos + data.neg + data.neu || 1
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Comunidad autónoma</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>{name}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        <Stat label="Noticias 72h" value={data.n} accent="#1F4E8C" />
        <Stat label="Polaridad" value={data.sent_score} accent={data.sent_score > 0.1 ? '#16A34A' : data.sent_score < -0.1 ? '#DC2626' : '#6E6E73'} decimals={2} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Distribución sentimiento</div>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
          <div style={{ width: `${(data.pos / total) * 100}%`, background: '#16A34A' }} />
          <div style={{ width: `${(data.neu / total) * 100}%`, background: '#9CA3AF' }} />
          <div style={{ width: `${(data.neg / total) * 100}%`, background: '#DC2626' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>{data.pos}+</span>
          <span>{data.neu}=</span>
          <span style={{ color: '#DC2626', fontWeight: 600 }}>{data.neg}−</span>
        </div>
      </div>
      {data.top_topics.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Debates dominantes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {data.top_topics.map(t => <span key={t} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#1F4E8C', fontWeight: 500, border: '1px solid #DBEAFE' }}>{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

function CountryDetail({ name, data }: { name: string; data?: EuropeCountry }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>País</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>{name}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <Stat label="Artículos"   value={data.n}   accent="#1F4E8C" />
        <Stat label="Sentiment +" value={data.pos}  accent="#16A34A" />
        <Stat label="Sentiment −" value={data.neg}  accent="#DC2626" />
      </div>
      {data.spain_imp > 0 && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Impacto España</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginTop: 2 }}>
            <CountUp value={data.spain_imp} /> noticias con repercusión alta/crítica
          </div>
        </div>
      )}
      {data.sample_titles.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Titulares relevantes</div>
          {data.sample_titles.slice(0, 4).map((t, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-2)', padding: '6px 0', borderBottom: '1px solid var(--hairline)', lineHeight: 1.4 }}>{t}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, decimals = 0 }: { label: string; value: number; accent: string; decimals?: number }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
      <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        <CountUp value={value} decimals={decimals} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Verify TypeScript**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep "RegionalNewsMaps" | head -20
```

Expected: no errors from RegionalNewsMaps.tsx.

- [ ] **Step 5.3: Commit**

```bash
git add apps/visual-oscar/components/RegionalNewsMaps.tsx
git commit -m "feat(maps): rewrite RegionalNewsMaps with GeoJSON choropleth + d3 Mercator"
```

---

## Task 6: Rewrite NarrativeMap.tsx

**Files:**
- Rewrite: `apps/visual-oscar/components/media/NarrativeMap.tsx`

**What stays:** component interface (`paises: PaisItem[], ccaas: CcaaItem[]`), `ViewMode` type, `NARRATIVA_COLORS`, `NARRATIVA_LABELS`, `Tooltip` sub-component, `view` state, toggle buttons.

**What changes:**
- World mode: fetch `world-countries.geojson`, render filled country paths with `geoNaturalEarth1`, overlay proportional circles on centroids.
- Europa mode: same world GeoJSON but filtered to European features, `geoConicConformal` projection.
- España mode: fetch `spain-ccaa.geojson`, render CCAA fills colored by `categoricalColor(narrativa_dominante)`, proportional circles for `n_articulos`, Canarias inset.
- Remove: `CCAA_POSITIONS`, `CCAA_ABBR`, `buildGraticule` linear function, `SpainMap` CSS-div implementation, linear `project()`.

**World feature filtering for Europe mode:** filter world features where the feature centroid `[lon, lat]` satisfies `lon ∈ [-25, 45]` AND `lat ∈ [34, 72]`. Use `geoCentroid(feature)` from d3-geo.

**CCAA name lookup (NarrativeMap):** API returns `ccaa.nombre_ccaa` values. Map to GeoJSON names (same table as Task 5 — kept in-component per spec):
```
'Andalucía'        → 'Andalucía'
'Aragón'           → 'Aragón'
'Asturias'         → 'Principado de Asturias'
'Baleares'         → 'Illes Balears'
'Canarias'         → 'Islas Canarias'
'Cantabria'        → 'Cantabria'
'Castilla-La Mancha' → 'Castilla-La Mancha'
'Castilla y León'  → 'Castilla y León'
'Cataluña'         → 'Cataluña'
'Extremadura'      → 'Extremadura'
'Galicia'          → 'Galicia'
'La Rioja'         → 'La Rioja'
'Madrid'           → 'Comunidad de Madrid'
'Murcia'           → 'Región de Murcia'
'Navarra'          → 'Comunidad Foral de Navarra'
'País Vasco'       → 'País Vasco'
'Comunitat Valenciana' → 'Comunitat Valenciana'
```

- [ ] **Step 6.1: Replace the full file**

Replace `apps/visual-oscar/components/media/NarrativeMap.tsx` with:

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { geoConicConformal, geoMercator, geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import MapSkeleton from '@/components/maps/MapSkeleton'
import MapLegend from '@/components/maps/MapLegend'
import { positiveColorScale, riskColorScale, categoricalColor } from '@/lib/map-colors'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown; id?: string | number }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

// ─── API types (props — unchanged) ────────────────────────────────────────────
interface PaisItem { country_code: string; country_name: string; n_articulos: number; sentiment_avg: number; lat: number; lon: number }
interface CcaaItem { ccaa_id: number; nombre_ccaa: string; narrativa_dominante: string; n_articulos: number; ideologia_media: number }
interface NarrativeMapProps { paises: PaisItem[]; ccaas: CcaaItem[] }
type ViewMode = 'mundo' | 'europa' | 'espana'

// ─── Constants ─────────────────────────────────────────────────────────────────
const W = 900, H = 460
const INS_W = 198, INS_H = 110  // Canarias inset (22% of W ≈ 198)

const NARRATIVA_LABELS: Record<string, string> = {
  politica: 'Política', economia: 'Economía', justicia: 'Justicia',
  vivienda: 'Vivienda', sanidad: 'Sanidad', inmigracion: 'Inmigración',
  energia: 'Energía', educacion: 'Educación', generalista: 'Generalista',
}

// API nombre_ccaa → GeoJSON name property
const CCAA_TO_GEO: Record<string, string> = {
  'Andalucía':            'Andalucía',
  'Aragón':               'Aragón',
  'Asturias':             'Principado de Asturias',
  'Baleares':             'Illes Balears',
  'Canarias':             'Islas Canarias',
  'Cantabria':            'Cantabria',
  'Castilla-La Mancha':   'Castilla-La Mancha',
  'Castilla y León':      'Castilla y León',
  'Cataluña':             'Cataluña',
  'Extremadura':          'Extremadura',
  'Galicia':              'Galicia',
  'La Rioja':             'La Rioja',
  'Madrid':               'Comunidad de Madrid',
  'Murcia':               'Región de Murcia',
  'Navarra':              'Comunidad Foral de Navarra',
  'País Vasco':           'País Vasco',
  'Comunitat Valenciana': 'Comunitat Valenciana',
}
const GEO_TO_CCAA: Record<string, string> = Object.fromEntries(Object.entries(CCAA_TO_GEO).map(([a, g]) => [g, a]))

// ─── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipState { x: number; y: number; lines: string[] }

function Tooltip({ tip }: { tip: TooltipState }) {
  return (
    <div style={{
      position: 'absolute', left: tip.x + 10, top: tip.y - 10, zIndex: 200, pointerEvents: 'none',
      background: '#0d1f3a', color: '#fff', borderRadius: 10, padding: '8px 12px',
      fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'nowrap',
      boxShadow: '0 4px 18px rgba(0,0,0,0.45)', border: '1px solid rgba(64,96,160,0.4)',
    }}>
      {tip.lines.map((l, i) => <div key={i} style={i === 0 ? { fontWeight: 700, marginBottom: 2 } : { opacity: 0.82 }}>{l}</div>)}
    </div>
  )
}

// ─── World / Europa GeoJSON map ────────────────────────────────────────────────
interface GeoMapProps {
  paises: PaisItem[]
  worldData: GeoFC
  mode: 'mundo' | 'europa'
}

function GeoMap({ paises, worldData, mode }: GeoMapProps) {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxArt = paises.reduce((m, p) => Math.max(m, p.n_articulos), 0)
  const colorFn = positiveColorScale([0, maxArt])

  // For Europa mode: filter world features by centroid
  const features = mode === 'mundo'
    ? worldData.features
    : worldData.features.filter(f => {
        const [lon, lat] = geoCentroid(f as unknown as GeoPermissibleObjects)
        return lon >= -25 && lon <= 45 && lat >= 34 && lat <= 72
      })

  const fc: GeoFC = { type: 'FeatureCollection', features }

  const projection = mode === 'mundo'
    ? geoNaturalEarth1().fitSize([W, H], fc as unknown as ExtendedFeatureCollection)
    : geoConicConformal().parallels([43, 62]).rotate([-15, 0]).fitSize([W, H], fc as unknown as ExtendedFeatureCollection)
  const pathGen = geoPath(projection)

  // Build lookup: country_code → PaisItem
  const byCode: Record<string, PaisItem> = {}
  const byName: Record<string, PaisItem> = {}
  for (const p of paises) {
    byCode[p.country_code.toUpperCase()] = p
    byName[p.country_name] = p
  }

  function getPais(f: GeoFeature): PaisItem | undefined {
    const id   = String(f.id ?? '').toUpperCase()
    const name = String(f.properties?.name ?? '')
    return byCode[id] ?? byName[name]
  }

  function bubbleR(n: number): number {
    return Math.min(Math.max((n / (maxArt || 1)) * 28 + 5, 5), 32)
  }

  function sentColor(s: number): string {
    if (s > 0.2) return '#00c47c'
    if (s > 0.05) return '#4dba87'
    if (s > -0.05) return '#6c7480'
    if (s > -0.2) return '#e07840'
    return '#c42c2c'
  }

  function handleEnter(p: PaisItem, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines: [p.country_name, `${p.n_articulos.toLocaleString('es-ES')} artículos`, `Sentimiento: ${p.sentiment_avg.toFixed(2)}`] })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: '#0b1422', borderRadius: 12 }} role="img" aria-label={`Mapa narrativo — ${mode}`}>
        {/* Country fills */}
        {features.map((f, i) => {
          const d = pathGen(f as unknown as GeoPermissibleObjects)
          if (!d) return null
          const p = getPais(f)
          return (
            <path
              key={i} d={d}
              fill={p && p.n_articulos > 0 ? colorFn(p.n_articulos) : '#1e293b'}
              stroke="rgba(255,255,255,0.08)" strokeWidth={0.4}
              style={p ? { cursor: 'pointer' } : undefined}
              onMouseEnter={p ? e => handleEnter(p, e) : undefined}
              onMouseLeave={p ? () => setTip(null) : undefined}
              aria-label={p ? `${p.country_name}: ${p.n_articulos} artículos` : undefined}
            />
          )
        })}

        {/* Proportional sentiment circles on centroids */}
        {paises.map(p => {
          const pos = projection([p.lon, p.lat])
          if (!pos) return null
          const [x, y] = pos
          const r = bubbleR(p.n_articulos)
          return (
            <g key={p.country_code} style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleEnter(p, e)}
              onMouseLeave={() => setTip(null)}>
              <circle cx={x} cy={y} r={r} fill={sentColor(p.sentiment_avg)} fillOpacity={0.75} stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} />
              {r >= 12 && (
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {p.country_code.toUpperCase()}
                </text>
              )}
            </g>
          )
        })}

        {paises.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.35)" fontSize={14} fontFamily="-apple-system, system-ui, sans-serif">
            Sin datos · Conectando con backend…
          </text>
        )}
      </svg>
      {tip && <Tooltip tip={tip} />}
      <MapLegend scale={colorFn} min={0} max={maxArt} unit="arts." />
    </div>
  )
}

// ─── España CCAA map ───────────────────────────────────────────────────────────
interface SpainMapProps { ccaas: CcaaItem[] }

function SpainMap({ ccaas }: SpainMapProps) {
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [tip, setTip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  const maxArt = ccaas.reduce((m, c) => Math.max(m, c.n_articulos), 0)

  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([W, H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  // Build lookup: geoName → CcaaItem
  const byCcaa: Record<string, CcaaItem> = {}
  for (const c of ccaas) {
    const geoName = CCAA_TO_GEO[c.nombre_ccaa] ?? c.nombre_ccaa
    byCcaa[geoName] = c
  }

  function bubbleR(n: number): number {
    return Math.min(Math.max((n / (maxArt || 1)) * 28 + 6, 6), 34)
  }

  function handleEnter(c: CcaaItem, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines: [c.nombre_ccaa, NARRATIVA_LABELS[c.narrativa_dominante] ?? c.narrativa_dominante, `${c.n_articulos.toLocaleString('es-ES')} artículos`] })
  }

  const usedNarrativas = Array.from(new Set(ccaas.map(c => c.narrativa_dominante))).filter(n => n in NARRATIVA_LABELS)

  if (geoError) return <div style={{ color: '#c42c2c', fontSize: 12, padding: 12 }}>Error cargando mapa España: {geoError}</div>
  if (!geoData)  return <MapSkeleton height={H} />

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: '#0b1422', borderRadius: 12 }} role="img" aria-label="Mapa España CCAA — narrativas dominantes">
        {/* CCAA fills colored by narrativa_dominante */}
        {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
          const d = mainPath(f as unknown as GeoPermissibleObjects)
          if (!d) return null
          const geoName = String(f.properties?.name ?? '')
          const ccaa = byCcaa[geoName]
          const fill = ccaa ? categoricalColor(ccaa.narrativa_dominante) : '#1e293b'
          return (
            <path
              key={i} d={d}
              fill={fill} fillOpacity={0.75}
              stroke="rgba(255,255,255,0.1)" strokeWidth={0.6}
              style={ccaa ? { cursor: 'pointer' } : undefined}
              onMouseEnter={ccaa ? e => handleEnter(ccaa, e) : undefined}
              onMouseLeave={ccaa ? () => setTip(null) : undefined}
              aria-label={ccaa ? `${ccaa.nombre_ccaa}: ${NARRATIVA_LABELS[ccaa.narrativa_dominante] ?? ccaa.narrativa_dominante}` : undefined}
            />
          )
        })}

        {/* Proportional circles on centroids */}
        {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
          const geoName = String(f.properties?.name ?? '')
          const ccaa = byCcaa[geoName]
          if (!ccaa || ccaa.n_articulos === 0 || !mainProj) return null
          const centroid = geoCentroid(f as unknown as GeoPermissibleObjects)
          const pos = mainProj(centroid)
          if (!pos) return null
          const [x, y] = pos
          const r = bubbleR(ccaa.n_articulos)
          return (
            <circle key={`dot-${i}`} cx={x} cy={y} r={r}
              fill={categoricalColor(ccaa.narrativa_dominante)} fillOpacity={0.9}
              stroke="rgba(255,255,255,0.4)" strokeWidth={0.8}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleEnter(ccaa, e)}
              onMouseLeave={() => setTip(null)}
            />
          )
        })}
      </svg>

      {/* Canarias inset */}
      {canariasFC && canPath && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          background: 'rgba(11,20,34,0.92)', borderRadius: 8, border: '1px solid rgba(64,96,160,0.3)', padding: 4,
        }}>
          <div style={{ fontSize: 8, color: '#8899bb', textAlign: 'center', fontWeight: 600, marginBottom: 2 }}>Canarias</div>
          <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
            {canariasFC.features.map((f, i) => {
              const d = canPath(f as unknown as GeoPermissibleObjects)
              if (!d) return null
              const geoName = String(f.properties?.name ?? '')
              const ccaa = byCcaa[geoName]
              return (
                <path key={i} d={d}
                  fill={ccaa ? categoricalColor(ccaa.narrativa_dominante) : '#1e293b'}
                  fillOpacity={0.75}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={0.6}
                >
                  {ccaa && <title>{ccaa.nombre_ccaa}: {ccaa.n_articulos} artículos</title>}
                </path>
              )
            })}
          </svg>
        </div>
      )}

      {/* Narrativa legend */}
      {usedNarrativas.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center',
          background: 'rgba(11,20,34,0.82)', borderRadius: 10, padding: '6px 14px',
          maxWidth: '90%', zIndex: 10, border: '1px solid rgba(64,96,160,0.3)',
        }}>
          {usedNarrativas.map(n => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#cdd5e0', fontSize: 10.5, fontWeight: 500 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: categoricalColor(n), flexShrink: 0 }} />
              {NARRATIVA_LABELS[n] ?? n}
            </span>
          ))}
        </div>
      )}

      {tip && <Tooltip tip={tip} />}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NarrativeMap({ paises, ccaas }: NarrativeMapProps) {
  const [view, setView] = useState<ViewMode>('mundo')

  // Fetch world GeoJSON (shared by mundo + europa modes)
  const [worldData, setWorldData] = useState<GeoFC | null>(null)
  const [worldError, setWorldError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/world-countries.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setWorldData)
      .catch(e => setWorldError((e as Error).message))
  }, [])

  const views: { id: ViewMode; label: string }[] = [
    { id: 'mundo',  label: 'Mundo' },
    { id: 'europa', label: 'Europa' },
    { id: 'espana', label: 'España CCAA' },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
      {/* Toggle */}
      <div style={{
        display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.07)',
        borderRadius: 24, padding: 4, marginBottom: 14, border: '1px solid rgba(64,96,160,0.25)',
      }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? '#2a4a9c' : 'transparent',
            color: view === v.id ? '#e8f0ff' : '#8899bb',
            border: 'none', borderRadius: 20, padding: '6px 16px',
            fontSize: 12.5, fontWeight: view === v.id ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms', whiteSpace: 'nowrap',
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Map area */}
      {(view === 'mundo' || view === 'europa') && (
        worldError
          ? <div style={{ color: '#c42c2c', fontSize: 12, padding: 12 }}>Error cargando mapa: {worldError}</div>
          : !worldData
            ? <MapSkeleton height={H} />
            : <GeoMap paises={paises} worldData={worldData} mode={view} />
      )}
      {view === 'espana' && <SpainMap ccaas={ccaas} />}
    </div>
  )
}
```

- [ ] **Step 6.2: Verify TypeScript**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep "NarrativeMap" | head -20
```

Expected: no errors from NarrativeMap.tsx.

- [ ] **Step 6.3: Full typecheck**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only pre-existing errors not in files we touched).

- [ ] **Step 6.4: Commit**

```bash
git add apps/visual-oscar/components/media/NarrativeMap.tsx
git commit -m "feat(maps): rewrite NarrativeMap — world/europe/spain with real GeoJSON + d3-geo"
```

---

## Task 7: Final verification

- [ ] **Step 7.1: Dev server smoke test**

```bash
cd apps/visual-oscar && npm run dev &
sleep 8
curl -s http://localhost:3001 | grep -c "html"
```

Expected: server starts without crash, HTML returned. Visit pages that contain the three components and confirm maps render (no blank boxes).

- [ ] **Step 7.2: TypeScript clean**

```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 7.3: Lint**

```bash
cd apps/visual-oscar && npx next lint 2>&1 | tail -5
```

Expected: no errors (warnings are OK).

- [ ] **Step 7.4: Final commit**

```bash
git add -A
git commit -m "feat(maps): final cleanup — all three maps rewritten with GeoJSON + d3-geo"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ LegislationMap: GeoJSON fetch, MapSkeleton, d3 projection, Canarias inset, Portugal removed, dots via projection, aria-labels
- ✅ RegionalNewsMaps SpainCCAAMap: GeoJSON choropleth, positiveColorScale, hover stroke, onSelect callback, Canarias inset, MapLegend, aria-labels
- ✅ RegionalNewsMaps EuropeMap: geoMercator fitExtent with europeBbox, all 22 country positions, graticule kept
- ✅ NarrativeMap world: world-countries.geojson, geoNaturalEarth1, country fills + circles, MapLegend
- ✅ NarrativeMap europa: same GeoJSON filtered to European features, geoConicConformal
- ✅ NarrativeMap españa: spain-ccaa.geojson, categoricalColor fills, circles on centroids, Canarias inset, narrativa legend
- ✅ Shared files: map-colors.ts (positiveColorScale, riskColorScale, categoricalColor), MapSkeleton, MapLegend
- ✅ Error handling: inline error message in each component on GeoJSON fetch failure
- ✅ MapaProvincias untouched

**Type consistency:**
- `ExtendedFeatureCollection` and `GeoPermissibleObjects` from d3-geo used consistently in Tasks 4, 5, 6
- `positiveColorScale`, `riskColorScale`, `categoricalColor` from `@/lib/map-colors` used in Tasks 5, 6
- `MapSkeleton` and `MapLegend` imported from `@/components/maps/` in Tasks 4, 5, 6

**Note on CCAA name lookup tables:** The tables in Tasks 4–6 are based on known codeforgermany GeoJSON names. If Step 1.3 reveals different names, update the `API_TO_GEO` / `CCAA_TO_GEO` constants before writing the component files. All three components keep their lookup tables in-component (not shared) per spec.
