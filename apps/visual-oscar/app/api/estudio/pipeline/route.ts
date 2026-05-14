import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/pipeline`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockPipelines(), { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({
      id:        `pipe-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    }, { status: 201 })
  }
}

function getMockPipelines() {
  return [
    {
      id: 'pipe-1',
      name: 'Ingesta resultados electorales',
      description: 'Extrae de PostgreSQL, normaliza y escribe en dataset de análisis',
      status: 'active',
      schedule: 'hourly',
      lastRunAt: new Date(Date.now() - 3_600_000).toISOString(),
      lastRunStatus: 'success',
      lastRunRecords: 48_320,
      lastRunDurationMs: 14_200,
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
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pipe-2',
      name: 'Agregación demoscópica semanal',
      description: 'Combina encuestas, agrega por partido y genera serie histórica',
      status: 'paused',
      schedule: 'weekly',
      lastRunAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      lastRunStatus: 'success',
      lastRunRecords: 1_200,
      lastRunDurationMs: 3_800,
      nodes: [
        { id: 'n1', type: 'source',      label: 'Encuestas CSV', position: { x: 80,  y: 150 }, config: {} },
        { id: 'n2', type: 'aggregate',   label: 'Por partido',   position: { x: 280, y: 150 }, config: { groupBy: 'partido', aggregations: '[{"col":"intencion","fn":"avg"}]' } },
        { id: 'n3', type: 'destination', label: 'Serie histórica', position: { x: 480, y: 150 }, config: { writeMode: 'append' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
      createdAt: '2025-02-15T09:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ]
}
