/**
 * Sprint Energía S8b ("exprimir GIE") · Tests del cliente GIE IIP
 * (lib/energia/iip.ts · Inside Information Platform · eventos UMM de mercado
 * gasista).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del repo — ver
 * tests/unit/energia/agsi.test.ts). Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/iip.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURE del payload REAL de IIP capturado en
 * vivo con la GIE key (2026-06-06):
 *   - Base: https://iip.gie.eu/api
 *   - Auth: header `x-key` (la MISMA key que AGSI/ALSI).
 *   - Envelope OK: { current_page, last_page, total, data: [ {...UMM} ] }
 *   - UMM: submitted, reportingEntity:{name,...}, message:{messageType,
 *       unavailabilityType,...}, asset, from, to, unavailable, balancingZone,
 *       unavailabilityReason, ...
 *
 * Cubre:
 *   1. parseInsideEvents mapea los campos anidados al shape plano de la UI
 *   2. orden por `submitted` descendente (lo más reciente primero)
 *   3. data[] vacío / filas malformadas → no lanza, devuelve []
 *   4. key ausente → {ok:false} sin lanzar ni tocar la red
 *   5. header x-key + caché + filtro country en la query
 */
import assert from 'node:assert/strict'
import {
  fetchGieInsideInfo,
  parseInsideEvents,
  _clearIipCache,
} from '../../../lib/energia/iip.ts'

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

// ─── FIXTURE (shape REAL IIP · capturado en vivo 2026-06-06) ─────────────────

/**
 * Respuesta IIP con 2 UMM. La primera es el registro real del enunciado (TAQA
 * Gas Storage · indisponibilidad planificada de planta de tratamiento). La
 * segunda es más antigua (orden) y trae un activo + zona de balance para probar
 * el mapeo completo. Se incluye una tercera fila malformada (null) para probar
 * que parseInsideEvents no lanza.
 */
function iipFixture() {
  return {
    current_page: 1,
    last_page: 5,
    total: 97,
    data: [
      {
        submitted: '2026-06-06 05:07:23',
        reportingEntity: { name: 'TAQA Gas Storage B.V.', code: '21X000000001234A', type: 'SSO' },
        message: {
          messageId: 'MSG-1',
          messageType: 'Gas treatment plant unavailability',
          reportType: 'unavailabilityOfGasFacilitiesReport',
          unavailabilityType: 'Planned',
        },
        messageString: 'Planned maintenance at treatment plant.',
        status: 'Active',
        from: '2026-06-10 06:00:00',
        to: '2026-06-12 06:00:00',
        duration: '48h',
        asset: 'Bergermeer treatment',
        unavailable: '120 GWh/d',
        balancingZone: 'NL TTF',
        unavailabilityReason: 'Maintenance',
      },
      {
        submitted: '2026-06-05 12:30:00',
        reportingEntity: { name: 'Enagás Transporte', code: '21X000000005678B', type: 'TSO' },
        message: {
          messageId: 'MSG-2',
          messageType: 'LNG facility unavailability',
          reportType: 'unavailabilityOfGasFacilitiesReport',
          unavailabilityType: 'Unplanned',
        },
        status: 'Active',
        from: '2026-06-05 10:00:00',
        to: '2026-06-07 10:00:00',
        asset: 'Barcelona LNG',
        unavailable: '-',
        balancingZone: 'ES',
        unavailabilityReason: 'Technical failure',
      },
      // Fila malformada: parseInsideEvents debe ignorarla sin lanzar.
      null,
    ],
  }
}

// ─── Mock de fetch ──────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0
let lastUrl = ''
let lastHeaders: Record<string, any> = {}

