# Sector Energía v2 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Granularidad SPRINT (no micro-pasos): el ejecutor es Claude con el spec a mano. Cada sprint = 1+ subagente con prompt explícito + verificación + commit/push independiente.

**Goal:** Convertir `/sector-energia` en la pestaña sectorial más detallada de Politeia (supera a Defensa): navegación 2 niveles por tipo de energía, exprimiendo ESIOS/Ember/ENTSO-E/Alpha/Nasdaq/AGSI/OpenCorporates/Finnhub, con fichas de empresa y análisis IA de riesgo de suministro.

**Architecture:** `EnergiaShell` con barra superior por tipo (`?energia=` URL state, lazy mount). El deep-dive ESIOS (9 sub-tabs) se conserva dentro de "Eléctrico". Clientes API nuevos (Ember, ENTSO-E, AGSI, commodities energía) en `lib/`, endpoints proxy en `app/api/`, vistas en `app/sector-energia/_components/`. Reutiliza `SectorPanel`, `SectorIntelPanel`, primitivas SVG, `useUrlState`, cadena IA Gemini→heurístico.

**Tech Stack:** Next.js 14 App Router · TypeScript estricto · node --experimental-strip-types (tests) · APIs externas directas server-side con caché + degradación marcada.

**Spec source:** `docs/superpowers/specs/2026-06-02-sector-energia-v2-design.md` (commit `e5c3446a`).

**Branch:** `claude/sharp-keller-3d6d48` (HEAD `e5c3446a`).

**Convención:** Español. Cero emojis (Unicode `◆ ◉ ⬡ ⇡ ⟶ ✓`). Cero datos sintéticos sin marcar. Cada panel cita fuente.

---

## File Structure Overview

```
apps/visual-oscar/
  app/sector-energia/
    page.tsx                              ← MODIFICAR (S1: renderiza <EnergiaShell>; preserva imports)
    _components/
      EnergiaShell.tsx                    (S1 · nav 2 niveles + useUrlState + lazy)
      VisionGlobalView.tsx                (S4)
      ElectricoView.tsx                   (S1 · envuelve EsiosTabsSection actual; S3 añade EU/Ember)
      RenovablesView.tsx                  (S5)
      NuclearView.tsx                     (S6)
      PetroleoView.tsx                    (S7)
      GasView.tsx                         (S8)
      HidrogenoView.tsx                   (S9)
      WorldEnergyMap.tsx                  (S2/S4)
      EnergyPriceMatrix.tsx              (S4)
      SupplyRiskGauge.tsx                 (S4)
      EntsoeEuContextPanel.tsx            (S3)
      ReactorFleet.tsx                    (S6)
      LoadFactorChart.tsx                 (S5)
      CommodityStrip.tsx                  (S7)
      EnergyCompanyCard.tsx               (S9)
      EnergyCompanyFicha.tsx              (S9)
    empresas/
      page.tsx                            (S9 · grid)
      [slug]/page.tsx                     (S9 · ficha drill-down)
  lib/
    ember/client.ts                       (S2)
    entsoe/client.ts                      (S3 · XML parser + EIC zonas)
    entsoe/zones.ts                       (S3 · catálogo EIC codes)
    energia/commodities.ts                (S7)
    energia/agsi.ts                       (S8)
    energia/companies.ts                  (S9 · catálogo + OpenCorporates enrich)
    energia/catalog.ts                    (S1 · catálogos curados: reactores, renovables capacidad, H2 proyectos, PNIEC)
    energia/types.ts                      (S1 · tipos compartidos)
  app/api/
    ember/generation/route.ts             (S2)
    ember/carbon-intensity/route.ts       (S2)
    ember/country/[iso]/route.ts          (S2)
    entsoe/prices/route.ts                (S3)
    entsoe/flows/route.ts                 (S3)
    entsoe/generation/route.ts            (S3)
    energia/commodities/route.ts          (S7)
    energia/gas-storage/route.ts          (S8)
    energia/empresas/route.ts             (S9)
    energia/empresas/[slug]/route.ts      (S9)
    energia/supply-risk-brief/route.ts    (S10)
  tests/unit/energia/
    ember-client.test.ts                  (S2)
    entsoe-client.test.ts                 (S3)
    commodities.test.ts                   (S7)
    agsi.test.ts                          (S8)
    companies.test.ts                     (S9)
    catalog.test.ts                       (S1)
  tests/acceptance/
    sector-energia-v2.spec.ts             (S10)
```

