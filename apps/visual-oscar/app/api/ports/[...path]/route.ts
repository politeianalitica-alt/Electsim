/**
 * Catch-all proxy para `/api/v1/ports/*` (Sprint Puertos & Comercio Global).
 *
 * Forward 1:1 a FastAPI: añade `X-API-Key`, preserva querystring y body.
 * Diseñado para fallar cerrado: si BACKEND_URL no está, devuelve 200 con
 * payload vacío para que la UI no rompa en demo/offline.
 */

const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export const revalidate = 0

function targetUrl(pathSegments: string[], search: string): string {
  const path = pathSegments.map(encodeURIComponent).join('/')
  return `${BACKEND}/api/v1/ports/${path}${search}`
}

function emptyFallback(pathSegments: string[]): unknown {
  const head = pathSegments[0]
  // Heurística mínima · payload vacío coherente
  if (head === 'catalog' && pathSegments[1] === 'vessels')
    return { n_items: 0, items: [] }
  if (head === 'catalog') return { n_items: 0, items: [] }
  if (head === 'snapshot-all')
    return { n_items: 0, data_source: 'unavailable', items: [] }
  if (head === 'freight' && pathSegments[1] === 'snapshot')
    return { n_items: 0, data_source: 'unavailable', items: [] }
  if (head === 'chokepoints' && pathSegments.length === 1)
    return { n_items: 0, items: [] }
  if (head === 'trade')
    return { ok: false, n_items: 0, items: [], use_source: null }
  return { ok: false, available: false }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const { search } = new URL(req.url)
  const segments = params.path
  try {
    if (BACKEND) {
      const res = await fetch(targetUrl(segments, search), {
        headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
      if (res.status === 404) {
        return Response.json(
          { error: 'no encontrado', path: segments.join('/') },
          { status: 404 },
        )
      }
      return Response.json(
        { error: `backend ${res.status}`, path: segments.join('/') },
        { status: res.status },
      )
    }
  } catch (e) {
    return Response.json(
      { error: String(e), path: segments.join('/') },
      { status: 502 },
    )
  }
  return Response.json(emptyFallback(segments))
}

export async function POST(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const { search } = new URL(req.url)
  const segments = params.path
  let body: unknown = undefined
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    if (BACKEND) {
      const res = await fetch(targetUrl(segments, search), {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
      return Response.json(
        { error: `backend ${res.status}`, path: segments.join('/') },
        { status: res.status },
      )
    }
  } catch (e) {
    return Response.json(
      { error: String(e), path: segments.join('/') },
      { status: 502 },
    )
  }
  return Response.json({ ok: false, available: false })
}
