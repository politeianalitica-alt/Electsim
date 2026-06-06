# Turismo v3 · Diseño + plan de sprints (autónomo)

> Mejora de `/sector-turismo`. Objetivos del propietario: exhaustiva, todos los
> TIPOS de turismo con detalle en todos sus niveles, SIN repetición entre
> pestañas, SIN hardcodear (fuentes vivas de toda la plataforma + nuevas si
> hacen falta), buena visualización. Ejecución autónoma sin validación.

## Estado actual (auditado)
- `app/sector-turismo/page.tsx` = página PLANA (sin shell/sub-tabs): 4 KPIs hero
  + 2 líneas (FRONTUR + pernoctaciones EOH) + paneles hardcodeados
  (PROGRAMAS/EMPRESAS/REGULADORES/AREAS en `lib/sources/sectorial-data.ts`) +
  `SectorIntelPanel sector="turismo"` + Cuaderno.
- Endpoint: `/api/sectores/turismo/resumen` (INE TEMPUS FREG651/EOT21193/EOT21197).
- Hardcodeado: EMPRESAS_TURISMO(10), REGULADORES_TURISMO(8), AREAS_TURISMO(8),
  PROGRAMAS_TURISMO(4); `data/tourism/destinations_seed.json` (14 destinos).
- FALTA: tipos (rural, cultural, MICE/negocios, cruceros, naturaleza, salud,
  deportivo, gastronómico, idiomático, religioso/Camino, shopping), desglose por
  mercado emisor, estacionalidad, tipo de alojamiento, gasto, comparativa UE,
  mapas/drill. Repetición con /vivienda (VT), /puertos (cruceros), /infra (AENA).

## Fuentes (paths confirmados)
- **INE wstempus** `servicios.ine.es/wstempus`: FRONTUR (llegadas + por país
  residencia), EGATUR (gasto), ETR/FAMILITUR (residentes), EOH/EOAP/EOAC/EOTR
  (ocupación por tipo alojamiento). Endpoint genérico `/api/ine/frontur?n=24` +
  parser en `lib/macro/pulso-fetcher.ts`. Catálogo: `lib/macro/cultura-ocio-catalog.ts`.
- **Eurostat** JSON-stat (`parseJsonStat` en `lib/macro-utils.ts`), endpoint
  `/api/eurostat/dataset?code=...`: tour_occ_nin, tour_occ_arn (CCAA/NUTS2),
  tour_occ_arm, tour_cap_nat, tour_dem_tttot, bop_its6_det (%PIB).
- **AEMET** `/api/aemet/precipitacion-ccaa?ccaa=...` (clima/estacionalidad; AEMET_API_KEY).
- **Puertos** `lib/ports-handlers.ts` (cruceros / tráfico pasajeros).
- **AENA** datos.gob.es (pasajeros por aeropuerto) — crear cliente.
- **Macro** `lib/macro/*` (empleo HORECA, %PIB turístico).
- **Empresas** Finnhub `/api/finnhub/quote/{T}` (MEL, AMS, IAG, AENA).
- **Commodities** jet fuel / Brent (coste aéreo).
- **Geopolítica** `lib/geopolitica/*` (riesgo mercados emisores).
- Reutilizable FE: `app/sector-energia/_components/shared/` (HeroKpis,
  CommoditySnapshot genéricos), `components/macro/charts/CCAAHexmap.tsx` (mapa CCAA),
  recharts, mapas SVG España (patrón NuclearMap/H2ProjectsMap).

## Patrón técnico (copiar de `lib/energia/agsi.ts` + `app/api/energia/gas-storage/route.ts`)
Cliente `{ok,data|null,error?,fetched_at,source_url}`, caché TTL + revalidate,
helpers puros testables. Route `dynamic/runtime/maxDuration`, 200 aun degradado.

## Arquitectura v3: shell con sub-tabs (como EnergiaShell)
`TurismoShell` (nav 2 niveles, lazy-mount). 7 vistas:
1. **Visión Global** — cuadro ejecutivo: KPIs, snapshot, estacionalidad, comparativa UE, semáforo.
2. **Demanda y mercados** — FRONTUR por país emisor (UK/DE/FR/Nórdicos/USA/...), EGATUR gasto (medio/turista, medio/día), residentes ETR, estacionalidad.
3. **Alojamiento** — ocupación por tipo (hotel/apartamento/camping/rural/VT): pernoctaciones, ocupación %, ADR, RevPAR, estancia media.
4. **Destinos y territorio** — mapa CCAA (choropleth presión/pernoctaciones), tabla destinos enriquecida, tasa turística, saturación VT.
5. **Tipos de turismo** — sol&playa, urbano, cultural, rural/naturaleza, MICE/negocios, cruceros, salud/wellness, deportivo (esquí/golf), gastronómico, religioso (Camino), idiomático, shopping — cada uno con datos/indicadores/contexto.
6. **Conectividad** — AENA pasajeros por aeropuerto, aerolíneas (IAG), coste aéreo (jet fuel), cruceros por puerto.
7. **Impacto económico** — %PIB turístico, empleo HORECA, gasto público (PERTE ejecución), empresas cotizadas (CompanyQuotePanel turismo).

## Olas
### Ola 1 — fundación (paralelo, ficheros disjuntos)
- **T1 · Shell**: `TurismoShell.tsx` + 7 vistas stub que compilan + reescribir
  `page.tsx`. Reusar HeroKpis/CommoditySnapshot genéricos (import de energia/shared).
  Crear `TurismoEmpresasPanel` (consume `/api/turismo/empresas`). SectorIntelPanel sector="turismo".
- **T2-ine · data INE/Eurostat** (ficheros nuevos `lib/turismo/*` + `app/api/turismo/*`):
  frontur (+by-origin), egatur, ocupacion (por tipo), residentes, ccaa, comparativa-ue.
- **T2-cross · data cross-source**: aena, cruceros (puertos), estacionalidad (AEMET),
  impacto-economico (macro), empresas (Finnhub), destinos (de-hardcode + enriquecido).

### Ola 2 — profundidad por vista (paralelo, 1 vista cada uno)
- T3 Visión Global · T4 Demanda/mercados · T5 Alojamiento · T6 Destinos/territorio
  (mapa) · T7 Tipos de turismo · T8 Conectividad · T9 Impacto económico.
- Reglas: cada agente edita SOLO su vista + crea sub-componentes con prefijo
  propio. NO tocar TurismoShell, sectorial-data.ts, lib/turismo (solo consumir).

### Ola 3 — cierre
- T10: QA runtime-safety, no-repetición (VT→/vivienda, cruceros→/puertos enlazados
  no duplicados), build, commit, push main+Visual_Oscar, vercel --prod, smoke.

## Principios
No repetir (cruceros/VT/AENA se enlazan a su módulo, no se duplican). Nada
hardcodeado donde haya fuente viva; curado siempre con fuente+fecha. Cero emojis.
Degradación honesta. Build verde por ola.
