import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'
import mediosData from '@/data/medios.json'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface CatalogStats { total: number; by_region: Record<string, number> }

function catalogStats(): CatalogStats {
  const medios = (mediosData as { medios: Array<{ ambito: string }> }).medios
  const by_region: Record<string, number> = {}
  for (const m of medios) {
    const k = (m.ambito || 'Otros').toLowerCase()
    by_region[k] = (by_region[k] || 0) + 1
  }
  return { total: medios.length, by_region }
}

export async function GET() {
  // Backend si está
  const real = await fromBackend<Record<string, unknown>>('/api/news/stats')
  if (real) return NextResponse.json(withMeta(real, 'backend'))

  // Datos REALES del feed RSS en vivo
  try {
    const articles = await getAggregatedNews({ maxSources: 35, hoursBack: 168 })
    const last24h = articles.filter(a => {
      if (!a.pubDate) return false
      return Date.now() - a.pubDate.getTime() < 24 * 3600_000
    }).length
    const sourcesActive = new Set(articles.map(a => a.medio.id)).size
    return NextResponse.json(withMeta({
      total_articles: articles.length,
      last_24h: last24h,
      sources_active: sourcesActive,
      catalog: catalogStats(),
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({
      total_articles: 0, last_24h: 0, sources_active: 0,
      catalog: catalogStats(),
    }, 'mock'))
  }
}
