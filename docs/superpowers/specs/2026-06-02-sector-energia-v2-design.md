# Sector Energía y Utilities v2 · Design

**Fecha:** 2026-06-02
**Autor:** Claude (autónomo, decisiones aprobadas por el usuario antes de ausentarse)
**Estado:** Aprobado para ejecución autónoma (writing-plans → subagent-driven-development → deploy)
**Branch:** `claude/sharp-keller-3d6d48`

---

## §0 · Objetivo y decisiones aprobadas

Overhaul completo de `/sector-energia` para que sea la pestaña sectorial **más
detallada de Politeia, superando a Defensa** (~7.300 líneas, 11 sub-páginas, 23
fichas de empresa, threat radar, IA). Debe cubrir **todas las energías** con
vistas específicas por tipo y exprimir al máximo las APIs reales disponibles.

**Decisiones del usuario (2026-06-02, batched antes de ausentarse):**
1. **Estructura**: navegación de 2 niveles por TIPO de energía. Barra superior:
   `Visión Global · Eléctrico · Renovables · Nuclear · Petróleo · Gas · Hidrógeno`.
   El deep-dive ESIOS actual (9 sub-tabs) se conserva DENTRO de "Eléctrico".
2. **Geografía**: España profundo (ESIOS/REE) + contexto Europa (ENTSO-E) +
   global (Ember electricidad mundial, commodities petróleo/gas).
3. **Empresas**: fichas drill-down de españolas tier-1 (OpenCorporates +
   cotización Finnhub) + majors globales en strip de cotización.
4. **Cierre**: Claude despliega a producción al terminar (merge main → build →
   tests → `vercel --prod`).

**Modo de trabajo**: ejecución autónoma sin gate de aprobación por sección
(el usuario no está). Cada sprint: subagente implementador + verificación
(build verde + tests). Deploy único al final.

---

## §1 · APIs disponibles (keys confirmadas en Vercel producción)

| API | Key (en prod) | Datos | Estado integración |
|-----|---------------|-------|--------------------|
| **ESIOS/REE** | `ESIOS_API_KEY` ✓ | Sistema eléctrico ES tiempo real (30 indicadores catalogados) | Integrado (ESIOS-DEEP) |
| **Ember** | `EMBER_API_KEY` ✓ | Electricidad global: generación por fuente, emisiones, capacidad por país | **Cliente NUEVO** |
| **ENTSO-E** | `ENTSOE_USERNAME`+`ENTSOE_PASSWORD` ✓ | Red europea: flujos cross-border, precios day-ahead, generación, carga | **Cliente NUEVO** |
| **Nasdaq Data Link** | `NASDAQ_DATA_LINK_KEY` ✓ | OPEC oil, commodities, FRED mirror | Integrado (parcial) |
| **Alpha Vantage** | `ALPHA_VANTAGE_KEY` ✓ | Brent/WTI/NatGas, técnico, FX | Integrado (parcial) |
| **OpenCorporates** | `OPENCORPORATES_API_KEY` ✓ | Estructura societaria empresas | Integrado (geopolítica) |
| **Finnhub** | `FINNHUB_API_KEY` ✓ | Cotización stocks tiempo real | Integrado |
| **FRED** | `FRED_API_KEY` ✓ | Series energía/macro US+global | Integrado |

**Política de degradación** (patrón Politeia existente): si una key falta o la
API falla, el endpoint devuelve `{ ok: false, error, fetched_at }` con HTTP 200
y el componente muestra empty-state con la fuente citada. **Nunca datos
sintéticos sin marcar.** Cada panel cita su fuente.

---

## §2 · Arquitectura de navegación (2 niveles)

```
/sector-energia
  └─ <EnergiaShell>  · barra superior tipo-de-energía (7 secciones)
       ├─ Visión Global   (overview cross-energía)
       ├─ Eléctrico       (ESIOS deep-dive 9 sub-tabs + ENTSO-E + Ember)
       ├─ Renovables      (tecnologías ES + capacidad + PNIEC + global)
       ├─ Nuclear         (parque ES + calendario cierre + global)
       ├─ Petróleo        (Brent/WTI/OPEC + refino + empresas)
       ├─ Gas             (TTF/HenryHub/MIBGAS + almacenamiento + LNG)
       └─ Hidrógeno       (PERTE H2 + electrolizadores + EU H2 Bank)
  └─ /empresas            (ficha-grid españolas + global strip)
  └─ /empresas/[slug]     (ficha drill-down empresa)
```

