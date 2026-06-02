/**
 * Sprint 2 C6 · Tests para la lib pulso-modes (lógica de 5 PulsoModes).
 *
 * Patrón Node native + assert (mismo formato que el resto del repo: tests
 * sin vitest/jest, se ejecutan con `node --experimental-strip-types`). Estas
 * pruebas atacan la lib `lib/medios/canonical/pulso-modes.ts` directamente
 * (no el route handler — eso lo cubre `endpoints.test.ts` contra un dev
 * server arriba).
 *
 * En entorno test/CI sin DATABASE_URL, los stores de pulso-modes caen al
 * fallback (`[]`, `0`, `{}`). Las aserciones validan **shape y contrato**
 * — no valores numéricos concretos — porque sin DB no hay datos reales.
 *
 * Para ejecutar:
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *     tests/integration/medios/pulso-modes.test.ts
 *
 * 8 casos:
 *   1. isValidMode acepta los 5 modos canónicos
 *   2. isValidMode rechaza valores no canónicos
 *   3. buildDominantTopicsForMode('PLURAL') devuelve array
 *   4. buildDominantTopicsForMode('AUDIEN') · estructura topics con
 *      total_audience_proxy si hay datos
 *   5. buildDominantTopicsForMode('REGION') · ccaa_breakdown es objeto
 *   6. buildDominantTopicsForMode('IDEOLOGY') · bias_index ∈ [-1, +1]
 *   7. buildDominantTopicsForMode('CRISIS') · sólo topics EMERGENT
 *   8. respeta `limit` (≤ valor pasado)
 */
import assert from 'node:assert/strict'
import {
  buildDominantTopicsForMode,
  isValidMode,
} from '../../../lib/medios/canonical/pulso-modes.ts'

let passed = 0
let failed = 0

async function test(
  name: string,
  fn: () => Promise<void> | void,
): Promise<void> {
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

async function main(): Promise<void> {
  console.log('\n→ pulso-modes · isValidMode + buildDominantTopicsForMode')

  // ─── 1. isValidMode acepta los 5 modos canónicos ──────────────────────
  await test('isValidMode acepta PLURAL, AUDIEN, REGION, IDEOLOGY, CRISIS', () => {
    for (const m of ['PLURAL', 'AUDIEN', 'REGION', 'IDEOLOGY', 'CRISIS']) {
      assert.equal(isValidMode(m), true, `expected ${m} valid`)
    }
  })

  // ─── 2. isValidMode rechaza valores no canónicos ──────────────────────
  await test('isValidMode rechaza INVALID / plural / "" / undefined-like', () => {
    assert.equal(isValidMode('INVALID'), false)
    assert.equal(isValidMode('plural'), false) // case-sensitive
    assert.equal(isValidMode(''), false)
    assert.equal(isValidMode('CRISES'), false)
  })

  // ─── 3. PLURAL → devuelve array ───────────────────────────────────────
  await test('buildDominantTopicsForMode(PLURAL) devuelve array DominantTopic', async () => {
    const topics = await buildDominantTopicsForMode('PLURAL', '24h', 14)
    assert.ok(Array.isArray(topics), 'expected array')
    // Sin DB en test → fallback [] es válido y common case
    topics.forEach((t) => {
      assert.equal(typeof t.topicId, 'string')
      assert.equal(typeof t.volume, 'number')
      assert.ok(
        ['STRUCTURAL', 'EMERGENT', 'STABLE'].includes(t.state),
        `unexpected state: ${t.state}`,
      )
    })
  })

  // ─── 4. AUDIEN · topics tienen total_audience_proxy si presentes ──────
  await test('buildDominantTopicsForMode(AUDIEN) topics tienen total_audience_proxy', async () => {
    const topics = await buildDominantTopicsForMode('AUDIEN', '24h', 14)
    assert.ok(Array.isArray(topics))
    topics.forEach((t) => {
      assert.ok(
        'total_audience_proxy' in t,
        'missing total_audience_proxy on enriched topic',
      )
      assert.equal(typeof t.total_audience_proxy, 'number')
      assert.ok(
        (t.total_audience_proxy ?? -1) >= 0,
        'expected non-negative audience proxy',
      )
    })
  })

  // ─── 5. REGION · ccaa_breakdown es objeto ──────────────────────────────
  await test('buildDominantTopicsForMode(REGION) topics tienen ccaa_breakdown objeto', async () => {
    const topics = await buildDominantTopicsForMode('REGION', '24h', 14)
    assert.ok(Array.isArray(topics))
    topics.forEach((t) => {
      assert.ok('ccaa_breakdown' in t, 'missing ccaa_breakdown')
      assert.equal(
        typeof t.ccaa_breakdown,
        'object',
        'ccaa_breakdown should be object',
      )
      assert.notEqual(t.ccaa_breakdown, null, 'ccaa_breakdown should not be null')
      // Cada entry debe tener shape { from_medium, mentions, affects }
      for (const [_ccaa, entry] of Object.entries(t.ccaa_breakdown ?? {})) {
        assert.equal(typeof entry.from_medium, 'number')
        assert.equal(typeof entry.mentions, 'number')
        assert.equal(typeof entry.affects, 'number')
      }
    })
  })

  // ─── 6. IDEOLOGY · bias_index ∈ [-1, +1] ──────────────────────────────
  await test('buildDominantTopicsForMode(IDEOLOGY) bias_index ∈ [-1, +1]', async () => {
    const topics = await buildDominantTopicsForMode('IDEOLOGY', '24h', 14)
    assert.ok(Array.isArray(topics))
    topics.forEach((t) => {
      assert.ok('bias_index' in t, 'missing bias_index')
      assert.equal(typeof t.bias_index, 'number')
      assert.ok(
        (t.bias_index ?? -2) >= -1 && (t.bias_index ?? 2) <= 1,
        `bias_index out of range: ${t.bias_index}`,
      )
      assert.ok(
        'ideological_distribution' in t,
        'missing ideological_distribution',
      )
      const dist = t.ideological_distribution!
      // Suma ≈ 1 (con tolerancia para floating point)
      const sum = dist.izquierda + dist.centro + dist.derecha
      assert.ok(
        Math.abs(sum - 1) < 0.001,
        `ideological_distribution sums ${sum}, expected ≈1`,
      )
    })
  })

  // ─── 7. CRISIS · sólo topics EMERGENT ─────────────────────────────────
  await test('buildDominantTopicsForMode(CRISIS) solo devuelve topics EMERGENT', async () => {
    const topics = await buildDominantTopicsForMode('CRISIS', '24h', 14)
    assert.ok(Array.isArray(topics))
    topics.forEach((t) => {
      assert.equal(
        t.state,
        'EMERGENT',
        `expected state=EMERGENT, got ${t.state}`,
      )
    })
  })

  // ─── 8. limit es respetado ────────────────────────────────────────────
  await test('buildDominantTopicsForMode respeta el parámetro limit', async () => {
    const topics = await buildDominantTopicsForMode('PLURAL', '24h', 5)
    assert.ok(Array.isArray(topics))
    assert.ok(topics.length <= 5, `expected ≤5 topics, got ${topics.length}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