**Cero modificación a los 9 sub-tabs ESIOS** (`EsiosTabsSection` + `Esios*Panel` + `/api/esios/*`). Se envuelven, no se tocan.

---

## Pre-flight (antes de S1)

- [ ] **PF.1**: `cd <repo> && git status` limpio, HEAD `e5c3446a`, branch `claude/sharp-keller-3d6d48`.
- [ ] **PF.2**: `cd apps/visual-oscar && npm run build` verde (baseline).
- [ ] **PF.3**: Leer `app/sector-energia/page.tsx` completo + `app/sector-energia/_components/EsiosTabsSection.tsx` para conocer el wiring exacto a preservar.

---

## S1 · Fundación: navegación 2 niveles

**Goal:** `EnergiaShell` con barra superior por tipo + URL state + lazy mount. "Eléctrico" envuelve el contenido actual (ESIOS + paneles REE) sin cambiarlo. Los otros 6 tipos = placeholders "en construcción" con empty-state. Tipos + catálogos curados base.

**Files:** Create `_components/EnergiaShell.tsx`, `_components/ElectricoView.tsx`, `lib/energia/types.ts`, `lib/energia/catalog.ts`, `tests/unit/energia/catalog.test.ts`. Modify `app/sector-energia/page.tsx`.

**Approach:**
1. Leer `page.tsx` actual (766 líneas). Extraer TODO su contenido actual (hero + EsiosTabsSection + paneles + empresas + áreas + SectorIntelPanel + Cuaderno) a `ElectricoView.tsx` SIN cambios funcionales — es un move + wrap. (El hero cross-energía se rehará en S4 Visión Global; por ahora el hero actual va en Eléctrico.)
2. `EnergiaShell.tsx`: barra de 7 botones (`Visión Global · Eléctrico · Renovables · Nuclear · Petróleo · Gas · Hidrógeno`), estado vía `useUrlState('energia', 'global')` (o 'electrico' por defecto si Visión Global aún no existe en S1 → default 'electrico' en S1, cambia a 'global' en S4). Lazy: renderiza solo la vista activa.
3. `page.tsx`: pasa a renderizar `<EnergiaShell />`.
4. `lib/energia/types.ts`: `EnergiaTipo` union, `EnergyCommodity`, `Reactor`, `RenewableCapacity`, `H2Project`, `EnergyCompany` interfaces.
5. `lib/energia/catalog.ts`: catálogos curados base — `REACTORES_ES` (7), `CAPACIDAD_RENOVABLE_ES` (por tech, MW instalados, fuente REE/MITECO), `PNIEC_2030` (objetivos), `H2_PROYECTOS_ES` (PERTE), `EMPRESAS_ENERGIA` (~25 con ticker/segmentos/OpenCorporates jurisdiction). Datos verificables, citados.
6. Tests: `catalog.test.ts` valida shape + counts (7 reactores, capacidad>0, empresas con ticker).
7. Verificar: build verde, los 9 sub-tabs ESIOS siguen funcionando dentro de Eléctrico (smoke local).

**Verificación:** `npm run build` verde. `/sector-energia?energia=electrico` = lo de hoy. Otros tipos muestran placeholder. catalog.test pasa.

**Commit:** `feat(energia): S1 · navegación 2 niveles por tipo + catálogos base`

**Sub-agent prompt:** Lee spec §2 (arquitectura) + §3.1 nota + §5 (reutilización). Lee `page.tsx` y `EsiosTabsSection.tsx` completos ANTES. El cambio es un refactor estructural: mover el contenido actual a `ElectricoView` sin tocar su lógica, y crear el shell de navegación. NO toques `EsiosTabsSection` ni `/api/esios/*`. Catálogos curados con datos reales verificables (reactores nucleares ES, capacidad renovable instalada por REE, objetivos PNIEC 2030, empresas con tickers correctos).

