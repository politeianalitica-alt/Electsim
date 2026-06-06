/**
 * Sprint Turismo T2-ine · Tests del cliente EGATUR (lib/turismo/egatur.ts).
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/egatur.test.ts
 *
 * Fixture de la estructura real de la tabla INE 23992 (EGATUR, ANUAL):
 *   "Turista. Total. {métrica}. Total Nacional. Dato base." con FK_Periodo=28
 *   (anual). Métricas: Gasto total, Gasto medio por persona, Gasto medio diario
 *   por persona, Duración media de los viajes.
 *
 * Cubre:
 *   1. las 4 métricas + último valor + YoY anual
 *   2. unidades correctas por métrica
 *   3. buildEgatur PURO
 *   4. degradación parcial (falta una métrica → partial=true, ok=true)
 *   5. fallo total → ok:false
 */
import assert from 'node:assert/strict'
import { fetchEgatur, buildEgatur } from '../../../lib/turismo/egatur.ts'
import { _clearTurismoCache } from '../../../lib/turismo/shared.ts'

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok ${name}`) }
  catch (e) { failed++; console.error(`  XX ${name}`); console.error('    ', (e as Error).message) }
}

function annualObs(anyo: number, valor: number | null) {
  return { FK_Periodo: 28, Anyo: anyo, Valor: valor }
}
function metricSerie(metric: string, v2024: number | null, v2025: number | null) {
  return {
    COD: `EG_${metric}`,
    Nombre: `Turista. Total. ${metric}. Total Nacional. Dato base. `,
    Data: [annualObs(2024, v2024), annualObs(2025, v2025)],
  }
}
function metricTasa(metric: string) {
  return {
    COD: `EGT_${metric}`,
    Nombre: `Turista. Total. ${metric}. Total Nacional. Tasa de variación anual. `,
    Data: [annualObs(2025, 5.0)],
  }
}

function egaturFixture() {
  return [
    metricSerie('Gasto total', 126000, 134743.32), // M€
    metricTasa('Gasto total'),
    metricSerie('Gasto medio por persona', 1340, 1392),
    metricSerie('Gasto medio diario por persona', 188, 195),
    metricSerie('Duración media de los viajes', 7.2, 7.13),
    // ruido: transporte aéreo (no debe colarse en las métricas Total)
    {
      COD: 'EG_aereo',
      Nombre: 'Turista. Transporte aereo. Gasto total. Total Nacional. Dato base. ',
      Data: [annualObs(2025, 121075.58)],
    },
  ]
}

const realFetch = globalThis.fetch
let fetchCalls = 0
function installFetchMock(body: unknown, status = 200) {
  fetchCalls = 0
  globalThis.fetch = (async () => {
    fetchCalls++
    return { ok: status >= 200 && status < 300, status, statusText: 'x', text: async () => JSON.stringify(body), json: async () => body } as any
  }) as any
}
function restoreFetch() { globalThis.fetch = realFetch }

async function run() {
  console.log('\n-> turismo · egatur')

  await test('4 métricas + último valor + YoY anual', async () => {
    _clearTurismoCache()
    installFetchMock(egaturFixture())
    const r = await fetchEgatur({ n: 10 })
    restoreFetch()
    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.last_period, '2025')
    assert.equal(d.gasto_total.last?.value, 134743.32)
    // YoY gasto total: (134743.32-126000)/126000*100 = 6.94
    assert.equal(d.gasto_total.yoy_pct, 6.94)
    assert.equal(d.gasto_medio_persona.last?.value, 1392)
    assert.equal(d.gasto_medio_diario.last?.value, 195)
    assert.equal(d.estancia_media.last?.value, 7.13)
  })

  await test('unidades correctas por métrica', async () => {
    _clearTurismoCache()
    installFetchMock(egaturFixture())
    const r = await fetchEgatur({ n: 10 })
    restoreFetch()
    const d = r.data!
    assert.equal(d.gasto_total.unit, 'M€')
    assert.equal(d.gasto_medio_persona.unit, '€/turista')
    assert.equal(d.gasto_medio_diario.unit, '€/día')
    assert.equal(d.estancia_media.unit, 'noches')
  })

  await test('buildEgatur PURO + no se cuela el transporte aéreo', () => {
    const d = buildEgatur(egaturFixture())
    // El gasto total Total Nacional es 134743 (no el del aéreo 121075).
    assert.equal(d.gasto_total.last?.value, 134743.32)
  })

  await test('degradación parcial (falta estancia) → ok:true, partial:true', async () => {
    _clearTurismoCache()
    const fx = egaturFixture().filter((s) => !s.Nombre.includes('Duración media'))
    installFetchMock(fx)
    const r = await fetchEgatur({ n: 10, noCache: true })
    restoreFetch()
    assert.equal(r.ok, true)
    assert.equal(r.partial, true)
    assert.equal(r.data!.estancia_media.last, null)
    assert.equal(r.data!.gasto_total.last?.value, 134743.32)
  })

  await test('fallo total (HTTP 500) → ok:false', async () => {
    _clearTurismoCache()
    installFetchMock({}, 500)
    const r = await fetchEgatur({ n: 10, noCache: true })
    restoreFetch()
    assert.equal(r.ok, false)
    assert.equal(r.data, null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}
run()
