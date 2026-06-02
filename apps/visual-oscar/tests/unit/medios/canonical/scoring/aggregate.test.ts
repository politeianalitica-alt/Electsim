/**
 * Sprint 2 C4 · Tests para aggregateProminenceScore({...}).
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/aggregate.test.ts
 *
 * Fórmula:
 *   score = 0.30·V + 0.25·M + 0.20·D + 0.15·T + 0.10·E
 *   Σ pesos = 1.0 → con entradas ∈ [0, 1], salida ∈ [0, 1].
 *
 * Cubre:
 *   1. Todos los componentes = 1 → score = 1
 *   2. Todos los componentes = 0 → score = 0
 */
import assert from 'node:assert/strict'
import { aggregateProminenceScore } from '../../../../../lib/medios/canonical/scoring/aggregate.ts'

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
  console.log('\n→ scoring · aggregateProminenceScore')

  // ─── Caso 1: todos los componentes = 1 → score = 1 ────────────────────
  await test('todos los componentes = 1 · score = 1', () => {
    const score = aggregateProminenceScore({
      volume: 1,
      momentum: 1,
      sourceDiversity: 1,
      tierWeight: 1,
      entityDensity: 1,
    })
    // Σ pesos = 0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.0
    assert.ok(
      Math.abs(score - 1) < 1e-9,
      `esperado ≈ 1, obtenido ${score}`,
    )
  })

  // ─── Caso 2: todos los componentes = 0 → score = 0 ────────────────────
  await test('todos los componentes = 0 · score = 0', () => {
    const score = aggregateProminenceScore({
      volume: 0,
      momentum: 0,
      sourceDiversity: 0,
      tierWeight: 0,
      entityDensity: 0,
    })
    assert.equal(score, 0, `esperado 0, obtenido ${score}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
