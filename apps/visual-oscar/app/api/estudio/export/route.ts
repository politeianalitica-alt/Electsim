import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/export`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const now = new Date().toISOString()
    return NextResponse.json([
      { id: 'exp-1', name: 'Briefing semanal CIS (PDF)',        scope: 'dashboard', scopeId: 'dash-1', format: 'pdf', schedule: 'weekly', recipients: ['carlos@politeia.es', 'ana@politeia.es'], lastRunAt: '2026-05-13T09:00:00Z', lastRunStatus: 'success', fileSizeBytes: 482_000, isActive: true, createdAt: '2025-09-01T00:00:00Z', updatedAt: now },
      { id: 'exp-2', name: 'Contratos AAPP mensual (Parquet)',  scope: 'dataset',   scopeId: 'ds-3',   format: 'parquet', schedule: 'manual', recipients: [], isActive: true, createdAt: '2025-11-15T00:00:00Z', updatedAt: now },
    ])
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    const res = await fetch(`${BACKEND}/api/estudio/export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      id: `exp-${Date.now().toString(36)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    }, { status: 201 })
  }
}
