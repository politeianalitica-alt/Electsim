import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/dashboard`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockDashboards())
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({
      id: `dash-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      widgets:   [],
      visibility: 'private',
      ...body,
    }, { status: 201 })
  }
}

function getMockDashboards() {
  const now = new Date().toISOString()
  return [
    {
      id: 'dash-1',
      name: 'Monitor Electoral 2024',
      description: 'Seguimiento en tiempo real de resultados electorales y tendencias demoscópicas',
      visibility: 'team',
      isTemplate:   false,
      viewCount:    1_482,
      tags:         ['electoral', 'generales', '2024'],
      updatedAt:    now,
      createdAt: '2025-01-15T10:00:00Z',
      refreshIntervalSeconds: 300,
      widgets: [
        { id: 'w1', type: 'kpi',            layout: { i: 'w1', x: 0, y: 0, w: 3, h: 2 }, config: { title: 'Censo electoral', valueField: 'censo', kpiAggregation: 'sum', unit: ' votantes', datasetId: 'ds-1', kpiComparePct: false } },
        { id: 'w2', type: 'bar_horizontal', layout: { i: 'w2', x: 3, y: 0, w: 5, h: 4 }, config: { title: 'Votos por partido', xField: 'partido', yField: 'votos', colorScheme: 'partido', datasetId: 'ds-1' } },
        { id: 'w3', type: 'pie',            layout: { i: 'w3', x: 8, y: 0, w: 4, h: 4 }, config: { title: 'Distribución %', labelField: 'partido', valueField: 'pct_votos', colorScheme: 'partido', showLegend: true, datasetId: 'ds-1' } },
        { id: 'w4', type: 'line',           layout: { i: 'w4', x: 0, y: 4, w: 6, h: 3 }, config: { title: 'Tendencia semanal', xField: 'semana', yField: 'media_estimacion', colorScheme: 'politeia', datasetId: 'ds-2' } },
        { id: 'w5', type: 'table',          layout: { i: 'w5', x: 6, y: 4, w: 6, h: 3 }, config: { title: 'Top municipios', xField: 'municipio', yField: 'votos', limit: 8, sortField: 'votos', sortDir: 'desc', datasetId: 'ds-1' } },
      ],
    },
    {
      id: 'dash-2',
      name: 'Radar Ibex35 — Sector público',
      description: 'Contratos públicos adjudicados a empresas del Ibex35 por sector y año',
      visibility: 'private',
      isTemplate:   false,
      viewCount:    234,
      tags:         ['ibex35', 'contratos'],
      updatedAt:    now,
      createdAt: '2025-03-10T09:00:00Z',
      widgets: [
        { id: 'w6', type: 'kpi', layout: { i: 'w6', x: 0, y: 0, w: 3, h: 2 }, config: { title: 'Importe total', valueField: 'importe', kpiAggregation: 'sum', unit: ' M€', datasetId: 'ds-3', kpiComparePct: true } },
        { id: 'w7', type: 'bar', layout: { i: 'w7', x: 3, y: 0, w: 9, h: 4 }, config: { title: 'Contratos por empresa', xField: 'empresa', yField: 'importe', sortField: 'importe', sortDir: 'desc', limit: 10, datasetId: 'ds-3' } },
      ],
    },
    {
      id: 'dash-tpl',
      name: 'Plantilla: Análisis de campaña',
      description: 'Plantilla base para seguimiento de campaña electoral',
      visibility: 'team',
      isTemplate:   true,
      viewCount:    89,
      tags:         ['plantilla', 'campaña'],
      updatedAt:    now,
      createdAt: '2025-02-01T08:00:00Z',
      widgets:      [],
    },
  ]
}
