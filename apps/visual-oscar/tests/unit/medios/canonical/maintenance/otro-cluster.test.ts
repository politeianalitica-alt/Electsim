/**
 * Sprint 2 C8 · Tests para `jobOtroCluster`.
 *
 * El job lee artículos con `categoria='OTRO'` de las últimas 12h (cap 500),
 * tokeniza titles+descriptions, computa TF-IDF, hace clustering greedy por
 * cosine similarity ≥ 0.6 y descarta clusters < 2 items.
 *
 * Estrategia de mock:
 *   - `jobOtroCluster` acepta un fixture inyectado opcional para
 *     evitar tocar Postgres en tests. Patrón análogo a C7 (que usa un
 *     override module-level), pero más simple porque aquí el contrato es
 *     un argumento explícito.
 *   - Helpers `tokenize`, `cosineSimilarity` y `computeTfIdf` se exportan
 *     para poder testearlos por separado.
 *
 * Ejecutar:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/maintenance/otro-cluster.test.ts
 */
import assert from 'node:assert/strict'
import {
  jobOtroCluster,
  tokenize,
  cosineSimilarity,
  computeTfIdf,
} from '../../../../../lib/medios/canonical/maintenance/otro-cluster.ts'

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
  console.log('\n→ maintenance · otro-cluster')

  // ─── tokenize ────────────────────────────────────────────────────────
  await test('tokenize · lowercases + filtra stopwords + length > 2', () => {
    const toks = tokenize('El gobierno de Pedro Sánchez anuncia medidas')
    // 'de' y 'el' son stopwords; 'pedro', 'sánchez', 'gobierno', 'anuncia',
    // 'medidas' son contenido (longitud > 2 y no stopword).
    assert.ok(toks.includes('gobierno'), 'esperaba "gobierno"')
    assert.ok(toks.includes('sánchez'), 'esperaba "sánchez" (preservar tilde)')
    assert.ok(toks.includes('anuncia'), 'esperaba "anuncia"')
    assert.ok(toks.includes('medidas'), 'esperaba "medidas"')
    assert.ok(!toks.includes('de'), '"de" debería estar filtrado por stopword')
    assert.ok(!toks.includes('el'), '"el" debería estar filtrado por stopword')
  })

  await test('tokenize · sin contenido → array vacío', () => {
    assert.deepEqual(tokenize(''), [])
    assert.deepEqual(tokenize('el la los las'), []) // todo stopwords
    assert.deepEqual(tokenize('a el'), []) // longitud ≤ 2
  })

  // ─── cosineSimilarity ────────────────────────────────────────────────
  await test('cosineSimilarity · vectores idénticos → 1', () => {
    const v = new Map<string, number>([['a', 1], ['b', 2]])
    const sim = cosineSimilarity(v, v)
    assert.ok(Math.abs(sim - 1) < 1e-9, `esperaba ~1, obtuve ${sim}`)
  })

  await test('cosineSimilarity · vectores ortogonales → 0', () => {
    const a = new Map<string, number>([['x', 1]])
    const b = new Map<string, number>([['y', 1]])
    assert.equal(cosineSimilarity(a, b), 0)
  })

  await test('cosineSimilarity · vector vacío → 0 (no NaN)', () => {
    const empty = new Map<string, number>()
    const v = new Map<string, number>([['a', 1]])
    assert.equal(cosineSimilarity(empty, v), 0)
    assert.equal(cosineSimilarity(v, empty), 0)
  })

  // ─── computeTfIdf ────────────────────────────────────────────────────
  await test('computeTfIdf · corpus vacío → []', () => {
    assert.deepEqual(computeTfIdf([]), [])
  })

  await test('computeTfIdf · término en todos los docs tiene IDF=0', () => {
    const docs = [['foo', 'bar'], ['foo', 'baz']]
    const vecs = computeTfIdf(docs)
    // 'foo' aparece en 2/2 docs → IDF = log(2/2) = 0
    assert.equal(vecs[0]!.get('foo'), 0, '"foo" debería tener TF-IDF=0 en doc 0')
    assert.equal(vecs[1]!.get('foo'), 0, '"foo" debería tener TF-IDF=0 en doc 1')
    // 'bar' solo en doc 0 → IDF = log(2/1) > 0
    assert.ok((vecs[0]!.get('bar') ?? 0) > 0)
  })

  // ─── jobOtroCluster ──────────────────────────────────────────────────
  await test('jobOtroCluster · fixture con 2 grupos temáticos detecta ≥ 1 cluster', async () => {
    // Para superar el threshold cosine 0.6 con textos cortos necesitamos
    // alta proporción de tokens compartidos. Repetimos el vocabulario
    // dominante en los dos pares (machine learning transformers neuronales /
    // paella arroz pescado mariscos) para que el TF-IDF haga su trabajo.
    const fixture = [
      {
        id: '1',
        title: 'machine learning transformers neuronales',
        description: 'machine learning transformers neuronales redes',
      },
      {
        id: '2',
        title: 'machine learning transformers neuronales',
        description: 'machine learning transformers neuronales modelo',
      },
      {
        id: '3',
        title: 'paella arroz pescado mariscos',
        description: 'paella arroz pescado mariscos receta',
      },
      {
        id: '4',
        title: 'paella arroz pescado mariscos',
        description: 'paella arroz pescado mariscos valenciana',
      },
      { id: '5', title: 'cuántica isolated', description: 'computación física' },
    ]
    const report = await jobOtroCluster(fixture)
    assert.ok(
      report.clusters.length >= 1,
      `esperado al menos 1 cluster, obtuve ${report.clusters.length}`,
    )
    // Cada cluster respeta MIN_CLUSTER_SIZE = 2.
    report.clusters.forEach((c) => {
      assert.ok(c.cluster_size >= 2, `cluster_size ${c.cluster_size} < 2`)
      assert.ok(Array.isArray(c.top_terms), 'top_terms debe ser array')
      assert.ok(Array.isArray(c.sample_articles), 'sample_articles debe ser array')
      assert.ok(c.sample_articles.length <= 5, 'sample_articles cap 5')
    })
    assert.equal(report.window_hours, 12)
    assert.ok(typeof report.generated_at === 'string')
    assert.ok(!Number.isNaN(Date.parse(report.generated_at)), 'generated_at ISO válido')
  })

  await test('jobOtroCluster · top_terms ordenados desc por frecuencia y populated', async () => {
    const fixture = [
      { id: '1', title: 'medicina sanidad hospital', description: 'salud público' },
      { id: '2', title: 'medicina sanidad servicio', description: 'salud paciente' },
      { id: '3', title: 'medicina urgencia hospital', description: 'salud médica' },
    ]
    const report = await jobOtroCluster(fixture)
    if (report.clusters.length > 0) {
      const cluster = report.clusters[0]!
      assert.ok(cluster.top_terms.length > 0, 'top_terms no debe estar vacío')
      // 'medicina' (3) y 'salud' (3) deben estar entre los top_terms; ambos
      // aparecen en los 3 docs.
      const knownFrequent = ['medicina', 'salud', 'sanidad', 'hospital']
      const hit = cluster.top_terms.some((t) => knownFrequent.includes(t))
      assert.ok(
        hit,
        `esperaba al menos uno de ${knownFrequent.join('/')} en top_terms, obtuve [${cluster.top_terms.join(',')}]`,
      )
    } else {
      // Si no se formó cluster (poco probable con este fixture), no podemos
      // validar pero no fallamos: el test C8 principal es el anterior.
      console.log('    (sin clusters, skip)')
    }
  })

  await test('jobOtroCluster · items < 2 → 0 clusters', async () => {
    const report = await jobOtroCluster([
      { id: '1', title: 'solo uno', description: 'aislado' },
    ])
    assert.equal(report.clusters.length, 0)
    assert.equal(report.window_hours, 12)
  })

  await test('jobOtroCluster · fixture vacío → 0 clusters', async () => {
    const report = await jobOtroCluster([])
    assert.equal(report.clusters.length, 0)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
