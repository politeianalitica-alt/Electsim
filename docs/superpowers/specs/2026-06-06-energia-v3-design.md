# Energía v3 · Diseño + plan de sprints (autónomo)

> Mejora del módulo `/sector-energia` sobre v2. Objetivos del propietario:
> más detalle por tipo de energía en todos sus niveles, SIN repetición entre
> pestañas, SIN datos hardcodeados (apoyarse en fuentes vivas de toda la
> plataforma), y mejor visualización. Ejecución autónoma sin validación.

## Principios

1. **No repetir entre pestañas.** Cada commodity/serie/empresa se muestra UNA
   vez en su lugar canónico. Visión Global = snapshots; el detalle vive en la
   pestaña del tipo. Empresas y SectorIntel = primitivas compartidas.
2. **Nada hardcodeado donde exista fuente viva.** De-hardcodear vía endpoints
   que tiren de REE/ESIOS/ALSI/Ember/puertos/geopolítica/macro. Lo
   inevitablemente curado (cierres nucleares pactados, backbone H2, subastas
   pasadas) se mantiene PERO con `fuente`, `fuente_url` y `fecha_ref` visibles.
3. **Cross-source: apóyate en todo el ecosistema.** Puertos (logística
   energética), geopolítica (riesgo país proveedor), macro (inflación
   energética), ESIOS completo, REE apidatos.
4. **Degradación honesta.** Endpoints responden 200 con `ok:false` + empty-state
   claro; nunca pantalla rota. Cero emojis (Unicode geométrico).

## Patrón técnico (copiar de `lib/energia/agsi.ts` + `app/api/energia/gas-storage/route.ts`)

- Cliente lib: `fetchX(opts): Promise<{ ok, data|null, error?, fetched_at, source_url }>`,
  caché en memoria TTL + `next:{revalidate}`, key sin secretos, helpers puros
  exportados (testables).
- Route: `export const dynamic='force-dynamic'; runtime='nodejs'; maxDuration=30`.
  `NextResponse.json({ ...data, _meta:{source, cache_ttl_seconds} })`, 200 aun degradado.

## Fuentes (paths exactos confirmados)

- **ESIOS**: `lib/esios/catalog.ts` (`ESIOS_CATALOG`, 30 ind. + colecciones slug),
  `lib/esios/client.ts`. No usados: servicios de ajuste, restricciones técnicas,
  índice de desviación, intercambios bilaterales. (Verificar IDs en vivo; degradar
  si 404.)
- **REE apidatos**: `lib/sources/ree.ts` (`balanceElectrico`, `mixGeneracion`,
  `precioSpot`, `intercambios`, `emisiones`). Endpoints `/api/sectores/energia/*`.
  Potencia instalada: categoría REE `generacion/potencia-instalada` (verificar).
- **GIE**: `lib/energia/{agsi,alsi,iip}.ts` (ya integrados).
- **Puertos**: `lib/ports-handlers.ts` (standalone) → chokepoints (Ormuz/Suez/
  Bósforo + ACLED), `freight/baltic-dry` (BDI Yahoo), vessels. Importar la lib
  directamente server-side (no depender de BACKEND_URL).
- **Geopolítica**: `lib/geopolitica/{vdem-data,sipri-data,geo-risk-engine,
  country-coords}.ts` (datasets seed). Importar seeds directamente para riesgo
  país de proveedores energéticos.
- **Macro**: `lib/macro/pulso-indicators.ts` + `pulso-fetcher.ts` (EUR/USD Alpha
  Vantage, IPC energía INE, IPI). Reusar fetchers para series concretas.
- **Catálogo**: `lib/energia/catalog.ts` (REACTORES_ES, CAPACIDAD_RENOVABLE_ES,
  PNIEC_2030, H2_PROYECTOS_ES, GNL_ESPANA, PETROLEO_DEPENDENCIA_ES, EMPRESAS_ENERGIA).
- **Vistas**: `app/sector-energia/_components/` (18 .tsx, sin `shared/`).
  `EnergyCompanyCard` en 6 vistas; `SectorIntelPanel` (`components/SectorIntelPanel.tsx`)
  en 7; `EsiosTabsSection` en ElectricoView.

## Olas (waves) y sprints

Barrera entre olas: commit + build verde antes de la siguiente.

### Ola 1 — fundación (paralelo, sin conflicto de ficheros)
- **E1 · Primitivas compartidas + de-dup** (edita las 7 vistas + crea
  `_components/shared/`). Mueve `EnergyCompanyCard`→shared, crea
  `CompanyQuotePanel` (cotización filtrable por tipo), `EnergyIntelDrawer`
  (SectorIntel consolidado), `HeroKpis` (patrón KPIs), `CommoditySnapshot`
  (snapshot-only). Elimina series de commodities duplicadas en Visión Global.
- **E2-data · de-hardcode** (solo ficheros NUEVOS lib/api): `renovables-capacity`
  (REE potencia instalada), `pniec-progress` (mix REE vs PNIEC_2030),
  `gnl-origenes` (de ALSI por terminal), `h2-projects-status`, `petroleo-origenes`
  (curado+freshness), `esios-financial` (indicadores ESIOS no usados).
- **E2-cross · cross-source** (solo ficheros NUEVOS): `energy-logistics`
  (puertos: chokepoints+BDI+metaneros/petroleros), `energy-supply-risk`
  (geopolítica: riesgo país proveedores), `energy-inflation` (macro: IPC
  energía/IPI/EURUSD).

### Ola 2 — profundidad por tipo (paralelo, 1 vista cada uno)
- **E3 Eléctrico**: sub-tab "Mercado financiero" (esios-financial), forecast,
  almacenamiento + intercambios bilaterales.
- **E4 Renovables**: curtailment, correlación eólica-solar, progreso PNIEC live,
  capacidad live, forecast D+1.
- **E5 Nuclear** (el más débil): factor de carga, Gantt cierre, mapa centrales,
  coste desmantelamiento Enresa, contexto IAEA PRIS, uranio.
- **E6 Petróleo**: crack spread, OPEP target vs real, reservas estratégicas,
  forward curve/contango, panel logística (energy-logistics).
- **E7 Gas**: forward curve/contango TTF, demanda inducida, comparativa
  almacenamiento EU, orígenes GNL live, reserva estratégica, logística.
- **E8 Hidrógeno**: LCOH (CAPEX electrolizador + precio luz live), roadmap EU
  RFNBO, mapa proyectos por fase, estados live.
- **E9 Visión Global**: cuadro ejecutivo SIN repetición — snapshot commodities,
  inflación energética, SupplyRiskGauge enriquecido (riesgo país), semáforo.

Reglas Ola 2: cada agente edita SOLO su vista + crea sub-componentes nuevos.
NO tocar `EnergiaShell.tsx`, `catalog.ts`, `types.ts`, `shared/` (solo consumir).

### Ola 3 — cierre
- **E10**: pulido viz (tablas catálogo→cards/timeline/mapas, empty-states
  coherentes), revisión no-repetición, acceptance/humo, build, commit, push
  main+Visual_Oscar, `vercel --prod` desde raíz, smoke producción.

## Verificación

`cd apps/visual-oscar && npm run build` verde tras cada ola. Tests de los libs
nuevos con el harness del repo (`node --experimental-strip-types`). Smoke de
endpoints nuevos (200, no 404).
