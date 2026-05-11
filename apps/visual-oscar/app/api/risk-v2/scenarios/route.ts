import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskScenario {
  scenario_id: string
  name: string
  description: string
  index_id?: string
  index_name?: string
  probability: number | null
  confidence_low: number | null
  confidence_high: number | null
  key_drivers: Record<string, number>
  horizon_days: number
  model: string
  calculated_at?: string | null
  status: 'fresh' | 'never_run'
}

interface Payload {
  country: string
  n_scenarios: number
  scenarios: RiskScenario[]
  note?: string
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<Payload>(
    `/api/risk-v2/scenarios?country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.scenarios)) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  const empty: Payload = { country, n_scenarios: 0, scenarios: [] }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_scenarios_configured'],
    latency_ms: r.latency_ms,
  }))
}
