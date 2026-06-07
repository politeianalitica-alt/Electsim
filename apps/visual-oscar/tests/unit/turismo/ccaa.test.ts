/**
 * Sprint Turismo T2-ine · Tests del cliente CCAA (lib/turismo/ccaa.ts).
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/ccaa.test.ts
 *
 * Fixture JSON-stat 2.0 (estructura real Eurostat: value + dimension + id +
 * size) construido con `jsonStat()`. Datasets tour_occ_nin2 (pernoctaciones
 * NUTS2) y tour_occ_arn2 (llegadas NUTS2).
 *
 * Cubre:
 *   1. reduceByRegion · último año por NUTS2 + filtra solo ES
 *   2. buildCcaa · cuota nacional + YoY + ranking descendente + ISO
 *   3. llegadas degradadas (arn2 null) → arrivals_degraded, ok:true
 *   4. fetchCcaa con fetch-mock (nin2 ok, arn2 500)
 */
import assert from 'node:assert/strict'
import {
  buildCcaa,
  reduceByRegion,
  fetchCcaa,
} from '../../../lib/turismo/ccaa.ts'
import { parseJsonStat, _clearTurismoCache } from '../../../lib/turismo/shared.ts'

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok ${name}`) }
  catch (e) { failed++; console.error(`  XX ${name}`); console.error('    ', (e as Error).message) }
}

/**
 * Construye un payload JSON-stat 2.0 mínimo con dims [geo, time].
 * `data` = { geo: { time: value } }. Respeta el orden cartesiano geo×time.
 */
function jsonStat(geos: string[], times: string[], data: Record<string, Record<string, number | null>>) {
  const geoIndex: Record<string, number> = {}
  geos.forEach((g, i) => (geoIndex[g] = i))
  const timeIndex: Record<string, number> = {}
  times.forEach((t, i) => (timeIndex[t] = i))
  const value: Record<string, number | null> = {}
  // índice plano: i = geoPos * |times| + timePos
  geos.forEach((g, gi) => {
    times.forEach((t, ti) => {
      const v = data[g]?.[t]
      if (v != null) value[String(gi * times.length + ti)] = v
    })
  })
  return {
    value,
    id: ['geo', 'time'],
    size: [geos.length, times.length],
    dimension: {
      geo: { category: { index: geoIndex, label: Object.fromEntries(geos.map((g) => [g, g])) } },
      time: { category: { index: timeIndex, label: Object.fromEntries(times.map((t) => [t, t])) } },
    },
  }
}

function nightsFixture() {
  return jsonStat(
    ['ES51', 'ES70', 'ES30', 'FR10'], // FR10 debe ser ignorado (no ES NUTS2)
    ['2023', '2024'],
    {
      ES51: { '2023': 95000000, '2024': 100000000 }, // Cataluña
      ES70: { '2023': 90000000, '2024': 92000000 }, // Canarias
      ES30: { '2023': 19000000, '2024': 20000000 }, // Madrid
      FR10: { '2023': 80000000, '2024': 85000000 },
    },
  )
}
function arrivalsFixture() {
  return jsonStat(['ES51', 'ES70', 'ES30'], ['2024'], {
    ES51: { '2024': 22000000 },
    ES70: { '2024': 15000000 },
    ES30: { '2024': 12000000 },
  })
}

async function run() {
  console.log('\n-> turismo · ccaa')

  await test('reduceByRegion · último año por NUTS2 + filtra solo ES', () => {
    const pts = parseJsonStat(nightsFixture())
    const red = reduceByRegion(pts)
    assert.equal(red['ES51'].latest, 100000000)
    assert.equal(red['ES51'].prev, 95000000)
    assert.equal(red['ES51'].year, 2024)
    assert.ok(!('FR10' in red), 'FR10 no debe estar (no es ES NUTS2)')
  })

  await test('buildCcaa · cuota + YoY + ranking + ISO', () => {
    const nights = parseJsonStat(nightsFixture())
    const arrivals = parseJsonStat(arrivalsFixture())
    const d = buildCcaa(nights, arrivals)
    assert.equal(d.year, 2024)
    // total = 100M+92M+20M = 212M
    assert.equal(d.total_pernoctaciones, 212000000)
    // primera fila = Cataluña (más pernoct)
    assert.equal(d.rows[0].ccaa, 'Cataluña')
    assert.equal(d.rows[0].ccaa_iso, 'CT')
    assert.equal(d.rows[0].nuts2, 'ES51')
    // cuota Cataluña = 100/212 ≈ 47.2%
    assert.equal(d.rows[0].cuota_pct, 47.2)
    // YoY Cataluña = (100-95)/95*100 = 5.26
    assert.equal(d.rows[0].yoy_pct, 5.26)
    // llegadas presentes
    assert.equal(d.rows[0].llegadas, 22000000)
    assert.equal(d.arrivals_degraded, false)
    // CCAA sin dato (las que no están en el fixture) tienen null pero existen
    assert.equal(d.rows.length, 19) // las 19 NUTS2 ES siempre presentes
  })

  await test('llegadas degradadas (arn2 null) → arrivals_degraded, ok lógico', () => {
    const nights = parseJsonStat(nightsFixture())
    const d = buildCcaa(nights, null)
    assert.equal(d.arrivals_degraded, true)
    assert.equal(d.rows[0].llegadas, null)
    assert.equal(d.rows[0].pernoctaciones, 100000000) // pernoct sigue
  })

  await test('fetchCcaa · nin2 ok + arn2 500 → ok:true, partial:true', async () => {
    _clearTurismoCache()
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: any) => {
      const u = String(url)
      if (u.includes('tour_occ_arn2')) {
        return { ok: false, status: 500, statusText: 'err', json: async () => ({}) } as any
      }
      const body = nightsFixture()
      return { ok: true, status: 200, statusText: 'OK', json: async () => body } as any
    }) as any
    const r = await fetchCcaa({ noCache: true })
    globalThis.fetch = realFetch
    assert.equal(r.ok, true, r.error)
    assert.equal(r.partial, true)
    assert.equal(r.data!.arrivals_degraded, true)
    assert.equal(r.data!.rows[0].pernoctaciones, 100000000)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}
run()
