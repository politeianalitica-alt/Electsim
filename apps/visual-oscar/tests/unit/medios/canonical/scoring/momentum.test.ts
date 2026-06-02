/**
 * Sprint 2 C3 · Tests para computeMomentum(history).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del módulo
 * medios — ver pipeline-classify.test.ts). Se ejecuta con Node 24+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/momentum.test.ts
 *
 * Cubre los 4 casos clave de la fórmula:
 *   momentum = current_24h_volume / max(baseline_7d_mean, 1)
 *   score    = min(momentum / 3, 1)          // satura en 3× baseline → 1
 *
 *   1. 5× baseline → score saturado a 1
 *   2. baseline 0 con tráfico hoy → score > 0 y ≤ 1
 *   3. 1.5× baseline → score ≈ 0.5 (rango [0.4, 0.6])
 *   4. histórico vacío → score = 0
 *
 * NOTA · fixtures se construyen con `Date.now() - N*hours` (no Dates literales
 * con anclaje 2026-06-02) para que los tests no rompan cuando la fecha del
 * sistema avance respecto al T24H sliding window.
 */
import assert from 'node:assert/strict'
import { computeMomentum } from '../../../../../lib/medios/canonical/scoring/momentum.ts'

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

// ─── Helpers para construir history relativo a now ────────────────────
const H = 3600_000

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * H)
}

async function run() {
  console.log('\n→ scoring · computeMomentum')

  // ─── Caso 1: 5× baseline → score saturado a 1 ─────────────────────────
  await test('5× baseline · score satura a 1', () => {
    // 50 articles in last 24h
    // baseline: 10/day average over 7 days previous (7 snapshots, each volume=10)
    // momentum = 50 / 10 = 5  → min(5/3, 1) = 1
    const history = [
      // dentro de últimas 24h (recent)
      { computed_at: hoursAgo(1), volume: 25 },
      { computed_at: hoursAgo(12), volume: 25 },
      // baseline (>24h ago, <7d)
      { computed_at: hoursAgo(48), volume: 10 },
      { computed_at: hoursAgo(72), volume: 10 },
      { computed_at: hoursAgo(96), volume: 10 },
      { computed_at: hoursAgo(120), volume: 10 },
      { computed_at: hoursAgo(144), volume: 10 },
      { computed_at: hoursAgo(168), volume: 10 },
    ]
    const score = computeMomentum(history)
    assert.equal(score, 1, `esperado 1, obtenido ${score}`)
  })

  // ─── Caso 2: baseline 0 + tráfico hoy → score > 0 ─────────────────────
  await test('baseline vacío + 5 arts hoy · score positivo pero bajo', () => {
    // No hay baseline previo → momentum = 5 / max(0, 1) = 5 / 1 = 5
    // → score = min(5/3, 1) = 1 (saturado)
    // El test verifica que el branch no explota y devuelve algo ∈ (0, 1].
    const history = [{ computed_at: hoursAgo(2), volume: 5 }]
    const score = computeMomentum(history)
    assert.ok(score > 0, `esperado > 0, obtenido ${score}`)
    assert.ok(score <= 1, `esperado ≤ 1, obtenido ${score}`)
  })

  // ─── Caso 3: 1.5× baseline → score ~0.5 ───────────────────────────────
  await test('1.5× baseline · score en rango [0.4, 0.6]', () => {
    // Recent: 1 punto con volume=15
    // Baseline: 5 puntos con volume=10 cada uno (media=10)
    // momentum = 15 / 10 = 1.5  → score = 1.5 / 3 = 0.5
    const history = [
      { computed_at: hoursAgo(1), volume: 15 },
      { computed_at: hoursAgo(36), volume: 10 },
      { computed_at: hoursAgo(60), volume: 10 },
      { computed_at: hoursAgo(84), volume: 10 },
      { computed_at: hoursAgo(108), volume: 10 },
      { computed_at: hoursAgo(132), volume: 10 },
    ]
    const score = computeMomentum(history)
    assert.ok(
      score >= 0.4 && score <= 0.6,
      `esperado en [0.4, 0.6], obtenido ${score}`,
    )
  })

  // ─── Caso 4: histórico vacío → score = 0 ──────────────────────────────
  await test('histórico vacío · score = 0', () => {
    const score = computeMomentum([])
    assert.equal(score, 0, `esperado 0, obtenido ${score}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