**Routing**: el tipo de energía se controla con `?energia=electrico|...` (URL
state, patrón `useUrlState` existente) para que sea deep-linkable y el SSR
prefetch funcione. La sección por defecto es `Visión Global`.

**Lazy loading**: cada sección-tipo monta sus componentes solo al activarse
(igual que `EsiosTabsSection`). Evita 7×N fetches al cargar.

**Reutilización**: `<SectorPanel>` (contenedor universal), `<SectorIntelPanel>`
(widget intel), `HeroKPI` grid, primitivas SVG de gráfico (patrón
`GastoLineChart`/`OtanComparativa` de defensa), `CuadernoEntityWidget`.

**Cero modificación destructiva**: los 9 sub-tabs ESIOS + sus endpoints
`/api/esios/*` se conservan intactos dentro de "Eléctrico". El overhaul AÑADE,
no reescribe lo que funciona.

---

## §3 · Vistas por tipo de energía (contenido específico)

### §3.1 · Visión Global (landing)

**Propósito**: foto cross-energía de un vistazo + navegación a cada tipo.

- **Hero · 8 KPIs vivos**: demanda eléctrica ES (MW), mix renovable ES (%),
  PVPC (€/MWh), Brent (\$/bbl), TTF gas (€/MWh), Henry Hub (\$/MMBtu), EUA CO2
  (€/t), intensidad CO2 eléctrica ES (gCO2/kWh).
- **Matriz de precios energía** (tabla): electricidad spot, gas TTF/MIBGAS,
  petróleo Brent/WTI, CO2 — nivel + variación 24h/7d/30d + sparkline.
- **Mapa mundial Ember**: generación eléctrica por país coloreada por
  intensidad de carbono (o % renovable, toggle). Tooltip con mix por fuente.
- **Semáforo seguridad de suministro** (5 dimensiones): dependencia importación
  energética ES, almacenamiento gas Europa (% lleno), margen capacidad
  eléctrica, diversificación geográfica gas, exposición precios.
- **Strip cotización**: majors globales + utilities españolas (Finnhub).
- **Análisis IA riesgo de suministro** (Gemini): síntesis de los semáforos +
  contexto geopolítico (link /geopolitica). Cadena Gemini→heurístico.
- **Áreas estratégicas** (cards): transición energética, autonomía, precios,
  descarbonización, redes, almacenamiento.

**Fuentes**: ESIOS (eléctrico ES), Ember (mapa global), Alpha/Nasdaq
(commodities), GIE AGSI (gas storage si disponible), Finnhub (cotización).

### §3.2 · Eléctrico

Conserva **los 9 sub-tabs ESIOS** (Pulso, Precios, Mix·Emisiones, Demanda,
Intercambios, Predicciones D+1, Ajustes, No-Peninsular, Explorar) + AÑADE:

- **Contexto europeo (ENTSO-E)**: precios day-ahead de los principales mercados
  EU (ES, FR, DE, PT, IT) comparados; flujos cross-border físicos ES↔FR/PT;
  generación por fuente agregada EU.
- **Contexto global (Ember)**: cuota de cada fuente en la generación eléctrica
  mundial; ranking países por intensidad de carbono; evolución renovable global.
- **Empresas eléctricas**: Iberdrola, Endesa, Naturgy, EDP, Redeia (REE) —
  cotización + cuota generación.

**Indicadores ESIOS**: 1001 (PVPC), 600 (spot), 1339 (EUA CO2), 612-615 (MI1-4),
1293/460/372 (demanda), 549/551/1161/1162/1158 (generación por fuente),
1738-1741 (no peninsular).

### §3.3 · Renovables

- **Generación ES por tecnología** (stacked tiempo real, ESIOS): eólica (551),
  solar FV (1161), solar térmica (1162), hidráulica (1158), + biomasa/otras.
- **Factor de carga**: generación real / capacidad instalada por tecnología
  (capacidad de catálogo curado REE/MITECO + generación ESIOS).
- **Cuota renovable**: histórica (REE balance) + objetivo PNIEC 2030 (81%
  electricidad renovable) con barra de progreso.
- **Curtailment/vertidos**: energía renovable no integrada (ESIOS si disponible).
- **Comparativa global (Ember)**: % renovable por país, ranking, evolución.
- **Subastas y PPA**: últimas subastas renovables ES (precios adjudicados,
  catálogo curado) — contexto de mercado.
- **Empresas**: Acciona Energía, Solaria, Grenergy, EDPR, Iberdrola (renovable).

### §3.4 · Nuclear

