/**
 * Sprint 0+1 · Task 3 · Tests para classify-rss-tags (Capa 1) y
 * classify-heuristic (Capa 2).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline-classify.test.ts
 */
import assert from 'node:assert/strict'
import {
  loadRssTagMap,
  loadTopicRules,
  _resetCatalogCache,
} from '../../../../lib/medios/canonical/catalogs.ts'
import { classifyByRssTags } from '../../../../lib/medios/canonical/classify-rss-tags.ts'
import { classifyByHeuristic } from '../../../../lib/medios/canonical/classify-heuristic.ts'

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
    console.error('    ', (e as Error).message)
    if ((e as Error).stack)
      console.error(
        '    ',
        (e as Error).stack!.split('\n').slice(1, 3).join('\n     '),
      )
  }
}

async function main() {
  _resetCatalogCache()
  const rssCatalog = await loadRssTagMap()
  const topicsCatalog = await loadTopicRules()

  console.log('\n→ Pipeline · classify · Capa 1 RSS Tags')

  await test('rawTag "política" → POLITICA_INSTITUCIONAL conf 0.85', () => {
    const tag = classifyByRssTags(['política'], 'el-pais', rssCatalog)
    assert.equal(tag?.topicId, 'POLITICA_INSTITUCIONAL')
    assert.equal(tag?.method, 'RSS_TAG')
    assert.equal(tag?.confidence, 0.85)
  })

  await test('rawTag "cataluña" → TERRITORIAL/CATALUÑA con subtopicId y level 2', () => {
    const tag = classifyByRssTags(['cataluña'], 'la-vanguardia', rssCatalog)
    assert.equal(tag?.topicId, 'TERRITORIAL')
    assert.equal(tag?.subtopicId, 'CATALUÑA')
    assert.equal(tag?.level, 2)
  })

  await test('rawTag "others" topicId=null → null (no clasifica)', () => {
    assert.equal(classifyByRssTags(['others'], 'el-pais', rssCatalog), null)
  })

  await test('rawTag desconocido → null (pasa a capa 2)', () => {
    assert.equal(classifyByRssTags(['tag-inexistente'], 'el-pais', rssCatalog), null)
  })

  await test('rawTags vacíos → null', () => {
    assert.equal(classifyByRssTags([], 'el-pais', rssCatalog), null)
  })

  console.log('\n→ Pipeline · classify · Capa 2 Heurísticas')

  await test('"Tribunal Supremo dicta sentencia sobre amnistía" → JUDICIAL', () => {
    const tag = classifyByHeuristic(
      'Tribunal Supremo dicta sentencia sobre amnistía',
      'El TS resuelve la cuestión',
      topicsCatalog,
    )
    assert.equal(tag?.topicId, 'JUDICIAL')
    assert.equal(tag?.method, 'HEURISTIC')
    assert.ok(
      tag!.confidence >= 0.5,
      `confidence ${tag!.confidence} esperaba ≥ 0.5`,
    )
  })

  await test('"Generalitat aprueba presupuestos en Barcelona" → TERRITORIAL/CATALUÑA', () => {
    const tag = classifyByHeuristic(
      'Generalitat aprueba presupuestos en Barcelona',
      'Govern catalán',
      topicsCatalog,
    )
    assert.equal(tag?.topicId, 'TERRITORIAL')
    assert.equal(tag?.subtopicId, 'CATALUÑA')
  })

  await test('"Texto genérico sin keywords políticas" → null (pasa a capa 3)', () => {
    const tag = classifyByHeuristic(
      'Texto genérico sin keywords políticas',
      'Descripción genérica',
      topicsCatalog,
    )
    assert.equal(tag, null)
  })

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
