import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST() {
  const r = await callBackend(
 `/api/media-intel/ingest`,
    { method: 'POST', cache: 'no-store' },
  )
  if (r.data !== null && r.data !== undefined) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { ok: false },
 'mock',
    { warnings: r.error ? [`backend_unreachable:${r.error}`] : ['ingest_failed'],
      latency_ms: r.latency_ms },
  ))
}
