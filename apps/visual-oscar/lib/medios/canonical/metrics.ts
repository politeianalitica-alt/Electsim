/**
 * Métricas del pipeline: counters por paso, agregados por ventana.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { ClassificationMethod, PipelineMetrics } from './types'

export interface MetricsAccumulator {
  fetchedTotal: number
  duplicatesExact: number
  duplicatesTitular: number
  noiseFiltered: number
  processedSuccessfully: number
  classifiedWithTaxonomy: number
  withEntities: number
  clusteredExisting: number
  clusteredNew: number
  failedInPipeline: Record<string, number>
  classificationByMethod: Record<ClassificationMethod, number>
  classificationConfidence: { high: number; mid: number; low: number }
  otroCount: number
}

export function createAccumulator(): MetricsAccumulator {
  return {
    fetchedTotal: 0,
    duplicatesExact: 0,
    duplicatesTitular: 0,
    noiseFiltered: 0,
    processedSuccessfully: 0,
    classifiedWithTaxonomy: 0,
    withEntities: 0,
    clusteredExisting: 0,
    clusteredNew: 0,
    failedInPipeline: {},
    classificationByMethod: {
      RSS_TAG: 0,
      HEURISTIC: 0,
      SEMANTIC: 0,
      MANUAL: 0,
      FALLBACK: 0,
    },
    classificationConfidence: { high: 0, mid: 0, low: 0 },
    otroCount: 0,
  }
}

export function recordOutcome(
  acc: MetricsAccumulator,
  outcome: {
    status: 'success' | 'noise' | 'duplicate' | 'failed'
    failedStep?: string | null
    method?: ClassificationMethod
    confidence?: number
    topicId?: string
    hasEntities?: boolean
  },
): void {
  acc.fetchedTotal++
  if (outcome.status === 'duplicate') {
    // distinguir exact vs titular: caller pasa failedStep='dedupe_exact' or 'dedupe_titular'
    if (outcome.failedStep === 'dedupe_exact') acc.duplicatesExact++
    else if (outcome.failedStep === 'dedupe_titular') acc.duplicatesTitular++
    return
  }
  if (outcome.status === 'noise') {
    acc.noiseFiltered++
    return
  }
  if (outcome.status === 'failed') {
    const step = outcome.failedStep ?? 'unknown'
    acc.failedInPipeline[step] = (acc.failedInPipeline[step] ?? 0) + 1
    return
  }
  // success
  acc.processedSuccessfully++
  if (outcome.method) acc.classificationByMethod[outcome.method]++
  if (outcome.topicId && outcome.topicId !== 'OTRO') acc.classifiedWithTaxonomy++
  if (outcome.topicId === 'OTRO') acc.otroCount++
  if (outcome.hasEntities) acc.withEntities++
  const c = outcome.confidence ?? 0
  if (c >= 0.8) acc.classificationConfidence.high++
  else if (c >= 0.5) acc.classificationConfidence.mid++
  else acc.classificationConfidence.low++
}

export function finalize(
  acc: MetricsAccumulator,
  windowFrom: string,
  windowTo: string,
): PipelineMetrics {
  const total = acc.processedSuccessfully + acc.otroCount
  return {
    windowFrom,
    windowTo,
    fetchedTotal: acc.fetchedTotal,
    duplicatesExact: acc.duplicatesExact,
    duplicatesTitular: acc.duplicatesTitular,
    noiseFiltered: acc.noiseFiltered,
    processedSuccessfully: acc.processedSuccessfully,
    classifiedWithTaxonomy: acc.classifiedWithTaxonomy,
    withEntities: acc.withEntities,
    clusteredExisting: acc.clusteredExisting,
    clusteredNew: acc.clusteredNew,
    failedInPipeline: acc.failedInPipeline,
    classificationByMethod: acc.classificationByMethod,
    classificationConfidence: acc.classificationConfidence,
    otroPercentage: total > 0 ? (acc.otroCount / total) * 100 : 0,
  }
}
