import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest) {
  try {
    const qs  = req.nextUrl.searchParams.toString()
    const res = await fetch(`${BACKEND}/api/domo/fuentes${qs ? `?${qs}` : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      next:    { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(
      { data: getMockSources(), total: 3, page: 1, pageSize: 100, hasMore: false },
      { status: 200 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/domo/fuentes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Modo demo: simula creación con un ID generado
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({
      id:         `mock-${Date.now().toString(36)}`,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      ...body,
    }, { status: 201 })
  }
}

function getMockSources() {
  return [
    {
      id: 'mock-1', name: 'PostgreSQL Producción', type: 'postgresql',
      status: 'connected', schedule: 'hourly',
      description: 'Base de datos principal de resultados electorales',
      totalRecords: 4_823_012, lastSyncAt: new Date(Date.now() - 3_600_000).toISOString(),
      lastSyncDurationMs: 12_400, lastSyncRecords: 1_240,
      config: { host: 'db.politeia.es', port: '5432', database: 'politeia_prod', user: 'reader', ssl: 'require' },
      createdAt: '2025-01-15T10:00:00Z', updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-2', name: 'API Congreso', type: 'rest_api',
      status: 'connected', schedule: 'every_15min',
      description: 'Datos del Congreso de los Diputados vía API REST',
      totalRecords: 18_500, lastSyncAt: new Date(Date.now() - 900_000).toISOString(),
      lastSyncDurationMs: 3_200, lastSyncRecords: 45,
      config: { url: 'https://api.congreso.es/v1', method: 'GET', auth_type: 'api_key' },
      createdAt: '2025-02-01T08:00:00Z', updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-3', name: 'RSS El País Política', type: 'rss',
      status: 'error', schedule: 'every_5min',
      description: 'Feed RSS sección política El País',
      totalRecords: 32_104,
      lastSyncAt: new Date(Date.now() - 86_400_000).toISOString(),
      lastSyncError: 'Connection timeout después de 30s',
      lastSyncDurationMs: 30_001, lastSyncRecords: 0,
      config: { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada', max_items: '50' },
      createdAt: '2025-03-10T14:00:00Z', updatedAt: new Date().toISOString(),
    },
  ]
}
