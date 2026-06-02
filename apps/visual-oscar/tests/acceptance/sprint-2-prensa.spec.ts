/**
 * Sprint 2 · Tests aceptación §IV (Task C10 · 2026-06-02).
 *
 * 10 tests que verifican la LÓGICA / CONTRATOS que respaldan cada claim §IV
 * del Sprint 2. El entorno de test NO tiene conexión a Railway (`withDb`
 * degrada a fallback vacío), así que NO consultamos datos en vivo: cada test
 * usa fixtures sintéticos + dependencias inyectadas y verifica el MECANISMO
 * DE MEDICIÓN que respalda cada claim (ej. "OTRO ≤ 8%" → se prueba que el
 * cómputo de `otro_percentage` es correcto con counts conocidos).
 *
 * Pattern: node native runner (idéntico a tests/acceptance/sprint-0-1-prensa.spec.ts).
 * NO usamos vitest porque tests/ es estricto-TS y no hay setup de jest.
 *
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *     tests/acceptance/sprint-2-prensa.spec.ts
 *
 * Si todos pasan → exit 0. Si alguno falla → exit 1 + stack.
 *
 * Adaptaciones respecto al spec original (firmas reales del código):
 *   - No existe `classifyTopic` exportado: la cascada L1→L2→L3 vive dentro
 *     de `processArticle`, que expone `outcome.method` ∈ {RSS_TAG, HEURISTIC,
 *     SEMANTIC, FALLBACK} y `outcome.confidence`. Los tests #2/#3/#10 usan
 *     `processArticle` y aseveran sobre `.method` (no `classification_method`).
 *   - `GeminiProductionClient.classifyBatch(items, topicList)` requiere el
 *     segundo argumento `topicList`; el stub inyectado es `generateJSON`.
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
import type { Catalogs } from '../../lib/medios/canonical/types.ts'
import type { LlmClassifierClient } from '../../lib/medios/canonical/classify-semantic.ts'
import {
  jobClassifierMetrics,
  type AggregatedMetrics,
} from '../../lib/medios/canonical/maintenance/classifier-metrics.ts'
import { GeminiProductionClient } from '../../lib/medios/canonical/llm-classifier.ts'
import {
  computeSourceDiversity,
  type SourceCount,
} from '../../lib/medios/canonical/scoring/diversity.ts'
import {
  computeMomentum,
  type VolumePoint,
} from '../../lib/medios/canonical/scoring/momentum.ts'
import {
  deriveTopicState,
  type StateInput,
} from '../../lib/medios/canonical/scoring/state-machine.ts'
import {
  buildDominantTopicsForMode,
  isValidMode,
} from '../../lib/medios/canonical/pulso-modes.ts'

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
    _topicList: string[],
  ): Promise<Array<{ topicId: string; confidence: number; reasoning: string } | null>> {
    this.calls += 1
    return items.map(() => ({ topicId: 'OTRO', confidence: 0.3, reasoning: 'stub' }))
  }
}

const H = 3600_000

// ─── Main ──────────────────────────────────────────────────────────────
await setup()

console.log('\nSprint 2 acceptance tests')
console.log('=========================')

// ─── Test #1: OTRO percentage measurement correcto ────────────────────
// Respaldo de claim §IV "OTRO ≤ 8%": verificamos que el job calcula
// otro_percentage = otro_count/fetched_total * 100 correctamente con un
// aggregator inyectado (sin DB). fetched_total=1000, otro_count=50 → 5.0%.
await test('#1 OTRO% measurement · jobClassifierMetrics(inj) 50/1000 → 5.0%', async () => {
  const agg: AggregatedMetrics = {
    fetched_total: 1000,
    duplicates_exact: 80,
    noise_filtered: 20,
    processed_successfully: 850,
    classified_with_taxonomy: 800,
    classification_by_method: {
      RSS_TAG_OR_HEURISTIC: 800,
      SEMANTIC_LLM: 0,
      NONE: 50,
    },
    otro_count: 50,
    semantic_errors: 0,
  }
  const row = await jobClassifierMetrics(async () => agg)
  assert.equal(row.otro_percentage, 5.0, `esperaba 5.0, fue ${row.otro_percentage}`)
  assert.equal(row.fetched_total, 1000)
  // 5.0% ≤ 8% → el gate §IV se mediría como verde con estos counts.
  assert.ok(row.otro_percentage <= 8, 'measurement debe permitir comparar contra el gate 8%')
})

// ─── Test #2: Layer 1 RSS_TAG coverage mechanism ──────────────────────
// Claim §IV "L1 RSS_TAG cubre ≥60%": probamos el camino L1 con un tag
// presente en rss-tag-map.json ('política' → POLITICA_INSTITUCIONAL,
// conf 0.85). Debe clasificar por RSS_TAG con confidence ≥ 0.65.
await test('#2 L1 RSS_TAG · tag conocido → method RSS_TAG conf ≥0.65', async () => {
  const r = await processArticle(
    {
      url: 'https://elpais.com/l1',
      title: 'El Gobierno aprueba una medida en el Congreso',
      description: 'Noticia institucional con contenido suficiente',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    { semanticEnabled: false },
  )
  assert.equal(r.method, 'RSS_TAG', `esperaba RSS_TAG, fue ${r.method}`)
  assert.ok(
    (r.confidence ?? 0) >= 0.65,
    `esperaba confidence ≥0.65, fue ${r.confidence}`,
  )
})

// ─── Test #3: Layer 2 HEURISTIC coverage mechanism ────────────────────
// Claim §IV "L2 HEURISTIC cubre ≥20%": artículo SIN tags RSS pero con
// keyword económica fuerte ('IPC inflación subyacente' → regla eco-01).
// Debe caer a L2 y clasificar por HEURISTIC.
await test('#3 L2 HEURISTIC · sin tags + keyword fuerte → method HEURISTIC', async () => {
  const r = await processArticle(
    {
      url: 'https://elpais.com/l2',
      title: 'El IPC dispara la inflación subyacente este trimestre',
      description: 'Análisis de precios y política monetaria',
      publishedAt: new Date().toISOString(),
      rawTags: [],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    { semanticEnabled: false },
  )
  assert.equal(r.method, 'HEURISTIC', `esperaba HEURISTIC, fue ${r.method}`)
  assert.notEqual(
    r.article?.topicTags[0]?.topicId,
    'OTRO',
    'L2 debe asignar un topic real (no OTRO)',
  )
})

// ─── Test #4: Layer 3 cache hit rate ──────────────────────────────────
// Claim §IV "L3 ≥70% cache hit": GeminiProductionClient con generateJSON
// stub inyectado. Dos classifyBatch con input idéntico → stub llamado UNA
// sola vez (2ª llamada sirve del cache SHA256). Verifica el mecanismo que
// respalda la tasa de cache hit.
await test('#4 L3 cache · classifyBatch ×2 idénticos → generateJSON llamado 1 vez', async () => {
  let stubCalls = 0
  const stubGenerateJSON = async <T,>(_opts: unknown): Promise<T> => {
    stubCalls += 1
    return { results: [{ topicId: 'ECONOMIA', confidence: 0.7, reasoning: 'x' }] } as T
  }
  const client = new GeminiProductionClient({
    apiKey: 'test-key',
    generateJSON: stubGenerateJSON,
  })
  const items = [{ title: 'Titular idéntico de prueba', description: 'desc idéntica' }]
  const topicList = ['ECONOMIA', 'OTRO']
  const first = await client.classifyBatch(items, topicList)
  const second = await client.classifyBatch(items, topicList)
  assert.equal(stubCalls, 1, `esperaba 1 llamada (2ª cache hit), fue ${stubCalls}`)
  assert.equal(first[0]?.topicId, 'ECONOMIA')
  assert.equal(second[0]?.topicId, 'ECONOMIA', 'resultado cacheado debe coincidir')
})

// ─── Test #5: sourceDiversityScore correlaciona con nº de fuentes ─────
// Claim §IV "sourceDiversity correlaciona positivamente con pluralidad":
// 10 fuentes uniformes deben puntuar MÁS que 1 fuente dominante
// (relación monótona = correlación positiva).
await test('#5 sourceDiversity · 10 fuentes uniformes > 1 fuente dominante', async () => {
  const tenSources: SourceCount[] = Array.from({ length: 10 }, (_, i) => ({
    source_id: `s${i}`,
    count: 10,
  }))
  const oneSource: SourceCount[] = [{ source_id: 's0', count: 100 }]
  const scoreTen = computeSourceDiversity(tenSources)
  const scoreOne = computeSourceDiversity(oneSource)
  assert.ok(
    scoreTen > scoreOne,
    `esperaba diversity(10)=${scoreTen.toFixed(3)} > diversity(1)=${scoreOne.toFixed(3)}`,
  )
  assert.equal(scoreOne, 0, 'monopolio (1 fuente) → 0')
  assert.ok(scoreTen > 0.8, `10 fuentes uniformes → alta diversidad, fue ${scoreTen.toFixed(3)}`)
})

// ─── Test #6: momentumScore detecta spike ─────────────────────────────
// Claim §IV "momentum detecta picos de cobertura": baseline 10/día durante
// 6 días + 50 en las últimas 24h → momentumScore alto (≥0.7). Usa fechas
// relativas a Date.now() (la función segmenta por edad respecto a now).
await test('#6 momentum spike · baseline 10/d ×6 + 50 last-24h → ≥0.7', async () => {
  const now = Date.now()
  const history: VolumePoint[] = []
  // baseline: snapshots en 48h..168h ago (todos >24h → baseline_window)
  for (let d = 2; d <= 7; d++) {
    history.push({ computed_at: new Date(now - d * 24 * H), volume: 10 })
  }
  // spike: 50 hace 2h (dentro de recent_window 24h)
  history.push({ computed_at: new Date(now - 2 * H), volume: 50 })
  const score = computeMomentum(history)
  assert.ok(score >= 0.7, `esperaba momentum ≥0.7 (spike), fue ${score.toFixed(3)}`)
  // sanity: baseline plano sin spike reciente → 0
  const flat: VolumePoint[] = []
  for (let d = 2; d <= 7; d++) {
    flat.push({ computed_at: new Date(now - d * 24 * H), volume: 10 })
  }
  assert.equal(computeMomentum(flat), 0, 'sin volumen reciente → momentum 0')
})

// ─── Test #7: TopicState determinista ─────────────────────────────────
// Claim §IV "TopicState es determinista": misma history + mismo now llamado
// dos veces → resultado idéntico. now inyectado (2º parámetro) para
// reproducibilidad.
await test('#7 TopicState determinista · deriveTopicState ×2 → idéntico', async () => {
  const fixedNow = new Date('2026-06-02T12:00:00Z')
  const history: StateInput[] = [
    { computed_at: new Date('2026-06-02T11:00:00Z'), volume_score: 0.2, momentum_score: 0.9 },
    { computed_at: new Date('2026-06-02T10:00:00Z'), volume_score: 0.1, momentum_score: 0.8 },
  ]
  const a = deriveTopicState(history, fixedNow)
  const b = deriveTopicState(history, fixedNow)
  assert.equal(a, b, `esperaba resultado determinista, fue a=${a} b=${b}`)
  // momentum alto + volume bajo (últimas 24h) → EMERGENT (verifica la regla)
  assert.equal(a, 'EMERGENT', `esperaba EMERGENT con momentum 0.85 + volume 0.15, fue ${a}`)
})

// ─── Test #8: PulsoMode REGION shape ──────────────────────────────────
// Claim §IV "PulsoMode REGION expone ccaa_breakdown": el builder devuelve un
// array (posiblemente vacío en test env sin DB) y NO lanza. Si hay items,
// cada uno tiene la propiedad `ccaa_breakdown` (objeto). En empty-DB esto
// asevera que el contrato se sostiene para el caso vacío.
await test('#8 PulsoMode REGION · array + ccaa_breakdown en cada item', async () => {
  const region = await buildDominantTopicsForMode('REGION', '24h', 14)
  assert.ok(Array.isArray(region), 'REGION debe devolver un array')
  for (const item of region) {
    assert.ok(
      'ccaa_breakdown' in item && typeof item.ccaa_breakdown === 'object',
      'cada item REGION debe tener ccaa_breakdown (objeto)',
    )
  }
})

// ─── Test #9: CrisisMode filtra solo EMERGENT ─────────────────────────
// Claim §IV "CRISIS solo topics EMERGENT": el builder devuelve un array
// donde todo item (si lo hay) tiene state==='EMERGENT'. Array vacío pasa
// trivialmente (no hay fugas de no-EMERGENT). También verifica isValidMode.
await test('#9 CrisisMode · solo EMERGENT + isValidMode(CRISIS|FOO)', async () => {
  const crisis = await buildDominantTopicsForMode('CRISIS', '24h', 14)
  assert.ok(Array.isArray(crisis), 'CRISIS debe devolver un array')
  for (const item of crisis) {
    assert.equal(item.state, 'EMERGENT', `CRISIS solo debe contener EMERGENT, fue ${item.state}`)
  }
  assert.equal(isValidMode('CRISIS'), true, 'CRISIS debe ser modo válido')
  assert.equal(isValidMode('FOO'), false, 'FOO no debe ser modo válido')
})

// ─── Test #10: Confidence aggregation respeta thresholds ──────────────
// Claim §IV "las capas no se sobre-invocan": cascada con semanticClient
// inyectado (spy). Artículo con tag RSS fuerte → L1 corta el circuito y el
// spy.classifyBatch NUNCA se invoca (no se desperdicia L3).
await test('#10 confidence cascade · L1 corta circuito → L3 spy nunca llamado', async () => {
  const spy = new SpyLlmClient()
  const r = await processArticle(
    {
      url: 'https://elpais.com/sc',
      title: 'El Gobierno aprueba un decreto ley en el Congreso',
      description: 'Sesión institucional con contenido suficiente',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    },
    catalogs,
    { semanticEnabled: true, semanticClient: spy },
  )
  assert.equal(r.method, 'RSS_TAG', `L1 debe ganar, method fue ${r.method}`)
  assert.equal(spy.calls, 0, `L3 no debe invocarse cuando L1 clasifica, calls=${spy.calls}`)
})

// ─── Report ────────────────────────────────────────────────────────────
console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) {
  console.log('\nFailures detail:')
  for (const f of failures) console.log(`  ${f.name}: ${f.err}`)
  process.exit(1)
}
process.exit(0)
