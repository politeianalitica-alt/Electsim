import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface CoferReserves { days: number; series: Record<string, Array<{ date: string; value: number }>> }

export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') || '365'
  const r = await callBackend<CoferReserves>(
 `/api/macro-finance/cofer?days=${encodeURIComponent(days)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { days: 2190, series: {} },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
