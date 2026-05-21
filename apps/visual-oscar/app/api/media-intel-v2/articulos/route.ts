import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const horas = req.nextUrl.searchParams.get('horas') || '24'
  const limit = req.nextUrl.searchParams.get('limit') || '50'
  const offset = req.nextUrl.searchParams.get('offset') || '0'
  const q = req.nextUrl.searchParams.get('q') || ''
  const ideologia = req.nextUrl.searchParams.get('ideologia') || ''
  const solo_spikes = req.nextUrl.searchParams.get('solo_spikes') || 'false'
  const r = await callBackend(
 `/api/media-intel/articulos?horas=${encodeURIComponent(horas)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}&q=${encodeURIComponent(q)}&ideologia=${encodeURIComponent(ideologia)}&solo_spikes=${encodeURIComponent(solo_spikes)}`,
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
