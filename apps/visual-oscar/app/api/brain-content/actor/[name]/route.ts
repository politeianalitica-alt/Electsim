/**
 * Route Handler · GET /api/brain-content/actor/[name]
 *
 * Devuelve el dossier enriquecido de un actor desde brain_actor_dossiers.
 * Si no hay BD o no hay dossier, devuelve { found:false } (la página
 * decide si renderizar con datos crudos o mostrar placeholder).
 *
 * Cachea con ISR · revalidate 10 minutos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  ctx: { params: { name: string } },
) {
  const name = decodeURIComponent(ctx.params.name || '').trim()
  if (!name) {
    return NextResponse.json({ found: false, error: 'empty name' }, { status: 400 })
  }
  // Proxy a un endpoint backend que lee de brain_actor_dossiers.
  // El handler FastAPI debe existir en /api/v2/brain/content/actor/{name}.
  const res = await callBackend<{ found: boolean; dossier?: Record<string, unknown> }>(
    `/api/v2/brain/content/actor/${encodeURIComponent(name)}`,
    { next: { revalidate: 600 } } as RequestInit,
  )
  if (res.error || !res.data) {
    // BD no disponible o sin dossier → devolvemos found:false sin error 500
    return NextResponse.json({ found: false })
  }
  return NextResponse.json(res.data)
}
