/**
 * Route Handler · POST /api/brain-v2/tool/[name]
 *
 * Proxy server-side al GroqBrain (FastAPI /api/v2/brain/tool/{name}).
 * Permite a client components del workspace llamar al brain sin exponer
 * BACKEND_URL al browser y sin pasar por el proxy genérico (que hace POST
 * a paths arbitrarios — esto es más específico y auditable).
 *
 * Devuelve siempre 200 con el shape estándar del brain — los errores van
 * dentro del JSON (`ok=false`, `error=...`) para que la UI no tenga que
 * gestionar también códigos HTTP.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBrainTool } from '@/lib/brain'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  ctx: { params: { name: string } },
) {
  const toolName = ctx.params.name
  let kwargs: Record<string, unknown> = {}
  try {
    const body = await req.json()
    if (body && typeof body === 'object' && body !== null) {
      // Aceptamos { kwargs: {...} } o el dict directo
      if ('kwargs' in body && typeof body.kwargs === 'object' && body.kwargs !== null) {
        kwargs = body.kwargs as Record<string, unknown>
      } else {
        kwargs = body as Record<string, unknown>
      }
    }
  } catch {
    kwargs = {}
  }
  const out = await callBrainTool(toolName, kwargs)
  return NextResponse.json(out)
}

export async function GET() {
  // Pequeño hint informativo
  return NextResponse.json({
    info: 'POST a /api/brain-v2/tool/{name} con body { kwargs: {...} }',
  })
}
