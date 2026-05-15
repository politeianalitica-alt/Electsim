import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { mockAlerts } from '../_mocks'

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
  if (r.data && Array.isArray(r.data.alerts) && r.data.alerts.length > 0) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  // Backend caído · devolvemos 6 alertas DEMO (1 critical, 3 warning, 2 info)
  // distribuidas en los 6 índices · una ya viene acknowledged.
  return NextResponse.json(withMeta(mockAlerts(country), 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['demo_data'],
    latency_ms: r.latency_ms,
  }))
}
