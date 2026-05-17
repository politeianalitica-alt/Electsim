/**
 * /api/medios/intel — endpoint consolidado del Pulso de Prensa.
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
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews, byCCAA } from '@/lib/news-aggregator'
import {
  tieredFeed, narrativesDeep, topicPartySentiment, figuresDeep,
  storyCluster, coverageGaps, companiesSentiment, sectorsSentiment,
} from '@/lib/news-intel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export const revalidate = 300

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const include = (params.get('include') || 'feed,narratives,topicparty,figures,companies,sectors,clusters,gaps,ccaa').split(',')
  const hours = Math.min(168, Math.max(6, Number(params.get('hours') || 72)))
  const sources = Math.min(80, Math.max(15, Number(params.get('sources') || 50)))

  const updatedAt = new Date().toISOString()

  try {
    const articles = await getAggregatedNews({ maxSources: sources, hoursBack: hours })
    const out: Record<string, unknown> = { meta: { updatedAt, total: articles.length, hours, sources } }

    if (include.includes('feed'))       out.feed       = tieredFeed(articles, 25)
    if (include.includes('narratives')) out.narratives = narrativesDeep(articles).slice(0, 12)
    if (include.includes('topicparty')) out.topicparty = topicPartySentiment(articles).slice(0, 60)
    if (include.includes('figures'))    out.figures    = figuresDeep(articles, 15)
    if (include.includes('companies'))  out.companies  = companiesSentiment(articles).slice(0, 25)
    if (include.includes('sectors'))    out.sectors    = sectorsSentiment(articles)
    if (include.includes('clusters'))   out.clusters   = storyCluster(articles)
    if (include.includes('gaps'))       out.gaps       = coverageGaps(articles).slice(0, 10)
    if (include.includes('ccaa'))       out.ccaa       = byCCAA(articles)

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({
      error: String(e),
      meta: { updatedAt, total: 0 },
      feed: { tiers: { nacional: [], europeo: [], regional: [], local: [] }, counts: { nacional: 0, europeo: 0, regional: 0, local: 0 }, total: 0, categories: [] },
      narratives: [], topicparty: [], figures: [], companies: [], sectors: [], clusters: [], gaps: [], ccaa: {},
    }, { status: 200 })
  }
}
