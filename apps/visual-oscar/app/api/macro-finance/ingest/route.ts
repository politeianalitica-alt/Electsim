import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const only = req.nextUrl.searchParams.get('only') || ''
  const r = await callBackend<{ n_connectors: number; n_ok: number; n_stub: number; n_failed: number; total_rows: number; total_pairs: number; results: unknown[] }>(
    `/api/macro-finance/ingest?only=${encodeURIComponent(only)}`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data) return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  return NextResponse.json(withMeta(
    { n_connectors: 0, n_ok: 0, n_stub: 0, n_failed: 0, total_rows: 0, total_pairs: 0, results: [] },
    'mock',
    { warnings: r.error ? [`backend_unreachable:${r.error}`] : ['ingest_failed'], latency_ms: r.latency_ms },
  ))
}
