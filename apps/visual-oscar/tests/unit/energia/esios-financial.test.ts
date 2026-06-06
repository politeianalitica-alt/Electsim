/**
 * Energía v3 · E2-data · Tests del cliente ESIOS financiero/ajuste
 * (lib/energia/esios-financial.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/agsi.test.ts). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/esios-financial.test.ts
 *
 * Mock de `globalThis.fetch` con la respuesta de api.esios.ree.es
 * (`{ indicator: { id, values:[{value, datetime, datetime_utc, ...}] } }`).
 * Enruta por el ID en la URL para simular un 404 en UN indicador y comprobar la
 * degradación POR-INDICADOR (el conjunto no se rompe).
 *
 * Cubre:
 *   1. todos OK · ajuste + bilateral poblados, ok_count = total
 *   2. degradación por-indicador · un 404 → ese ok:false, resto OK, global ok:true
 *   3. summariseIndicator puro · last_value/serie/null
 *   4. pickFinancialSlugs puro · resuelve items del catálogo
 *   5. key ausente · todos no_key, global ok:false (200 en la route)
 */
import assert from 'node:assert/strict'
import {
  fetchEsiosFinancial,
  summariseIndicator,
  pickFinancialSlugs,
  ESIOS_FINANCIAL_AJUSTE_SLUGS,
  ESIOS_FINANCIAL_BILATERAL_SLUGS,
  _clearEsiosFinancialCache,
} from '../../../lib/energia/esios-financial.ts'
import { ESIOS_CATALOG } from '../../../lib/esios/catalog.ts'

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
  }
}

// ─── FIXTURE ESIOS indicator ──────────────────────────────────────────────────
function indicatorBody(id: number) {
  return {
    indicator: {
      id,
      name: `Indicador ${id}`,
      short_name: `Ind ${id}`,
      values: [
        { value: 10, datetime: '2026-06-05T00:00:00+02:00', datetime_utc: '2026-06-04T22:00:00Z', tz_time: 'CEST', geo_id: 8741, geo_name: 'Península' },
        { value: 12, datetime: '2026-06-05T01:00:00+02:00', datetime_utc: '2026-06-04T23:00:00Z', tz_time: 'CEST', geo_id: 8741, geo_name: 'Península' },
        { value: 15, datetime: '2026-06-05T02:00:00+02:00', datetime_utc: '2026-06-05T00:00:00Z', tz_time: 'CEST', geo_id: 8741, geo_name: 'Península' },
      ],
    },
  }
}

const realFetch = globalThis.fetch
let fetchCalls = 0

/** Mock que responde 200 a todos salvo `failId` (404). */
function installFetchMock(failId?: number) {
  fetchCalls = 0
  globalThis.fetch = (async (input: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    const m = u.match(/indicators\/(\d+)/)
    const id = m ? Number(m[1]) : 0
    if (failId != null && id === failId) {
      return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as any
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => indicatorBody(id),
    } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

async function run() {
  console.log('\n→ energia · esios-financial')

  const totalSlugs = ESIOS_FINANCIAL_AJUSTE_SLUGS.length + ESIOS_FINANCIAL_BILATERAL_SLUGS.length

  // ── 1. todos OK ──────────────────────────────────────────────────────────
  await test('todos OK · ajuste + bilateral poblados, ok_count = total', async () => {
    process.env.ESIOS_API_KEY = 'test-key'
    _clearEsiosFinancialCache()
    installFetchMock()
    const r = await fetchEsiosFinancial({ hoursBack: 24 })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.ajuste.length, ESIOS_FINANCIAL_AJUSTE_SLUGS.length)
    assert.equal(d.bilateral.length, ESIOS_FINANCIAL_BILATERAL_SLUGS.length)
    assert.equal(d.total_count, totalSlugs)
    assert.equal(d.ok_count, totalSlugs)
    // un indicador concreto trae último valor 15 + change 24h calculado
    const rt = d.ajuste.find((x) => x.slug === 'restricciones_tecnicas')
    assert.ok(rt && rt.ok)
    assert.equal(rt!.last_value, 15)
    assert.ok(rt!.series.length === 3)
  })

  // ── 2. degradación por-indicador ─────────────────────────────────────────
  await test('degradación por-indicador · un 404 no rompe el resto', async () => {
    process.env.ESIOS_API_KEY = 'test-key'
    _clearEsiosFinancialCache()
    // hacemos fallar 'desvios'
    const failId = ESIOS_CATALOG['desvios'].id
    installFetchMock(failId)
    const r = await fetchEsiosFinancial({ hoursBack: 24 })
    restoreFetch()

    assert.equal(r.ok, true, 'global debe ser ok si hay al menos uno')
    const d = r.data!
    const desvios = d.ajuste.find((x) => x.slug === 'desvios')!
    assert.equal(desvios.ok, false)
    assert.match(desvios.error ?? '', /404|http/i)
    assert.equal(desvios.last_value, null)
    // el resto siguen OK
    assert.equal(d.ok_count, totalSlugs - 1)
    const otros = d.ajuste.filter((x) => x.slug !== 'desvios')
    assert.ok(otros.every((x) => x.ok))
  })

  // ── 3. summariseIndicator puro ───────────────────────────────────────────
  await test('summariseIndicator · last_value/serie/null', () => {
    const item = ESIOS_CATALOG['restricciones_tecnicas']
    const ind = indicatorBody(item.id).indicator as any
    const sum = summariseIndicator(item, ind)
    assert.equal(sum.ok, true)
    assert.equal(sum.last_value, 15)
    assert.equal(sum.slug, 'restricciones_tecnicas')
    assert.ok(sum.series.length === 3)
    // fallo → null
    const fail = summariseIndicator(item, null, 'http_404')
    assert.equal(fail.ok, false)
    assert.equal(fail.error, 'http_404')
    assert.equal(fail.last_value, null)
    assert.deepEqual(fail.series, [])
  })

  // ── 4. pickFinancialSlugs puro ───────────────────────────────────────────
  await test('pickFinancialSlugs · resuelve items del catálogo', () => {
    const items = pickFinancialSlugs(ESIOS_FINANCIAL_AJUSTE_SLUGS)
    assert.equal(items.length, ESIOS_FINANCIAL_AJUSTE_SLUGS.length)
    assert.ok(items.every((it) => typeof it.id === 'number'))
    // slug inexistente se filtra
    const mixed = pickFinancialSlugs([...ESIOS_FINANCIAL_AJUSTE_SLUGS, 'no_existe' as any])
    assert.equal(mixed.length, ESIOS_FINANCIAL_AJUSTE_SLUGS.length)
  })

  // ── 5. key ausente ───────────────────────────────────────────────────────
  await test('key ausente · todos no_key, global ok:false', async () => {
    delete process.env.ESIOS_API_KEY
    _clearEsiosFinancialCache()
    installFetchMock()
    const r = await fetchEsiosFinancial({ hoursBack: 24 })
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.equal(calls, 0, 'sin key fetchEsiosIndicator no toca la red')
    const d = r.data!
    assert.equal(d.ok_count, 0)
    assert.ok(d.ajuste.every((x) => !x.ok))
    assert.match(d.ajuste[0].error ?? '', /no_key/)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
