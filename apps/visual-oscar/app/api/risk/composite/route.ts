import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskDriver {
  id: number
  title: string
  source: string
  relevance: number
  sentiment: string
  spain_impact: string
  contribution: number
  scraped_at: string | null
  dimension?: string
  dimension_label?: string
}

export interface RiskDimension {
  label: string
  score: number
  level: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  weight: number
  n_articles: number
  delta_24h: number
  z_score: number
  is_anomaly: boolean
  drivers: RiskDriver[]
}

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
  const searchParams = req.nextUrl.searchParams
  // Default to 720h (30 days) so stale data gaps are handled gracefully
  if (!searchParams.has('hours_back')) {
    searchParams.set('hours_back', '720')
  }
  const params = searchParams.toString()
  const path = `/api/risk/composite${params ? '?' + params : ''}`
  const real = await fromBackend<RiskComposite>(path)
  if (real && real.dimensions) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    fetched_at: new Date().toISOString(),
    hours_back: 720,
    composite: 0, composite_level: 'BAJO', composite_semaforo: 'verde',
    framework: 'unavailable',
    dimensions: {}, top_risks: [],
  }, 'mock'))
}
