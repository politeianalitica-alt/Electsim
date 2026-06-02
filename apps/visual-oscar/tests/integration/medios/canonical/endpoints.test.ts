/**
 * Tests integration · 7 endpoints canónicos prensa.
 *
 * Patrón Node native + fetch contra un dev server arrancado a parte.
 * Para ejecutar:
 *   PORT=3001 nohup npm run dev > /tmp/dev-task4.log 2>&1 &
 *   sleep 12
 *   TEST_BASE_URL=http://localhost:3001 \
 *     node --experimental-strip-types --no-warnings \
 *     tests/integration/medios/canonical/endpoints.test.ts
 *
 * En staging/CI se ejecutarán contra el deploy real.
 */
import assert from 'node:assert/strict'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void>): Promise<void> {
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
  await test('GET /api/medios/pulso responde con shape canónico válido', async () => {
    const r = await fetch(`${BASE}/api/medios/pulso?window=72h&mode=PLURAL`)
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    assert.ok('generatedAt' in data, 'missing generatedAt')
    assert.equal(data.window, '72h')
    assert.equal(data.mode, 'PLURAL')
    assert.ok('confidence' in data, 'missing confidence')
    const conf = data.confidence as Record<string, unknown>
    assert.ok('score' in conf, 'missing confidence.score')
    assert.ok('components' in conf, 'missing confidence.components')
    assert.ok(Array.isArray(conf.warnings), 'warnings not array')
    assert.ok('volume' in data, 'missing volume')
    const vol = data.volume as Record<string, unknown>
    for (const k of ['total', 'analyzed', 'noise', 'duplicates', 'unique', 'clustered']) {
      assert.ok(k in vol, `missing volume.${k}`)
    }
    assert.ok('balance' in data, 'missing balance')
    const bal = data.balance as Record<string, unknown>
    assert.ok('tierDistribution' in bal, 'missing balance.tierDistribution')
    assert.ok(Array.isArray(data.dominantTopics), 'dominantTopics not array')
  })

  await test('GET /api/medios/pulso?mode=INVALID devuelve 400', async () => {
    const r = await fetch(`${BASE}/api/medios/pulso?mode=INVALID`)
    assert.equal(r.status, 400, `expected 400, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    assert.equal(data.error, 'invalid_mode')
  })

  await test('GET /api/medios/clusters paginado responde 200 o 503 con shape válido', async () => {
    const r = await fetch(`${BASE}/api/medios/clusters?page=1&pageSize=5`)
    assert.ok(r.ok || r.status === 503, `expected ok or 503, got ${r.status}`)
    if (r.ok) {
      const data = (await r.json()) as Record<string, unknown>
      assert.ok('clusters' in data, 'missing clusters')
      assert.equal(data.page, 1)
      assert.equal(data.pageSize, 5)
      assert.ok('total' in data, 'missing total')
      assert.ok(Array.isArray(data.clusters), 'clusters not array')
    }
  })

  await test('GET /api/medios/fuentes-status summary.total >= 20', async () => {
    const r = await fetch(`${BASE}/api/medios/fuentes-status`)
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    assert.ok('summary' in data, 'missing summary')
    const sum = data.summary as Record<string, number>
    assert.ok(sum.total >= 20, `expected total >= 20, got ${sum.total}`)
    assert.ok(Array.isArray(data.sources), 'sources not array')
  })

  await test('GET /api/medios/pipeline-metrics shape PipelineMetrics', async () => {
    const r = await fetch(`${BASE}/api/medios/pipeline-metrics?window=24h`)
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    for (const k of [
      'fetchedTotal',
      'classificationByMethod',
      'otroPercentage',
      'windowFrom',
      'windowTo',
      'duplicatesExact',
      'duplicatesTitular',
      'noiseFiltered',
      'processedSuccessfully',
      'classifiedWithTaxonomy',
      'withEntities',
      'classificationConfidence',
    ]) {
      assert.ok(k in data, `missing ${k}`)
    }
  })

  await test('GET /api/medios/narrativas devuelve stub estable', async () => {
    const r = await fetch(`${BASE}/api/medios/narrativas`)
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    assert.deepEqual(data.narratives, [])
    assert.equal(data.total, 0)
  })

  await test('GET /api/medios/actores/pedro-sanchez/metricas shape EntityMetrics', async () => {
    const r = await fetch(`${BASE}/api/medios/actores/pedro-sanchez/metricas`)
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    const data = (await r.json()) as Record<string, unknown>
    assert.equal(data.entityId, 'pedro-sanchez')
    assert.ok('prominenceScore' in data, 'missing prominenceScore')
    assert.ok('topicDistribution' in data, 'missing topicDistribution')
    assert.ok('sentimentProfile' in data, 'missing sentimentProfile')
    assert.ok('coOccurrences' in data, 'missing coOccurrences')
  })

  await test('GET /api/medios/pulso cache hit segunda llamada < 800ms', async () => {
    // 1ª llamada calienta la cache (revalidate=300 en /api/medios/intel upstream)
    await fetch(`${BASE}/api/medios/pulso?window=24h`)
    const t0 = Date.now()
    const r = await fetch(`${BASE}/api/medios/pulso?window=24h`)
    const elapsed = Date.now() - t0
    assert.equal(r.ok, true, `expected ok, got ${r.status}`)
    assert.ok(elapsed < 800, `expected < 800ms, got ${elapsed}ms`)
  })

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
