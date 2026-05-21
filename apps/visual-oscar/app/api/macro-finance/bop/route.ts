import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface BopSeries { years: number; series: Record<string, Array<{ date: string; value: number }>> }

export async function GET(req: NextRequest) {
  const years = req.nextUrl.searchParams.get('years') || '10'
  const r = await callBackend<BopSeries>(
 `/api/macro-finance/bop?years=${encodeURIComponent(years)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { years: 10, series: {} },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
