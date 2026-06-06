/**
 * Sprint Energía S8b ("exprimir GIE") · Tests del cliente GIE ALSI
 * (lib/energia/alsi.ts · almacenamiento de GNL).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del repo — ver
 * tests/unit/energia/agsi.test.ts). Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/alsi.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURE del payload REAL de ALSI capturado en
 * vivo con la GIE key (2026-06-06):
 *   - Base: https://alsi.gie.eu/api
 *   - Auth: header `x-key` (la MISMA key que AGSI). Sin key la API responde 401
 *       con envelope { error:"access denied", message:"Invalid or missing API key" }.
 *   - Envelope OK: { last_page, total, data: [ {...registro diario} ] }
 *   - Registro: gasDayStart, inventory:{lng,gwh}, sendOut, dtmi:{lng,gwh}, ...
 *       (valores como STRING, huecos "-").
 *   - fullness % de GNL = inventory.gwh / dtmi.gwh × 100 (ES ≈ 75%).
 *
 * Cubre:
 *   1. ES · fullness 75% + inventory/dtmi/send-out correctos (fixture real)
 *   2. EU · type=eu agregado · fullness + inventario
 *   3. serie ascendente + parseAlsiRows/buildLngStorage puros (con hueco "-")
 *   4. key ausente → {ok:false} sin lanzar ni tocar la red
 *   5. header x-key se envía con la key + caché (2ª llamada NO refetch)
 *   6. parseNum (reexportado de agsi) tolera string/"-"/null
 */
import assert from 'node:assert/strict'
import {
  fetchLngStorage,
  parseAlsiRows,
  buildLngStorage,
  _clearAlsiCache,
} from '../../../lib/energia/alsi.ts'
import { parseNum } from '../../../lib/energia/agsi.ts'

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

// ─── FIXTURES (shape REAL ALSI · valores como STRING · capturado 2026-06-06) ──

/**
 * Respuesta ALSI para España (country=ES). El registro principal es el del
 * enunciado (gasDay 2026-06-04, fullness ≈ 75%). Añadimos un día previo con un
 * hueco ("-" en sendOut) para probar la tolerancia del parser y el orden asc.
 * La API entrega más reciente primero (descendente).
 */
function esFixture() {
  return {
    last_page: 0,
    total: 2,
    data: [
      {
        name: 'Spain',
        code: 'ES',
        gasDayStart: '2026-06-04',
        inventory: { lng: '2586.14', gwh: '17400.7' },
        sendOut: '482.7',
        dtmi: { lng: '3446.5', gwh: '23189.58' },
        dtrs: '2132.3',
        contractedCapacity: '-',
        availableCapacity: '-',
        coveredCapacity: '100',
        status: 'C',
      },
      {
        name: 'Spain',
        code: 'ES',
        gasDayStart: '2026-06-03',
        inventory: { lng: '2550.00', gwh: '17150.0' },
        sendOut: '-',
        dtmi: { lng: '3446.5', gwh: '23189.58' },
        status: 'C',
      },
    ],
  }
}

/**
 * Respuesta ALSI agregada UE (type=eu) · 1 gas-day del enunciado:
 * inventory.gwh 33961.39 / dtmi.gwh 62119.13 → fullness ≈ 54.7%, sendOut 3384.9.
 */
function euFixture() {
  return {
    last_page: 0,
    total: 1,
    data: [
      {
        name: 'EU',
        code: 'eu',
        gasDayStart: '2026-06-04',
        inventory: { lng: '5043.0', gwh: '33961.39' },
        sendOut: '3384.9',
        dtmi: { lng: '9223.0', gwh: '62119.13' },
        status: 'C',
      },
    ],
  }
}

