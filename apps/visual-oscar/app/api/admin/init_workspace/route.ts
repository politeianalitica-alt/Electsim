import { NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const result = await callBackend('/api/v1/admin/init_workspace', { method: 'POST' })

  if (result.data) {
    return NextResponse.json({
      ...(result.data as object),
      _meta: {
        source: 'backend',
        latency_ms: result.latency_ms,
        ts: new Date().toISOString(),
      },
    })
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error || 'backend_unavailable',
      _meta: {
        source: 'error',
        status: result.status,
        latency_ms: result.latency_ms,
        ts: new Date().toISOString(),
      },
    },
    { status: result.status || 502 },
  )
}
