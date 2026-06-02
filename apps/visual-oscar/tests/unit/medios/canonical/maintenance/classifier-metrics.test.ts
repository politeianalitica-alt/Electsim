/**
 * Sprint 2 C9 · Tests para `jobClassifierMetrics`.
 *
 * El job agrega métricas pipeline últimas 24h y persiste en
 * `pipeline_metrics` (Railway Postgres, migración 0058).
 *
 * Estrategia de mock:
 *   - `jobClassifierMetrics` acepta `injectedAggregator?: () => Promise<AggregatedMetrics>`.
 *     Cuando se pasa, salta la consulta DB y usa el aggregate inyectado.
 *     Esto permite probar la lógica de cómputo (otro_percentage, buckets,
 *     failed_in_pipeline) sin tocar Postgres.
 *   - El insert en `insertPipelineMetric` cae a noop si `withDb` no tiene
 *     conexión disponible (sin DATABASE_URL en tests), así que la persistencia
 *     es silenciosa.
 *
 * Ejecutar:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/maintenance/classifier-metrics.test.ts
 */
import assert from 'node:assert/strict'
import {
  jobClassifierMetrics,
  type AggregatedMetrics,
} from '../../../../../lib/medios/canonical/maintenance/classifier-metrics.ts'

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
  console.log('\n→ maintenance · classifier-metrics')

  await test('jobClassifierMetrics calcula otro_percentage correctamente', async () => {
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
    // 50/1000 = 0.05 → 5.00% (2-decimal percentage)
    assert.equal(row.otro_percentage, 5.0)
    assert.equal(row.fetched_total, 1000)
  })

  await test('classification_by_method tiene los buckets esperados', async () => {
    const agg: AggregatedMetrics = {
      fetched_total: 100,
      duplicates_exact: 0,
      noise_filtered: 0,
      processed_successfully: 100,
      classified_with_taxonomy: 95,
      classification_by_method: {
        RSS_TAG_OR_HEURISTIC: 95,
        SEMANTIC_LLM: 0,
        NONE: 5,
      },
      otro_count: 5,
      semantic_errors: 0,
    }
    const row = await jobClassifierMetrics(async () => agg)
    assert.ok('RSS_TAG_OR_HEURISTIC' in row.classification_by_method)
    assert.ok('SEMANTIC_LLM' in row.classification_by_method)
    assert.ok('NONE' in row.classification_by_method)
  })

  await test('semantic_errors > 0 → failed_in_pipeline contains semantic_llm', async () => {
    const agg: AggregatedMetrics = {
      fetched_total: 100,
      duplicates_exact: 0,
      noise_filtered: 0,
      processed_successfully: 100,
      classified_with_taxonomy: 80,
      classification_by_method: {
        RSS_TAG_OR_HEURISTIC: 80,
        SEMANTIC_LLM: 0,
        NONE: 20,
      },
      otro_count: 20,
      semantic_errors: 5,
    }
    const row = await jobClassifierMetrics(async () => agg)
    assert.equal(row.failed_in_pipeline.semantic_llm, 5)
  })

  await test('ventana vacía: fetched_total=0 → otro_percentage=0', async () => {
    const agg: AggregatedMetrics = {
      fetched_total: 0,
      duplicates_exact: 0,
      noise_filtered: 0,
      processed_successfully: 0,
      classified_with_taxonomy: 0,
      classification_by_method: {
        RSS_TAG_OR_HEURISTIC: 0,
        SEMANTIC_LLM: 0,
        NONE: 0,
      },
      otro_count: 0,
      semantic_errors: 0,
    }
    const row = await jobClassifierMetrics(async () => agg)
    assert.equal(row.otro_percentage, 0)
    assert.equal(row.fetched_total, 0)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
