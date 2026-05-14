import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const res = await fetch(`${BACKEND}/api/estudio/annotation?${url.searchParams}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Mock: hitos políticos relevantes para el contexto de Politeia
    return NextResponse.json([
      { id: 'a1', scope: 'dataset',   scopeId: 'ds-1', kind: 'event',     title: 'Elecciones Generales 2023', description: 'Convocatoria oficial', date: '2023-07-23T00:00:00Z', color: '#ef4444', createdBy: 'demo', createdAt: '2023-07-01T00:00:00Z' },
      { id: 'a2', scope: 'dataset',   scopeId: 'ds-2', kind: 'milestone', title: 'Ley de Vivienda',          description: 'Aprobación en Congreso', date: '2023-05-17T00:00:00Z', color: '#3b82f6', createdBy: 'demo', createdAt: '2023-05-18T00:00:00Z' },
      { id: 'a3', scope: 'dashboard', scopeId: 'dash-1', kind: 'note',    title: 'Cambio metodológico CIS',  description: 'Nueva técnica de muestreo desde abril', date: '2024-04-01T00:00:00Z', color: '#f59e0b', createdBy: 'demo', createdAt: '2024-04-01T00:00:00Z' },
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
    const res = await fetch(`${BACKEND}/api/estudio/annotation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      id: `ann-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      createdBy: 'demo',
      ...body,
    }, { status: 201 })
  }
}
