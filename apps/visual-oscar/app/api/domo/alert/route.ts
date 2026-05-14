import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/domo/alert`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockAlerts())
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${BACKEND}/api/domo/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({
      id: `alert-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggerCount: 0,
      ...body,
    }, { status: 201 })
  }
}

function getMockAlerts() {
  const now = new Date().toISOString()
  return [
    {
      id: 'alert-1',
      name: 'Caída intención voto PP > 3%',
      description: 'Monitoriza variación semanal de estimaciones de voto',
      datasetId: 'ds-2',
      condition: { field: 'media_estimacion', op: 'pct_change_lt', threshold: -3, aggregation: 'avg', windowMinutes: 10080 },
      severity: 'critical',
      status: 'active',
      actions: [{ channel: 'in_app' }, { channel: 'email', emailTo: ['analista@politeia.es'] }],
      cooldownMinutes: 1440,
      triggerCount: 2,
      lastTriggeredAt: '2026-05-10T09:15:00Z',
      lastCheckedAt: now,
      createdAt: '2025-06-01T08:00:00Z',
      updatedAt: now,
    },
    {
      id: 'alert-2',
      name: 'Nuevo contrato IBEX > 10M€',
      description: 'Detecta contratos públicos de gran cuantía',
      datasetId: 'ds-3',
      condition: { field: 'importe', op: 'gt', threshold: 10_000_000, aggregation: 'last' },
      severity: 'warning',
      status: 'triggered',
      actions: [{ channel: 'in_app' }, { channel: 'webhook', webhookUrl: 'https://hooks.slack.com/...' }],
      cooldownMinutes: 60,
      triggerCount: 7,
      lastTriggeredAt: '2026-05-14T07:30:00Z',
      lastCheckedAt: now,
      createdAt: '2025-09-15T10:00:00Z',
      updatedAt: now,
    },
    {
      id: 'alert-3',
      name: 'Anomalía en abstención electoral',
      datasetId: 'ds-1',
      condition: { field: 'censo', op: 'anomaly', aggregation: 'last', windowMinutes: 2880 },
      severity: 'info',
      status: 'paused',
      actions: [{ channel: 'in_app' }],
      cooldownMinutes: 120,
      triggerCount: 0,
      createdAt: '2026-01-10T11:00:00Z',
      updatedAt: now,
    },
  ]
}