- **Parque nuclear español** (catálogo curado): 7 reactores (Almaraz I/II, Ascó
  I/II, Cofrentes, Vandellós II, Trillo) — potencia MW, año, propietario, factor
  de carga, estado operativo.
- **Generación nuclear ES** (ESIOS 549) tiempo real + histórico + cuota en mix.
- **Calendario de cierre** (2027-2035, catálogo curado): timeline visual del
  cierre escalonado pactado.
- **Contexto global (Ember)**: generación nuclear por país, ranking, nuevos
  reactores/SMR (catálogo curado de contexto).
- **Precio uranio** (Nasdaq DL si dataset disponible; sino catálogo).
- **Empresas**: Endesa, Iberdrola, Naturgy (copropietarias del parque ES).

### §3.5 · Petróleo

- **Precios crudo** (Alpha Vantage + Nasdaq DL): Brent, WTI, OPEC basket (ORB) —
  spot + histórico + variación. Spread Brent-WTI.
- **Productos refinados**: gasolina/diésel (Alpha si disponible), crack spread.
- **Consumo/importaciones ES** (catálogo curado CORES/MITECO): dependencia,
  países de origen.
- **Contexto geopolítico**: link a /geopolitica + chokepoints (Ormuz, Suez via
  módulo puertos existente si aplica).
- **Empresas**: Repsol, Cepsa (ES) + majors (Shell, BP, TotalEnergies, Exxon,
  Chevron, Equinor) — strip cotización.

### §3.6 · Gas

- **Precios gas** (Alpha/Nasdaq): TTF (hub europeo), Henry Hub (US), MIBGAS
  (hub español si dataset disponible).
- **Almacenamiento Europa (GIE AGSI)**: % lleno agregado EU + España, evolución
  estacional. (Cliente AGSI: API pública GIE, key `GIE_*` o sin key.)
- **Importaciones GNL ES** (Enagás/catálogo): plantas regasificación, flujos.
- **Dependencia y diversificación**: origen del gas ES (Argelia, US LNG, etc.).
- **Empresas**: Naturgy, Enagás (ES) + majors gas.

### §3.7 · Hidrógeno

- **Proyectos H2 verde ES** (catálogo curado PERTE H2/MITECO): mapa + capacidad
  electrolizadores MW, estado, promotor.
- **EU Hydrogen Bank**: subastas (precios €/kg adjudicados, catálogo).
- **Precio H2** (emergente — catálogo + cualquier serie disponible).
- **Corredor H2 / backbone**: proyectos de red (H2Med, catálogo).
- **Empresas**: Iberdrola, Repsol, Acciona, Enagás (backbone H2).

**Nota datos H2**: el hidrógeno tiene poca data tiempo-real pública. Esta vista
es la más basada en catálogo curado + cualquier serie disponible. Se marca
claramente como "datos de proyecto/catálogo" vs "tiempo real".

---

## §4 · Clientes API nuevos

### §4.1 · Ember (`lib/ember/client.ts` + `app/api/ember/*`)

Ember Energy API (`api.ember-energy.org` / open data). Datos:
- `electricity-generation` por país/año/fuente (TWh + %)
- `carbon-intensity` por país (gCO2/kWh)
- `electricity-demand`, `capacity` por país/fuente

Endpoints frontend: `/api/ember/generation`, `/api/ember/carbon-intensity`,
`/api/ember/country/[iso]`. Caché 24h (datos anuales/mensuales). Auth: API key
header o query param según doc Ember.

### §4.2 · ENTSO-E (`lib/entsoe/client.ts` + `app/api/entsoe/*`)

ENTSO-E Transparency Platform (`web-api.tp.entsoe.eu`). **API XML** (no JSON) —
el cliente parsea XML a JSON. Datos:
- Day-ahead prices (documentType A44) por zona
- Cross-border physical flows (A11)
- Actual generation per type (A75)
- Total load (A65)

Auth: token (security token derivado de credenciales — `ENTSOE_SECURITY_TOKEN`
o derivar de user/pass). Endpoints: `/api/entsoe/prices`, `/api/entsoe/flows`,
`/api/entsoe/generation`. Caché 1h. **Riesgo**: XML parsing + zonas EIC codes
complejas — el sprint dedica tiempo a un cliente robusto con catálogo de zonas.

### §4.3 · Commodities energía (`lib/energia/commodities.ts`)

Extiende el patrón commodities existente (`lib/commodities-utils.ts`,
`lib/commodities-yahoo-seed.ts`) para energía: Brent, WTI, OPEC, TTF, Henry Hub,
MIBGAS, uranio, gasolina/diésel. Fuente preferente Alpha Vantage + Nasdaq DL +
Yahoo (series largas). Endpoint `/api/energia/commodities`.

