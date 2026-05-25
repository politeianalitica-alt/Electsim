import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Catch-all proxy a FastAPI · /api/dosieres/* (api/routers/dosieres.py)
// Sirve TODO el CRUD de dosieres:
//   GET    /api/dosieres                              → lista
//   GET    /api/dosieres/{slug}                       → detalle completo
//   POST   /api/dosieres                              → crear
//   PUT    /api/dosieres/{slug}                       → actualizar
//   DELETE /api/dosieres/{slug}                       → borrar
//   POST   /api/dosieres/{slug}/apartados             → upsert apartado
//   DELETE /api/dosieres/{slug}/apartados/{tipo}      → borrar apartado
//   POST   /api/dosieres/{slug}/apartados/{tipo}/items
//   DELETE /api/dosieres/items/{item_id}

function buildPath(params: { path?: string[] }, search: string): string {
  const sub = params.path?.join('/') ?? ''
  const suffix = sub ? `/${sub}` : ''
  const qs = search ? `?${search}` : ''
  return `/api/dosieres${suffix}${qs}`
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const data = await fromBackend<unknown>(path)
  if (data === null || data === undefined) {
    // El backend devuelve {detail: ...} en 4xx — propagamos como 404 genérico
    return NextResponse.json(
      withMeta({ error: 'not_found', path }, 'mock', { warnings: ['backend_offline_or_404'] }),
      { status: 404 },
    )
  }
  return NextResponse.json(withMeta(data, 'backend'))
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const body = await req.json().catch(() => ({}))
  const data = await fromBackend<unknown>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (data === null || data === undefined) {
    return NextResponse.json(
      { error: 'backend_unavailable', path },
      { status: 502 },
    )
  }
  return NextResponse.json(withMeta(data, 'backend'), { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const body = await req.json().catch(() => ({}))
  const data = await fromBackend<unknown>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (data === null || data === undefined) {
    return NextResponse.json(
      { error: 'backend_unavailable', path },
      { status: 502 },
    )
  }
  return NextResponse.json(withMeta(data, 'backend'))
}

export async function DELETE(_req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildPath(params, '')
  await fromBackend<unknown>(path, { method: 'DELETE' })
  return new NextResponse(null, { status: 204 })
}