---

## S2 · Cliente Ember (electricidad global)

**Goal:** Cliente Ember + endpoints + tests. Datos: generación eléctrica por país/fuente, intensidad de carbono, capacidad.

**Files:** Create `lib/ember/client.ts`, `app/api/ember/generation/route.ts`, `app/api/ember/carbon-intensity/route.ts`, `app/api/ember/country/[iso]/route.ts`, `tests/unit/energia/ember-client.test.ts`.

**Approach:**
1. **Investigar la API real PRIMERO** (WebFetch a docs Ember: `ember-energy.org` / `api.ember-energy.org`). Confirmar: base URL, auth (key header/query), endpoints de generación/emisiones, shape de respuesta, granularidad. Si la REST API es limitada, fallback a Ember open-data (CSV/JSON datasets).
2. `lib/ember/client.ts`: `fetchEmberGeneration(opts)`, `fetchCarbonIntensity(opts)`, `fetchCountryProfile(iso)`. Caché 24h (datos anuales/mensuales). Key `EMBER_API_KEY`. Degradación `{ok:false,error}` si falta key/falla.
3. Endpoints proxy (patrón ESIOS): validan key, llaman cliente, devuelven `{ok, data, fetched_at}` con cache-control s-maxage=3600.
4. Tests: mock fetch con fixture de payload Ember real (capturado del WebFetch), verifican parsing + caché + key-missing fallback.

**Verificación:** build verde. `curl /api/ember/generation` devuelve datos o empty-state marcado. Tests pasan.

**Reviews:** Cliente API nuevo → spec-compliance + code-quality review completos (subagent-driven full cycle).

**Commit:** `feat(energia): S2 · cliente Ember (electricidad global)`

**Sub-agent prompt:** Lee spec §4.1. INVESTIGA la API Ember real con WebFetch antes de codificar (no inventes el shape). Sigue el patrón de cliente de `lib/esios/client.ts` (degradación, caché, tipos). Tests con fixture del payload real.

---

## S3 · Cliente ENTSO-E (red europea)

**Goal:** Cliente ENTSO-E (parser XML + zonas EIC) + endpoints + panel contexto EU en Eléctrico.

**Files:** Create `lib/entsoe/client.ts`, `lib/entsoe/zones.ts`, `app/api/entsoe/prices/route.ts`, `app/api/entsoe/flows/route.ts`, `app/api/entsoe/generation/route.ts`, `_components/EntsoeEuContextPanel.tsx`, `tests/unit/energia/entsoe-client.test.ts`. Modify `ElectricoView.tsx` (añadir panel EU).

**Approach:**
1. **Investigar API ENTSO-E PRIMERO** (WebFetch docs Transparency Platform). Confirmar: base `web-api.tp.entsoe.eu/api`, auth (securityToken — derivar de `ENTSOE_USERNAME`/`PASSWORD` o key directa), documentType codes (A44 day-ahead prices, A11 flows, A75 generation, A65 load), formato XML respuesta, EIC zona codes (ES=10YES-REE------0, FR, DE-LU, PT, IT).
2. `lib/entsoe/zones.ts`: catálogo EIC de zonas relevantes (ES, FR, DE-LU, PT, IT-NORD, BE, NL).
3. `lib/entsoe/client.ts`: `fetchDayAheadPrices(zone, period)`, `fetchCrossBorderFlows(from, to, period)`, `fetchGeneration(zone, period)`. Parser XML→JSON (sin dep externa pesada; usar DOMParser/regex o un parser ligero). Caché 1h. Degradación robusta.
4. Endpoints proxy.
5. `EntsoeEuContextPanel.tsx`: precios day-ahead ES/FR/DE/PT/IT comparados + flujos ES↔FR/PT. Reutiliza primitiva barra/línea.
6. Wire en `ElectricoView` (sección "Contexto europeo").
7. Tests: fixture XML real → parsing correcto + zonas + error handling.

**Verificación:** build verde. Panel EU renderiza en Eléctrico. Tests XML pasan.

