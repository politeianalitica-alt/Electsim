/**
 * Sprint 0+1 · Task 2 · Tests para los loaders y helpers de catálogos.
 *
 * Cubre:
 *   · entity-catalog: ≥85 entities, Pedro Sánchez, alias lookup, cache
 *   · topic-rules: ≥20 topics + OTRO, TERRITORIAL subtopics
 *   · rss-tag-map: ≥80 mappings, "política", "others" con topicId=null
 *   · framing-rules: 9 framings preparados
 *   · source-catalog: ≥20 sources, findSourceByDomain con www. normalization
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings tests/unit/medios/canonical/catalogs.test.ts
 *
 * Si todos los assertions pasan imprime un resumen con tests pasados.
 * Si alguno falla el proceso sale con código 1 y stack trace.
 */
import assert from 'node:assert/strict'
import {
  loadEntityCatalog,
  loadTopicRules,
  loadRssTagMap,
  loadFramingRules,
  loadSourceCatalog,
  findSourceByDomain,
  findEntityById,
  findEntitiesByAlias,
  _resetCatalogCache,
} from '../../../../lib/medios/canonical/catalogs.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  _resetCatalogCache()
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
  // ─── entity-catalog ───────────────────────────────────────────────────
  console.log('\n→ Catalogs · entity-catalog')

  await test('entity-catalog · carga ≥85 entities con shape válido', async () => {
    const entities = await loadEntityCatalog()
    assert.ok(entities.length >= 85, `esperaba ≥85 entities, encontré ${entities.length}`)
    assert.ok('id' in entities[0])
    assert.ok('aliases' in entities[0])
  })

  await test('entity-catalog · Pedro Sánchez está en el catálogo con aliases ricos', async () => {
    const entities = await loadEntityCatalog()
    const sanchez = findEntityById(entities, 'pedro-sanchez')
    assert.notStrictEqual(sanchez, null)
    assert.strictEqual(sanchez?.canonicalName, 'Pedro Sánchez')
    assert.ok(
      (sanchez?.aliases.length ?? 0) >= 4,
      `esperaba ≥4 aliases, encontré ${sanchez?.aliases.length}`,
    )
  })

  await test('entity-catalog · "Sánchez" alias se encuentra en al menos 1 entity', async () => {
    const entities = await loadEntityCatalog()
    const matches = findEntitiesByAlias(entities, 'Sánchez')
    assert.ok(matches.length >= 1)
    assert.ok(matches.some((e) => e.id === 'pedro-sanchez'))
  })

  await test('entity-catalog · "Sánchez" alias marcado disambiguationRequired', async () => {
    const entities = await loadEntityCatalog()
    const sanchez = findEntityById(entities, 'pedro-sanchez')
    const aliasSanchez = sanchez?.aliases.find((a) => a.text === 'Sánchez')
    assert.strictEqual(aliasSanchez?.disambiguationRequired, true)
  })

  await test('entity-catalog · "Moncloa" alias tiene contextRequired', async () => {
    const entities = await loadEntityCatalog()
    const sanchez = findEntityById(entities, 'pedro-sanchez')
    const moncloaAlias = sanchez?.aliases.find((a) => a.text === 'Moncloa')
    assert.ok(moncloaAlias?.contextRequired && moncloaAlias.contextRequired.length > 0)
    assert.ok(moncloaAlias.contextRequired.includes('gobierno'))
  })

  await test('entity-catalog · cache: segunda llamada no relee disco', async () => {
    const t0 = Date.now()
    await loadEntityCatalog()
    const first = Date.now() - t0
    const t1 = Date.now()
    await loadEntityCatalog()
    const second = Date.now() - t1
    assert.ok(
      second <= Math.max(first, 5),
      `cache debería evitar relectura: first=${first}ms second=${second}ms`,
    )
  })

  // ─── topic-rules ──────────────────────────────────────────────────────
  console.log('\n→ Catalogs · topic-rules')

  await test('topic-rules · carga ≥20 topics incluyendo OTRO', async () => {
    const cat = await loadTopicRules()
    assert.ok(
      cat.topics.length >= 20,
      `esperaba ≥20 topics, encontré ${cat.topics.length}`,
    )
    const ids = (cat.topics as Array<{ topicId: string }>).map((t) => t.topicId)
    assert.ok(ids.includes('POLITICA_INSTITUCIONAL'))
    assert.ok(ids.includes('TERRITORIAL'))
    assert.ok(ids.includes('JUDICIAL'))
    assert.ok(ids.includes('OTRO'))
  })

  await test('topic-rules · TERRITORIAL tiene subtopics CATALUÑA y PAIS_VASCO', async () => {
    const cat = await loadTopicRules()
    const terr = (cat.topics as Array<{ topicId: string; subtopics?: Array<{ subtopicId: string }> }>).find(
      (t) => t.topicId === 'TERRITORIAL',
    )
    assert.ok(terr?.subtopics !== undefined, 'TERRITORIAL debería tener subtopics')
    const subIds = terr!.subtopics!.map((s) => s.subtopicId)
    assert.ok(subIds.includes('CATALUÑA'))
    assert.ok(subIds.includes('PAIS_VASCO'))
  })

  // ─── rss-tag-map ──────────────────────────────────────────────────────
  console.log('\n→ Catalogs · rss-tag-map')

  await test('rss-tag-map · carga ≥80 mappings', async () => {
    const map = await loadRssTagMap()
    assert.ok(
      map.mappings.length >= 80,
      `esperaba ≥80 mappings, encontré ${map.mappings.length}`,
    )
  })

  await test('rss-tag-map · "política" mapea a POLITICA_INSTITUCIONAL con conf 0.85', async () => {
    const map = await loadRssTagMap()
    const m = (map.mappings as Array<{ rawTag: string; topicId: string | null; confidence: number }>).find(
      (x) => x.rawTag === 'política',
    )
    assert.strictEqual(m?.topicId, 'POLITICA_INSTITUCIONAL')
    assert.strictEqual(m?.confidence, 0.85)
  })

  await test('rss-tag-map · "others" tiene topicId null para forzar capa 2', async () => {
    const map = await loadRssTagMap()
    const m = (map.mappings as Array<{ rawTag: string; topicId: string | null }>).find(
      (x) => x.rawTag === 'others',
    )
    assert.strictEqual(m?.topicId, null)
  })

  // ─── framing-rules ────────────────────────────────────────────────────
  console.log('\n→ Catalogs · framing-rules')

  await test('framing-rules · carga 9 framings con rules vacíos (preparado Sprint 4)', async () => {
    const cat = await loadFramingRules()
    assert.strictEqual(cat.framings.length, 9)
    assert.ok((cat as { _status?: string })._status?.includes('PREPARED_FOR_SPRINT_4'))
  })

  // ─── source-catalog ───────────────────────────────────────────────────
  console.log('\n→ Catalogs · source-catalog')

  await test('source-catalog · carga ≥20 sources con tier asignado', async () => {
    const sources = await loadSourceCatalog()
    assert.ok(
      sources.length >= 20,
      `esperaba ≥20 sources, encontré ${sources.length}`,
    )
    assert.ok(sources.every((s) => [1, 2, 3, 4].includes(s.tier)))
  })

  await test('source-catalog · findSourceByDomain("elpais.com") devuelve El País', async () => {
    const sources = await loadSourceCatalog()
    const ep = findSourceByDomain(sources, 'elpais.com')
    assert.strictEqual(ep?.id, 'el-pais')
    assert.strictEqual(ep?.tier, 1)
    assert.strictEqual(ep?.ideology, 'CENTER_LEFT')
  })

  await test('source-catalog · findSourceByDomain normaliza www.', async () => {
    const sources = await loadSourceCatalog()
    const ep = findSourceByDomain(sources, 'www.elpais.com')
    assert.strictEqual(ep?.id, 'el-pais')
  })

  await test('source-catalog · findSourceByDomain devuelve null si no existe', async () => {
    const sources = await loadSourceCatalog()
    assert.strictEqual(findSourceByDomain(sources, 'inexistente.com'), null)
  })

  // ─── Reporte final ───────────────────────────────────────────────────
  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
