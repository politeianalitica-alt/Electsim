/**
 * Sprint 2 C5 · Tests para deriveTopicState(history, now?).
 *
 * NO depende de vitest/jest (mismo patrón que momentum.test.ts). Se ejecuta
 * con Node 24+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/state-machine.test.ts
 *
 * Reglas (determinista por construcción):
 *   STRUCTURAL: avg(volume_score) últimos 14d ≥ 0.5
 *   EMERGENT:   avg(momentum_score) últimas 24h ≥ 0.7 AND
 *               avg(volume_score) últimas 24h < 0.4
 *   STABLE:     el resto (default; también para histórico vacío)
 *
 * 5 casos:
 *   1. volumen sostenido 14d → STRUCTURAL
 *   2. spike último día con baseline bajo → EMERGENT
 *   3. volumen variable bajo + momentum medio → STABLE
 *   4. histórico vacío → STABLE
 *   5. determinismo: mismo input × 2 → mismo output
 *
 * NOTA · fixtures usan `FIXED_NOW` pasado como parámetro a deriveTopicState,
 * para que los tests sean deterministas independientemente del reloj del
 * sistema (testability win, see C3 code review note).
 */
import assert from 'node:assert/strict'
import { deriveTopicState } from '../../../../../lib/medios/canonical/scoring/state-machine.ts'

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

// ─── Helpers para construir history relativo a un ref Date ────────────
const FIXED_NOW = new Date('2026-06-02T12:00:00Z')
const H = 3600_000

function hoursAgo(n: number, ref: Date = FIXED_NOW): Date {
  return new Date(ref.getTime() - n * H)
}

async function run() {
  console.log('\n→ scoring · deriveTopicState')

  // ─── Caso 1: volumen sostenido 14d → STRUCTURAL ──────────────────────
  await test('volumen sostenido 14d · STRUCTURAL', () => {
    // 14 puntos, uno por día, todos con volume_score = 0.6 ≥ 0.5 threshold.
    // avg(volume_score) últimos 14d = 0.6 ≥ 0.5 → STRUCTURAL
    const history = Array.from({ length: 14 }, (_, i) => ({
      computed_at: hoursAgo((i + 1) * 24),
      volume_score: 0.6,
      momentum_score: 0.3,
    }))
    assert.equal(deriveTopicState(history, FIXED_NOW), 'STRUCTURAL')
  })

  // ─── Caso 2: spike último día con baseline bajo → EMERGENT ───────────
  await test('spike último día con baseline bajo · EMERGENT', () => {
    // Baseline 13 días con volume_score=0.2 / momentum=0.1 → avg 14d ≈ 0.22
    // < 0.5 (no STRUCTURAL). Último 24h: momentum=0.8 ≥ 0.7 AND volume=0.3 <
    // 0.4 → EMERGENT.
    const history = [
      // baseline bajo, 13 días atrás
      ...Array.from({ length: 13 }, (_, i) => ({
        computed_at: hoursAgo((i + 2) * 24),
        volume_score: 0.2,
        momentum_score: 0.1,
      })),
      // últimas 24h: momentum alto, volumen bajo
      { computed_at: hoursAgo(12), volume_score: 0.3, momentum_score: 0.8 },
    ]
    assert.equal(deriveTopicState(history, FIXED_NOW), 'EMERGENT')
  })

  // ─── Caso 3: volumen variable bajo + momentum medio → STABLE ─────────
  await test('volumen variable bajo + momentum medio · STABLE', () => {
    // volume_score oscila entre 0.2 y 0.4 (avg ≈ 0.3) → no STRUCTURAL.
    // Momentum 0.4 < 0.7 → no EMERGENT. Default → STABLE.
    const history = Array.from({ length: 14 }, (_, i) => ({
      computed_at: hoursAgo((i + 1) * 24),
      volume_score: 0.2 + (i % 3) * 0.1, // 0.2, 0.3, 0.4 ciclo
      momentum_score: 0.4,
    }))
    assert.equal(deriveTopicState(history, FIXED_NOW), 'STABLE')
  })

  // ─── Caso 4: histórico vacío → STABLE ────────────────────────────────
  await test('histórico vacío · STABLE', () => {
    assert.equal(deriveTopicState([]), 'STABLE')
  })

  // ─── Caso 5: determinismo → mismo input × 2 → mismo output ───────────
  await test('determinismo · mismo input × 2 → mismo output', () => {
    const history = [
      { computed_at: hoursAgo(2), volume_score: 0.5, momentum_score: 0.6 },
      { computed_at: hoursAgo(48), volume_score: 0.4, momentum_score: 0.5 },
    ]
    const s1 = deriveTopicState(history, FIXED_NOW)
    const s2 = deriveTopicState(history, FIXED_NOW)
    assert.equal(s1, s2)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
