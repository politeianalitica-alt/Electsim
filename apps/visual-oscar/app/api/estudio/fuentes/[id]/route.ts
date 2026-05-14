import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/fuentes/${params.id}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // Devuelve un mock coherente con la lista
    return NextResponse.json({
      id: params.id,
      name: 'Fuente demo · ' + params.id,
      type: 'postgresql',
      status: 'connected',
      schedule: 'hourly',
      description: 'Fuente generada en modo demo (sin backend).',
      totalRecords: 1_240_000,
      lastSyncAt: new Date(Date.now() - 1_800_000).toISOString(),
      lastSyncDurationMs: 8_900,
      lastSyncRecords: 240,
      config: { host: 'localhost', port: '5432', database: 'demo', user: 'reader' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/fuentes/${params.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend no disponible' }, { status: 503 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/fuentes/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