**Reviews:** Cliente API nuevo + XML parsing (riesgo) → full review cycle.

**Commit:** `feat(energia): S3 · cliente ENTSO-E + contexto europeo en Eléctrico`

**Sub-agent prompt:** Lee spec §4.2. INVESTIGA ENTSO-E real con WebFetch (es API XML, no JSON — confirma el parsing y los EIC codes). El parser XML debe ser robusto y testeado con fixture XML real. Riesgo alto en zonas/documentTypes — dedica cuidado.

---

## S4 · Visión Global (landing cross-energía)

**Goal:** `VisionGlobalView`: hero 8 KPIs + matriz precios + mapa mundial + semáforo suministro + strip + áreas. Cambia default del shell a `global`.

**Files:** Create `_components/VisionGlobalView.tsx`, `_components/WorldEnergyMap.tsx`, `_components/EnergyPriceMatrix.tsx`, `_components/SupplyRiskGauge.tsx`. Modify `EnergiaShell.tsx` (default 'global').

**Approach:**
1. Hero 8 KPIs (spec §3.1): demanda ES, mix renovable, PVPC (ESIOS) + Brent, TTF, Henry Hub (commodities — usa endpoints existentes o stub hasta S7), EUA CO2 (ESIOS 1339), intensidad CO2 ES.
2. `EnergyPriceMatrix`: tabla electricidad/gas/petróleo/CO2 con nivel + var 24h/7d/30d + sparkline.
3. `WorldEnergyMap`: mapa Ember (S2) coloreado por intensidad carbono / % renovable (toggle). Reutiliza patrón mapa SVG existente o MapLibre.
4. `SupplyRiskGauge`: semáforo 5 dimensiones (reutiliza patrón radar/gauge tipo ThreatRadar).
5. Strip cotización + áreas estratégicas (reutiliza patrones).
6. Default shell → 'global'.

**Verificación:** build verde. `/sector-energia` carga Visión Global con KPIs vivos + mapa + matriz + semáforo.

**Reviews:** inline (Bash) — patrones ya validados.

**Commit:** `feat(energia): S4 · Visión Global cross-energía (KPIs + mapa + matriz + semáforo)`

---

## S5 · Renovables

**Goal:** `RenovablesView`: generación por tech + factor de carga + PNIEC + comparativa global + subastas.

**Files:** Create `_components/RenovablesView.tsx`, `_components/LoadFactorChart.tsx`. Usa `lib/energia/catalog.ts` (capacidad) + ESIOS + Ember.

**Approach:**
1. Stacked generación ES por tech (ESIOS 551/1161/1162/1158 + biomasa) tiempo real.
2. `LoadFactorChart`: generación real / capacidad instalada (catálogo) por tech.
3. Cuota renovable histórica (REE balance endpoint existente) + PNIEC 2030 81% con barra progreso.
4. Comparativa global % renovable por país (Ember S2).
5. Subastas/PPA (catálogo curado).
6. Strip empresas renovables (Acciona Energía, Solaria, Grenergy, EDPR via Finnhub).

**Verificación:** build verde. Sección Renovables completa con datos reales.

**Reviews:** inline.

**Commit:** `feat(energia): S5 · Renovables (tech + factor carga + PNIEC + global)`

---

## S6 · Nuclear

**Goal:** `NuclearView`: parque ES + generación + calendario cierre + contexto global.

**Files:** Create `_components/NuclearView.tsx`, `_components/ReactorFleet.tsx`. Usa catálogo (reactores, calendario) + ESIOS 549 + Ember.

**Approach:**
1. `ReactorFleet`: 7 reactores (catálogo) — potencia, año, propietario, factor carga, estado.
2. Generación nuclear ES (ESIOS 549) tiempo real + cuota mix.
3. Calendario cierre 2027-2035 (catálogo) — timeline visual.
4. Contexto global Ember (nuclear por país, ranking).
5. Precio uranio (Nasdaq DL si dataset; sino catálogo marcado).
6. Empresas copropietarias (Endesa/Iberdrola/Naturgy).

