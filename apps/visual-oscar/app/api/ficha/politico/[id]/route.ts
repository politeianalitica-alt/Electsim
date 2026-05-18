/**
 * GET /api/ficha/politico/[id]?nombre=...&fresh=1
 *
 * id puede ser un QID Wikidata (Q12345) o un slug (pedro_sanchez).
 * Si el id NO es QID y no aparece en BD, hace falta `?nombre=` para
 * resolver vía Wikidata.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } },
) {
  const id = decodeURIComponent(ctx.params.id || '').trim()
  if (!id) return NextResponse.json({ found: false, error: 'empty id' }, { status: 400 })
  const nombre = req.nextUrl.searchParams.get('nombre') || ''
  const fresh = req.nextUrl.searchParams.get('fresh') === '1'

  let path = `/api/v2/ficha/politico/${encodeURIComponent(id)}`
  const qs: string[] = []
  if (nombre) qs.push(`nombre=${encodeURIComponent(nombre)}`)
  if (fresh) qs.push('fresh=1')
  if (qs.length) path += '?' + qs.join('&')

  const res = await callBackend<{ found: boolean; ficha?: Record<string, unknown> }>(
    path,
    fresh ? { cache: 'no-store' } : { next: { revalidate: 3600 } } as RequestInit,
  )
  if (res.error || !res.data) {
    return NextResponse.json({ found: false, error: res.error || 'backend_unavailable' })
  }
  return NextResponse.json(res.data)
}
