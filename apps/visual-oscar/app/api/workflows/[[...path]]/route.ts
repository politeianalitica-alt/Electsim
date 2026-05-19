/**
 * Catch-all proxy · /api/workflows/* → FastAPI /api/v1/workflows/*
 *
 * Timeout 90s · los workflows multi-step pueden tardar 30-60s (3-5 tool
 * calls Groq encadenadas). Propaga X-User-Id para audit trail.
 */

const BACKEND = process.env.BACKEND_URL ?? ''
const TIMEOUT_MS = 90_000

export const dynamic = 'force-dynamic'
export const maxDuration = 90

async function passthrough(
  req: Request,
  ctx: { params: { path?: string[] } },
): Promise<Response> {
  const tail = (ctx.params.path ?? []).map((s) => encodeURIComponent(s)).join('/')
  const url = new URL(req.url)
  const target = `/api/v1/workflows${tail ? '/' + tail : ''}${url.search}`

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
    const xUser = req.headers.get('x-user-id')
    if (xUser) headers['X-User-Id'] = xUser
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
