/**
 * Sprint Turismo T2-ine · Tests del cliente RESIDENTES/ETR (lib/turismo/residentes.ts).
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/residentes.test.ts
 *
 * Fixture de la tabla INE 12422 (ETR por tipo destino, mensual · FK_Periodo
 * 1-12). Destinos: "Total." y "Extranjera." con métricas Viajes,
 * Pernoctaciones, Gasto total, Duración media (+ pares "Porcentaje" que se
 * ignoran). Interior se deriva como Total − Extranjera.
 *
 * Cubre:
 *   1. serie de viajes/pernoctaciones del Total
 *   2. desglose interno (derivado) vs emisor + cuotas
 *   3. duración media interna derivada (pernoct/viajes)
 *   4. buildResidentes PURO
 *   5. fallo total → ok:false
 */
import assert from 'node:assert/strict'
import { fetchResidentes, buildResidentes } from '../../../lib/turismo/residentes.ts'
import { _clearTurismoCache } from '../../../lib/turismo/shared.ts'

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok ${name}`) }
  catch (e) { failed++; console.error(`  XX ${name}`); console.error('    ', (e as Error).message) }
}

// dos meses mensuales (FK_Periodo 11 y 12 de 2025)
const M = (fk: number, v: number | null) => ({ FK_Periodo: fk, Anyo: 2025, Valor: v })

function serie(destino: string, metric: string, v11: number | null, v12: number | null) {
  return {
    COD: `${destino}_${metric}`,
    Nombre: `${destino}. ${metric}. Dato base. `,
    Data: [M(11, v11), M(12, v12)],
  }
}
function pct(destino: string, metric: string) {
  return {
    COD: `${destino}_${metric}_pct`,
    Nombre: `${destino}. ${metric}. Porcentaje. `,
    Data: [M(12, 100)],
  }
}

function etrFixture() {
  // Total dic: viajes 13.248.150, pernoct 47.053.725, gasto 4.361.919
  // Extranjera dic: viajes 1.935.060, pernoct 12.423.167, gasto 2.294.532
  // Interior = Total − Extranjera.
  return [
    serie('Total', 'Viajes', 12000000, 13248150),
    pct('Total', 'Viajes'),
    serie('Total', 'Pernoctaciones', 44000000, 47053725),
    serie('Total', 'Gasto total', 4000000, 4361919.41),
    serie('Total', 'Duración media de los viajes', 3.6, 3.55),
    serie('Extranjera', 'Viajes', 1800000, 1935060),
    pct('Extranjera', 'Viajes'),
    serie('Extranjera', 'Pernoctaciones', 11000000, 12423167),
    serie('Extranjera', 'Gasto total', 2100000, 2294532.7),
    serie('Extranjera', 'Duración media de los viajes', 6.5, 6.42),
    // ruido: desglose interno que NO debe usarse como "Extranjera"
    serie('Dentro de la Comunidad Autónoma', 'Viajes', 5000000, 5500000),
  ]
}

const realFetch = globalThis.fetch
function installFetchMock(body: unknown, status = 200) {
  globalThis.fetch = (async () => ({ ok: status >= 200 && status < 300, status, statusText: 'x', text: async () => JSON.stringify(body), json: async () => body } as any)) as any
}
function restoreFetch() { globalThis.fetch = realFetch }

async function run() {
  console.log('\n-> turismo · residentes')

  await test('serie de viajes/pernoctaciones del Total + último periodo', async () => {
    _clearTurismoCache()
    installFetchMock(etrFixture())
    const r = await fetchResidentes({ n: 12 })
    restoreFetch()
    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.last_period, '2025-12')
    assert.equal(d.serie_viajes.length, 2)
    assert.equal(d.total.viajes, 13248150)
    assert.equal(d.total.pernoctaciones, 47053725)
  })

  await test('interno (derivado) vs emisor + cuotas', async () => {
    _clearTurismoCache()
    installFetchMock(etrFixture())
    const r = await fetchResidentes({ n: 12 })
    restoreFetch()
    const d = r.data!
    // emisor = Extranjera
    assert.equal(d.destino.emisor.viajes, 1935060)
    // interno = 13248150 − 1935060 = 11313090
    assert.equal(d.destino.interno.viajes, 11313090)
    // cuotas: emisor 1935060/13248150 ≈ 14.6%
    assert.equal(d.destino.emisor.cuota_pct, 14.6)
    assert.equal(d.destino.interno.cuota_pct, 85.4)
  })

  await test('duración media interna derivada (pernoct/viajes)', async () => {
    _clearTurismoCache()
    installFetchMock(etrFixture())
    const r = await fetchResidentes({ n: 12 })
    restoreFetch()
    const d = r.data!
    // interno pernoct = 47053725 − 12423167 = 34630558
    // interno viajes = 11313090 → dur = 34630558/11313090 ≈ 3.06
    assert.equal(d.destino.interno.duracion_media, 3.06)
    assert.equal(d.destino.emisor.duracion_media, 6.42) // directa de Extranjera
  })

  await test('buildResidentes PURO', () => {
    const d = buildResidentes(etrFixture())
    assert.equal(d.total.viajes, 13248150)
    assert.equal(d.destino.interno.viajes, 11313090)
  })

  await test('fallo total (HTTP 500) → ok:false', async () => {
    _clearTurismoCache()
    installFetchMock({}, 500)
    const r = await fetchResidentes({ n: 12, noCache: true })
    restoreFetch()
    assert.equal(r.ok, false)
    assert.equal(r.data, null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}
run()
