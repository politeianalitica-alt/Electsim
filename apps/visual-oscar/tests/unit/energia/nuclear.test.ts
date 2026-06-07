/**
 * Sprint Energía S6 · Tests de la vista Nuclear.
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo —
 * ver tests/unit/energia/renovables.test.ts). Se ejecuta con Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/nuclear.test.ts
 *
 * Cubre:
 *   - REACTORES_ES: 7 reactores · shape + rangos plausibles + cierres ordenables.
 *   - summarizeFleet(): nº operativos + potencia instalada (operativa/total).
 *   - fleetLoadFactor(): factor de carga del parque con clamp/nulos.
 *   - buildClosureSchedule(): agrupación por año + orden ascendente + potencia.
 */
import assert from 'node:assert/strict'
import { REACTORES_ES } from '../../../lib/energia/catalog.ts'
import {
  summarizeFleet,
  fleetLoadFactor,
  buildClosureSchedule,
} from '../../../lib/energia/nuclear-calc.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  const start = async () => {
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
  return start()
}

async function run() {
  console.log('\n→ energia · nuclear')

  // ─── REACTORES_ES ────────────────────────────────────────────────────
  await test('REACTORES_ES tiene exactamente 7 reactores', () => {
    assert.equal(REACTORES_ES.length, 7, `esperado 7, obtenido ${REACTORES_ES.length}`)
  })

  await test('cada reactor: shape completo + potencia/año/cierre plausibles', () => {
    for (const r of REACTORES_ES) {
      assert.equal(typeof r.nombre, 'string')
      assert.ok(r.nombre.length > 0, 'nombre no vacío')
      assert.equal(typeof r.central, 'string')
      assert.ok(r.central.length > 0, 'central no vacía')
      assert.equal(typeof r.potencia_mw, 'number')
      // Reactores comerciales españoles ~1.000-1.100 MW netos.
      assert.ok(
        r.potencia_mw > 900 && r.potencia_mw < 1200,
        `potencia plausible (900-1200 MW): ${r.nombre} = ${r.potencia_mw}`,
      )
      assert.equal(typeof r.ano_conexion, 'number')
      assert.ok(
        r.ano_conexion >= 1980 && r.ano_conexion <= 1990,
        `año conexión plausible (1980-1990): ${r.nombre} = ${r.ano_conexion}`,
      )
      assert.ok(Array.isArray(r.propietarios) && r.propietarios.length > 0, `propietarios no vacíos: ${r.nombre}`)
      assert.ok(['PWR', 'BWR'].includes(r.tecnologia), `tecnología PWR/BWR: ${r.nombre} = ${r.tecnologia}`)
      assert.equal(typeof r.cierre_previsto, 'number')
      assert.ok(
        r.cierre_previsto >= 2027 && r.cierre_previsto <= 2035,
        `cierre en ventana 2027-2035: ${r.nombre} = ${r.cierre_previsto}`,
      )
      assert.ok(['operativo', 'parada', 'cerrado'].includes(r.estado), `estado válido: ${r.estado}`)
    }
  })

  await test('los cierres son ordenables y cubren la ventana 2027-2035', () => {
    const years = REACTORES_ES.map((r) => r.cierre_previsto)
    const sorted = [...years].sort((a, b) => a - b)
    assert.equal(sorted[0], 2027, `primer cierre 2027, obtenido ${sorted[0]}`)
    assert.equal(sorted[sorted.length - 1], 2035, `último cierre 2035, obtenido ${sorted[sorted.length - 1]}`)
  })

  await test('Cofrentes es el único BWR; el resto PWR', () => {
    const bwr = REACTORES_ES.filter((r) => r.tecnologia === 'BWR')
    assert.equal(bwr.length, 1, `esperado 1 BWR, obtenido ${bwr.length}`)
    assert.equal(bwr[0].nombre, 'Cofrentes')
  })

  // ─── summarizeFleet ──────────────────────────────────────────────────
  await test('summarizeFleet: 7 operativos y potencia total ≈ 7,4 GW', () => {
    const s = summarizeFleet(REACTORES_ES)
    assert.equal(s.operativos, 7, `esperado 7 operativos, obtenido ${s.operativos}`)
    assert.equal(s.total, 7)
    // Suma del catálogo (1049+1044+1032+1027+1092+1087+1066) = 7397 MW.
    assert.equal(s.potencia_total_mw, 7397, `potencia total esperada 7397, obtenida ${s.potencia_total_mw}`)
    assert.equal(s.potencia_operativa_mw, 7397, 'todos operativos → operativa == total')
    assert.ok(
      s.potencia_operativa_mw / 1000 > 7 && s.potencia_operativa_mw / 1000 < 8,
      `~7.4 GW: ${s.potencia_operativa_mw / 1000}`,
    )
  })

  await test('summarizeFleet: excluye reactores no operativos de la potencia operativa', () => {
    const mixed = [
      { ...REACTORES_ES[0], estado: 'cerrado' as const },
      { ...REACTORES_ES[1], estado: 'operativo' as const },
    ]
    const s = summarizeFleet(mixed)
    assert.equal(s.operativos, 1)
    assert.equal(s.total, 2)
    assert.equal(s.potencia_operativa_mw, REACTORES_ES[1].potencia_mw)
    assert.equal(s.potencia_total_mw, REACTORES_ES[0].potencia_mw + REACTORES_ES[1].potencia_mw)
  })

  await test('summarizeFleet: array vacío → ceros sin lanzar', () => {
    const s = summarizeFleet([])
    assert.deepEqual(s, { operativos: 0, total: 0, potencia_operativa_mw: 0, potencia_total_mw: 0 })
  })

  // ─── fleetLoadFactor ─────────────────────────────────────────────────
  await test('fleetLoadFactor: nuclear como base de carga (~90%)', () => {
    // 6.650 MW medios / 7.397 MW instalados ≈ 0,899 → 89,9 %
    const r = fleetLoadFactor(6650, 7397)
    assert.ok(r.factor !== null, 'factor no debería ser null')
    assert.ok(Math.abs((r.factor as number) - 0.899) < 0.005, `esperado ~0.90, obtenido ${r.factor}`)
    assert.equal(r.factor_pct, 89.9, `esperado 89.9, obtenido ${r.factor_pct}`)
  })

  await test('fleetLoadFactor: capacidad ≤ 0 o nulos → null sin dividir por cero', () => {
    assert.equal(fleetLoadFactor(5000, 0).factor, null)
    assert.equal(fleetLoadFactor(5000, -10).factor, null)
    assert.equal(fleetLoadFactor(null, 7397).factor, null)
    assert.equal(fleetLoadFactor(5000, null).factor, null)
    assert.equal(fleetLoadFactor(NaN, 7397).factor, null)
  })

  await test('fleetLoadFactor: clamp generación > capacidad → 100%', () => {
    const r = fleetLoadFactor(8000, 7397)
    assert.equal(r.factor, 1)
    assert.equal(r.factor_pct, 100)
  })

  // ─── buildClosureSchedule ────────────────────────────────────────────
  await test('buildClosureSchedule: orden ascendente por año', () => {
    const sched = buildClosureSchedule(REACTORES_ES)
    const years = sched.map((s) => s.year)
    const sorted = [...years].sort((a, b) => a - b)
    assert.deepEqual(years, sorted, 'el calendario debe venir ordenado por año asc')
    assert.equal(years[0], 2027, `primer año 2027, obtenido ${years[0]}`)
    assert.equal(years[years.length - 1], 2035, `último año 2035, obtenido ${years[years.length - 1]}`)
  })

  await test('buildClosureSchedule: agrupa reactores que cierran el mismo año', () => {
    const sched = buildClosureSchedule(REACTORES_ES)
    // 2035 cierra Vandellós II + Trillo (dos reactores).
    const y2035 = sched.find((s) => s.year === 2035)
    assert.ok(y2035, 'debe existir el año 2035')
    assert.equal(y2035!.reactores.length, 2, `2035 cierra 2 reactores, obtenido ${y2035!.reactores.length}`)
    assert.equal(
      y2035!.potencia_mw,
      y2035!.reactores.reduce((acc, r) => acc + r.potencia_mw, 0),
      'potencia agregada del año = suma de sus reactores',
    )
  })

  await test('buildClosureSchedule: suma de potencias por año = total del parque', () => {
    const sched = buildClosureSchedule(REACTORES_ES)
    const totalSched = sched.reduce((acc, s) => acc + s.potencia_mw, 0)
    const totalFleet = REACTORES_ES.reduce((acc, r) => acc + r.potencia_mw, 0)
    assert.equal(totalSched, totalFleet, `calendario ${totalSched} debe sumar el parque ${totalFleet}`)
  })

  await test('buildClosureSchedule: array vacío → []', () => {
    assert.deepEqual(buildClosureSchedule([]), [])
  })

  // ─── Resumen ─────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