**Verificación:** build verde. Sección Nuclear completa.

**Reviews:** inline.

**Commit:** `feat(energia): S6 · Nuclear (parque ES + cierre + global)`

---

## S7 · Petróleo + commodities energía

**Goal:** `lib/energia/commodities.ts` (Brent/WTI/OPEC/TTF/HenryHub/uranio) + `PetroleoView` + `CommodityStrip`.

**Files:** Create `lib/energia/commodities.ts`, `app/api/energia/commodities/route.ts`, `_components/PetroleoView.tsx`, `_components/CommodityStrip.tsx`, `tests/unit/energia/commodities.test.ts`.

**Approach:**
1. `commodities.ts`: extiende patrón `lib/commodities-utils.ts`. Fuentes Alpha Vantage (Brent/WTI/NatGas) + Nasdaq DL (OPEC ORB) + Yahoo (series largas). Cálculo variación.
2. Endpoint `/api/energia/commodities?category=oil|gas|all`.
3. `PetroleoView`: Brent/WTI/OPEC spot + histórico + spread Brent-WTI + refino/crack + dependencia ES (catálogo) + geopolítica link.
4. `CommodityStrip`: reutilizable, lo usará Visión Global (retrofit hero KPIs S4 a datos reales).
5. Empresas (Repsol/Cepsa + majors via Finnhub).
6. Tests commodities (variación, agregación).

**Verificación:** build verde. Petróleo completo + hero Visión Global ahora con commodities reales.

**Reviews:** inline (lib con tests).

**Commit:** `feat(energia): S7 · Petróleo + commodities energía (Brent/WTI/OPEC)`

---

## S8 · Gas + almacenamiento AGSI

**Goal:** `lib/energia/agsi.ts` + `GasView`: TTF/HenryHub/MIBGAS + almacenamiento EU/ES + LNG.

**Files:** Create `lib/energia/agsi.ts`, `app/api/energia/gas-storage/route.ts`, `_components/GasView.tsx`, `tests/unit/energia/agsi.test.ts`.

**Approach:**
1. **Investigar AGSI API** (WebFetch `agsi.gie.eu/api`). Auth (key opcional), shape (% lleno, inyección/extracción por país).
2. `agsi.ts`: `fetchGasStorage(country)`. Caché 6h. Degradación.
3. `GasView`: TTF/HenryHub/MIBGAS (commodities S7) + almacenamiento EU/ES (AGSI) + estacionalidad + importaciones GNL (catálogo Enagás) + dependencia.
4. Empresas (Naturgy/Enagás + majors).
5. Tests AGSI con fixture.

**Verificación:** build verde. Gas completo.

**Reviews:** cliente API nuevo (AGSI) → full review.

**Commit:** `feat(energia): S8 · Gas + almacenamiento AGSI + LNG`

---

## S9 · Hidrógeno + Empresas (fichas drill-down)

**Goal:** `HidrogenoView` + módulo empresas (catálogo + OpenCorporates + Finnhub) con fichas drill-down.

**Files:** Create `_components/HidrogenoView.tsx`, `lib/energia/companies.ts`, `app/api/energia/empresas/route.ts`, `app/api/energia/empresas/[slug]/route.ts`, `app/sector-energia/empresas/page.tsx`, `app/sector-energia/empresas/[slug]/page.tsx`, `_components/EnergyCompanyCard.tsx`, `_components/EnergyCompanyFicha.tsx`, `tests/unit/energia/companies.test.ts`.

**Approach:**
1. `HidrogenoView`: proyectos PERTE H2 (catálogo) mapa + capacidad electrolizadores + EU H2 Bank subastas (catálogo) + H2Med backbone + empresas.
2. `companies.ts`: catálogo ~25 empresas (S1) + enrich Finnhub (cotización) + OpenCorporates (estructura societaria, subsidiarias).
3. Endpoints: `/empresas` (grid con cotización), `/empresas/[slug]` (ficha: cotización + segmentos energía + estructura OpenCorporates + en qué energías opera).
4. `empresas/page.tsx`: grid filtrable (país, energía) — patrón defensa/empresas.
5. `[slug]/page.tsx`: ficha drill-down.
6. Tests companies (enrich, shape).