interface MockOpts {
  status?: number
  body?: any
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
    const body = opts.body ?? iipFixture()
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => body,
    } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ energia · iip (inside information platform)')

  // ── 1. parseInsideEvents mapea los campos anidados ───────────────────────
  await test('parseInsideEvents · mapea entity/asset/message_type/unavailability/window', () => {
    const events = parseInsideEvents(iipFixture().data)
    // 2 eventos válidos (la fila null se ignora)
    assert.equal(events.length, 2)
    // El más reciente (TAQA) queda primero por orden desc → comprobamos su mapeo
    const taqa = events[0]
    assert.equal(taqa.submitted, '2026-06-06 05:07:23')
    assert.equal(taqa.entity, 'TAQA Gas Storage B.V.')
    assert.equal(taqa.asset, 'Bergermeer treatment')
    assert.equal(taqa.message_type, 'Gas treatment plant unavailability')
    assert.equal(taqa.unavailability_type, 'Planned')
    assert.equal(taqa.from, '2026-06-10 06:00:00')
    assert.equal(taqa.to, '2026-06-12 06:00:00')
    assert.equal(taqa.unavailable, '120 GWh/d')
    assert.equal(taqa.balancing_zone, 'NL TTF')
    assert.equal(taqa.reason, 'Maintenance')
    // El segundo (Enagás) trae unavailable "-" → null tras normalizar
    const enagas = events[1]
    assert.equal(enagas.entity, 'Enagás Transporte')
    assert.equal(enagas.unavailability_type, 'Unplanned')
    assert.equal(enagas.unavailable, null, 'sendOut "-" debió normalizar a null')
    assert.equal(enagas.balancing_zone, 'ES')
  })

  // ── 2. Orden por submitted descendente ───────────────────────────────────
  await test('parseInsideEvents · ordena por submitted descendente (reciente primero)', () => {
    const events = parseInsideEvents(iipFixture().data)
    assert.equal(events[0].submitted, '2026-06-06 05:07:23')
    assert.equal(events[1].submitted, '2026-06-05 12:30:00')
    assert.ok((events[0].submitted ?? '') > (events[1].submitted ?? ''), 'no está en orden desc')
  })

  // ── 3. Vacío / malformado no lanza ───────────────────────────────────────
  await test('parseInsideEvents · data vacío o no-array → [] sin lanzar', () => {
    assert.deepEqual(parseInsideEvents([]), [])
    assert.deepEqual(parseInsideEvents(null), [])
    assert.deepEqual(parseInsideEvents(undefined), [])
    assert.deepEqual(parseInsideEvents('nope' as unknown), [])
    // array con solo basura → []
    assert.deepEqual(parseInsideEvents([null, 5, 'x'] as unknown), [])
  })

  // ── 4. Key ausente ──────────────────────────────────────────────────────
  await test('key ausente · {ok:false} sin lanzar ni tocar la red', async () => {
    delete process.env.GIE_API_KEY
    _clearIipCache()
    installFetchMock({})

    const r = await fetchGieInsideInfo({ country: 'es' })
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key/)
    assert.match(r.error ?? '', /GIE_API_KEY/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin key')
    assert.ok(r.fetched_at, 'falta fetched_at')
  })

  // ── 5. Fetch OK · x-key + caché + filtro country ─────────────────────────
  await test('fetch OK · x-key + caché + filtro country=ES en la query', async () => {
    process.env.GIE_API_KEY = 'secret-iip'
    _clearIipCache()
    installFetchMock({})

    const r1 = await fetchGieInsideInfo({ country: 'es', size: 20 })
    const callsAfter1 = fetchCalls
    const r2 = await fetchGieInsideInfo({ country: 'es', size: 20 })
    const callsAfter2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true, r1.error)
    assert.ok(r1.data)
    assert.equal(r1.data!.events.length, 2)
    // header x-key con la key, nunca en la URL
    assert.equal((lastHeaders as any)['x-key'], 'secret-iip')
    assert.ok(!/secret-iip/.test(lastUrl), 'la key no debe ir en la query string')
    // país → country=ES (mayúsculas) en la query
    assert.match(lastUrl, /country=ES/)
    assert.match(lastUrl, /size=20/)
    // caché: 2ª llamada idéntica NO refetch
    assert.equal(callsAfter1, 1, `1ª llamada debió hacer 1 fetch, hizo ${callsAfter1}`)
    assert.equal(callsAfter2, 1, `2ª llamada NO debió refetch, total=${callsAfter2}`)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