/** Envelope de error que devuelve ALSI ante key ausente/inválida (HTTP 401). */
function keyErrorBody() {
  return {
    last_page: 0,
    total: 0,
    dataset: 'lng ERROR',
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
  console.log('\n→ energia · alsi (lng storage)')

  // ── 1. ES · fullness 75% + inventory/dtmi/send-out (fixture real) ────────
  await test('ES · fullness ≈75% + inventory/dtmi/send-out del último día', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAlsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchLngStorage({ country: 'es' })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.ok(r.data)
    const d = r.data!
    assert.equal(d.zona, 'es')
    assert.equal(d.zona_label, 'España')
    // último gas-day = 2026-06-04 (la API entrega desc, el cliente ordena asc)
    assert.equal(d.updated_at, '2026-06-04')
    assert.equal(d.inventory_gwh, 17400.7)
    assert.equal(d.dtmi_gwh, 23189.58)
    assert.equal(d.send_out_gwh, 482.7)
    // fullness = 17400.7 / 23189.58 × 100 ≈ 75.04% (enunciado dice ≈75%)
    assert.ok(d.fullness_pct != null)
    assert.ok(Math.abs(d.fullness_pct! - 75.04) < 0.1, `fullness=${d.fullness_pct}, esperaba ≈75`)
    // el país se mandó como ISO-2 mayúsculas en la query
    assert.match(lastUrl, /country=ES/)
  })

  // ── 2. EU · agregado type=eu ─────────────────────────────────────────────
  await test('EU · type=eu agregado · fullness ≈54.7% + inventario', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearAlsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchLngStorage({ country: 'eu' })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.zona, 'eu')
    assert.equal(d.zona_label, 'Unión Europea')
    assert.equal(d.inventory_gwh, 33961.39)
    assert.equal(d.dtmi_gwh, 62119.13)
    assert.equal(d.send_out_gwh, 3384.9)
    // fullness = 33961.39 / 62119.13 × 100 ≈ 54.67%
    assert.ok(Math.abs(d.fullness_pct! - 54.67) < 0.1, `fullness=${d.fullness_pct}, esperaba ≈54.7`)
    // type=eu va en la query, NO country
    assert.match(lastUrl, /type=eu/)
  })

  // ── 3. Serie ascendente + funciones puras (con hueco "-") ────────────────
  await test('parseAlsiRows + buildLngStorage · puros, orden asc, hueco "-"', () => {
    // parseAlsiRows ordena asc y respeta huecos
    const pts = parseAlsiRows(esFixture().data)
    assert.equal(pts.length, 2)
    assert.equal(pts[0].date, '2026-06-03')
    assert.equal(pts[1].date, '2026-06-04')
    assert.ok(pts[0].date < pts[1].date, 'serie no ascendente')
    // día con sendOut "-" → null
    assert.equal(pts[0].send_out_gwh, null)
    assert.equal(pts[1].send_out_gwh, 482.7)
    // fullness se computa por punto desde inventory.gwh / dtmi.gwh
    assert.ok(pts[1].fullness_pct != null && Math.abs(pts[1].fullness_pct - 75.04) < 0.1)

    // buildLngStorage puro: sin red, a partir de filas crudas
    const d = buildLngStorage('es', esFixture().data)
    assert.equal(d.updated_at, '2026-06-04')
    assert.equal(d.inventory_gwh, 17400.7)
    assert.equal(d.dtmi_gwh, 23189.58)
    // serie de 2 puntos en el objeto ensamblado
    assert.equal(d.series.length, 2)
  })

  // ── 4. Key ausente ──────────────────────────────────────────────────────
  await test('key ausente · {ok:false} sin lanzar ni tocar la red', async () => {
    delete process.env.GIE_API_KEY
    _clearAlsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchLngStorage({ country: 'es' })
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key/)
    assert.match(r.error ?? '', /GIE_API_KEY/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin key')
    assert.ok(r.fetched_at, 'falta fetched_at')
  })

  // ── 5. Header x-key + caché ──────────────────────────────────────────────
  await test('auth · envía x-key + caché (2ª llamada idéntica NO refetch)', async () => {
    process.env.GIE_API_KEY = 'secret-123'
    _clearAlsiCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r1 = await fetchLngStorage({ country: 'es' })
    const callsAfter1 = fetchCalls
    const r2 = await fetchLngStorage({ country: 'es' })
    const callsAfter2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true)
    assert.equal(r2.ok, true)
    const xk = (lastHeaders as any)['x-key']
    assert.equal(xk, 'secret-123', `esperaba x-key en headers, hay: ${JSON.stringify(lastHeaders)}`)
    // la key NUNCA debe ir en la URL
    assert.ok(!/secret-123/.test(lastUrl), 'la key no debe ir en la query string')
    // caché: solo 1 fetch real
    assert.equal(callsAfter1, 1, `1ª llamada debió hacer 1 fetch, hizo ${callsAfter1}`)
    assert.equal(callsAfter2, 1, `2ª llamada NO debió refetch, total=${callsAfter2}`)
    assert.deepEqual(r1.data, r2.data)
  })

  // ── 6. Envelope de error de la API + parseNum ────────────────────────────
  await test('envelope error ALSI (access denied) → {ok:false}; parseNum tolera strings', async () => {
    process.env.GIE_API_KEY = 'bad-key'
    _clearAlsiCache()
    installFetchMock({ status: 200, bodyForUrl: () => keyErrorBody() })

    const r = await fetchLngStorage({ country: 'es' })
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /alsi_error|api key/i)

    // parseNum (reexportado de agsi) normaliza los STRING de ALSI
    assert.equal(parseNum('17400.7'), 17400.7)
    assert.equal(parseNum('-'), null)
    assert.equal(parseNum(''), null)
    assert.equal(parseNum(null), null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
