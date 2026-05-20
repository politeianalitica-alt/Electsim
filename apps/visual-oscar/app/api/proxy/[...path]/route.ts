import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, backendConfigured } from '@/lib/backend'

// Proxy genérico: GET /api/proxy/foo/bar  -> ${BACKEND_URL}/foo/bar
// Útil para llamar a cualquier endpoint del FastAPI sin tener que crear
// un route handler específico para cada uno.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!backendConfigured()) {
    return NextResponse.json(
      { error: 'BACKEND_URL no configurada · proxy genérico requiere backend real' },
      { status: 503 },
    )
  }
  const path = '/' + (ctx.params.path || []).join('/')
  const search = req.nextUrl.search // incluye '?'
  const init: RequestInit = { method: req.method }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text()
  }
  const data = await fromBackend(path + search, init)
  if (data === null) {
    return NextResponse.json({ error: 'Backend no respondió' }, { status: 502 })
  }
  return NextResponse.json(data)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
