import type { Watchlist } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_WATCHLISTS, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return listDomain<Watchlist>('/api/intelligence/watchlists', MOCK_WATCHLISTS)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { nombre: string; terminos: string[]; descripcion?: string }
    return createInDomain(
      '/api/intelligence/watchlists',
      {
        name: body.nombre,
        description: body.descripcion,
        members: body.terminos.map(t => ({ type: 'term', label: t })),
        severity: 'medium',
        active: true,
      },
      (): Watchlist => ({
        id: `wl-${Date.now()}`,
        nombre: body.nombre,
        descripcion: body.descripcion,
        terminos: body.terminos ?? [],
        activa: true,
        alertas_count: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
