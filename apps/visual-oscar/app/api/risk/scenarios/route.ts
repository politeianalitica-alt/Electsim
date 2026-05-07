import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

export interface RiskScenario {
  title: string
  narrative: string
  probability_pct: number
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  horizon: string
  dimensions_affected: string[]
  triggers: string[]
  early_warnings: string[]
  mitigations: string[]
  key_actors: string[]
}

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    return NextResponse.json({ error: 'BACKEND_URL no configurada', scenarios: [] }, { status: 502 })
  }
  let body: unknown = {}
  try { body = await req.json() } catch { /* ignore */ }
  try {
    const res = await fetch(`${BACKEND}/api/risk/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: String(e), scenarios: [] }, { status: 502 })
  }
}
