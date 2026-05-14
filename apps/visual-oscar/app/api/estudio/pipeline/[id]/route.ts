import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/pipeline/${params.id}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Mock: el primer pipeline del listado mock
    if (params.id === 'pipe-1') {
      return NextResponse.json({
        id: 'pipe-1',
        name: 'Ingesta resultados electorales',
        description: 'Extrae de PostgreSQL, normaliza y escribe en dataset de análisis',
        status: 'active',
        schedule: 'hourly',
        nodes: [
          { id: 'n1', type: 'source',      label: 'PG Producción', position: { x: 80,  y: 150 }, config: { sourceId: 'mock-1' } },
          { id: 'n2', type: 'filter',      label: 'Solo 2024',     position: { x: 280, y: 150 }, config: { condition: 'año = 2024' } },
          { id: 'n3', type: 'select',      label: 'Campos clave',  position: { x: 480, y: 150 }, config: { columns: 'municipio, partido, votos, año' } },
          { id: 'n4', type: 'destination', label: 'Dataset final', position: { x: 680, y: 150 }, config: { writeMode: 'overwrite' } },
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2' },
          { id: 'e2', source: 'n2', target: 'n3' },
          { id: 'e3', source: 'n3', target: 'n4' },
        ],
        lastRunAt: new Date(Date.now() - 3_600_000).toISOString(),
        lastRunStatus: 'success',
        lastRunRecords: 48_320,
        lastRunDurationMs: 14_200,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({
      id: params.id,
      name: 'Pipeline ' + params.id,
      status: 'draft',
      schedule: 'manual',
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/pipeline/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ id: params.id, ...(await req.json().catch(() => ({}))) }, { status: 200 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/pipeline/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
