import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Indicator { label_id: string; display_name: string; category: string; unit: string; current: number | null; delta: number | null; delta_pct: number | null; as_of: string | null; source_id: string }
export interface MacroPanorama { country: string; indicators: Indicator[] }

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<MacroPanorama>(
    `/api/macro-finance/panorama?country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  return NextResponse.json(withMeta(
    { country: 'ES', indicators: [] },
    'mock',
    {
      warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_data'],
      latency_ms: r.latency_ms,
    },
  ))
}
