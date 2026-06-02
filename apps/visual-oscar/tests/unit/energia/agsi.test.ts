/**
 * Sprint Energía S8 · Tests del cliente GIE AGSI (lib/energia/agsi.ts) +
 * validación del catálogo GNL_ESPANA (lib/energia/catalog.ts).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del repo — ver
 * tests/unit/energia/ember-client.test.ts). Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/agsi.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURE del payload real de AGSI capturado vía
 * WebFetch del endpoint + User Manual GIE v007 (2026-06-02):
 *   - Base: https://agsi.gie.eu/api
 *   - Auth: header `x-key`. Sin key la API responde 401 con envelope de error
 *       { error:"access denied", message:"Invalid or missing API key", data:[] }.
 *   - Envelope OK: { last_page, total, data: [ {...registro diario} ] }
 *   - Campos por registro: gasDayStart, full, gasInStorage, workingGasVolume,
 *       injection, withdrawal, trend, ... (valores como STRING).
 *
 * Cubre:
 *   1. parsing % lleno + TWh + inyección/extracción del último día (zona UE)
 *   2. agregación zona ES (country=ES) · fase derivada (extracción)
 *   3. serie ordenada ascendente + working gas volume + trend del último día
 *   4. key ausente → {ok:false} sin lanzar ni tocar la red
 *   5. envelope de error de la API (200 con message API key) → {ok:false}
 *   6. caché: 2ª llamada idéntica NO refetch
 *   7. el header x-key se envía con la key
 *   8. parseNum tolera string/"-"/null
 *   9. GNL_ESPANA · shape válido (plantas + orígenes suman ~100%)
 */
import assert from 'node:assert/strict'
import {
  fetchGasStorage,
  parseAgsiRows,
  buildGasStorage,
  parseNum,
  _clearAgsiCache,
} from '../../../lib/energia/agsi.ts'
import { GNL_ESPANA } from '../../../lib/energia/catalog.ts'

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

// ─── FIXTURES (shape real AGSI · valores como STRING) ───────────────────────

/**
 * Respuesta AGSI agregada UE (type=eu), 3 gas-days en fase de INYECCIÓN
 * (inyección > extracción · típico verano). La API entrega más reciente
 * primero (descendente).
 */
function euFixture() {
  return {
    last_page: 0,
    total: 3,
    data: [
      {
        gasDayStart: '2024-07-03',
        gasInStorage: '880.50',
        full: '78.45',
        trend: '0.42',
        injection: '4200.00',
        withdrawal: '120.00',
        workingGasVolume: '1122.30',
        injectionCapacity: '12000.00',
        withdrawalCapacity: '18000.00',
        status: 'C',
        name: 'EU',
        code: 'eu',
      },
      {
        gasDayStart: '2024-07-02',
        gasInStorage: '875.80',
        full: '78.03',
        trend: '0.40',
        injection: '4100.00',
        withdrawal: '130.00',
        workingGasVolume: '1122.30',
        status: 'C',
        name: 'EU',
        code: 'eu',
      },
      {
        gasDayStart: '2024-07-01',
        gasInStorage: '871.30',
        full: '77.63',
        trend: '0.38',
        injection: '4000.00',
        withdrawal: '140.00',
        workingGasVolume: '1122.30',
        status: 'C',
        name: 'EU',
        code: 'eu',
      },
    ],
  }
}

/**
 * Respuesta AGSI para España (country=ES), 2 gas-days en fase de EXTRACCIÓN
 * (extracción > inyección · típico invierno). Incluye un hueco ("-") para
 * probar la tolerancia del parser.
 */
function esFixture() {
  return {
    last_page: 0,
    total: 2,
    data: [
      {
        gasDayStart: '2024-01-15',
        gasInStorage: '28.40',
        full: '85.12',
        trend: '-0.95',
        injection: '50.00',
        withdrawal: '320.00',
        workingGasVolume: '33.36',
        status: 'C',
        name: 'Spain',
        code: 'ES',
      },
      {
        gasDayStart: '2024-01-14',
        gasInStorage: '29.10',
        full: '87.20',
        trend: '-',
        injection: '-',
        withdrawal: '300.00',
        workingGasVolume: '33.36',
        status: 'C',
        name: 'Spain',
        code: 'ES',
      },
    ],
  }
}

/** Envelope de error que devuelve AGSI ante key ausente/ inválida (HTTP 401). */
function keyErrorBody() {
  return {
    last_page: 0,
    total: 0,
    dataset: 'storage ERROR',
    error: 'access denied',
    message: 'Invalid or missing API key',
    data: [],
  }
}

