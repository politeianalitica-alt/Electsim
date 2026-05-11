import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface SourcesHealth { sources: Array<{ source_id: string; name: string; category: string; cadencia: string; market: string; is_active: boolean; last_fetch: string | null; last_error: string | null; n_rows: number; latest_data: string | null }> }

export async function GET(_req: NextRequest) {

  const r = await callBackend<SourcesHealth>(
    `/api/macro-finance/sources`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { sources: [] },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
