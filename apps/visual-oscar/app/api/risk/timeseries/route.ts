import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

// Genera N días de serie sintética con tendencia + ruido determinista por día
function buildMockBuckets(days: number): RiskBucket[] {
  const out: RiskBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayOfMonth = d.getDate()
    const seed = ((dayOfMonth * 17) % 11) - 5  // -5..+5
    // Ligera tendencia al alza hacia hoy (más riesgo reciente)
    const trend = (days - i) / days * 12
    const base = 38 + trend
    const dims = {
      institutional: Math.max(20, Math.min(85, Math.round(base + seed * 1.2 + 18))),
      electoral:     Math.max(15, Math.min(70, Math.round(base + seed * 0.8 + 8))),
      geopolitical:  Math.max(20, Math.min(75, Math.round(base + seed * 1.0 + 10))),
      economic:      Math.max(25, Math.min(80, Math.round(base + seed * 1.5 + 14))),
      media:         Math.max(30, Math.min(90, Math.round(base + seed * 2.0 + 22))),
      social:        Math.max(15, Math.min(65, Math.round(base + seed * 0.6 + 3))),
    }
    const weights: Record<keyof typeof dims, number> = {
      institutional: 0.20, electoral: 0.18, geopolitical: 0.15,
      economic: 0.18, media: 0.14, social: 0.15,
    }
    const composite = Math.round(
      Object.entries(dims).reduce((s, [k, v]) => s + v * weights[k as keyof typeof dims], 0)
    )
    out.push({ date: dateStr, composite, ...dims })
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
  const days = Number(req.nextUrl.searchParams.get('days') || 14)
  return NextResponse.json(withMeta({
    days,
    buckets: buildMockBuckets(days),
    dimensions: ['institutional', 'electoral', 'geopolitical', 'economic', 'media', 'social'],
  }, 'mock'))
}
