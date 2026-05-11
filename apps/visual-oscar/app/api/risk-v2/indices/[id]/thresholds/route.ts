import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json()
  const r = await callBackend(
    `/api/risk-v2/indices/${encodeURIComponent(params.id)}/thresholds`,
    {
      method: 'PUT', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { ok: false, index_id: params.id },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['update_failed'],
      latency_ms: r.latency_ms,
    },
  ), { status: 502 })
}
