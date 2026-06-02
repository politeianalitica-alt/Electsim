/**
 * Sprint 0+1 · Tests aceptación §IV (Task 9 · 2026-06-02).
 *
 * 6 tests §IV implementables sin storage real + 4 tests prep Sprint 2/3
 * (capa 3 lazy invocation + disambiguación entidades).
 *
 * Pattern: node native runner (idéntico a tests/unit/medios-methodology.test.ts).
 * NO usamos vitest porque tests/ es estricto-TS y no hay setup de jest.
 *
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *     tests/acceptance/sprint-0-1-prensa.spec.ts
 *
 * Si todos pasan → exit 0. Si alguno falla → exit 1 + stack.
 */
import assert from 'node:assert/strict'
import { processArticle } from '../../lib/medios/canonical/pipeline.ts'
import {
  loadEntityCatalog,
  loadTopicRules,
  loadRssTagMap,
  loadFramingRules,
  loadSourceCatalog,
  _resetCatalogCache,
} from '../../lib/medios/canonical/catalogs.ts'
import { computeTitleHash } from '../../lib/medios/canonical/dedupe.ts'
import type {
  Catalogs,
  TopicTag,
} from '../../lib/medios/canonical/types.ts'
import type { LlmClassifierClient } from '../../lib/medios/canonical/classify-semantic.ts'

// ─── Setup ─────────────────────────────────────────────────────────────
let catalogs: Catalogs

async function setup(): Promise<void> {
  _resetCatalogCache()
  catalogs = {
    sources: await loadSourceCatalog(),
    entities: await loadEntityCatalog(),
    topicRules: await loadTopicRules(),
    rssTagMap: await loadRssTagMap(),
    framingRules: await loadFramingRules(),
  }
}

let passed = 0
let failed = 0
const failures: Array<{ name: string; err: string }> = []

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    passed++
    console.log(`  ok ${name}`)
  } catch (e) {
    failed++
    const msg = (e as Error).message ?? String(e)
    failures.push({ name, err: msg })
    console.error(`  FAIL ${name}`)
    console.error('     ', msg)
    const stack = (e as Error).stack
    if (stack) console.error('     ', stack.split('\n').slice(1, 3).join('\n      '))
  }
}

// ─── Spy-able LLM client (sin vitest) ──────────────────────────────────
class SpyLlmClient implements LlmClassifierClient {
  public calls = 0
  async classifyBatch(
    items: Array<{ title: string; description: string }>,
  ): Promise<Array<{ topicId: string; confidence: number; reasoning: string } | null>> {
    this.calls += 1
    return items.map(() => ({ topicId: 'OTRO', confidence: 0.3, reasoning: 'stub' }))
  }
}

// ─── Main ──────────────────────────────────────────────────────────────
await setup()

console.log('\nSprint 0+1 acceptance tests')
console.log('===========================')

// ─── Test #1: ingesta ≥15 fuentes RSS curadas ─────────────────────────
await test('#1 catálogo source ≥20 fuentes · ≥15 tier-1/2', async () => {
  assert.ok(
    catalogs.sources.length >= 20,
    `esperaba ≥20 fuentes, hay ${catalogs.sources.length}`,
  )
  const tier12 = catalogs.sources.filter((s) => s.tier <= 2)
  assert.ok(
    tier12.length >= 15,
    `esperaba ≥15 tier-1/2, hay ${tier12.length}`,
  )
})

// ─── Test #2: dedupe URL 100% ─────────────────────────────────────────
await test('#2 dedupe URL · 100% bloqueado en segunda invocación', async () => {
  const knownIds = new Set<string>()
  const raw = {
    url: 'https://elpais.com/x',
    title: 'Pedro Sánchez convoca consejo extraordinario hoy',
    description: 'descripción de prueba con contenido suficiente',
    publishedAt: new Date().toISOString(),
    rawTags: [] as string[],
    ingestionSource: 'RSS' as const,
    sourceDomain: 'elpais.com',
  }
  const r1 = await processArticle(raw, catalogs, { knownIds })
  assert.ok(r1.article, 'primer procesamiento debe producir artículo')
  knownIds.add(r1.article!.id)
  const r2 = await processArticle(raw, catalogs, { knownIds })
  assert.equal(r2.status, 'duplicate', 'segunda invocación debe ser duplicate')
})

