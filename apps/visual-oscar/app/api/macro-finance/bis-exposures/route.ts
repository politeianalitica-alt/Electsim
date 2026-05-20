import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface BisExposures { country: string; counterparties: string[]; periods: string[]; matrix: Array<{ counterparty: string; series: Array<{ date: string; value: number | null }> }> }

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const n_quarters = req.nextUrl.searchParams.get('n_quarters') || '12'
  const r = await callBackend<BisExposures>(
 `/api/macro-finance/bis-exposures?country=${encodeURIComponent(country)}&n_quarters=${encodeURIComponent(n_quarters)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { country: 'ES', counterparties: [], periods: [], matrix: [] },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
