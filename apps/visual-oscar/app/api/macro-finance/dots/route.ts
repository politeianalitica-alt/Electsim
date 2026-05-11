import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface DotsTrade { reporter: string; months: number; series: { exports: Array<{ date: string; value: number }>; imports: Array<{ date: string; value: number }>; balance: Array<{ date: string; value: number }> } }

export async function GET(req: NextRequest) {
  const reporter = req.nextUrl.searchParams.get('reporter') || 'ES'
  const months = req.nextUrl.searchParams.get('months') || '60'
  const r = await callBackend<DotsTrade>(
    `/api/macro-finance/dots?reporter=${encodeURIComponent(reporter)}&months=${encodeURIComponent(months)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { reporter: 'ES', months: 60, series: { exports: [], imports: [], balance: [] } },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