// ─── Test #3: dedupe titular ≥60% repetido en mismo source ────────────
await test('#3 dedupe titular ≥60% para agencia repetida en mismo source', async () => {
  const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
  let dups = 0
  // Variaciones del mismo titular EFE que sólo se diferencian a partir del
  // 8º token (computeTitleHash trunca a primeros 8 tokens no-stopword).
  const titles = [
    'EFE Pedro Sánchez convoca consejo ministros extraordinario hoy',
    'EFE Pedro Sánchez convoca consejo ministros extraordinario hoy mismo',
    'EFE Pedro Sánchez convoca consejo ministros extraordinario hoy ahora',
    'EFE Pedro Sánchez convoca consejo ministros extraordinario hoy tarde',
    'EFE Pedro Sánchez convoca consejo ministros extraordinario hoy urgente',
  ]
  for (let i = 0; i < titles.length; i++) {
    const r = await processArticle(
      {
        url: `https://elpais.com/efe-${i}`,
        title: titles[i],
        description: 'descripción suficiente',
        publishedAt: new Date().toISOString(),
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { recentTitleHashes: recent },
    )
    if (r.status === 'duplicate') {
      dups++
    } else if (r.article) {
      const hash = computeTitleHash(titles[i])
      recent.set(hash, { id: r.article.id, sourceId: 'el-pais', ts: new Date().toISOString() })
    }
  }
  const rate = dups / titles.length
  assert.ok(rate >= 0.6, `esperaba dedupe titular ≥60%, fue ${(rate * 100).toFixed(0)}%`)
})

// ─── Test #4: OTRO ≤15% en dataset 100 artículos políticos ────────────
await test('#4 OTRO ≤15% sobre 100 artículos políticos (mock)', async () => {
  let otro = 0
  const TITLES = [
    'Pedro Sánchez convoca al consejo de ministros',
    'Feijóo critica gestión gobierno',
    'Tribunal Supremo dicta sentencia amnistía',
    'PSOE aprueba enmienda presupuestos',
    'Cataluña reclama financiación autonómica',
    'Vox abandona junta extraordinaria',
    'Congreso aprueba decreto ley',
  ]
  for (let i = 0; i < 100; i++) {
    const title = TITLES[i % TITLES.length] + ` numero ${i}`
    const r = await processArticle(
      {
        url: `https://elpais.com/n-${i}`,
        title,
        description: 'descripción suficiente para superar filtro ruido',
        publishedAt: new Date().toISOString(),
        rawTags: ['política'],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      { semanticEnabled: false },
    )
    if (r.article?.topicTags[0]?.topicId === 'OTRO') otro++
  }
  const rate = otro / 100
  assert.ok(rate <= 0.15, `esperaba OTRO ≤15%, fue ${(rate * 100).toFixed(0)}%`)
})

// ─── Test #5: pipeline < 2s por artículo ──────────────────────────────
await test('#5 pipeline < 2s end-to-end por artículo (median path)', async () => {
  const t0 = Date.now()
  await processArticle(
    {
      url: 'https://elpais.com/t5',
      title: 'Pedro Sánchez visita Bruselas en cumbre europea',
      description: 'El presidente acude a la cumbre del Consejo Europeo',
      publishedAt: new Date().toISOString(),
      rawTags: ['política', 'union europea'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    { semanticEnabled: false },
  )
  const elapsed = Date.now() - t0
  assert.ok(elapsed < 2000, `esperaba <2000ms, fue ${elapsed}ms`)
})

// ─── Test #9: entity extraction ≥7 de 10 personas ─────────────────────
await test('#9 entity extraction ≥7 de 10 personas en titulares de prueba', async () => {
  const tests: Array<{ title: string; expected: string }> = [
    { title: 'Pedro Sánchez anuncia decreto extraordinario hoy', expected: 'pedro-sanchez' },
    { title: 'Alberto Núñez Feijóo critica gestión del gobierno actual', expected: 'alberto-nunez-feijoo' },
    { title: 'Yolanda Díaz presenta nueva reforma laboral', expected: 'yolanda-diaz' },
    { title: 'Santiago Abascal abandona plenario en protesta', expected: 'santiago-abascal' },
    { title: 'Oriol Junqueras anuncia regreso a primera línea política', expected: 'oriol-junqueras' },
    { title: 'Pere Aragonès cierra etapa al frente de la Generalitat', expected: 'pere-aragones' },
    { title: 'Isabel Díaz Ayuso defiende rebajas fiscales en Madrid', expected: 'isabel-diaz-ayuso' },
    { title: 'Carles Puigdemont mantiene línea independentista en Junts', expected: 'carles-puigdemont' },
    { title: 'María Jesús Montero presenta presupuestos hacienda', expected: 'maria-jesus-montero' },
    { title: 'Irene Montero critica nuevamente al gobierno desde Podemos', expected: 'irene-montero' },
  ]
  let matches = 0
  const missed: string[] = []
  for (const t of tests) {
    const r = await processArticle(
      {
        url: `https://elpais.com/e-${t.expected}`,
        title: t.title,
        description: 'descripción suficiente para superar filtro ruido',
        publishedAt: new Date().toISOString(),
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      },
      catalogs,
      {},
    )
    if (r.article?.entities.some((e) => e.entityId === t.expected)) {
      matches++
    } else {
      missed.push(t.expected)
    }
  }
  assert.ok(
    matches >= 7,
    `esperaba ≥7 de 10 personas extraídas, fue ${matches} (missed: ${missed.join(', ')})`,
  )
})

// ─── Test §2.5#9 Sprint 2 prep: capa 3 NO se invoca si capa 1 conf ≥0.80 ─
await test('§2.5#9 Sprint 2 prep · capa 3 NO se invoca cuando capa 1 produce RSS_TAG conf ≥0.80', async () => {
  const llmStub = new SpyLlmClient()
  const r = await processArticle(
    {
      url: 'https://elpais.com/cap1',
      title: 'Pedro Sánchez aprueba decreto ley en Moncloa',
      description: 'Consejo de Ministros extraordinario',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    { semanticEnabled: true, semanticClient: llmStub },
  )
  assert.equal(r.method, 'RSS_TAG', `método debe ser RSS_TAG, fue ${r.method}`)
  assert.equal(llmStub.calls, 0, `LLM no debe invocarse, llamadas=${llmStub.calls}`)
})

// ─── Test §3.5#2 Sprint 3 prep: Pedro Sánchez conf ≥0.95 ──────────────
await test('§3.5#2 Sprint 3 prep · Pedro Sánchez en título → conf ≥0.95', async () => {
  const r = await processArticle(
    {
      url: 'https://elpais.com/ps',
      title: 'Pedro Sánchez convoca al consejo de ministros con urgencia hoy',
      description: 'Sesión extraordinaria',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    {},
  )
  const ps = r.article?.entities.find(
    (e) => e.entityId === 'pedro-sanchez' && e.alias === 'Pedro Sánchez',
  )
  assert.ok(ps, 'esperaba match Pedro Sánchez con alias completo')
  assert.ok(
    (ps?.confidence ?? 0) >= 0.95,
    `esperaba conf ≥0.95, fue ${ps?.confidence?.toFixed(3)}`,
  )
})

// ─── Test §3.5#3 Sprint 3 prep: Sánchez ambiguo → conf <0.75 ──────────
await test('§3.5#3 Sprint 3 prep · Sánchez SOLO ambiguo → conf <0.75 o no match', async () => {
  const r = await processArticle(
    {
      url: 'https://elpais.com/amb',
      title: 'Sánchez se incorpora al partido en Galicia tras meses fuera',
      description: 'Una noticia regional sin contexto del presidente',
      publishedAt: new Date().toISOString(),
      rawTags: [],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    {},
  )
  // Como no hay match previo de Pedro Sánchez con conf ≥0.85, la pasada
  // de co-referencia descarta el alias ambiguo. Aceptamos ambos casos:
  // (a) no aparece pedro-sanchez (preferido) o (b) aparece con conf <0.75.
  const ps = r.article?.entities.find(
    (e) => e.entityId === 'pedro-sanchez' && e.alias === 'Sánchez',
  )
  if (ps) {
    assert.ok(
      ps.confidence < 0.75,
      `match ambiguo presente debe tener conf <0.75, fue ${ps.confidence.toFixed(3)}`,
    )
  }
})

// ─── Test §3.5#4 Sprint 3 prep: Govern + cataluña → generalitat-catalunya ─
await test('§3.5#4 Sprint 3 prep · Govern + cataluña → generalitat-catalunya', async () => {
  const r = await processArticle(
    {
      url: 'https://lavanguardia.com/g',
      title: 'El Govern propone reforma en Cataluña con junts y erc',
      description: 'Generalitat anuncia plan',
      publishedAt: new Date().toISOString(),
      rawTags: ['cataluña'],
      ingestionSource: 'RSS',
      sourceDomain: 'lavanguardia.com',
    },
    catalogs,
    {},
  )
  const got = r.article?.entities.some((e) => e.entityId === 'generalitat-catalunya')
  assert.equal(
    got,
    true,
    'esperaba match generalitat-catalunya con contexto cataluña+junts+erc',
  )
})

// ─── Report ────────────────────────────────────────────────────────────
console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) {
  console.log('\nFailures detail:')
  for (const f of failures) console.log(`  ${f.name}: ${f.err}`)
  process.exit(1)
}
process.exit(0)

// Mantener TS contento con tipos importados pero no referenciados
void undefined as unknown as TopicTag | undefined
