import type { Watchlist, WatchlistSnapshot } from '@/types/intelligence'
import { MOCK_WATCHLISTS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/watchlists`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const snap: WatchlistSnapshot = { items: MOCK_WATCHLISTS, total: MOCK_WATCHLISTS.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { nombre: string; terminos: string[]; descripcion?: string }
    const item: Watchlist = {
      id: `wl-${Date.now()}`,
      nombre: body.nombre,
      descripcion: body.descripcion,
      terminos: body.terminos ?? [],
      activa: true,
      alertas_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(item)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
