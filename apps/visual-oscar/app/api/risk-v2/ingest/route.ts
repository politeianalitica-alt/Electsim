import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// ETL can take ~30s with several external HTTP fetches
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const only    = req.nextUrl.searchParams.get('only') || ''
  const recompute = req.nextUrl.searchParams.get('recompute') ?? 'true'
  const r = await callBackend<{
    country: string
    n_connectors: number
    n_ok: number
    n_stub: number
    n_failed: number
    total_rows: number
    results: unknown[]
    recompute: unknown
  }>(
 `/api/risk-v2/ingest?country=${encodeURIComponent(country)}&only=${encodeURIComponent(only)}&recompute=${recompute}`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { country, n_connectors: 0, n_ok: 0, n_stub: 0, n_failed: 0, total_rows: 0, results: [], recompute: {} },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['ingest_failed'],
      latency_ms: r.latency_ms,
    },
  ))
}
