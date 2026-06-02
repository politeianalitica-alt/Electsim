/**
 * Sprint 2 · C2 · Tests para la cascada completa de clasificación
 * RSS_TAG → HEURISTIC → SEMANTIC en processArticle() step 6.
 *
 * Verifica que cuando Layers 1 + 2 fallan, Layer 3 (LLM semantic) se
 * invoca con el cliente inyectado vía `ProcessOptions.semanticClient`.
 * Cuando ningún cliente se inyecta, el pipeline cae al factory
 * `createLlmClient()` (FLAGS-driven). Si el FLAG resuelve a 'disabled'
 * → StubLlmClient → Layer 3 retorna null → FALLBACK OTRO.
 *
 * NO depende de vitest/jest (mismo harness que el resto de tests del
 * módulo medios). Se ejecuta con Node 24+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts
 *
 * Cubre:
 *   1. L1 match (rawTag 'política' RSS_TAG conf 0.85) → no toca L2 ni L3
 *   2. L2 match (heurística keyword) → no toca L3
 *   3. L3 match (LLM stub retorna SANIDAD conf 0.75) → method SEMANTIC
 *   4. L3 desactivada vía semanticEnabled=false → FALLBACK OTRO (no L3)
 *   5. L3 error (cliente lanza) → FALLBACK OTRO sin crashear · marca
 *      `semanticErrored=true` en el outcome (I5 fix)
 *   6. L3 default-branch sin semanticClient inyectado · FLAG=disabled →
 *      createLlmClient() resuelve a Stub → FALLBACK OTRO sin error
 *      (I1 fix · cubre el path crítico de producción Sprint 2)
 */
import assert from 'node:assert/strict'
import {
  processArticle,
  type RawArticle,
} from '../../../../lib/medios/canonical/pipeline.ts'
import type { LlmClassifierClient } from '../../../../lib/medios/canonical/classify-semantic.ts'
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

// ─── Spy stubs para LlmClassifierClient ─────────────────────────────

class SpyLlmClient implements LlmClassifierClient {
  calls = 0
  receivedItems: Array<{ title: string; description: string }> = []
  result: { topicId: string; confidence: number; reasoning: string } | null

  constructor(
    result: { topicId: string; confidence: number; reasoning: string } | null = null,
  ) {
    this.result = result
  }

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
  ): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    this.calls++
    this.receivedItems.push(...items)
    return items.map(() => this.result)
  }
}

class ThrowingLlmClient implements LlmClassifierClient {
  calls = 0
  async classifyBatch(): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    this.calls++
    throw new Error('LLM provider outage')
  }
}

// ─── Helpers de fixtures ─────────────────────────────────────────────

