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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/timeseries${params ? '?' + params : ''}`
  const real = await fromBackend<RiskTimeseriesResponse>(path)
  if (real && real.buckets) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ days: 14, buckets: [], dimensions: [] }, 'mock'))
}
