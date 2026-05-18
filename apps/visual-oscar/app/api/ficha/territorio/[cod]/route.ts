/**
 * GET /api/ficha/territorio/[cod]  → ficha de municipio (5 dígitos INE)
 *      o GET /api/ficha/territorio/ccaa-{nombre} → ficha CCAA
 *
 * Proxy server-side al FastAPI `/api/v2/ficha/territorio/...`.
 * El usuario puede llamar `?fresh=1` para forzar reconstrucción.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  ctx: { params: { cod: string } },
) {
  const cod = decodeURIComponent(ctx.params.cod || '').trim()
  const fresh = req.nextUrl.searchParams.get('fresh') === '1'
  if (!cod) return NextResponse.json({ found: false, error: 'empty cod' }, { status: 400 })

  // CCAA si el prefijo es "ccaa-Nombre"
  let path: string
  if (cod.toLowerCase().startsWith('ccaa-')) {
    const nombre = cod.slice(5)
    path = `/api/v2/ficha/territorio/ccaa/${encodeURIComponent(nombre)}`
  } else {
    path = `/api/v2/ficha/territorio/${encodeURIComponent(cod)}`
  }
  if (fresh) path += '?fresh=1'

  const res = await callBackend<{ found: boolean; ficha?: Record<string, unknown> }>(
    path,
    fresh
      ? { cache: 'no-store' }
      : { next: { revalidate: 3600 } } as RequestInit,
  )
  if (res.error || !res.data) {
    return NextResponse.json({ found: false, error: res.error || 'backend_unavailable' })
  }
  return NextResponse.json(res.data)
}
