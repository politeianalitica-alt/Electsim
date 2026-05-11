import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const horas = req.nextUrl.searchParams.get('horas') || '24'
  const granularidad = req.nextUrl.searchParams.get('granularidad') || 'hour'
  const r = await callBackend(
    `/api/media-intel/timeline?horas=${encodeURIComponent(horas)}&granularidad=${encodeURIComponent(granularidad)}`,
    { cache: 'no-store' },
  )
  if (r.data !== null && r.data !== undefined) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    [],
    'mock',
    { warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms },
  ))
}
