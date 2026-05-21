import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/dataset`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockDatasets())
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/dataset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({
      id: `ds-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'empty',
      rowCount:  0,
      columnCount: 0,
      sizeBytes:   0,
      schema:    [],
      ...body,
    }, { status: 201 })
  }
}

function getMockDatasets() {
  return [
    {
      id: 'ds-1',
      name: 'Resultados electorales 2024',
      description: 'Resultados completos municipio-partido de las elecciones generales de 2024',
      status: 'ready',
      rowCount:     179_852,
      columnCount:  8,
      sizeBytes:    14_680_064,
      sourcePipelineId: 'pipe-1',
      tags:         ['electoral', 'municipios', '2024', 'generales'],
      lastRefreshedAt:  new Date(Date.now() - 3_600_000).toISOString(),
      refreshDurationMs: 14_200,
      retentionDays: 730,
      schema: [
        { name: 'municipio_id', type: 'integer', nullable: false, description: 'INE municipio code', stats: { nullCount: 0, distinctCount: 8_131, min: 1001, max: 52006 } },
        { name: 'municipio',    type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 8_131, topValues: [{ value: 'Madrid', count: 1 }, { value: 'Barcelona', count: 1 }] } },
        { name: 'ccaa',         type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 17,    topValues: [{ value: 'Andalucía', count: 785 }, { value: 'Castilla y León', count: 2248 }] } },
        { name: 'partido',      type: 'string',  nullable: false, stats: { nullCount: 0, distinctCount: 34 } },
        { name: 'votos',        type: 'integer', nullable: false, stats: { nullCount: 0, distinctCount: 28_420, min: 0, max: 892_340, mean: 2847.3 } },
        { name: 'pct_votos',    type: 'float',   nullable: false, stats: { nullCount: 0, distinctCount: 89_420, min: 0, max: 74.8, mean: 11.2, stddev: 12.4 } },
        { name: 'censo',        type: 'integer', nullable: false, stats: { nullCount: 0, distinctCount: 8_100 } },
        { name: 'año',          type: 'integer', nullable: false, stats: { nullCount: 0, distinctCount: 1, min: 2024, max: 2024 } },
      ],
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ds-2',
      name: 'Serie demoscópica semanal',
      description: 'Intención de voto agregada semanalmente desde todas las encuestas disponibles',
      status: 'ready',
      rowCount:     2_860,
      columnCount:  6,
      sizeBytes:    204_800,
      sourcePipelineId: 'pipe-2',
      tags:         ['demoscopía', 'series-temporales', 'intención-de-voto'],
      lastRefreshedAt:  new Date(Date.now() - 7 * 86_400_000).toISOString(),
      refreshDurationMs: 3_800,
      retentionDays: 365,
      schema: [
        { name: 'semana',           type: 'date',    nullable: false },
        { name: 'partido',          type: 'string',  nullable: false },
        { name: 'media_estimacion', type: 'float',   nullable: false },
        { name: 'intervalo_inf',    type: 'float',   nullable: false },
        { name: 'intervalo_sup',    type: 'float',   nullable: false },
        { name: 'n_encuestas',      type: 'integer', nullable: false },
      ],
      createdAt: '2025-02-15T09:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ds-3',
      name: 'Empresas Ibex35 — Contratos públicos',
      description: 'Contratos públicos adjudicados a empresas del Ibex35 desde 2018',
      status: 'stale',
      rowCount:     48_210,
      columnCount:  12,
      sizeBytes:    8_388_608,
      tags:         ['ibex35', 'contratación-pública', 'empresas'],
      lastRefreshedAt:  new Date(Date.now() - 14 * 86_400_000).toISOString(),
      refreshDurationMs: 28_400,
      retentionDays: 1_825,
      schema: [
        { name: 'id_contrato',        type: 'string',  nullable: false },
        { name: 'empresa',            type: 'string',  nullable: false },
        { name: 'ticker',             type: 'string',  nullable: true },
        { name: 'importe',            type: 'float',   nullable: false },
        { name: 'organismo',          type: 'string',  nullable: false },
        { name: 'fecha_adjudicacion', type: 'date',    nullable: false },
        { name: 'tipo_contrato',      type: 'string',  nullable: false },
        { name: 'cpv',                type: 'string',  nullable: true },
        { name: 'ccaa',               type: 'string',  nullable: true },
        { name: 'provincia',          type: 'string',  nullable: true },
        { name: 'procedimiento',      type: 'string',  nullable: false },
        { name: 'licitadores',        type: 'integer', nullable: true },
      ],
      createdAt: '2025-03-01T08:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ]
}
