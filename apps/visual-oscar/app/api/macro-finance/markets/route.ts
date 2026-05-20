import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface MacroMarkets { days: number; country: string; series: Record<string, Array<{ date: string; value: number }>> }

export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') || '365'
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<MacroMarkets>(
 `/api/macro-finance/markets?days=${encodeURIComponent(days)}&country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { days: 365, country: 'ES', series: {} },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
