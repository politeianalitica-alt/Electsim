/**
 * Catch-all proxy/handler para `/api/v1/ports/*`.
 *
 * Modos:
 *  1. **Backend Python disponible** (BACKEND_URL configurado) · forward 1:1
 *  2. **Standalone** (sin BACKEND_URL) · sirve datos desde lib/ports-handlers.ts
 *     - Catálogos seed embebidos (40 puertos, 50 vessels, 6 freight, 6 chokepoints)
 *     - Fetch directo a APIs públicas (World Bank, ECB, GLEIF, GPSJam, EMSC, GIE)
 *
 * Esto garantiza que /puertos NUNCA esté vacío, incluso sin backend desplegado.
 */

import * as H from '@/lib/ports-handlers'

const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export const revalidate = 0

function targetUrl(pathSegments: string[], search: string): string {
  const path = pathSegments.map(encodeURIComponent).join('/')
  return `${BACKEND}/api/v1/ports/${path}${search}`
}

// ─────────────────────────────────────────────────────────────────
// Standalone router · ejecuta cuando NO hay BACKEND_URL
// ─────────────────────────────────────────────────────────────────

async function standaloneGet(
  segments: string[],
  params: URLSearchParams,
): Promise<unknown> {
  const [head, ...rest] = segments

  // Catálogos
  if (head === 'catalog' && rest[0] === 'vessels') return H.catalogVessels(params)
  if (head === 'catalog') return H.catalogPorts(params)
  if (head === 'snapshot-all') return H.snapshotAll(params)
  if (head === 'data-sources' && rest[0] === 'status') return H.dataSourcesStatus()

  // Vessels endpoints · ficha + sisters + anomalies + flag-history (Sprint 2 Fase F)
  if (head === 'vessels' && rest.length >= 1) {
    const imo = rest[0]
    const action = rest[1]
    if (!action) return wrap404(H.vesselLookup(imo))
    if (action === 'track') return wrap404(H.vesselTrack(imo, params))
    if (action === 'screen') return wrap404(H.vesselScreen(imo))
    if (action === 'sisters') return wrap404(H.vesselSisters(imo))
    if (action === 'anomalies') return wrap404(H.vesselAnomalies(imo))
    if (action === 'flag-history') return wrap404(H.vesselFlagHistory(imo))
  }

  // Trade
  if (head === 'trade') {
    const action = rest[0]
    if (action === 'bilateral') return H.tradeBilateral(params)
    if (action === 'spain-flows') return H.tradeSpainFlows(params)
    if (action === 'top-partners') return H.tradeTopPartners(params)
  }

  // Freight
  if (head === 'freight') {
    const action = rest[0]
    if (action === 'snapshot') return H.freightSnapshot()
    if (action === 'world-bank' && rest.length === 1) return H.worldBankSnapshot()
    if (action === 'world-bank' && rest[1]) return wrap404(await H.worldBankSeries(rest[1], params))
    if (action && rest[1] === 'price') return wrap404(H.freightPrice(action, params))
  }

  // Chokepoints
  if (head === 'chokepoints' && rest.length === 0) return H.chokepointsList(params)
  if (head === 'chokepoints' && rest[0]) return wrap404(H.chokepointDetail(rest[0], params))

  // Macro / Corporate / Energy / Risk
  if (head === 'macro' && rest[0] === 'ecb' && rest[1] === 'fx' && rest[2]) {
    return H.ecbFx(rest[2], params)
  }
  if (head === 'corporate' && rest[0] === 'gleif' && rest[1] === 'search') {
    return H.gleifSearch(params)
  }
  if (head === 'gnss' && rest[0] === 'jamming' && rest[1] === 'latest') {
    return H.gpsjamLatest()
  }
  if (head === 'seismic' && rest[0] === 'recent') {
    return H.seismicRecent(params)
  }
  if (head === 'energy' && rest[0] === 'gas-storage') {
    return H.gasStorageEu()
  }

  // Sprint 2 Fase D · navieras + rutas
  if (head === 'shipping-lines' && rest.length === 0) {
    return H.shippingLinesList(params)
  }
  if (head === 'shipping-lines' && rest[0] && rest.length === 1) {
    return wrap404(H.shippingLineDetail(rest[0]))
  }
  if (head === 'carrier-services' && rest.length === 0) {
    return H.carrierServicesList(params)
  }
  if (head === 'routes' && rest.length === 0) {
    return H.shippingRoutes(params)
  }

  // Sanciones consolidadas · no implementadas standalone (XMLs grandes)
  if (head === 'sanctions' && rest[0] === 'consolidated') {
    return {
      ok: false,
      reason: 'OFAC/EU/UN consolidated requiere backend Python (XMLs >10MB).',
      items: [],
    }
  }

  // Port slug endpoints · /{slug}, /{slug}/vessels, /{slug}/calls, /{slug}/congestion,
  //                       /{slug}/terminals, /{slug}/traffic, /{slug}/connectivity
  if (segments.length === 1) return wrap404(H.portOverview(head))
  if (segments.length === 2) {
    const slug = head
    const action = rest[0]
    if (action === 'vessels') return wrap404(H.portVessels(slug, params))
    if (action === 'calls') return wrap404(H.portCalls(slug, params))
    if (action === 'congestion') return wrap404(H.portCongestion(slug, params))
    if (action === 'terminals') return wrap404(H.portTerminals(slug, params))
    if (action === 'traffic') return wrap404(H.portTraffic(slug, params))
    if (action === 'connectivity') return wrap404(H.portConnectivity(slug, params))
  }

  return { ok: false, available: false, items: [] }
}

function wrap404(result: any): any {
  if (result && result.__404) {
    return { ok: false, status: 404, error: 'not found', items: [] }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segments = params.path

  // 1. Backend Python disponible → forward
  if (BACKEND) {
    try {
      const res = await fetch(targetUrl(segments, url.search), {
        headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
      if (res.status === 404) {
        return Response.json({ error: 'no encontrado', path: segments.join('/') }, { status: 404 })
      }
      // Otros códigos → cae a standalone para no romper UX
    } catch {
      // Network error → standalone
    }
  }

  // 2. Standalone fallback
  try {
    const result = await standaloneGet(segments, url.searchParams)
    if (result && (result as any).status === 404) {
      return Response.json(result, { status: 404 })
    }
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: String(e), path: segments.join('/') }, { status: 502 })
  }
}

// ─────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segments = params.path
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  if (BACKEND) {
    try {
      const res = await fetch(targetUrl(segments, url.search), {
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
    } catch {
      // fall through
    }
  }

  // Standalone POST · sólo sanctions/screen
  if (segments[0] === 'sanctions' && segments[1] === 'screen') {
    return Response.json(H.sanctionsScreen(body))
  }
  return Response.json({ ok: false, available: false })
}
