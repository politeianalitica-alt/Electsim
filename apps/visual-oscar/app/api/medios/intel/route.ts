/**
 * /api/medios/intel — endpoint consolidado del Pulso de Prensa.
 *
 * Sprint M1 · ahora con priorización inteligente y metadata metodológica.
 *
 * Devuelve TODA la inteligencia derivada del feed RSS en un solo round-trip:
 *   - feed por tiers + categorías dinámicas
 *   - narrativas profundas con anatomía completa
 *   - topic × party sentiment (heatmap político)
 *   - figuras públicas con análisis
 *   - empresas IBEX35 con sentimiento
 *   - sectores agregados
 *   - story clusters (cobertura comparada)
 *   - coverage gaps (sesgo por tema)
 *   - CCAA stats para el mapa
 *
 * Sprint M1 adds:
 *   - hasta 100 fuentes (antes 80)
 *   - balance_mode · audience | pluralism | regional | ideological | crisis
 *   - source_methodology · qué se seleccionó, qué quedó fuera, qué balance
 *   - _meta homogéneo · source, ts, latency, warnings, methodology_version,
 *     sources_requested, sources_used, articles_read, confidence
 *   - readings (opcional) · ArticleReading[] estructurado por artículo
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews, byCCAA, getCatalog } from '@/lib/news-aggregator'
import {
  tieredFeed, narrativesDeep, topicPartySentiment, figuresDeep,
  storyCluster, coverageGaps, companiesSentiment, sectorsSentiment,
} from '@/lib/news-intel'
import {
  selectPrioritySources, buildDiversityBreakdown, buildMeta, readArticle,
  profileFromCatalog, buildNarrativeClusters, figuresFromReadings, summarizeReadings,
  type BalanceMode, type ArticleReading,
} from '@/lib/medios/media-methodology'
// Sprint M4 FASE B · misma capa de análisis que NewsAPI search
import {
  framingComparison, coverageGapsAnalysis, mediaAnalysisWarnings,
  computeMethodologyConfidence, suggestedFollowupQueries,
} from '@/lib/medios/media-analysis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export const revalidate = 300

const VALID_MODES: BalanceMode[] = ['audience', 'pluralism', 'regional', 'ideological', 'crisis']

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const params = req.nextUrl.searchParams
  const include = (params.get('include') || 'feed,narratives,topicparty,figures,companies,sectors,clusters,gaps,ccaa,methodology,narrative_clusters,figures_v2,readings_summary,framing_comparison,actor_impacts,coverage_gaps,analysis_warnings,methodology_confidence,followup_queries').split(',')
  const hours = Math.min(168, Math.max(6, Number(params.get('hours') || 72)))
  const sources = Math.min(100, Math.max(15, Number(params.get('sources') || 80)))
  const balanceModeParam = (params.get('balance_mode') || 'pluralism').toLowerCase()
  const balanceMode: BalanceMode = (VALID_MODES as string[]).includes(balanceModeParam)
    ? (balanceModeParam as BalanceMode)
    : 'pluralism'
  const includeReadings = params.get('readings') === '1'
  const ccaa = params.get('ccaa')
  const updatedAt = new Date().toISOString()
  const warnings: string[] = []

  try {
    // 1 · Priorización inteligente · cuenta cuántas fuentes habrían sido elegibles
    const catalog = getCatalog()
    const { selected, eligible } = selectPrioritySources(catalog, {
      maxSources: sources,
      balanceMode,
      ccaa,
      includeEuropean: true,
      includeRegional: true,
    })
    const diversity = buildDiversityBreakdown(selected)
    for (const w of diversity.warnings) warnings.push(w)

    // 2 · Agregar artículos usando la selección
    const articles = await getAggregatedNews({
      maxSources: sources,
      hoursBack: hours,
      balanceMode,
      ccaa,
    })

    if (articles.length === 0) {
      warnings.push('Sin artículos · todos los RSS fallaron o devolvieron vacío.')
    } else if (articles.length < sources * 2) {
      warnings.push(`Pocos artículos (${articles.length}) · ventana ${hours}h podría ser corta o varios RSS fallaron.`)
    }

    const out: Record<string, unknown> = {
      // Compatibilidad legacy · UI antigua espera meta
      meta: { updatedAt, total: articles.length, hours, sources },
    }

    if (include.includes('feed'))       out.feed       = tieredFeed(articles, 25)
    if (include.includes('narratives')) out.narratives = narrativesDeep(articles).slice(0, 12)
    if (include.includes('topicparty')) out.topicparty = topicPartySentiment(articles).slice(0, 60)
    if (include.includes('figures'))    out.figures    = figuresDeep(articles, 15)
    if (include.includes('companies'))  out.companies  = companiesSentiment(articles).slice(0, 25)
    if (include.includes('sectors'))    out.sectors    = sectorsSentiment(articles)
    if (include.includes('clusters'))   out.clusters   = storyCluster(articles)
    if (include.includes('gaps'))       out.gaps       = coverageGaps(articles).slice(0, 10)
    if (include.includes('ccaa'))       out.ccaa       = byCCAA(articles)

    // Sprint M1 · source_methodology block
    if (include.includes('methodology')) {
      const totalAudience = selected.reduce((s, p) => s + (p.audience_M || 0), 0)
      const avgCredibility = selected.length > 0
        ? selected.reduce((s, p) => s + (p.credibility || 0), 0) / selected.length
        : 0
      out.source_methodology = {
        selected_sources: selected.length,
        eligible_sources: eligible,
        catalog_total: catalog.length,
        balance_mode: balanceMode,
        ideological_distribution: diversity.ideological_distribution,
        territorial_distribution: diversity.territorial_distribution,
        media_type_distribution: diversity.media_type_distribution,
        group_distribution: diversity.group_distribution,
        ccaa_distribution: diversity.ccaa_distribution,
        ideological_balance_score: diversity.ideological_balance_score,
        territorial_balance_score: diversity.territorial_balance_score,
        type_balance_score: diversity.type_balance_score,
        credibility_avg: Math.round(avgCredibility),
        audience_total_M: Math.round(totalAudience * 10) / 10,
        warnings: diversity.warnings,
        copy_for_hero: `Catálogo: ${catalog.length} medios · Analizados ahora: ${selected.length} · muestra balanceada por audiencia, territorio e ideología (modo "${balanceMode}")`,
      }
    }

    // Sprint M1+M2+M4 · construir readings UNA VEZ (es la materia prima)
    // - readings completos sólo si los piden con ?readings=1 (response pesado)
    // - narrative_clusters, figures_v2, readings_summary, framing_comparison,
    //   coverage_gaps, actor_impacts y analysis_warnings los usan internamente
    const needsReadings =
      includeReadings ||
      include.includes('narrative_clusters') ||
      include.includes('figures_v2') ||
      include.includes('readings_summary') ||
      include.includes('framing_comparison') ||
      include.includes('actor_impacts') ||
      include.includes('coverage_gaps') ||
      include.includes('analysis_warnings') ||
      include.includes('methodology_confidence') ||
      include.includes('followup_queries')
    let readings: ArticleReading[] = []
    if (needsReadings) {
      const profilesByMediumId: Record<string, ReturnType<typeof profileFromCatalog>> = {}
      for (const p of selected) profilesByMediumId[p.id] = p
      readings = articles.slice(0, 240).map((a) => {
        const profile = profilesByMediumId[a.medio.id] || profileFromCatalog(a.medio)
        return readArticle(a, profile)
      })
      if (includeReadings) out.readings = readings
    }

    // Sprint M2 · narrative clusters auditables
    if (include.includes('narrative_clusters') && readings.length > 0) {
      out.narrative_clusters = buildNarrativeClusters(readings, { maxClusters: 12 })
    }

    // Sprint M2 · figuras agregadas usando assessSentiment · separa
    // sentiment HACIA actor vs mention plana
    if (include.includes('figures_v2') && readings.length > 0) {
      out.figures_v2 = figuresFromReadings(readings, 20)
    }

    // Sprint M2 · resumen ejecutivo de readings · listo para enviar a lectura IA
    if (include.includes('readings_summary') && readings.length > 0) {
      out.readings_summary = summarizeReadings(readings)
    }

    // Sprint M4 FASE B · análisis NewsAPI-grade sobre RSS readings
    // Reusa exactamente las mismas funciones que /api/medios/search · puerta común.
    let framing: ReturnType<typeof framingComparison> | undefined
    if (readings.length > 0 && (include.includes('framing_comparison') || include.includes('followup_queries') || include.includes('analysis_warnings'))) {
      framing = framingComparison(readings)
      if (include.includes('framing_comparison')) out.framing_comparison = framing
    }

    if (readings.length > 0 && include.includes('actor_impacts')) {
      // Agregar actor_impact desde readings · mismo shape que /search
      const actorImpactMap = new Map<string, { beneficial: number; harmful: number; neutral: number; uncertain: number; mentions: number; reasons: string[] }>()
      for (const r of readings) {
        for (const ai of r.sentiment.actor_impact) {
          if (!actorImpactMap.has(ai.actor)) actorImpactMap.set(ai.actor, { beneficial: 0, harmful: 0, neutral: 0, uncertain: 0, mentions: 0, reasons: [] })
          const cur = actorImpactMap.get(ai.actor)!
          cur[ai.impact]++
          cur.mentions++
          if (cur.reasons.length < 3 && ai.reason) cur.reasons.push(ai.reason)
        }
      }
      out.actor_impacts = Array.from(actorImpactMap.entries())
        .map(([actor, agg]) => {
          const dominant = (['beneficial', 'harmful', 'neutral', 'uncertain'] as const).reduce((best, k) =>
            (agg[k] as number) > best.count ? { kind: k, count: agg[k] as number } : best,
            { kind: 'uncertain' as 'beneficial' | 'harmful' | 'neutral' | 'uncertain', count: 0 },
          )
          return {
            actor,
            mentions: agg.mentions,
            dominant_impact: dominant.kind,
            beneficial: agg.beneficial,
            harmful: agg.harmful,
            neutral: agg.neutral,
            uncertain: agg.uncertain,
            sample_reasons: agg.reasons,
          }
        })
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 25)
    }

    if (readings.length > 0 && include.includes('coverage_gaps')) {
      out.coverage_gaps = coverageGapsAnalysis(readings)
    }

    if (readings.length > 0 && include.includes('methodology_confidence')) {
      out.methodology_confidence = computeMethodologyConfidence(readings, diversity)
    }

    if (readings.length > 0 && include.includes('analysis_warnings')) {
      out.analysis_warnings = mediaAnalysisWarnings(readings, diversity, framing)
    }

    if (readings.length > 0 && include.includes('followup_queries')) {
      // Sin query original (pulse general) · usamos "agenda" como placeholder semántico
      out.suggested_followup_queries = suggestedFollowupQueries(readings, 'agenda mediática actual', framing)
    }

    // Sprint M1 · _meta homogéneo (en paralelo a meta legacy)
    const confidence = articles.length === 0 ? 0
      : Math.min(1, (articles.length / (sources * 6)) * 0.5
        + diversity.ideological_balance_score * 0.25
        + (selected.length > 0 ? (selected.reduce((s, p) => s + p.credibility, 0) / selected.length) / 100 : 0) * 0.25)

    out._meta = buildMeta({
      source: articles.length > 0 ? 'live' : 'fallback',
      startedAt,
      warnings,
      sources_requested: sources,
      sources_used: selected.length,
      articles_read: articles.length,
      confidence: Math.round(confidence * 100) / 100,
    })

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({
      error: String(e),
      meta: { updatedAt, total: 0 },
      _meta: buildMeta({
        source: 'error',
        startedAt,
        warnings: [`fatal: ${String(e).slice(0, 200)}`],
        sources_requested: sources,
        sources_used: 0,
        articles_read: 0,
        confidence: 0,
      }),
      feed: { tiers: { nacional: [], europeo: [], regional: [], local: [] }, counts: { nacional: 0, europeo: 0, regional: 0, local: 0 }, total: 0, categories: [] },
      narratives: [], topicparty: [], figures: [], companies: [], sectors: [], clusters: [], gaps: [], ccaa: {},
    }, { status: 200 })
  }
}
