/**
 * Sprint Energía S5 · Tests de la vista Renovables.
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo —
 * ver tests/unit/energia/catalog.test.ts). Se ejecuta con Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/renovables.test.ts
 *
 * Cubre:
 *   - computeLoadFactor(): factor de carga = gen media / capacidad, con clamp
 *     [0,1], manejo de nulos/cero/negativos, redondeo a 1 decimal.
 *   - SUBASTAS_RENOVABLES_ES: shape + rangos plausibles (precio > 0, capacidad > 0).
 */
import assert from 'node:assert/strict'
import { computeLoadFactor } from '../../../lib/energia/renovables-calc.ts'
import { SUBASTAS_RENOVABLES_ES } from '../../../lib/energia/catalog.ts'

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
  console.log('\n→ energia · renovables')

  // ─── computeLoadFactor ──────────────────────────────────────────────
  await test('factor de carga = gen media / capacidad (caso eólica ~27%)', () => {
    // 8.370 MW medios / 31.000 MW instalados ≈ 0,27 → 27,0 %
    const r = computeLoadFactor(8370, 31000)
    assert.equal(r.factor !== null, true, 'factor no debería ser null')
    assert.ok(Math.abs((r.factor as number) - 0.27) < 0.001, `esperado ~0.27, obtenido ${r.factor}`)
    assert.equal(r.factor_pct, 27, `esperado 27, obtenido ${r.factor_pct}`)
    assert.equal(r.gen_media_mw, 8370)
    assert.equal(r.capacidad_mw, 31000)
  })

  await test('redondea el porcentaje a 1 decimal', () => {
    // 5600 / 28000 = 0,2 → 20,0 % ; 5712 / 28000 = 0,204 → 20,4 %
    assert.equal(computeLoadFactor(5600, 28000).factor_pct, 20)
    assert.equal(computeLoadFactor(5712, 28000).factor_pct, 20.4)
  })

  await test('capacidad cero o negativa → factor null (no divide por cero)', () => {
    assert.equal(computeLoadFactor(5000, 0).factor, null)
    assert.equal(computeLoadFactor(5000, 0).factor_pct, null)
    assert.equal(computeLoadFactor(5000, -10).factor, null)
  })

  await test('valores nulos/undefined/NaN → factor null sin lanzar', () => {
    assert.equal(computeLoadFactor(null, 31000).factor, null)
    assert.equal(computeLoadFactor(8000, null).factor, null)
    assert.equal(computeLoadFactor(undefined, undefined).factor, null)
    assert.equal(computeLoadFactor(NaN, 31000).factor, null)
    assert.equal(computeLoadFactor(8000, NaN).factor, null)
  })

  await test('generación negativa → factor null', () => {
    assert.equal(computeLoadFactor(-100, 31000).factor, null)
  })

  await test('clamp: generación > capacidad → factor = 1.0 (100%)', () => {
    const r = computeLoadFactor(35000, 31000)
    assert.equal(r.factor, 1)
    assert.equal(r.factor_pct, 100)
  })

  await test('caso límite: generación = capacidad → factor exactamente 1.0', () => {
    const r = computeLoadFactor(17000, 17000)
    assert.equal(r.factor, 1)
    assert.equal(r.factor_pct, 100)
  })

  await test('generación = 0 con capacidad válida → factor 0 (no null)', () => {
    const r = computeLoadFactor(0, 31000)
    assert.equal(r.factor, 0)
    assert.equal(r.factor_pct, 0)
  })

  // ─── SUBASTAS_RENOVABLES_ES ──────────────────────────────────────────
  await test('SUBASTAS_RENOVABLES_ES tiene entre 3 y 8 entradas', () => {
    assert.ok(
      SUBASTAS_RENOVABLES_ES.length >= 3 && SUBASTAS_RENOVABLES_ES.length <= 8,
      `esperado 3-8, obtenido ${SUBASTAS_RENOVABLES_ES.length}`,
    )
  })

  await test('cada subasta: shape completo + rangos plausibles', () => {
    for (const s of SUBASTAS_RENOVABLES_ES) {
      assert.equal(typeof s.fecha, 'string', 'fecha string')
      assert.ok(/^\d{4}(-\d{2}){0,2}$/.test(s.fecha), `fecha ISO plausible: ${s.fecha}`)
      assert.equal(typeof s.tecnologia, 'string')
      assert.ok(s.tecnologia.length > 0, 'tecnologia no vacía')
      assert.equal(typeof s.precio_adjudicado_eur_mwh, 'number')
      assert.ok(
        s.precio_adjudicado_eur_mwh > 0 && s.precio_adjudicado_eur_mwh < 200,
        `precio €/MWh plausible (0-200): ${s.precio_adjudicado_eur_mwh}`,
      )
      assert.equal(typeof s.capacidad_mw, 'number')
      assert.ok(s.capacidad_mw > 0, `capacidad_mw > 0: ${s.capacidad_mw}`)
      assert.equal(typeof s.observacion, 'string')
      assert.ok(s.observacion.length > 0, 'observacion (fuente) no vacía')
    }
  })

  await test('subastas incluyen la histórica de 2021 a ~24,5 €/MWh (fotovoltaica)', () => {
    const baratas = SUBASTAS_RENOVABLES_ES.filter((s) => s.precio_adjudicado_eur_mwh < 30)
    assert.ok(baratas.length >= 1, 'al menos una subasta por debajo de 30 €/MWh (récord 2021)')
  })

  // ─── Resumen ─────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