**Verificación:** build verde. Hidrógeno + grid empresas + ficha drill-down funcionan.

**Reviews:** inline + spec-compliance (OpenCorporates integration).

**Commit:** `feat(energia): S9 · Hidrógeno + empresas energéticas con fichas`

---

## S10 · IA riesgo suministro + cierre + deploy

**Goal:** Análisis IA riesgo de suministro + integración /medios + acceptance tests + merge main + build + deploy.

**Files:** Create `app/api/energia/supply-risk-brief/route.ts`, `tests/acceptance/sector-energia-v2.spec.ts`. Modify `VisionGlobalView.tsx` (wire brief).

**Approach:**
1. `supply-risk-brief`: Gemini (cadena→heurístico) sintetiza semáforos + precios + geopolítica → briefing + nivel riesgo por vector. Disclaimer `generated_by_llm`.
2. Wire en Visión Global.
3. Integración /medios: noticias energía (link o widget).
4. Acceptance tests: cada tipo renderiza, cada endpoint nuevo responde 200/empty marcado, cero regresión ESIOS (9 sub-tabs).
5. **Cierre/deploy** (yo, el controlador — no subagente):
   - `git fetch origin` + merge `origin/main` (backups antes, §0.3 CLAUDE.md). Resolver si conflictos (esperado zero-overlap: energía vs trabajo compañero).
   - `npm install` (si main trajo deps) + `npm run build` verde + suite tests.
   - Push fast-forward a `main` + `Visual_Oscar`.
   - `vercel --prod --yes` desde raíz monorepo.
   - Smoke producción: `/sector-energia` + cada `?energia=` + endpoints.
   - Resumen al usuario.

**Verificación:** build verde, acceptance 100%, deploy READY, smoke OK.

**Commit:** `feat(energia): S10 · IA riesgo suministro + acceptance tests + deploy prod`

---

## Self-Review (skill checklist)

**1. Spec coverage:** ✅
- §2 nav 2 niveles → S1. §3.1 Visión Global → S4. §3.2 Eléctrico → S1(preserva)+S3(EU/Ember). §3.3 Renovables → S5. §3.4 Nuclear → S6. §3.5 Petróleo → S7. §3.6 Gas → S8. §3.7 Hidrógeno → S9. §4.1 Ember → S2. §4.2 ENTSO-E → S3. §4.3 commodities → S7. §4.4 empresas → S9. §4.5 AGSI → S8. §5 reutilización → todos. §6 IA → S10. §7 sprints → estructura. §8 tests → cada sprint + S10 acceptance.

**2. Placeholder scan:** Los "si dataset disponible" (uranio, MIBGAS) son hedges de disponibilidad real, no placeholders de plan — cada uno tiene fallback a catálogo marcado. Sin TBD/TODO de plan.

**3. Type consistency:** `EnergiaTipo`, `EnergyCommodity`, `Reactor`, `EnergyCompany` definidos en S1 `lib/energia/types.ts`, usados consistentemente en S5-S9.

**4. Riesgos cubiertos:** Ember/ENTSO-E/AGSI investigan API real con WebFetch ANTES de codificar (S2/S3/S8). XML parsing ENTSO-E con review completo. Merge main + deploy en S10 con backups. Reanudable (cada sprint commit independiente).

---

## Resumen sprints

| Sprint | Entregable | API nueva | Review |
|--------|-----------|-----------|--------|
| S1 | Nav 2 niveles + catálogos | — | inline |
| S2 | Cliente Ember + mapa | Ember | full |
| S3 | Cliente ENTSO-E + EU context | ENTSO-E | full |
| S4 | Visión Global landing | — | inline |
| S5 | Renovables | — | inline |
| S6 | Nuclear | — | inline |
| S7 | Petróleo + commodities | — | inline |
| S8 | Gas + AGSI | AGSI | full |
| S9 | Hidrógeno + Empresas fichas | OpenCorp enrich | inline+spec |
| S10 | IA + acceptance + DEPLOY | — | controlador |
