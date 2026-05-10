import type { Fuente, FuenteSnapshot, TipoFuente, CredibilidadFuente } from '@/types/intelligence'
import { MOCK_FUENTES, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/fuentes`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 120 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const snap: FuenteSnapshot = { items: MOCK_FUENTES, total: MOCK_FUENTES.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { nombre: string; tipo: TipoFuente; url?: string; credibilidad_default?: CredibilidadFuente; descripcion?: string }
    const item: Fuente = {
      id: `src-${Date.now()}`,
      nombre: body.nombre,
      tipo: body.tipo,
      url: body.url,
      credibilidad_default: body.credibilidad_default,
      descripcion: body.descripcion,
      activa: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(item)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
