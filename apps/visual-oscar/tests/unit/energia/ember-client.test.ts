/**
 * Sprint Energía S2 · Tests del cliente Ember (lib/ember/client.ts).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del repo — ver
 * tests/unit/medios/canonical/scoring/momentum.test.ts). Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/ember-client.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURES del payload real de Ember capturado
 * vía WebFetch del OpenAPI (2026-06-02):
 *   - Envelope: { stats: {...}, data: [ {...registro} ] }
 *   - Auth: query param api_key (sin key → cliente devuelve {ok:false} sin red).
 *   - Campos generación: entity, entity_code, date, series, generation_twh,
 *       share_of_generation_pct, is_aggregate_series
 *   - Campos carbono: emissions_intensity_gco2_per_kwh
 *   - Campos demanda: demand_twh, demand_mwh_per_capita
 *
 * Cubre:
 *   1. parsing generación (fuentes + % + agregados renovable/limpio/fósil)
 *   2. parsing intensidad de carbono (gCO2/kWh)
 *   3. parsing perfil país (mix + carbono + demanda + tendencia)
 *   4. caché: 2ª llamada idéntica NO refetch (mismo contador)
 *   5. key ausente → {ok:false} sin lanzar ni tocar la red
 *   6. fetch falla (HTTP 500) → {ok:false} sin lanzar
 *   7. tolerancia a generation_twh null (no rompe agregados)
 */
import assert from 'node:assert/strict'
import {
  fetchEmberGeneration,
  fetchCarbonIntensity,
  fetchCountryProfile,
  _clearEmberCache,
} from '../../../lib/ember/client.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error('    ', (e as Error).message)
    if ((e as Error).stack)
      console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// ─── FIXTURES (shape real Ember) ───────────────────────────────────────────

/** Generación anual España 2022-2023, varias fuentes + 1 agregado. */
function genFixtureSpain() {
  return {
    stats: {
      timestamp: '2026-06-02T00:00:00Z',
      response_time_in_seconds: 0.12,
      rate_limit: 1000,
      number_of_records: 12,
      query_parameters_used: {},
      available_metrics: ['generation_twh', 'share_of_generation_pct'],
      query_value_range: '',
      query_all_dates_value_range: '',
    },
    data: [
      // 2023
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Wind', is_aggregate_series: false, generation_twh: 60.0, share_of_generation_pct: 24.0 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Solar', is_aggregate_series: false, generation_twh: 37.0, share_of_generation_pct: 14.8 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Nuclear', is_aggregate_series: false, generation_twh: 54.0, share_of_generation_pct: 21.6 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Hydro', is_aggregate_series: false, generation_twh: 25.0, share_of_generation_pct: 10.0 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Gas', is_aggregate_series: false, generation_twh: 49.0, share_of_generation_pct: 19.6 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Coal', is_aggregate_series: false, generation_twh: 12.0, share_of_generation_pct: 4.8 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Bioenergy', is_aggregate_series: false, generation_twh: 13.0, share_of_generation_pct: 5.2 },
      // Agregado que la API a veces incluye · DEBE filtrarse (no doble conteo)
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Total Generation', is_aggregate_series: true, generation_twh: 250.0, share_of_generation_pct: 100.0 },
      // 2022 (año anterior, para tendencia)
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2022', series: 'Wind', is_aggregate_series: false, generation_twh: 55.0, share_of_generation_pct: 22.0 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2022', series: 'Solar', is_aggregate_series: false, generation_twh: 28.0, share_of_generation_pct: 11.2 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2022', series: 'Nuclear', is_aggregate_series: false, generation_twh: 56.0, share_of_generation_pct: 22.4 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2022', series: 'Gas', is_aggregate_series: false, generation_twh: 61.0, share_of_generation_pct: 24.4 },
    ],
  }
}

