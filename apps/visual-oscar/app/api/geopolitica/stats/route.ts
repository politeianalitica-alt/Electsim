import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import {
  getAggregatedNews,
  geoOsintFromArticles,
  geoAlertasFromArticles,
  geoRiesgoFromArticles,
} from '@/lib/news-aggregator'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const startedAt = Date.now()
  // 1. Backend real
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/geo-stats')
  if (real && typeof real === 'object' && 'osint_24h' in real) {
    return NextResponse.json({
      ...withMeta(real, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'live_api',
        sources_used: ['backend · /api/geopolitica/geo-stats'],
        startedAt, confidence: 0.8, layer: 'analytical_model',
        notes: 'Agregados pre-calculados por backend',
      }),
    })
  }

  // 2. Derivar agregados de los feeds
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 48 })
    const osint    = geoOsintFromArticles(articles)
    const alertas  = geoAlertasFromArticles(articles)
    const riesgos  = geoRiesgoFromArticles(articles)

    const last24 = articles.filter(a => a.pubDate && Date.now() - a.pubDate.getTime() < 24 * 3600_000)
    const osint24h = osint.filter(o => Date.now() - new Date(o.fecha).getTime() < 24 * 3600_000).length

    const alertCount: Record<string, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
    for (const a of alertas) alertCount[a.nivel]++

    return NextResponse.json({
      ...withMeta({
        osint_24h: osint24h || osint.length,
        alertas_activas: alertas.length,
        paises_monitorizados: riesgos.length,
        presencia_activa: 12,
        alertas_count: alertCount,
        total_articulos: last24.length,
        derived_from_feeds: true,
      }, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'derived_from_news',
        sources_used: [`RSS agregado · ${articles.length} artículos`],
        startedAt, confidence: 0.55, layer: 'analytical_model',
        warnings: [
          'Agregados derivados de titulares RSS · no del backend',
          '"presencia_activa: 12" es valor curado fijo · no calculado',
        ],
      }),
    })
  } catch (e) {
    console.error('[geo-stats] feed derivation failed:', e)
  }

  // 3. Fallback
  const mock = {
    osint_24h: 47,
    alertas_activas: 8,
    paises_monitorizados: 23,
    presencia_activa: 12,
    alertas_count: { CRITICO: 2, ALTO: 3, MEDIO: 3 },
  }
  return NextResponse.json({
    ...withMeta(mock, 'mock'),
    _geo_meta: buildGeoMeta({
      source_mode: 'mock',
      sources_used: ['mock interno'],
      startedAt, confidence: 0.10, layer: 'analytical_model',
      warnings: ['DATOS SINTÉTICOS · NO usar en producción'],
    }),
  })
}
