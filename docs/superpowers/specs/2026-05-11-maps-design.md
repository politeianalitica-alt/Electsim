# Maps Improvement — Design Spec

## Goal

Replace all hand-rolled SVG maps in `apps/visual-oscar` with real GeoJSON + d3-geo components that follow the canonical map patterns defined in the project CLAUDE.md.

## Scope

**Components rewritten (3):**
- `components/LegislationMap.tsx` — Spain outline + legislative impact dots
- `components/RegionalNewsMaps.tsx` — Spain CCAA choropleth + Europe bubble map
- `components/media/NarrativeMap.tsx` — World / Europe / Spain three-mode map

**Components left unchanged:**
- `components/MapaProvincias.tsx` — intentional tile-grid cartogram for elections
- `components/MunicipiosHistorico.tsx` — not a map
- `components/media/SentimentHeatmap.tsx` — not a map

## Architecture

### New dependencies
```json
"d3-geo": "^3.1.0",
"d3-scale": "^4.0.2"
```
Both ship their own TypeScript declarations. No `@types/*` needed.

### New GeoJSON assets (committed to repo)
```
apps/visual-oscar/public/geodata/spain-ccaa.geojson       ~130 KB
apps/visual-oscar/public/geodata/world-countries.geojson  ~130 KB
```

- `spain-ccaa.geojson` — download from:
  `https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-communities.geojson`
  Feature property `codauto` = ISO 3166-2 code (e.g. `"ES-MD"`).
- `world-countries.geojson` — download from:
  `https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson`
  Feature property `id` = three-letter ISO code. Spain = `"ESP"`.

### New shared files
```
apps/visual-oscar/lib/map-colors.ts
apps/visual-oscar/components/maps/MapLegend.tsx
apps/visual-oscar/components/maps/MapSkeleton.tsx
```

**`lib/map-colors.ts`** — three exported scale factories:
- `positiveColorScale(domain)` — dark-navy → sky-blue, for article counts
- `riskColorScale(domain)` — green → amber → red, for risk/negativity
- `categoricalColor(category)` — fixed palette for narrative categories

**`components/maps/MapLegend.tsx`** — horizontal gradient strip with min/max labels and a unit string. Accepts any `(value: number) => string` scale.

**`components/maps/MapSkeleton.tsx`** — grey pulsing div matching the map's height. Shown while GeoJSON fetch resolves.

### Projection standard for Spain
All Spain maps use identical projection setup:
```ts
geoConicConformal()
  .parallels([36, 44])
  .rotate([4, 0])
  .fitSize([width, height], geojsonData)
```
Canarias always rendered as a separate inset SVG, absolute-positioned at bottom-left, `width: 22%`.

### CCAA name → codauto lookup
A 17-entry `Record<string, string>` constant maps Spanish CCAA display names (as returned by the API) to ISO codauto codes, kept inside each component that needs it. Not a shared file — the three maps use different name formats from different APIs.

---

## Component designs

### LegislationMap.tsx

**File:** `apps/visual-oscar/components/LegislationMap.tsx`

**Before:** 476 lines. `SPAIN_PATH` (40-vertex string), `PORTUGAL_PATH`, hand-rolled `project(lat,lon)`, CCAA label positions hardcoded as pixel pairs, demo fallback data inline.

**After:** ~280 lines.

- Fetch `spain-ccaa.geojson` on mount (`useEffect`). Show `<MapSkeleton height={400} />` while loading.
- API call to `/api/intelligence/legislation/impact` fires in parallel.
- CCAA fills: neutral `#e2e8f0` (no choropleth — this map is about dots, not regions).
- Dots: same logic as before (impact level → radius, nivel → color), but positioned via the d3 projection instead of the linear function.
- Canarias inset: absolute bottom-left, own `fitSize` projection.
- Portugal outline: removed (visual noise, no data).
- `aria-label` on `<svg>` and each `<path>`.
- Demo fallback (14 items) kept for when API returns nothing.

**Props:** unchanged.

---

### RegionalNewsMaps.tsx

**File:** `apps/visual-oscar/components/RegionalNewsMaps.tsx`

**Before:** 422 lines. `SpainCCAAMap` = 17 `<button>` elements in 4 hardcoded flex rows. `EuropeMap` = SVG circles on broken linear projection.

