import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import {
  DOSIERES_FIXTURE,
  DOSIERES_RESUMEN,
  getDossierBySlug,
} from '@/data/dosieres-fixture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Catch-all proxy a FastAPI · /api/dosieres/* (api/routers/dosieres.py)
//
// FALLBACK · si el backend Python no responde, devuelve el fixture estático
// con los 24 dosieres del Gobierno de España + Feijóo (parseado del PDF
// "Informe_politicos_publicos" · ver apps/visual-oscar/data/dosieres-fixture.ts).
// Así el frontend funciona en producción aunque el backend esté caído o sin
// migraciones aplicadas.

function buildBackendPath(params: { path?: string[] }, search: string): string {
  const sub = params.path?.join('/') ?? ''
  const suffix = sub ? `/${sub}` : ''
  const qs = search ? `?${search}` : ''
  return `/api/dosieres${suffix}${qs}`
}

function applyFilters(items: typeof DOSIERES_RESUMEN, search: URLSearchParams) {
  let result = items
  const partido = search.get('partido')
  const q = search.get('q')
  const limit = parseInt(search.get('limit') ?? '100', 10)
  if (partido) {
    result = result.filter(d => (d.partido ?? '').toLowerCase() === partido.toLowerCase())
  }
  if (q) {
    const ql = q.toLowerCase()
    result = result.filter(d =>
      d.nombre_completo.toLowerCase().includes(ql) ||
      (d.alias ?? '').toLowerCase().includes(ql) ||
      (d.cargo_actual ?? '').toLowerCase().includes(ql)
    )
  }
  return result.slice(0, isNaN(limit) ? 100 : limit)
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildBackendPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const data = await fromBackend<unknown>(path)
  if (data !== null && data !== undefined) {
    return NextResponse.json(withMeta(data, 'backend'))
  }

  // Fallback al fixture estático · misma forma que el backend
  const subpath = params.path?.join('/') ?? ''
  if (!subpath) {
    // Lista resumida con filtros
    const filtered = applyFilters(DOSIERES_RESUMEN, req.nextUrl.searchParams)
    return NextResponse.json(withMeta(filtered, 'mock', {
      warnings: ['backend_offline · usando fixture estático con 24 dosieres del Gobierno'],
    }))
  }
  // Detalle por slug · `params.path[0]` es el slug
  const dossier = getDossierBySlug(subpath)
  if (!dossier) {
    return NextResponse.json(
      withMeta({ error: 'not_found', slug: subpath }, 'mock', {
        warnings: [`backend offline y el dossier '${subpath}' no está en el fixture`],
      }),
      { status: 404 },
    )
  }
  return NextResponse.json(withMeta(dossier, 'mock', {
    warnings: ['backend_offline · usando fixture estático'],
  }))
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildBackendPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const body = await req.json().catch(() => ({}))
  const data = await fromBackend<unknown>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (data === null || data === undefined) {
    return NextResponse.json(
      {
        error: 'backend_offline',
        message: 'No se puede crear/modificar dosieres sin backend Python conectado. El fixture estático es solo lectura.',
        hint: 'Levanta el backend FastAPI y aplica la migración 0081 (alembic upgrade head)',
      },
      { status: 503 },
    )
  }
  return NextResponse.json(withMeta(data, 'backend'), { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildBackendPath(params, req.nextUrl.search.replace(/^\?/, ''))
  const body = await req.json().catch(() => ({}))
  const data = await fromBackend<unknown>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (data === null || data === undefined) {
    return NextResponse.json(
      { error: 'backend_offline', message: 'Edición no disponible sin backend' },
      { status: 503 },
    )
  }
  return NextResponse.json(withMeta(data, 'backend'))
}

export async function DELETE(_req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = buildBackendPath(params, '')
  const data = await fromBackend<unknown>(path, { method: 'DELETE' })
  if (data === null || data === undefined) {
    return NextResponse.json(
      { error: 'backend_offline' },
      { status: 503 },
    )
  }
  return new NextResponse(null, { status: 204 })
}

// Marcar fixture como referenciado para que TS no quite el import sin uso
void DOSIERES_FIXTURE