/** Intensidad de carbono anual España. */
function carbonFixtureSpain() {
  return {
    stats: { timestamp: '2026-06-02T00:00:00Z', response_time_in_seconds: 0.05, rate_limit: 1000, number_of_records: 2, query_parameters_used: {}, available_metrics: ['emissions_intensity_gco2_per_kwh'], query_value_range: '', query_all_dates_value_range: '' },
    data: [
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2022', emissions_intensity_gco2_per_kwh: 171.0 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', emissions_intensity_gco2_per_kwh: 152.0 },
    ],
  }
}

/** Demanda anual España. */
function demandFixtureSpain() {
  return {
    stats: { timestamp: '2026-06-02T00:00:00Z', response_time_in_seconds: 0.04, rate_limit: 1000, number_of_records: 1, query_parameters_used: {}, available_metrics: ['demand_twh'], query_value_range: '', query_all_dates_value_range: '' },
    data: [
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', demand_twh: 244.0, demand_mwh_per_capita: 5.1 },
    ],
  }
}

/** Generación con un valor null (robustez del parser). */
function genFixtureWithNull() {
  return {
    stats: { timestamp: '2026-06-02T00:00:00Z', response_time_in_seconds: 0.1, rate_limit: 1000, number_of_records: 3, query_parameters_used: {}, available_metrics: ['generation_twh'], query_value_range: '', query_all_dates_value_range: '' },
    data: [
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Wind', is_aggregate_series: false, generation_twh: 60.0, share_of_generation_pct: 60.0 },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Solar', is_aggregate_series: false, generation_twh: null, share_of_generation_pct: null },
      { entity: 'Spain', entity_code: 'ESP', is_aggregate_entity: false, date: '2023', series: 'Gas', is_aggregate_series: false, generation_twh: 40.0, share_of_generation_pct: 40.0 },
    ],
  }
}

// ─── Mock de fetch ──────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0
let lastUrl = ''

interface MockOpts {
  status?: number
  bodyForUrl?: (url: string) => any
}

function installFetchMock(opts: MockOpts = {}) {
  fetchCalls = 0
  lastUrl = ''
  globalThis.fetch = (async (input: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    lastUrl = u
    const status = opts.status ?? 200
    if (status !== 200) {
      return {
        ok: false,
        status,
        statusText: 'Error',
        json: async () => ({ detail: 'boom' }),
      } as any
    }
    const body = opts.bodyForUrl
      ? opts.bodyForUrl(u)
      : { stats: {}, data: [] }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    } as any
  }) as any
}