### §4.4 · Empresas energía (`lib/energia/companies.ts` + OpenCorporates)

Catálogo curado de ~25 empresas energéticas (españolas tier-1 + majors) con:
ticker, exchange, país, segmentos por energía, jurisdicción OpenCorporates.
Enriquecimiento: cotización Finnhub (tiempo real) + estructura societaria
OpenCorporates (subsidiarias, filings) en la ficha drill-down.
Endpoints: `/api/energia/empresas`, `/api/energia/empresas/[slug]`.

### §4.5 · AGSI gas storage (`lib/energia/agsi.ts`)

GIE AGSI+ (`agsi.gie.eu/api`). Almacenamiento de gas EU + ES (% lleno,
inyección/extracción). Key opcional. Endpoint `/api/energia/gas-storage`.

---

## §5 · Componentes y reutilización

**Reutilizar (no recrear)**:
- `<SectorPanel title subtitle sourceUrl>` — contenedor universal
- `<SectorIntelPanel sector compact>` — widget intel (sector=`energia`)
- `HeroKPI` grid — KPIs con accent
- Primitivas SVG: línea (patrón `GastoLineChart`), barra horizontal comparativa
  (patrón `OtanComparativa`), heatmap (patrón `EsiosPreciosHeatmap`), stacked
  (patrón `EsiosMixStacked`), donut, radar (patrón `ThreatRadar` para semáforo)
- `CuadernoEntityWidget` — notas
- `useUrlState` — estado URL deep-linkable
- Cadena IA Gemini→heurístico (patrón briefing existente)

**Nuevos componentes** (en `app/sector-energia/_components/`):
- `EnergiaShell.tsx` — navegación 2 niveles + lazy mount
- `VisionGlobalView.tsx`, `ElectricoView.tsx`, `RenovablesView.tsx`,
  `NuclearView.tsx`, `PetroleoView.tsx`, `GasView.tsx`, `HidrogenoView.tsx`
- `WorldEnergyMap.tsx` — mapa Ember (reutiliza patrón mapa SVG/MapLibre existente)
- `EnergyPriceMatrix.tsx` — matriz precios cross-energía
- `SupplyRiskGauge.tsx` — semáforo seguridad suministro
- `ReactorFleet.tsx` — parque nuclear
- `LoadFactorChart.tsx` — factor de carga renovables
- `CommodityStrip.tsx` — strip commodities energía
- `EnergyCompanyCard.tsx` + `EnergyCompanyFicha.tsx` — empresas

**Estándares CLAUDE.md**: cero emojis (Unicode `◆ ◉ ⬡ ⇡ ⟶ ✓`), módulo BI =
"Estudio", post-login `/inicio`. Estilo visual coherente con paneles existentes.

---

## §6 · Análisis IA de riesgo de suministro

Endpoint `/api/energia/supply-risk-brief` que sintetiza (Gemini, cadena con
fallback heurístico):
- Semáforos de §3.1 (dependencia, almacenamiento, margen, diversificación)
- Precios actuales vs históricos
- Contexto geopolítico (señales del módulo /geopolitica)
→ Briefing ejecutivo + nivel de riesgo (bajo/medio/alto/crítico) por vector.
Disclaimer `generated_by_llm`. Mismo patrón que el briefing de defensa.

---

## §7 · Sprints (ejecución autónoma)

| Sprint | Contenido | Entregable visible |
|--------|-----------|--------------------|
| **S1 · Fundación** | `EnergiaShell` (nav 2 niveles + useUrlState + lazy) · mover ESIOS deep-dive a "Eléctrico" · tipos compartidos · `<SectorPanel>` wiring · empty-states. ESIOS intacto. | Navegación por tipo funciona; Eléctrico = lo de hoy |
| **S2 · Ember client** | `lib/ember/client.ts` + endpoints + `WorldEnergyMap` + tests | Mapa mundial energía |
| **S3 · ENTSO-E client** | `lib/entsoe/client.ts` (XML parser + zonas EIC) + endpoints + panel EU prices/flows + tests | Contexto europeo en Eléctrico |
| **S4 · Visión Global** | `VisionGlobalView`: hero 8 KPIs + price matrix + world map + supply-risk gauge + strip + áreas | Landing cross-energía |
| **S5 · Renovables** | `RenovablesView`: tech breakdown + load factor + PNIEC + global Ember + subastas | Sección Renovables completa |
| **S6 · Nuclear** | `NuclearView`: parque (ReactorFleet) + generación + calendario cierre + global | Sección Nuclear completa |
| **S7 · Petróleo** | commodities energía + `PetroleoView`: Brent/WTI/OPEC + refino + dependencia ES | Sección Petróleo completa |
| **S8 · Gas** | AGSI client + `GasView`: TTF/HenryHub/MIBGAS + almacenamiento + LNG | Sección Gas completa |
| **S9 · Hidrógeno + Empresas** | `HidrogenoView` (PERTE/EU H2 Bank) + empresas (catálogo + OpenCorporates + Finnhub) + fichas drill-down | Hidrógeno + fichas empresa |
| **S10 · IA + cierre** | supply-risk brief Gemini + /medios integration + polish + acceptance tests + merge main + build + deploy | LIVE en producción |

