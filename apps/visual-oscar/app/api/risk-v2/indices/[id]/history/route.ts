import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HistoryPoint {
  date: string
  score: number | null
  delta_7d: number | null
  label?: string
}
interface HistoryPayload {
  index_id: string
  country: string
  days: number
  n: number
  series: HistoryPoint[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const days = req.nextUrl.searchParams.get('days') || '365'
  const id = decodeURIComponent(params.id)
  const r = await callBackend<HistoryPayload>(
    `/api/risk-v2/indices/${encodeURIComponent(id)}/history?country=${encodeURIComponent(country)}&days=${days}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.series)) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  const empty: HistoryPayload = { index_id: id, country, days: Number(days), n: 0, series: [] }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_history_cached'],
    latency_ms: r.latency_ms,
  }))
}