// ─── Mock de fetch ──────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0
let lastUrl = ''
let lastHeaders: Record<string, any> = {}

interface MockOpts {
  status?: number
  bodyForUrl?: (url: string) => any
}

function installFetchMock(opts: MockOpts = {}) {
  fetchCalls = 0
  lastUrl = ''
  lastHeaders = {}
  globalThis.fetch = (async (input: any, init?: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    lastUrl = u
    lastHeaders = (init?.headers ?? {}) as Record<string, any>
    const status = opts.status ?? 200
    const body = opts.bodyForUrl ? opts.bodyForUrl(u) : { last_page: 0, total: 0, data: [] }
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => body,
    } as any
  }) as any
}

function routeFixture(url: string): any {
  if (/type=eu/.test(url)) return euFixture()
  if (/country=ES/i.test(url)) return esFixture()
  return { last_page: 0, total: 0, data: [] }
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ energia · agsi (gas storage)')

  // ── 1. Parsing UE · % lleno + TWh + inyección/extracción ────────────────
  await test('UE · parsea % lleno, TWh, inyección/extracción del último día', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchGasStorage({ country: 'eu' })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.ok(r.data)
    const d = r.data!
    assert.equal(d.zone, 'eu')
    assert.equal(d.zone_label, 'Unión Europea')
    // último gas-day = 2024-07-03 (la API entrega desc, el cliente ordena asc)
    assert.equal(d.latest_date, '2024-07-03')
    assert.equal(d.full_pct, 78.45)
    assert.equal(d.gas_in_storage_twh, 880.5)
    assert.equal(d.injection_gwh, 4200)
    assert.equal(d.withdrawal_gwh, 120)
    // inyección >> extracción → fase 'inyeccion'
    assert.equal(d.fase, 'inyeccion')
  })

  // ── 2. Agregación ES · fase extracción ──────────────────────────────────
  await test('ES · country=ES · fase extracción (withdrawal > injection)', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchGasStorage({ country: 'es' })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.zone, 'es')
    assert.equal(d.zone_label, 'España')
    assert.equal(d.latest_date, '2024-01-15')
    assert.equal(d.full_pct, 85.12)
    assert.equal(d.gas_in_storage_twh, 28.4)
    assert.equal(d.withdrawal_gwh, 320)
    // extracción >> inyección → fase 'extraccion'
    assert.equal(d.fase, 'extraccion')
    // el país se mandó como ISO-2 mayúsculas en la query
    assert.match(lastUrl, /country=ES/)
  })

  // ── 3. Serie ascendente + working gas volume + trend ────────────────────
  await test('serie ascendente + working gas volume + trend del último día', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchGasStorage({ country: 'eu' })
    restoreFetch()

    const d = r.data!
    // 3 puntos, orden ascendente por fecha
    assert.equal(d.series.length, 3)
    assert.equal(d.series[0].date, '2024-07-01')
    assert.equal(d.series[2].date, '2024-07-03')
    assert.ok(d.series[0].date < d.series[2].date, 'serie no ascendente')
    // working gas volume + trend del último día
    assert.equal(d.working_gas_volume_twh, 1122.3)
    assert.equal(d.trend, 0.42)
    // cada punto lleva sus inyección/extracción parseadas
    assert.equal(d.series[0].injection_gwh, 4000)
    assert.equal(d.series[2].injection_gwh, 4200)
  })

  // ── 4. Key ausente ──────────────────────────────────────────────────────
  await test('key ausente · {ok:false} sin lanzar ni tocar la red', async () => {
    delete process.env.GIE_API_KEY
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchGasStorage({ country: 'eu' })
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key/)
    assert.match(r.error ?? '', /GIE_API_KEY/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin key')
    assert.ok(r.fetched_at, 'falta fetched_at')
  })

  // ── 5. Envelope de error de la API (200 + message API key) ──────────────
  await test('envelope de error AGSI (access denied) → {ok:false} sin lanzar', async () => {
    process.env.GIE_API_KEY = 'bad-key'
    _clearAgsiCache()
    installFetchMock({ status: 200, bodyForUrl: () => keyErrorBody() })

    const r = await fetchGasStorage({ country: 'eu' })
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /agsi_error|api key/i)
    assert.ok(r.fetched_at)
  })

  // ── 6. Caché ────────────────────────────────────────────────────────────
  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r1 = await fetchGasStorage({ country: 'eu' })
    const callsAfter1 = fetchCalls
    const r2 = await fetchGasStorage({ country: 'eu' })
    const callsAfter2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true)
    assert.equal(r2.ok, true)
    assert.equal(callsAfter1, 1, `1ª llamada debió hacer 1 fetch, hizo ${callsAfter1}`)
    assert.equal(callsAfter2, 1, `2ª llamada NO debió refetch, total=${callsAfter2}`)
    assert.deepEqual(r1.data, r2.data)
  })

  // ── 7. Header x-key ─────────────────────────────────────────────────────
  await test('auth · envía el header x-key con la key', async () => {
    process.env.GIE_API_KEY = 'secret-123'
    _clearAgsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    await fetchGasStorage({ country: 'eu' })
    restoreFetch()

    const xk = (lastHeaders as any)['x-key']
    assert.equal(xk, 'secret-123', `esperaba x-key en headers, hay: ${JSON.stringify(lastHeaders)}`)
    // la key NUNCA debe ir en la URL
    assert.ok(!/secret-123/.test(lastUrl), 'la key no debe ir en la query string')
  })

  // ── 8. parseNum · funciones puras ───────────────────────────────────────
  await test('parseNum + parseAgsiRows · toleran string/"-"/null', async () => {
    assert.equal(parseNum('87.62'), 87.62)
    assert.equal(parseNum(42), 42)
    assert.equal(parseNum('-'), null)
    assert.equal(parseNum(''), null)
    assert.equal(parseNum(null), null)
    assert.equal(parseNum('n/a'), null)

    // parseAgsiRows ordena asc y respeta huecos
    const pts = parseAgsiRows(esFixture().data)
    assert.equal(pts.length, 2)
    assert.equal(pts[0].date, '2024-01-14')
    assert.equal(pts[1].date, '2024-01-15')
    // día con injection "-" → null
    assert.equal(pts[0].injection_gwh, null)
    assert.equal(pts[1].injection_gwh, 50)

    // buildGasStorage puro: sin red, a partir de filas crudas
    const d = buildGasStorage('es', esFixture().data)
    assert.equal(d.full_pct, 85.12)
    assert.equal(d.fase, 'extraccion')
  })

  // ── 9. Catálogo GNL_ESPANA ──────────────────────────────────────────────
  await test('GNL_ESPANA · shape válido (plantas + orígenes ≈ 100%)', () => {
    assert.ok(Array.isArray(GNL_ESPANA.plantas), 'plantas no es array')
    assert.ok(GNL_ESPANA.plantas.length >= 6, `esperaba ≥6 plantas, hay ${GNL_ESPANA.plantas.length}`)
    // Las 6 plantas en operación del enunciado están presentes.
    const nombres = GNL_ESPANA.plantas.map((p) => p.nombre)
    for (const planta of ['Barcelona', 'Cartagena', 'Huelva', 'Bilbao', 'Sagunto', 'Mugardos']) {
      assert.ok(nombres.includes(planta), `falta la planta ${planta}`)
    }
    // Cada planta tiene los campos requeridos.
    for (const p of GNL_ESPANA.plantas) {
      assert.equal(typeof p.nombre, 'string')
      assert.equal(typeof p.ubicacion, 'string')
      assert.equal(typeof p.operador, 'string')
      assert.ok(['operativa', 'puesta en marcha', 'planificada'].includes(p.estado), `estado inválido: ${p.estado}`)
      assert.ok(p.emision_gwh_dia === null || typeof p.emision_gwh_dia === 'number')
    }
    // Orígenes suman ~100% (tolerancia ±2).
    assert.ok(GNL_ESPANA.origenes.length >= 4, 'pocos orígenes')
    const total = GNL_ESPANA.origenes.reduce((s, o) => s + o.cuota_pct, 0)
    assert.ok(Math.abs(total - 100) <= 2, `orígenes suman ${total}%, esperaba ≈100%`)
    // EE. UU. y Argelia entre los orígenes (post-2022).
    const paises = GNL_ESPANA.origenes.map((o) => o.pais)
    assert.ok(paises.some((p) => /estados unidos|ee\.? ?uu/i.test(p)), 'falta EE. UU.')
    assert.ok(paises.some((p) => /argelia/i.test(p)), 'falta Argelia')
    // Metadata de fuente presente.
    assert.match(GNL_ESPANA.fuente_url, /^https?:\/\//)
    assert.ok(GNL_ESPANA.cuota_gnl_pct > 0 && GNL_ESPANA.cuota_gnl_pct <= 100)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
