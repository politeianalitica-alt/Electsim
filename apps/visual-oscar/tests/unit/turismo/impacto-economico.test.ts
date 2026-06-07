/**
 * Turismo v3 · Sprint T2-cross · Tests impacto económico
 * (lib/turismo/impacto-economico.ts).
 *
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/impacto-economico.test.ts
 *
 * Cubre:
 *   1. latestEurostatPoint extrae el último periodo con valor (vía parseJsonStat)
 *   2. buildImpactoEconomico marca eurostat_source live/partial/unavailable
 *   3. buildImpactoEconomico suma gasto público
 *   4. GASTO_PUBLICO_PERTE · shape válido + fechas + fuentes
 */
import assert from 'node:assert/strict'
import {
  latestEurostatPoint,
  buildImpactoEconomico,
  GASTO_PUBLICO_PERTE,
} from '../../../lib/turismo/impacto-economico.ts'

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
    console.error(e)
  }
}

async function run() {
  console.log('\nlib/turismo/impacto-economico.ts\n')

  await test('latestEurostatPoint extrae último periodo con valor', () => {
    // JSON-stat mínimo: dimensión time con 3 periodos, una geo.
    const json = {
      value: { 0: 5.2, 1: 5.5, 2: 5.8 },
      id: ['geo', 'time'],
      size: [1, 3],
      dimension: {
        geo: { category: { index: { ES: 0 }, label: { ES: 'Spain' } } },
        time: { category: { index: { '2021': 0, '2022': 1, '2023': 2 }, label: {} } },
      },
    }
    const p = latestEurostatPoint(json)
    assert.equal(p.value, 5.8)
    assert.equal(p.period, '2023')
  })

  await test('latestEurostatPoint con JSON vacío → null', () => {
    const p = latestEurostatPoint({})
    assert.equal(p.value, null)
    assert.equal(p.period, null)
  })

  await test('buildImpactoEconomico eurostat_source live/partial/unavailable', () => {
    const gasto = GASTO_PUBLICO_PERTE
    const live = buildImpactoEconomico(
      { value: 5.5, period: '2023' },
      { value: 1900, period: '2024Q3' },
      { gasto, nota: 'x' },
    )
    assert.equal(live.eurostat_source, 'live')
    assert.equal(live.pib_turistico_pct, 5.5)
    assert.equal(live.empleo_horeca, 1900)

    const partial = buildImpactoEconomico(
      { value: 5.5, period: '2023' },
      { value: null, period: null },
      { gasto, nota: 'x' },
    )
    assert.equal(partial.eurostat_source, 'partial')

    const none = buildImpactoEconomico(
      { value: null, period: null },
      { value: null, period: null },
      { gasto, nota: 'x' },
    )
    assert.equal(none.eurostat_source, 'unavailable')
    assert.equal(none.pib_turistico_pct, null)
  })

  await test('buildImpactoEconomico suma gasto público', () => {
    const d = buildImpactoEconomico(
      { value: null, period: null },
      { value: null, period: null },
      {
        gasto: [
          { programa: 'A', presupuesto_meur: 100, fuente: 'f', fecha: '2024' },
          { programa: 'B', presupuesto_meur: 250, fuente: 'f', fecha: '2024' },
        ],
        nota: 'x',
      },
    )
    assert.equal(d.gasto_publico_total_meur, 350)
    assert.equal(d.gasto_publico_perte.length, 2)
  })

  await test('GASTO_PUBLICO_PERTE · shape válido', () => {
    assert.ok(GASTO_PUBLICO_PERTE.length >= 3, 'pocos programas')
    for (const p of GASTO_PUBLICO_PERTE) {
      assert.equal(typeof p.programa, 'string')
      assert.equal(typeof p.presupuesto_meur, 'number')
      assert.ok(p.presupuesto_meur > 0)
      assert.equal(typeof p.fuente, 'string')
      assert.match(p.fecha, /^\d{4}/)
    }
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