Cada sprint: subagente implementador (con prompt explícito, archivos exactos,
tests), verificación local (build verde + tests), commit + push a claude branch.
Reviews completas (spec+quality) en sprints con cliente API nuevo (S2, S3, S8);
verificación inline (Bash) en sprints de UI sobre patrones ya validados.

S10 hace el merge de `origin/main` (puede haber avanzado por el compañero),
build, tests, y `vercel --prod` desde la raíz. Backups antes de push (§0.3 CLAUDE.md).

---

## §8 · Tests

- Clientes API nuevos (Ember, ENTSO-E, AGSI): tests unitarios con mock fetch
  (payload fixtures) — parsing, error handling, caché, key-missing fallback.
- Commodities/empresas libs: tests de cálculo (variación, factor de carga,
  agregación) con fixtures.
- Componentes: smoke (render con datos vacíos → empty-state; con datos → paneles).
- Aceptación final (S10): cada tipo de energía renderiza; cada endpoint nuevo
  responde 200 (con datos o empty-state marcado); cero regresión en los 9
  sub-tabs ESIOS.
- Harness: `node --experimental-strip-types` + `node:assert/strict` (patrón del
  repo). Build `npm run build` verde cada commit.

---

## §9 · Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| ENTSO-E XML + EIC codes complejos | Sprint dedicado (S3), catálogo de zonas curado, parser robusto con tests de fixtures XML reales |
| Ember API shape/endpoints inciertos | S2 investiga doc real primero (WebFetch); fallback a Ember open-data CSV si API REST limitada |
| Rate limits (Alpha 25/día, ENTSO-E, OpenCorporates 500/mes) | Caché agresiva (1-24h), batch, circuit breaker (reutilizar patrón Sprint 2) |
| Datos H2 escasos | Vista basada en catálogo curado, marcada como "proyecto/catálogo" |
| main avanza por el compañero durante el trabajo | Merge `origin/main` en S10 (zero-overlap esperado: energía vs su trabajo) + backups |
| Rate limit Vercel Hobby (100/día compartido) | 1 solo deploy al final (S10) |
| Sesión se corta a mitad | Cada sprint commiteado+pusheado independiente; el plan permite reanudar desde el último commit |

---

## §10 · Out of scope

- No se tocan otras pestañas sectoriales (defensa, farma, etc.).
- No se reescriben los 9 sub-tabs ESIOS (se conservan dentro de Eléctrico).
- No backend Python nuevo (todo en frontend Next.js + APIs externas directas).
- No autenticación nueva para las APIs (keys ya en Vercel).
- Mercados intradía de alta frecuencia (tick-level) — fuera de alcance, se usa
  la granularidad horaria/diaria que dan las APIs.

---

## §11 · Criterio de "éxito" (superar a Defensa)

| Métrica | Defensa (listón) | Energía v2 (objetivo) |
|---------|------------------|------------------------|
| Tipos/ángulos | 11 temáticos | 7 tipos energía × sub-vistas = 25+ ángulos |
| Sub-vistas navegables | 11 sub-páginas | 7 secciones + 9 sub-tabs ESIOS + empresas = 17+ |
| KPIs vivos | 8 | 8 (global) + por-tipo = 30+ |
| Visualizaciones | 10+ | 20+ (mapas, heatmaps, stacked, gauges, fichas) |
| Fuentes en vivo | 3 (WB/TED/SIPRI) | 8 (ESIOS/Ember/ENTSO-E/Alpha/Nasdaq/AGSI/OpenCorp/Finnhub) |
| Fichas empresa | 23 | 25+ (con estructura OpenCorporates, más profundas) |
| IA | Posicionamiento | Riesgo de suministro multi-vector |
| Líneas estimadas | ~7.300 | ~9.000+ |
