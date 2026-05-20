import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = decodeURIComponent(params.id)
  const user = req.nextUrl.searchParams.get('user') || 'ui'
  const r = await callBackend<{ ok: boolean; row_id: number }>(
 `/api/risk-v2/alerts/${encodeURIComponent(id)}/ack?user=${encodeURIComponent(user)}`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { ok: false, row_id: Number(id) },
 'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['ack_failed'],
      latency_ms: r.latency_ms,
    },
  ))
}
