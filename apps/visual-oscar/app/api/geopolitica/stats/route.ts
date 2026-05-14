import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import {
  getAggregatedNews,
  geoOsintFromArticles,
  geoAlertasFromArticles,
  geoRiesgoFromArticles,
} from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  // 1. Backend real
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/geo-stats')
  if (real && typeof real === 'object' && 'osint_24h' in real) {
    return NextResponse.json(withMeta(real, 'backend'))
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

    return NextResponse.json(withMeta({
      osint_24h: osint24h || osint.length,
      alertas_activas: alertas.length,
      paises_monitorizados: riesgos.length,
      presencia_activa: 12,  // valor estructural (España tiene presencia diplomática activa en ~12 países clave)
      alertas_count: alertCount,
      total_articulos: last24.length,
      derived_from_feeds: true,
    }, 'backend'))
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
  return NextResponse.json(withMeta(mock, 'mock'))
}
