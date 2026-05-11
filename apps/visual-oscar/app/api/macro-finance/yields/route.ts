import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface YieldsData { countries: string[]; days: number; series: Record<string, Array<{ date: string; value: number }>> }

export async function GET(req: NextRequest) {
  const countries = req.nextUrl.searchParams.get('countries') || 'ES,FR,IT,DE,PT'
  const days = req.nextUrl.searchParams.get('days') || '365'
  const r = await callBackend<YieldsData>(
    `/api/macro-finance/yields?countries=${encodeURIComponent(countries)}&days=${encodeURIComponent(days)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { countries: [], days: 730, series: {} },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
