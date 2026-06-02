/**
 * Sprint 2 C4 · Tests para computeSourceDiversity(distribution).
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/diversity.test.ts
 *
 * Cubre los 3 escenarios clave del HHI:
 *   1. 10 medios uniformes (10 arts cada uno) → score > 0.85 (alta div.)
 *   2. 1 dominante + 1 marginal → score < 0.2 (baja diversidad)
 *   3. Distribución vacía → score = 0
 */
import assert from 'node:assert/strict'
import {
  computeSourceDiversity,
  type SourceCount,
} from '../../../../../lib/medios/canonical/scoring/diversity.ts'

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
      if ((e as Error).stack)
        console.error(
          '    ',
          (e as Error).stack!.split('\n').slice(1, 3).join('\n     '),
        )
    }
  }
  return start()
}

async function run() {
  console.log('\n→ scoring · computeSourceDiversity')

  // ─── Caso 1: 10 medios uniformes → score alto ──────────────────────────
  await test('10 medios uniformes (10 arts/medio) · score > 0.85', () => {
    // HHI = 10 · (0.1)² = 0.1 → score = 1 − 0.1 = 0.9
    const distribution: SourceCount[] = Array.from({ length: 10 }, (_, i) => ({
      source_id: `medio_${i + 1}`,
      count: 10,
    }))
    const score = computeSourceDiversity(distribution)
    assert.ok(score > 0.85, `esperado > 0.85, obtenido ${score}`)
    assert.ok(score <= 1, `esperado ≤ 1, obtenido ${score}`)
  })

  // ─── Caso 2: 1 dominante + 1 marginal → score bajo ─────────────────────
  await test('1 medio dominante (100 arts) + 1 marginal (1 art) · score < 0.2', () => {
    // total = 101; shares = 100/101 ≈ 0.99, 1/101 ≈ 0.0099
    // HHI ≈ 0.9803 + 0.0001 ≈ 0.9804 → score ≈ 0.0196
    const distribution: SourceCount[] = [
      { source_id: 'dominante', count: 100 },
      { source_id: 'marginal', count: 1 },
    ]
    const score = computeSourceDiversity(distribution)
    assert.ok(score < 0.2, `esperado < 0.2, obtenido ${score}`)
    assert.ok(score >= 0, `esperado ≥ 0, obtenido ${score}`)
  })

  // ─── Caso 3: distribución vacía → score = 0 ─────────────────────────────
  await test('distribución vacía · score = 0', () => {
    const score = computeSourceDiversity([])
    assert.equal(score, 0, `esperado 0, obtenido ${score}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