function routeFixture(url: string): any {
  if (url.includes('/electricity-generation/')) return genFixtureSpain()
  if (url.includes('/carbon-intensity/')) return carbonFixtureSpain()
  if (url.includes('/electricity-demand/')) return demandFixtureSpain()
  return { stats: {}, data: [] }
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ ember · client')

  // ── 1. Parsing generación ──────────────────────────────────────────────
  await test('generación · parsea fuentes, total y agregados renovable/limpio/fósil', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchEmberGeneration({ country: 'Spain', year: 2023 })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.ok(r.data)
    const d = r.data!
    assert.equal(d.entity, 'Spain')
    assert.equal(d.entity_code, 'ESP')
    assert.equal(d.date, '2023')
    // 7 fuentes elementales (el agregado "Total Generation" se filtra)
    assert.equal(d.by_source.length, 7, `esperaba 7 fuentes, hay ${d.by_source.length}`)
    assert.ok(!d.by_source.some((s) => s.series === 'Total Generation'), 'agregado no filtrado')
    // total = 60+37+54+25+49+12+13 = 250
    assert.equal(d.total_twh, 250)
    // orden descendente por generación → Wind primero
    assert.equal(d.by_source[0].series, 'Wind')
    // renovable = wind+solar+hydro+bio = 60+37+25+13 = 135 → 54%
    assert.equal(d.renewable_pct, 54)
    // limpio = renovable + nuclear(54) = 189 → 75.6%
    assert.equal(d.clean_pct, 75.6)
    // fósil = gas(49)+coal(12) = 61 → 24.4%
    assert.equal(d.fossil_pct, 24.4)
  })

  // ── 2. Parsing intensidad de carbono ───────────────────────────────────
  await test('intensidad carbono · devuelve gCO2/kWh del periodo más reciente', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchCarbonIntensity({ country: 'Spain' })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.ok(r.data)
    // último periodo = 2023 → 152
    assert.equal(r.data!.date, '2023')
    assert.equal(r.data!.gco2_per_kwh, 152)
    assert.equal(r.data!.entity_code, 'ESP')
  })

  // ── 3. Perfil país ─────────────────────────────────────────────────────
  await test('perfil país · combina mix + carbono + demanda + tendencia', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchCountryProfile('ESP')
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.entity_code, 'ESP')
    assert.equal(d.latest_year, '2023')
    assert.ok(d.generation, 'sin mix')
    assert.equal(d.generation!.total_twh, 250)
    assert.ok(d.carbon_intensity, 'sin carbono')
    assert.equal(d.carbon_intensity!.gco2_per_kwh, 152)
    assert.equal(d.demand_twh, 244)
    assert.equal(d.demand_mwh_per_capita, 5.1)
    // tendencia renovable: 2 años (2022, 2023) orden ascendente
    assert.equal(d.renewable_trend.length, 2)
    assert.equal(d.renewable_trend[0].year, '2022')
    assert.equal(d.renewable_trend[1].year, '2023')
    assert.equal(d.renewable_trend[1].renewable_pct, 54)
  })

  // ── 4. Caché ───────────────────────────────────────────────────────────
  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r1 = await fetchEmberGeneration({ country: 'Spain', year: 2023 })
    const callsAfter1 = fetchCalls
    const r2 = await fetchEmberGeneration({ country: 'Spain', year: 2023 })
    const callsAfter2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true)
    assert.equal(r2.ok, true)
    assert.equal(callsAfter1, 1, `1ª llamada debió hacer 1 fetch, hizo ${callsAfter1}`)
    assert.equal(callsAfter2, 1, `2ª llamada NO debió refetch, total fetches=${callsAfter2}`)
    // mismo payload
    assert.deepEqual(r1.data, r2.data)
  })

  // ── 5. Key ausente ─────────────────────────────────────────────────────
  await test('key ausente · {ok:false} sin lanzar ni tocar la red', async () => {
    delete process.env.EMBER_API_KEY
    _clearEmberCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchEmberGeneration({ country: 'Spain' })
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin key')
    assert.ok(r.fetched_at, 'falta fetched_at')
  })

  // ── 6. Fetch falla ─────────────────────────────────────────────────────
  await test('fetch falla (HTTP 500) · {ok:false} sin lanzar', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ status: 500 })

    const r = await fetchCarbonIntensity({ country: 'Spain' })
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /http_500/)
    assert.ok(r.fetched_at)
  })

  // ── 7. Tolerancia a null ───────────────────────────────────────────────
  await test('robustez · generation_twh null no rompe agregados', async () => {
    process.env.EMBER_API_KEY = 'test-key'
    _clearEmberCache()
    installFetchMock({ bodyForUrl: () => genFixtureWithNull() })

    const r = await fetchEmberGeneration({ country: 'Spain', year: 2023 })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    // total = wind(60) + solar(null→0) + gas(40) = 100
    assert.equal(d.total_twh, 100)
    // renovable = wind(60) + solar(0) = 60 → 60%
    assert.equal(d.renewable_pct, 60)
    // fósil = gas(40) → 40%
    assert.equal(d.fossil_pct, 40)
    // la fila solar sigue presente con null preservado
    const solar = d.by_source.find((s) => s.series === 'Solar')
    assert.ok(solar)
    assert.equal(solar!.generation_twh, null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
