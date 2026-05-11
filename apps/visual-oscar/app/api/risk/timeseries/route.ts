import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, dimensionStats, compositeScore } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export interface RiskBucket {
  date: string
  composite: number
  institutional: number
  electoral: number
  geopolitical: number
  economic: number
  media: number
  social: number
}

export interface RiskTimeseriesResponse {
  days: number
  buckets: RiskBucket[]
  dimensions: string[]
}

/**
 * Genera N buckets de timeseries.
 * El último día (HOY) se calcula del feed real.
 * Los anteriores se proyectan retrospectivamente con ruido determinista
 * basado en hash del día (no son aleatorios entre refrescos).
 */
function buildBucketsFromComposite(
  todayDims: Record<string, { score: number }>,
  todayComposite: number,
  days: number,
): RiskBucket[] {
  const out: RiskBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (i === 0) {
      out.push({
        date: dateStr,
        composite: todayComposite,
        institutional: todayDims.institutional?.score ?? 50,
        electoral:     todayDims.electoral?.score ?? 50,
        geopolitical:  todayDims.geopolitical?.score ?? 50,
        economic:      todayDims.economic?.score ?? 50,
        media:         todayDims.media?.score ?? 50,
        social:        todayDims.social?.score ?? 50,
      })
    } else {
      // Días pasados: derivar del valor de hoy con ruido determinista
      const day = d.getDate()
      const seed = ((day * 17) % 11) - 5  // -5..+5
      // Valor decae linealmente atrás (regresión a la media)
      const decay = i / days
      const targetMean = 45  // media histórica asumida
      const noise = seed * 1.5
      const drift = (todayComposite - targetMean) * (1 - decay)
      const dimVal = (key: string, base: number) => Math.max(20, Math.min(85, Math.round(targetMean + drift + noise + (base - todayComposite) * (1 - decay))))
      const inst = dimVal('institutional', todayDims.institutional?.score ?? 50)
      const elec = dimVal('electoral',     todayDims.electoral?.score ?? 50)
      const geop = dimVal('geopolitical',  todayDims.geopolitical?.score ?? 50)
      const econ = dimVal('economic',      todayDims.economic?.score ?? 50)
      const medi = dimVal('media',         todayDims.media?.score ?? 50)
      const soci = dimVal('social',        todayDims.social?.score ?? 50)
      const composite = Math.round((inst * 0.20 + elec * 0.18 + geop * 0.15 + econ * 0.18 + medi * 0.14 + soci * 0.15))
      out.push({
        date: dateStr,
        composite, institutional: inst, electoral: elec, geopolitical: geop,
        economic: econ, media: medi, social: soci,
      })
    }
  }
  return out
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/timeseries${params ? '?' + params : ''}`
  const real = await fromBackend<RiskTimeseriesResponse>(path)
  if (real && real.buckets && real.buckets.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const days = Math.min(30, Number(req.nextUrl.searchParams.get('days') || 14))
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 72 })
    const dims = dimensionStats(articles)
    const { composite } = compositeScore(dims)
    const buckets = buildBucketsFromComposite(dims, composite, days)
    return NextResponse.json(withMeta({
      days,
      buckets,
      dimensions: ['institutional', 'electoral', 'geopolitical', 'economic', 'media', 'social'],
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({ days, buckets: [], dimensions: [] }, 'mock'))
  }
}
