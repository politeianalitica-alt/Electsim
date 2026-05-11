import type { Fuente, TipoFuente, CredibilidadFuente } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_FUENTES, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return listDomain<Fuente>('/api/intelligence/fuentes', MOCK_FUENTES)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      nombre: string; tipo: TipoFuente; url?: string
      credibilidad_default?: CredibilidadFuente; descripcion?: string
    }
    return createInDomain(
      '/api/intelligence/fuentes',
      {
        name: body.nombre,
        url: body.url,
        kind: body.tipo,
        trust_score: 0.5,
        data: { credibilidad_default: body.credibilidad_default, descripcion: body.descripcion },
      },
      (): Fuente => ({
        id: `src-${Date.now()}`,
        nombre: body.nombre,
        tipo: body.tipo,
        url: body.url,
        credibilidad_default: body.credibilidad_default,
        descripcion: body.descripcion,
        activa: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
