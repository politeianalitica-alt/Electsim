/**
 * Sprint Turismo T2-ine · Tests del cliente COMPARATIVA-UE (lib/turismo/comparativa-ue.ts).
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/comparativa-ue.test.ts
 *
 * Fixtures JSON-stat 2.0 (dims [geo, time]) para 4 datasets Eurostat:
 *   tour_occ_ninat (nights) · tour_occ_arnat (arrivals) ·
 *   bop_its6_det (Travel credits) · nama_10_gdp (PIB). El %PIB se deriva como
 *   travel/gdp del mismo año.
 *
 * Cubre:
 *   1. buildComparativaUe · nights + arrivals + %PIB por país (ES/FR/IT/PT/UE27)
 *   2. pctGdp usa año común travel∩gdp
 *   3. degradación parcial (sin bop → pib null, ok:true)
 *   4. fetchComparativaUe con fetch-mock que rutea por dataset en la URL
 */
import assert from 'node:assert/strict'
import {
  buildComparativaUe,
  pctGdpByGeo,
  fetchComparativaUe,
} from '../../../lib/turismo/comparativa-ue.ts'
import { parseJsonStat, _clearTurismoCache } from '../../../lib/turismo/shared.ts'

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok ${name}`) }
  catch (e) { failed++; console.error(`  XX ${name}`); console.error('    ', (e as Error).message) }
}

function jsonStat(geos: string[], times: string[], data: Record<string, Record<string, number | null>>) {
  const geoIndex: Record<string, number> = {}
  geos.forEach((g, i) => (geoIndex[g] = i))
  const timeIndex: Record<string, number> = {}
  times.forEach((t, i) => (timeIndex[t] = i))
  const value: Record<string, number | null> = {}
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

const GEOS = ['ES', 'FR', 'IT', 'PT', 'EU27_2020']

function nightsFx() {
  return jsonStat(GEOS, ['2023', '2024'], {
    ES: { '2023': 470000000, '2024': 500000000 },
    FR: { '2023': 440000000, '2024': 450000000 },
    IT: { '2023': 430000000, '2024': 440000000 },
    PT: { '2023': 80000000, '2024': 82000000 },
    EU27_2020: { '2023': 2900000000, '2024': 3000000000 },
  })
}
function arrivalsFx() {
  return jsonStat(GEOS, ['2024'], {
    ES: { '2024': 94000000 }, FR: { '2024': 100000000 }, IT: { '2024': 65000000 },
    PT: { '2024': 30000000 }, EU27_2020: { '2024': 600000000 },
  })
}
function bopFx() {
  // Travel credits (M€) 2024
  return jsonStat(GEOS, ['2024'], {
    ES: { '2024': 60836 }, FR: { '2024': 71000 }, IT: { '2024': 55000 },
    PT: { '2024': 27000 }, EU27_2020: { '2024': 500000 },
  })
}
function gdpFx() {
  // PIB nominal (M€) 2024
  return jsonStat(GEOS, ['2024'], {
    ES: { '2024': 1594330 }, FR: { '2024': 2900000 }, IT: { '2024': 2100000 },
    PT: { '2024': 280000 }, EU27_2020: { '2024': 18042085 },
  })
}

async function run() {
  console.log('\n-> turismo · comparativa-ue')

  await test('pctGdpByGeo · año común travel∩gdp', () => {
    const { byGeo, year } = pctGdpByGeo(parseJsonStat(bopFx()), parseJsonStat(gdpFx()))
    assert.equal(year, 2024)
    // ES: 60836/1594330*100 = 3.82
    assert.equal(byGeo['ES'], 3.82)
    // PT: 27000/280000*100 = 9.64 (Portugal muy turístico)
    assert.equal(byGeo['PT'], 9.64)
  })

  await test('buildComparativaUe · nights + arrivals + %PIB por país', () => {
    const d = buildComparativaUe(
      parseJsonStat(nightsFx()),
      parseJsonStat(arrivalsFx()),
      parseJsonStat(bopFx()),
      parseJsonStat(gdpFx()),
    )
    assert.equal(d.year_pernoctaciones, 2024)
    assert.equal(d.paises.length, 5)
    const es = d.paises.find((p) => p.geo === 'ES')!
    assert.equal(es.pais, 'España')
    assert.equal(es.es_ue, false)
    assert.equal(es.pernoctaciones, 500000000)
    assert.equal(es.llegadas, 94000000)
    assert.equal(es.pib_turistico_pct, 3.82)
    const ue = d.paises.find((p) => p.geo === 'EU27_2020')!
    assert.equal(ue.es_ue, true)
    assert.equal(ue.pais, 'UE-27')
  })

  await test('degradación parcial (sin bop) → %PIB null, ok lógico', () => {
    const d = buildComparativaUe(
      parseJsonStat(nightsFx()),
      parseJsonStat(arrivalsFx()),
      null, // bop degradó
      parseJsonStat(gdpFx()),
    )
    const es = d.paises.find((p) => p.geo === 'ES')!
    assert.equal(es.pib_turistico_pct, null)
    assert.equal(es.pernoctaciones, 500000000) // nights siguen
    assert.equal(es.llegadas, 94000000)
  })

  await test('fetchComparativaUe · rutea por dataset + bop 500 → partial', async () => {
    _clearTurismoCache()
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: any) => {
      const u = String(url)
      if (u.includes('bop_its6_det')) {
        return { ok: false, status: 500, statusText: 'err', json: async () => ({}) } as any
      }
      let body: unknown = {}
      if (u.includes('tour_occ_ninat')) body = nightsFx()
      else if (u.includes('tour_occ_arnat')) body = arrivalsFx()
      else if (u.includes('nama_10_gdp')) body = gdpFx()
      return { ok: true, status: 200, statusText: 'OK', json: async () => body } as any
    }) as any
    const r = await fetchComparativaUe({ noCache: true })
    globalThis.fetch = realFetch
    assert.equal(r.ok, true, r.error)
    assert.equal(r.partial, true) // bop degradó → %PIB null
    const es = r.data!.paises.find((p) => p.geo === 'ES')!
    assert.equal(es.pernoctaciones, 500000000)
    assert.equal(es.pib_turistico_pct, null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}
run()
