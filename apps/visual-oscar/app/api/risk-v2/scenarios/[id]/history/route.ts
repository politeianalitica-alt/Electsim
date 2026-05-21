import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ScenarioHistoryPoint {
  date: string
  probability: number | null
  confidence_low: number | null
  confidence_high: number | null
}
interface Payload {
  scenario_id: string
  country: string
  n: number
  series: ScenarioHistoryPoint[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const days = req.nextUrl.searchParams.get('days') || '90'
  const id = decodeURIComponent(params.id)
  const r = await callBackend<Payload>(
 `/api/risk-v2/scenarios/${encodeURIComponent(id)}/history?country=${encodeURIComponent(country)}&days=${days}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.series)) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  const empty: Payload = { scenario_id: id, country, n: 0, series: [] }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_history'],
    latency_ms: r.latency_ms,
  }))
}