**After:** ~340 lines.

#### SpainCCAAMap sub-component

- Fetch `spain-ccaa.geojson` on mount. Show `<MapSkeleton />` while loading.
- Lambert Conic projection + `fitSize`.
- Fill color = `positiveColorScale` applied to `n_articles`.
- Hover: stroke widens to `1.5px`, tooltip shows name + count + sentiment badge.
- Click calls existing `onSelect(ccaaName)` callback — no prop change.
- Canarias inset at bottom-left.
- `<MapLegend>` below the SVG.
- `aria-label` on `<svg>` and each `<path>`.

**CCAA name mapping:** API returns names like `"Madrid"`, `"Cataluña"`. The 17-entry lookup maps these to codauto codes.

**Data prop:** `{ [ccaaName]: { n_articles: number, sentiment: number, polarity: string } }` — unchanged.

#### EuropeMap sub-component

- No GeoJSON loaded — keeps SVG bubble approach.
- Replace `project(lat, lon)` with `d3.geoMercator().fitExtent([[20,20],[500,360]], europeBbox)` where `europeBbox` is a hardcoded GeoJSON bbox `{ type:'Feature', geometry:{ type:'Polygon', coordinates: [[[-25,34],[45,34],[45,72],[-25,72],[-25,34]]] } }`.
- All 22 country circle positions and labels recalculated via the d3 projection.
- Graticule lines kept (good for orientation).
- No new dependencies.

---

### NarrativeMap.tsx

**File:** `apps/visual-oscar/components/media/NarrativeMap.tsx`

**Before:** 534 lines. World/Europe = SVG circles on dark void with linear projection. Spain = CSS div bubbles over a rough `<ellipse>`. `CCAA_POSITIONS` hardcoded percentage table.

**After:** ~420 lines.

#### World mode
- Load `world-countries.geojson`.
- `d3.geoNaturalEarth1().fitSize([900, 460], geojson)`.
- Country fills: `positiveColorScale(n_articulos)`. Zero-data countries: `#1e293b`.
- Proportional circles on country centroids (`d3.geoCentroid(feature)`), sized by `n_articulos`, colored by `sentiment_avg` via `riskColorScale`.
- Spain: always rendered with `#1F4E8C` accent stroke.
- Graticule at 30° intervals.
- `<MapLegend>` below.

#### Europe mode
- Same `world-countries.geojson`, filtered client-side to `lon ∈ [-25, 45], lat ∈ [34, 72]`.
- `d3.geoConicConformal().parallels([43, 62]).rotate([-15, 0]).fitSize([900, 460], europeFeatures)`.
- Same fill + circle logic as world.

#### España mode
- Load `spain-ccaa.geojson` (may already be cached from another component).
- Lambert Conic projection identical to LegislationMap and RegionalNewsMaps.
- CCAA fills: `categoricalColor(narrativa_dominante)`.
- Proportional circles: `n_articulos`.
- Canarias inset.
- Click calls existing `onRegionClick(ccaaName)`.
- `<MapLegend>` showing narrative category colors.

**Removed:** `CCAA_POSITIONS` percentage table, `<ellipse>` silhouette, hand-rolled `project()`, `CONTINENT_PATHS` string (~120 lines).

**Props:** unchanged.

---

## Error handling

- GeoJSON fetch failure: show an inline error message inside the map container (not a full-page error).
- API failure: existing fallback behaviour in each component is preserved.
- Missing `codauto` on a feature: that path renders with default fill, no crash.

## Accessibility

Every `<svg>` gets:
```tsx
role="img"
aria-label="[descriptive string]"
```
Every `<path>` for a named region gets:
```tsx
aria-label={`${regionName}: ${formattedValue}`}
tabIndex={0}
onKeyDown={e => e.key === 'Enter' && onSelect?.(id)}
```

## What is NOT in scope

- MapaProvincias.tsx (tile cartogram, kept intentionally)
- Adding Mapbox/react-map-gl (no token available, d3-geo covers all needs)
- Province-level Spain maps (no use case identified)
- Municipios map (the component is a selector, not a map)
- Adding the CLAUDE.md map section to the repo (separate task)
