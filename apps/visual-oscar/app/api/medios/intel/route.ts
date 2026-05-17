/**
 * /api/medios/intel — endpoint consolidado del Pulso de Prensa.
 *
 * Devuelve TODA la inteligencia derivada del feed RSS en un solo round-trip:
 *   - feed por tiers (nacional/europeo/regional/local)
 *   - narrativas profundas con anatomía completa
 *   - topic × party sentiment heatmap
 *   - figuras públicas con análisis
 *   - story clusters (cobertura comparada)
 *   - coverage gaps (sesgo por tema)
 *   - CCAA stats para el mapa
 *
 * El cliente puede pedir solo lo que necesite con `?include=feed,narratives,...`.
 * Por defecto devuelve todo. Cache 5 minutos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews, byCCAA, topPersons } from '@/lib/news-aggregator'
import {
  tieredFeed, narrativesDeep, topicPartySentiment, figuresDeep,
  storyCluster, coverageGaps,
} from '@/lib/news-intel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export const revalidate = 300  // 5 minutos

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const include = (params.get('include') || 'feed,narratives,topicparty,figures,clusters,gaps,ccaa').split(',')
  const hours = Math.min(168, Math.max(6, Number(params.get('hours') || 72)))
  const sources = Math.min(80, Math.max(15, Number(params.get('sources') || 50)))

  const updatedAt = new Date().toISOString()

  try {
    const articles = await getAggregatedNews({ maxSources: sources, hoursBack: hours })

    const out: Record<string, unknown> = { meta: { updatedAt, total: articles.length, hours, sources } }

    if (include.includes('feed'))       out.feed       = tieredFeed(articles, 25)
    if (include.includes('narratives')) out.narratives = narrativesDeep(articles).slice(0, 12)
    if (include.includes('topicparty')) out.topicparty = topicPartySentiment(articles).slice(0, 40)
    if (include.includes('figures'))    out.figures    = figuresDeep(articles, 10)
    if (include.includes('clusters'))   out.clusters   = storyCluster(articles)
    if (include.includes('gaps'))       out.gaps       = coverageGaps(articles).slice(0, 10)
    if (include.includes('ccaa'))       out.ccaa       = byCCAA(articles)
    if (include.includes('persons'))    out.persons    = topPersons(articles, 15)

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({
      error: String(e),
      meta: { updatedAt, total: 0 },
      feed: { tiers: { nacional: [], europeo: [], regional: [], local: [] }, counts: { nacional: 0, europeo: 0, regional: 0, local: 0 }, total: 0 },
      narratives: [], topicparty: [], figures: [], clusters: [], gaps: [], ccaa: {},
    }, { status: 200 })
  }
}
