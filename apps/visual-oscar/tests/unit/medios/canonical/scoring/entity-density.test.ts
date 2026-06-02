/**
 * Sprint 2 C4 · Tests para computeEntityDensity(articles).
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/entity-density.test.ts
 *
 * Fórmula:
 *   density = unique_entities / article_count, saturado a 5 → score = 1.
 *
 * Cubre:
 *   1. 5+ entidades únicas por artículo → score = 1 (saturado)
 *   2. 1 entidad única por artículo → score ≈ 0.2
 */
import assert from 'node:assert/strict'
import {
  computeEntityDensity,
  type ArticleEntities,
} from '../../../../../lib/medios/canonical/scoring/entity-density.ts'

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
  console.log('\n→ scoring · computeEntityDensity')

  // ─── Caso 1: 5 entidades únicas por artículo · score saturado a 1 ─────
  await test('5 entidades únicas por artículo (10 arts, 50 únicas) · score = 1', () => {
    // 10 artículos, cada uno con 5 entidades únicas distintas → 50 únicas
    // density = 50/10 = 5 → score = min(5/5, 1) = 1
    const articles: ArticleEntities[] = Array.from({ length: 10 }, (_, i) => ({
      entities: [
        { type: 'PER', id: `per_${i}_a` },
        { type: 'PER', id: `per_${i}_b` },
        { type: 'ORG', id: `org_${i}_a` },
        { type: 'ORG', id: `org_${i}_b` },
        { type: 'LOC', id: `loc_${i}_a` },
      ],
    }))
    const score = computeEntityDensity(articles)
    assert.equal(score, 1, `esperado 1, obtenido ${score}`)
  })

  // ─── Caso 2: 1 entidad única por artículo · score ≈ 0.2 ────────────────
  await test('1 entidad única por artículo (10 arts, 10 únicas) · score ≈ 0.2', () => {
    // 10 artículos, cada uno con 1 entidad única distinta → 10 únicas
    // density = 10/10 = 1 → score = min(1/5, 1) = 0.2
    const articles: ArticleEntities[] = Array.from({ length: 10 }, (_, i) => ({
      entities: [{ type: 'PER', id: `per_${i}` }],
    }))
    const score = computeEntityDensity(articles)
    assert.ok(
      Math.abs(score - 0.2) < 1e-9,
      `esperado ≈ 0.2, obtenido ${score}`,
    )
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
