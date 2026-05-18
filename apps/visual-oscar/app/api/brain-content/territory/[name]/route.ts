/**
 * Route Handler · GET /api/brain-content/territory/[name]?ccaa=...
 *
 * Devuelve la ficha enriquecida de un municipio/CCAA desde
 * brain_territory_profiles. Mismo patrón que actor.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  ctx: { params: { name: string } },
) {
  const name = decodeURIComponent(ctx.params.name || '').trim()
  if (!name) {
    return NextResponse.json({ found: false, error: 'empty name' }, { status: 400 })
  }
  const ccaa = req.nextUrl.searchParams.get('ccaa') || ''
  const path = `/api/v2/brain/content/territory/${encodeURIComponent(name)}` +
    (ccaa ? `?ccaa=${encodeURIComponent(ccaa)}` : '')
  const res = await callBackend<{ found: boolean; profile?: Record<string, unknown> }>(
    path,
    { next: { revalidate: 600 } } as RequestInit,
  )
  if (res.error || !res.data) {
    return NextResponse.json({ found: false })
  }
  return NextResponse.json(res.data)
}
