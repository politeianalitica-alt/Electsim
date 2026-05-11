import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskAlert {
  id: number
  alert_id: string
  index_id: string
  index_name: string
  severity: 'critical' | 'warning' | 'info'
  score: number
  delta: number
  message: string
  fired_at: string
  acknowledged: boolean
}

interface AlertsPayload {
  country: string
  n_active: number
  n_total: number
  by_severity: Record<string, number>
  alerts: RiskAlert[]
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const days = req.nextUrl.searchParams.get('days') || '30'
  const r = await callBackend<AlertsPayload>(
    `/api/risk-v2/alerts?country=${encodeURIComponent(country)}&days=${days}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.alerts)) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  const empty: AlertsPayload = { country, n_active: 0, n_total: 0, by_severity: {}, alerts: [] }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_alerts_in_range'],
    latency_ms: r.latency_ms,
  }))
}
