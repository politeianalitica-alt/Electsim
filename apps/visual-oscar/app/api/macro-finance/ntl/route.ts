import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface NTLData { countries: string[]; series: Record<string, Array<{ date: string; metric: string; value: number }>> }

export async function GET(req: NextRequest) {
  const countries = req.nextUrl.searchParams.get('countries') || 'ES,FR,IT,DE,PT'
  const r = await callBackend<NTLData>(
 `/api/macro-finance/ntl?countries=${encodeURIComponent(countries)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { countries: [], series: {} },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
