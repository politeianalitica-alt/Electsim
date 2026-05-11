import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<{ country: string; n_indices: number; n_alerts: number; n_scenarios: number; alerts: unknown[] }>(
    `/api/risk-v2/refresh?country=${encodeURIComponent(country)}`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { country, n_indices: 0, n_alerts: 0, n_scenarios: 0, alerts: [] },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['refresh_failed'],
      latency_ms: r.latency_ms,
    },
  ))
}
