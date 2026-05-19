/**
 * Catch-all proxy Next.js → FastAPI · /api/entities/* → /api/v1/entities/*
 *
 * Estrategia:
 *   - Si BACKEND_URL responde 2xx → propagar.
 *   - 4xx → propagar status + body (errores de cliente legítimos como 404).
 *   - 5xx, timeout, sin BACKEND_URL → 503 con cuerpo explícito (no swallow).
 *
 * Proxy genérico: cubre todos los endpoints de entities sin tener que crear
 * un archivo route.ts por cada uno. Si en el futuro un endpoint necesita
 * lógica frontend extra, se le crea su propio handler que sobreescribe.
 */

const BACKEND = process.env.BACKEND_URL ?? ''
const TIMEOUT_MS = 10_000

export const dynamic = 'force-dynamic'

async function passthrough(
  req: Request,
  ctx: { params: { path?: string[] } },
): Promise<Response> {
  const tail = (ctx.params.path ?? []).map((s) => encodeURIComponent(s)).join('/')
  const url = new URL(req.url)
  const target = `/api/v1/entities/${tail}${url.search}`

  if (!BACKEND) {
    return Response.json(
      { error: 'BACKEND_URL not configured', target },
      { status: 503 },
    )
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {
      'X-API-Key': process.env.BACKEND_API_KEY ?? '',
    }
    const contentType = req.headers.get('content-type')
    if (contentType) headers['Content-Type'] = contentType

    const init: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await req.text()
    }

    const res = await fetch(`${BACKEND}${target}`, init)
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (err) {
    return Response.json(
      { error: 'backend_unreachable', detail: String(err).slice(0, 200), target },
      { status: 503 },
    )
  } finally {
    clearTimeout(t)
  }
}

export const GET = passthrough
export const POST = passthrough
export const PATCH = passthrough
export const PUT = passthrough
export const DELETE = passthrough
