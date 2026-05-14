import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/dataset/${params.id}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Fallback: reusa la entrada del listado mock que coincida
    if (params.id === 'ds-1') {
      return NextResponse.json({
        id: 'ds-1',
        name: 'Resultados electorales 2024',
        description: 'Resultados completos municipio-partido de las elecciones generales de 2024',
        status: 'ready',
        rowCount: 179_852,
        columnCount: 8,
        sizeBytes: 14_680_064,
        sourcePipelineId: 'pipe-1',
        tags: ['electoral', 'municipios', '2024'],
        lastRefreshedAt: new Date(Date.now() - 3_600_000).toISOString(),
        refreshDurationMs: 14_200,
        retentionDays: 730,
        schema: [
          { name: 'municipio_id', type: 'integer', nullable: false, description: 'INE municipio code', stats: { nullCount: 0, distinctCount: 8_131, min: 1001, max: 52006 } },
          { name: 'municipio',    type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 8_131, topValues: [{ value: 'Madrid', count: 1 }, { value: 'Barcelona', count: 1 }] } },
          { name: 'ccaa',         type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 17 } },
          { name: 'partido',      type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 34 } },
          { name: 'votos',        type: 'integer', nullable: false, stats: { nullCount: 0, distinctCount: 28_420, min: 0, max: 892_340, mean: 2847.3 } },
          { name: 'pct_votos',    type: 'float',   nullable: false, stats: { nullCount: 0, distinctCount: 89_420, min: 0, max: 74.8, mean: 11.2, stddev: 12.4 } },
          { name: 'censo',        type: 'integer', nullable: false },
          { name: 'año',          type: 'integer', nullable: false, stats: { min: 2024, max: 2024 } },
        ],
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({
      id: params.id,
      name: 'Dataset ' + params.id,
      status: 'empty',
      rowCount: 0,
      columnCount: 0,
      sizeBytes: 0,
      schema: [],
      retentionDays: 365,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/domo/dataset/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ id: params.id, ...(await req.json().catch(() => ({}))) })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/dataset/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
