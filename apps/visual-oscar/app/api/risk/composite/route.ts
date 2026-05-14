import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, dimensionStats, compositeScore, topDrivers, type RiskDriver as AggDriver, type RiskDimensionStat } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export type RiskDriver = AggDriver
export type RiskDimension = RiskDimensionStat

export interface RiskComposite {
  fetched_at: string
  hours_back: number
  composite: number
  composite_level: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  composite_semaforo: 'verde' | 'amarillo' | 'naranja' | 'rojo'
  framework: string
  dimensions: Record<string, RiskDimension>
  top_risks: RiskDriver[]
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/composite${params ? '?' + params : ''}`
  const real = await fromBackend<RiskComposite>(path)
  if (real && real.dimensions && Object.keys(real.dimensions).length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(168, Number(req.nextUrl.searchParams.get('hours_back') || 72))
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: hours })
    const dimensions = dimensionStats(articles)
    const { composite, level, semaforo } = compositeScore(dimensions)
    return NextResponse.json(withMeta({
      fetched_at: new Date().toISOString(),
      hours_back: hours,
      composite,
      composite_level: level,
      composite_semaforo: semaforo,
      framework: 'EWMA · 6 dimensiones · derivado de feed RSS en vivo',
      dimensions,
      top_risks: topDrivers(dimensions, 6),
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({
      fetched_at: new Date().toISOString(), hours_back: hours,
      composite: 0, composite_level: 'BAJO', composite_semaforo: 'verde',
      framework: 'unavailable', dimensions: {}, top_risks: [],
    }, 'mock'))
  }
}
