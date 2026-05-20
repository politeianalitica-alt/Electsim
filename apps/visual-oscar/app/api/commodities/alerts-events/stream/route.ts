/**
 * Proxy SSE · forward del stream del backend al cliente Next.js.
 *
 * Next.js App Router permite devolver el ReadableStream directamente al
 * cliente. Forzamos `dynamic = 'force-dynamic'` para evitar caching.
 */
const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()

  if (!BACKEND) {
    return new Response('event: error\ndata: {"error":"backend not configured"}\n\n', {
      status: 502,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  try {
    const upstream = await fetch(
      `${BACKEND}/api/v1/commodities/alerts-events/stream${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'X-API-Key': API_KEY,
        },
        cache: 'no-store',
      },
    )
    if (!upstream.ok || !upstream.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ status: upstream.status })}\n\n`,
        {
          status: upstream.status || 502,
          headers: { 'Content-Type': 'text/event-stream' },
        },
      )
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: String(e) })}\n\n`,
      {
        status: 502,
        headers: { 'Content-Type': 'text/event-stream' },
      },
    )
  }
}
