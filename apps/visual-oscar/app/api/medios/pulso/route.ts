/**
 * GET /api/medios/pulso · contrato canónico spec §3.1
 *
 * Query:
 *   - window: 24h | 48h | 72h | 7d (default: 72h)
 *   - mode:   PLURAL | AUDIEN | REGION | IDEOLOGY | CRISIS (default: PLURAL)
 *   - region: ISO CCAA opcional (sólo aplica si mode=REGION)
 *
 * Sprint 0.4 · "adapter mode": lee artículos vía readArticlesInWindow()
 *   que consume el endpoint legacy /api/medios/intel y mapea a ArticleUnit.
 *   En Sprint 2+ reemplazaremos por lectura directa de topic_prominence_history.
 *
 * Respuesta:
 *   - ConfidenceMetrics con 5 componentes ponderados
 *   - ConfidenceWarning[] con detección de LOW_ENTITY_COVERAGE / HIGH_UNCATEGORIZED_RATE
 *   - DominantTopic[] top 14
 *   - Cache: s-maxage=300, stale-while-revalidate=600
 */
import { NextRequest, NextResponse } from 'next/server'
import type {
  ConfidenceMetrics,
  ConfidenceWarning,
  DominantTopic,
  PulsoMode,
  WindowSpec,
} from '@/lib/medios/canonical/types'
import { readArticlesInWindow } from '@/lib/medios/canonical/stores'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID_WINDOWS: WindowSpec[] = ['24h', '48h', '72h', '7d']
const VALID_MODES: PulsoMode[] = ['PLURAL', 'AUDIEN', 'REGION', 'IDEOLOGY', 'CRISIS']

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const windowParam = url.searchParams.get('window') ?? '72h'
  const modeParam = url.searchParams.get('mode') ?? 'PLURAL'
  const region = url.searchParams.get('region')

  if (!(VALID_WINDOWS as string[]).includes(windowParam)) {
    return NextResponse.json(
      { error: 'invalid_window', validWindows: VALID_WINDOWS },
      { status: 400 },
    )
  }
  if (!(VALID_MODES as string[]).includes(modeParam)) {
    return NextResponse.json(
      { error: 'invalid_mode', validModes: VALID_MODES },
      { status: 400 },
    )
  }

  const window = windowParam as WindowSpec
  const mode = modeParam as PulsoMode

  const startedAt = Date.now()
  const articles = await readArticlesInWindow(window, url.origin)
  let filtered = articles
  if (mode === 'REGION' && region) {
    filtered = articles.filter((a) => a.source.regions.includes(region))
  }

  // ──────── Counters ──────────────────────────────────────────────
  const total = filtered.length
  const noise = filtered.filter((a) => a.isNoise).length
  const duplicates = filtered.filter((a) => a.isDuplicate).length
  const unique = Math.max(0, total - duplicates)
  const analyzed = filtered.filter((a) => a.processingStatus === 'success').length

  // ──────── Group by topic ────────────────────────────────────────
  const byTopic = new Map<string, typeof filtered>()
  for (const a of filtered) {
    if (a.isNoise || a.isDuplicate) continue
    const t = a.topicTags[0]?.topicId ?? 'OTRO'
    if (!byTopic.has(t)) byTopic.set(t, [])
    byTopic.get(t)!.push(a)
  }

  // Sorting respeta mode AUDIEN (peso por audiencia) vs default (volumen)
  const topicWeight = (arts: typeof filtered): number => {
    if (mode === 'AUDIEN') {
      return arts.reduce(
        (s, a) => s + (a.source.audienceEstimate / 1_000_000) * a.sourceWeight,
        0,
      )
    }
    return arts.length
  }

  const sortedTopics = Array.from(byTopic.entries()).sort(
    (a, b) => topicWeight(b[1]) - topicWeight(a[1]),
  )

  const dominantTopics: DominantTopic[] = sortedTopics.slice(0, 14).map(
    ([topicId, arts]: [string, typeof filtered]) => {
    const sourceIds = new Set<string>(arts.map((a) => a.source.id))
    const titles = arts.slice(0, 3).map((a) => a.title)
    const entityCounts = new Map<string, number>()
    for (const a of arts) {
      for (const e of a.entities) {
        entityCounts.set(e.entityId, (entityCounts.get(e.entityId) ?? 0) + 1)
      }
    }
    const topEntities = Array.from(entityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
    const rawTagsRep = arts[0]?.rawTags?.slice(0, 3) ?? []
    return {
      topicId,
      label: topicId,
      volume: arts.length,
      volumePct: unique > 0 ? arts.length / unique : 0,
      momentum: 0, // Sprint 2 calcula real con topic_prominence_history
      state: 'STABLE',
      sentimentBalance: { positive: 0, neutral: 1.0, negative: 0, mixed: 0 },
      topEntities,
      topSources: Array.from(sourceIds).slice(0, 5),
      rawTagsRepresentative: rawTagsRep,
      leadClusters: [],
      representativeTitles: titles,
      confidence: 0.7,
    }
  })

  // ──────── Confidence ────────────────────────────────────────────
  const classifiedCount = sortedTopics
    .filter(([t]) => t !== 'OTRO')
    .reduce((s, [, a]) => s + a.length, 0)
  const classificationCoverage = analyzed > 0 ? classifiedCount / analyzed : 0
  const entityCoverage =
    analyzed > 0
      ? filtered.filter((a) => a.entities.length > 0).length / analyzed
      : 0
  const deduplicationRate = total > 0 ? 1 - duplicates / total : 1
  const sourceCatalogCoverage =
    total > 0
      ? filtered.filter((a) => a.source.id !== 'unknown').length / total
      : 1
  const tier12Proportion =
    total > 0
      ? filtered.filter((a) => a.source.tier === 1 || a.source.tier === 2).length / total
      : 0

  const score =
    classificationCoverage * 0.30 +
    entityCoverage * 0.25 +
    deduplicationRate * 0.20 +
    sourceCatalogCoverage * 0.15 +
    tier12Proportion * 0.10

  const warnings: ConfidenceWarning[] = []
  if (entityCoverage < 0.5 && analyzed > 0) {
    const noEntities = filtered.filter((a) => a.entities.length === 0).length
    warnings.push({
      code: 'LOW_ENTITY_COVERAGE',
      severity: 'WARNING',
      title: 'Pocas entidades políticas reconocidas',
      message:
        'Una parte importante de los artículos no contiene entidades políticas identificables.',
      detail: `${noEntities}/${analyzed} artículos sin entidades`,
      action: 'Prueba una query más específica con actor/partido',
      affectedMetrics: ['entityCoverage', 'actorRanking'],
    })
  }
  const otroBucket = sortedTopics.find(([t]) => t === 'OTRO')?.[1] ?? []
  if (analyzed > 0) {
    const otroPct = otroBucket.length / analyzed
    if (otroPct > 0.10) {
      warnings.push({
        code: 'HIGH_UNCATEGORIZED_RATE',
        severity: 'ALERT',
        title: 'Alta tasa de artículos sin categorizar',
        message: 'Más del 10% de los artículos han sido asignados a OTRO.',
        detail: `${Math.round(otroPct * 100)}% en OTRO`,
        action: 'El equipo técnico ha sido notificado.',
        affectedMetrics: ['classificationCoverage', 'topicRanking'],
      })
    }
  }

  const confidence: ConfidenceMetrics = {
    score,
    components: {
      classificationCoverage,
      entityCoverage,
      deduplicationRate,
      sourceCatalogCoverage,
      tier12Proportion,
    },
    warnings,
  }

  // ──────── Balance: tier distribution ────────────────────────────
  const tierCounts: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 }
  for (const a of filtered) {
    const k = `T${a.source.tier}`
    tierCounts[k] = (tierCounts[k] ?? 0) + 1
  }
  const tierDistribution: Record<string, number> = {}
  for (const k of Object.keys(tierCounts)) {
    tierDistribution[k] = total > 0 ? tierCounts[k] / total : 0
  }

  const sourcesActive = new Set(filtered.map((a) => a.source.id)).size

  const response = {
    generatedAt: new Date().toISOString(),
    window,
    mode,
    confidence,
    volume: { total, analyzed, noise, duplicates, unique, clustered: 0 },
    balance: {
      ideological: 0.9, // Sprint 2 calcula con ideologyDistribution real
      territorial: 0.5, // Sprint 2 calcula con territoryDistribution real
      tierDistribution,
    },
    latency: Date.now() - startedAt,
    dominantTopics,
    topClusters: [],
    sourcesActive,
    lastUpdated: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
