import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/dashboard/${params.id}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    if (params.id === 'dash-1') {
      return NextResponse.json({
        id: 'dash-1',
        name: 'Monitor Electoral 2024',
        description: 'Seguimiento en tiempo real de resultados electorales y tendencias demoscópicas',
        visibility: 'team',
        tags: ['electoral', '2024'],
        widgets: [
          { id: 'w1', type: 'kpi',            layout: { i: 'w1', x: 0, y: 0, w: 3, h: 2 }, config: { title: 'Censo electoral', valueField: 'censo', kpiAggregation: 'sum', unit: ' votantes', datasetId: 'ds-1' } },
          { id: 'w2', type: 'bar_horizontal', layout: { i: 'w2', x: 3, y: 0, w: 5, h: 4 }, config: { title: 'Votos por partido', xField: 'partido', yField: 'votos', colorScheme: 'partido', datasetId: 'ds-1' } },
          { id: 'w3', type: 'pie',            layout: { i: 'w3', x: 8, y: 0, w: 4, h: 4 }, config: { title: 'Distribución %', labelField: 'partido', valueField: 'pct_votos', colorScheme: 'partido', showLegend: true, datasetId: 'ds-1' } },
          { id: 'w4', type: 'line',           layout: { i: 'w4', x: 0, y: 4, w: 6, h: 3 }, config: { title: 'Tendencia semanal', xField: 'semana', yField: 'media_estimacion', datasetId: 'ds-2' } },
          { id: 'w5', type: 'table',          layout: { i: 'w5', x: 6, y: 4, w: 6, h: 3 }, config: { title: 'Top municipios', xField: 'municipio', yField: 'votos', limit: 8, datasetId: 'ds-1' } },
        ],
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({
      id: params.id,
      name: 'Dashboard ' + params.id,
      visibility: 'private',
      widgets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/dashboard/${params.id}`, {
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
    const res = await fetch(`${BACKEND}/api/estudio/dashboard/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