function makeRaw(overrides: Partial<RawArticle>): RawArticle {
  return {
    url: 'https://elpais.com/ambiguo',
    title:
      'Texto neutro suficientemente largo sin keywords para superar el filtro de ruido',
    description:
      'Descripción genérica sin keywords macrotopic conocidos en heurística',
    publishedAt: '2026-06-02T10:00:00Z',
    rawTags: [],
    ingestionSource: 'RSS',
    sourceDomain: 'elpais.com',
    ...overrides,
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

  console.log('\n→ Pipeline · cascade · Layer 3 SEMANTIC wiring')

  // ─────────────────────────────────────────────────────────────────
  // Test 1 · L1 strong match → no L2, no L3
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L1 match (rawTag política) → method RSS_TAG · L3 stub NO se invoca',
    async () => {
      const spy = new SpyLlmClient({
        topicId: 'OTRO',
        confidence: 0.75,
        reasoning: 'no llegamos',
      })
      const r = await processArticle(
        makeRaw({
          url: 'https://elpais.com/l1',
          title: 'Pedro Sánchez convoca al Consejo de Ministros extraordinario',
          description: 'Sesión urgente en Moncloa',
          rawTags: ['política'],
        }),
        catalogs,
        { semanticEnabled: true, semanticClient: spy },
      )
      assert.equal(r.status, 'success')
      assert.equal(r.method, 'RSS_TAG', `method esperado RSS_TAG fue ${r.method}`)
      assert.equal(
        r.article?.topicTags[0].topicId,
        'POLITICA_INSTITUCIONAL',
      )
      assert.equal(
        spy.calls,
        0,
        `L3 LLM no debe invocarse cuando L1 matchea, calls=${spy.calls}`,
      )
    },
  )

  // ─────────────────────────────────────────────────────────────────
  // Test 2 · L2 match → no L3
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L2 match (heurística JUDICIAL: Tribunal Supremo) → method HEURISTIC · L3 stub NO se invoca',
    async () => {
      const spy = new SpyLlmClient({
        topicId: 'OTRO',
        confidence: 0.75,
        reasoning: 'no llegamos',
      })
      const r = await processArticle(
        makeRaw({
          url: 'https://elpais.com/l2',
          title:
            'El Tribunal Supremo dicta sentencia firme sobre la ley de amnistía',
          description: 'La Sala Segunda resuelve el recurso de casación',
          rawTags: ['etiqueta-no-mapeada'],
        }),
        catalogs,
        { semanticEnabled: true, semanticClient: spy },
      )
      assert.equal(r.status, 'success')
      assert.equal(r.method, 'HEURISTIC', `esperado HEURISTIC fue ${r.method}`)
      assert.equal(r.article?.topicTags[0].topicId, 'JUDICIAL')
      assert.equal(
        spy.calls,
        0,
        `L3 LLM no debe invocarse cuando L2 matchea, calls=${spy.calls}`,
      )
    },
  )

  // ─────────────────────────────────────────────────────────────────
  // Test 3 · L3 match cuando L1 + L2 fallan
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L3 invocada cuando L1+L2 fallan · stub devuelve SANIDAD conf 0.75 → method SEMANTIC',
    async () => {
      const spy = new SpyLlmClient({
        topicId: 'SANIDAD',
        confidence: 0.75,
        reasoning: 'menciona hospital y vacuna',
      })
      const r = await processArticle(
        makeRaw({
          url: 'https://elpais.com/l3',
          title:
            'Texto neutro suficientemente largo para superar el filtro de ruido sin disparar reglas',
          description:
            'Descripción sin keywords explícitas de macrotopics conocidos',
        }),
        catalogs,
        { semanticEnabled: true, semanticClient: spy },
      )
      assert.equal(r.status, 'success', `status fue ${r.status}`)
      assert.equal(r.method, 'SEMANTIC', `esperado SEMANTIC fue ${r.method}`)
      assert.equal(r.article?.topicTags[0].topicId, 'SANIDAD')
      assert.equal(r.article?.topicTags[0].method, 'SEMANTIC')
      assert.ok(
        (r.article?.topicTags[0].confidence ?? 0) <= 0.75,
        `confidence debe ≤ 0.75, fue ${r.article?.topicTags[0].confidence}`,
      )
      assert.equal(
        spy.calls,
        1,
        `L3 LLM debe invocarse una vez, calls=${spy.calls}`,
      )
      assert.equal(spy.receivedItems.length, 1, 'L3 debe recibir 1 item')
    },
  )

  // ─────────────────────────────────────────────────────────────────
  // Test 4 · L3 disabled vía semanticEnabled=false → FALLBACK
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L3 desactivada (semanticEnabled=false) · L1+L2 fallan → FALLBACK OTRO conf 0.30',
    async () => {
      const spy = new SpyLlmClient({
        topicId: 'SANIDAD',
        confidence: 0.75,
        reasoning: 'no debería invocarse',
      })
      const r = await processArticle(
        makeRaw({
          url: 'https://elpais.com/l3-off',
          title:
            'Texto neutro suficientemente largo para superar el filtro de ruido sin disparar reglas',
          description:
            'Descripción sin keywords explícitas de macrotopics conocidos',
        }),
        catalogs,
        { semanticEnabled: false, semanticClient: spy },
      )
      assert.equal(r.status, 'success')
      assert.equal(r.method, 'FALLBACK', `esperado FALLBACK fue ${r.method}`)
      assert.equal(r.article?.topicTags[0].topicId, 'OTRO')
      assert.equal(r.article?.topicTags[0].confidence, 0.3)
      assert.equal(
        spy.calls,
        0,
        `L3 LLM NO debe invocarse cuando semanticEnabled=false, calls=${spy.calls}`,
      )
    },
  )

  // ─────────────────────────────────────────────────────────────────
  // Test 5 · L3 errors → fallback OTRO (no crash)
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L3 cliente lanza error → catch graceful → FALLBACK OTRO sin crashear pipeline',
    async () => {
      const throwing = new ThrowingLlmClient()
      const r = await processArticle(
        makeRaw({
          url: 'https://elpais.com/l3-err',
          title:
            'Texto neutro suficientemente largo para superar el filtro de ruido sin disparar reglas',
          description:
            'Descripción sin keywords explícitas de macrotopics conocidos',
        }),
        catalogs,
        { semanticEnabled: true, semanticClient: throwing },
      )
      assert.equal(r.status, 'success', `status esperado success fue ${r.status}`)
      assert.equal(r.method, 'FALLBACK', `method esperado FALLBACK fue ${r.method}`)
      assert.equal(r.article?.topicTags[0].topicId, 'OTRO')
      assert.equal(r.article?.topicTags[0].confidence, 0.3)
      assert.equal(
        throwing.calls,
        1,
        `el cliente debe haberse intentado invocar, calls=${throwing.calls}`,
      )
      // I5 fix: el outcome debe marcar semanticErrored=true para que C9
      // distinga este caso (provider outage) de FALLBACK genuino (null).
      assert.equal(
        r.semanticErrored,
        true,
        `semanticErrored debe ser true cuando L3 lanzó · fue ${r.semanticErrored}`,
      )
    },
  )

  // ─────────────────────────────────────────────────────────────────
  // Test 6 · L3 default-branch · createLlmClient() vía FLAGS · I1 fix
  //
  // Cubre el path `options.semanticClient ?? createLlmClient()` cuando
  // semanticClient NO se inyecta. Sin este test, el comportamiento más
  // crítico (el que corre en producción Sprint 2) quedaba sin cobertura
  // unitaria — los tests 1-5 todos inyectan el cliente.
  //
  // Setup: MEDIOS_LLM_CLASSIFIER='disabled' → FLAGS.MEDIOS_LLM_CLASSIFIER
  // resuelve a 'disabled' → createLlmClient() devuelve StubLlmClient
  // (esto evita un fetch accidental a localhost:11434 en CI sin Ollama).
  //
  // FLAGS.MEDIOS_LLM_CLASSIFIER es un getter lazy (lib/medios/feature-
  // flags.ts), así que el cambio en process.env tiene efecto inmediato
  // sin necesidad de reimportar módulos.
  // ─────────────────────────────────────────────────────────────────
  await test(
    'L3 default-branch · sin semanticClient inyectado → createLlmClient() resuelve a Stub → FALLBACK OTRO',
    async () => {
      const previousFlag = process.env.MEDIOS_LLM_CLASSIFIER
      process.env.MEDIOS_LLM_CLASSIFIER = 'disabled'
      try {
        const r = await processArticle(
          makeRaw({
            url: 'https://elpais.com/l3-default',
            title:
              'Texto neutro suficientemente largo para superar el filtro de ruido sin disparar reglas',
            description:
              'Descripción sin keywords explícitas de macrotopics conocidos',
          }),
          catalogs,
          // semanticEnabled default true · semanticClient NO inyectado.
          {},
        )
        assert.equal(r.status, 'success', `status esperado success fue ${r.status}`)
        // Stub.classifyBatch() devuelve null → topicTag null → caemos a FALLBACK
        assert.equal(
          r.method,
          'FALLBACK',
          `esperado FALLBACK (Stub devuelve null) fue ${r.method}`,
        )
        assert.equal(r.article?.topicTags[0].topicId, 'OTRO')
        assert.equal(r.article?.topicTags[0].method, 'FALLBACK')
        // Stub NO lanza error · semanticErrored debe ser false/undefined
        assert.notEqual(
          r.semanticErrored,
          true,
          `semanticErrored NO debe ser true cuando Stub devuelve null sin error · fue ${r.semanticErrored}`,
        )
      } finally {
        if (previousFlag === undefined) delete process.env.MEDIOS_LLM_CLASSIFIER
        else process.env.MEDIOS_LLM_CLASSIFIER = previousFlag
      }
    },
  )

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
