/**
 * Sprint 0+1 · Task 3 · Tests integrales para processArticle (10 pasos).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline.test.ts
 */
import assert from 'node:assert/strict'
import {
  processArticle,
  StubLlmClient,
} from '../../../../lib/medios/canonical/pipeline.ts'
import {
  loadEntityCatalog,
  loadTopicRules,
  loadRssTagMap,
  loadFramingRules,
  loadSourceCatalog,
  _resetCatalogCache,
} from '../../../../lib/medios/canonical/catalogs.ts'
import type { Catalogs } from '../../../../lib/medios/canonical/types.ts'

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
  const catalogs: Catalogs = {
    sources: await loadSourceCatalog(),
    entities: await loadEntityCatalog(),
    topicRules: await loadTopicRules(),
    rssTagMap: await loadRssTagMap(),
    framingRules: await loadFramingRules(),
  }

  console.log('\n→ Pipeline · processArticle integration')

  await test('artículo político normal: 10 pasos OK → success con topic + entities', async () => {
    const r = await processArticle(
      {
        url: 'https://elpais.com/politica/sanchez-x',
        title: 'Pedro Sánchez convoca al Consejo de Ministros para aprobar decreto',
        description: 'El presidente del gobierno acelera la tramitación urgente',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: ['política', 'gobierno'],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { semanticEnabled: false },
    )
    assert.equal(r.status, 'success')
    assert.ok(r.article)
    assert.equal(r.article!.topicTags[0].topicId, 'POLITICA_INSTITUCIONAL')
    assert.ok(r.article!.entities.length >= 1, 'esperaba ≥1 entidad')
    assert.ok(
      r.article!.qualityScore > 0.5,
      `qualityScore ${r.article!.qualityScore} esperaba > 0.5`,
    )
    assert.equal(r.method, 'RSS_TAG')
  })

  await test('artículo cataluña → TERRITORIAL/CATALUÑA + entity generalitat', async () => {
    const r = await processArticle(
      {
        url: 'https://lavanguardia.com/cat/x',
        title: 'La Generalitat de Catalunya aprueba presupuestos en Barcelona',
        description:
          'El Govern catalán suma apoyos de Junts y ERC para sacar adelante el presupuesto',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: ['cataluña'],
        ingestionSource: 'RSS',
        sourceDomain: 'lavanguardia.com',
      },
      catalogs,
      {},
    )
    assert.equal(r.article?.topicTags[0].topicId, 'TERRITORIAL')
    assert.equal(r.article?.topicTags[0].subtopicId, 'CATALUÑA')
    assert.ok(
      r.article?.entities.some((e) => e.entityId === 'generalitat-catalunya'),
      'esperaba entity generalitat-catalunya',
    )
  })

  await test('dedupe exacto: id ya conocido → status duplicate + failedStep dedupe_exact', async () => {
    const known = new Set<string>()
    const first = await processArticle(
      {
        url: 'https://elpais.com/dedup-test-1',
        title: 'Titular largo de prueba politica suficiente palabras',
        description: 'Descripción aceptable y razonable',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { knownIds: known },
    )
    assert.ok(first.article)
    known.add(first.article!.id)
    const second = await processArticle(
      {
        url: 'https://elpais.com/dedup-test-1',
        title: 'Otro título largo de prueba politica suficiente',
        description: 'Otra descripción razonable',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { knownIds: known },
    )
    assert.equal(second.status, 'duplicate')
    assert.equal(second.failedStep, 'dedupe_exact')
  })

  await test('noise (título corto) → status noise + article.isNoise=true', async () => {
    const r = await processArticle(
      {
        url: 'https://elpais.com/n-test',
        title: 'Tres palabras solo',
        description: 'Algo',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      {},
    )
    assert.equal(r.status, 'noise')
    assert.equal(r.article?.isNoise, true)
  })

  await test('LLM disabled + sin keywords → FALLBACK OTRO conf 0.3', async () => {
    const r = await processArticle(
      {
        url: 'https://elpais.com/q-test',
        title:
          'Texto neutro suficientemente largo para superar el filtro de ruido',
        description:
          'Una descripción que no contiene keywords de ningún macrotopic conocido',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: ['inexistente-tag'],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { semanticEnabled: false },
    )
    assert.equal(r.article?.topicTags[0].topicId, 'OTRO')
    assert.equal(r.article?.topicTags[0].confidence, 0.3)
    assert.equal(r.method, 'FALLBACK')
  })

  await test('LLM enabled con StubClient (devuelve null) → FALLBACK OTRO', async () => {
    const r = await processArticle(
      {
        url: 'https://elpais.com/z-test',
        title: 'Texto sin keywords pero capa 3 stub responde null garantizado',
        description: 'No hay match en capas 1 ni 2 ni 3',
        publishedAt: '2026-06-02T10:00:00Z',
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { semanticEnabled: true, semanticClient: new StubLlmClient() },
    )
    assert.equal(r.method, 'FALLBACK')
  })

  await test('pipeline puro: misma entrada → misma salida (id + topic + count entities)', async () => {
    const raw = {
      url: 'https://elpais.com/det-test',
      title: 'Pedro Sánchez visita el Congreso de los Diputados hoy',
      description: 'Sesión de control',
      publishedAt: '2026-06-02T10:00:00Z',
      rawTags: ['política'],
      ingestionSource: 'RSS' as const,
      sourceDomain: 'elpais.com',
    }
    const a = await processArticle(raw, catalogs, {})
    const b = await processArticle(raw, catalogs, {})
    assert.equal(a.article?.id, b.article?.id)
    assert.equal(
      a.article?.topicTags[0].topicId,
      b.article?.topicTags[0].topicId,
    )
    assert.equal(a.article?.entities.length, b.article?.entities.length)
  })

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
