import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<{ country: string; n_runs: number; results: unknown[] }>(
    `/api/risk-v2/scenarios/run?country=${encodeURIComponent(country)}`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { country, n_runs: 0, results: [] },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['predictor_failed'],
      latency_ms: r.latency_ms,
    },
  ))
}
