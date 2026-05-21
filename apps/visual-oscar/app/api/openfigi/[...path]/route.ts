/**
 * /api/openfigi/[...path] · OpenFIGI Bloomberg identifier mapping.
 *
 * Fuente: api.openfigi.com/v3/mapping (POST) + /search (POST).
 * Sin key: 25 req/min · con OPENFIGI_API_KEY: 250 req/min.
 *
 * Casos de uso:
 *   - Mapear ISIN/CUSIP/SEDOL → FIGI + ticker + exchange
 *   - Resolver ticker → company name + composite FIGI
 *   - Buscar empresas por nombre (search endpoint)
 *
 * Rutas:
 *   GET /api/openfigi/health
 *   GET /api/openfigi/lookup?type=ID_ISIN&value=ES0113900J37
 *     → resolver ISIN único
 *   GET /api/openfigi/search?q=Banco+Santander
 *     → búsqueda libre por nombre
 *
 * Cache HTTP 7d (mappings ISIN/FIGI son estables).
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 604800 // 7d

const OPENFIGI_API = 'https://api.openfigi.com/v3'

async function openfigiMapping(queries: Array<Record<string, any>>): Promise<any> {
  const apiKey = process.env.OPENFIGI_API_KEY
  try {
    const r = await fetch(`${OPENFIGI_API}/mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-OPENFIGI-APIKEY': apiKey } : {}),
      },
      body: JSON.stringify(queries),
      next: { revalidate: 604800 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

async function openfigiSearch(query: string): Promise<any> {
  const apiKey = process.env.OPENFIGI_API_KEY
  try {
    const r = await fetch(`${OPENFIGI_API}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-OPENFIGI-APIKEY': apiKey } : {}),
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 604800 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/openfigi/health
  if (action === 'health') {
    const hasKey = !!process.env.OPENFIGI_API_KEY
    const probe = await openfigiMapping([
      { idType: 'ID_ISIN', idValue: 'ES0113900J37' }, // Banco Santander
    ])
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      has_optional_key: hasKey,
      rate_limit: hasKey ? '250 req/min' : '25 req/min (sin key)',
      probe_status: probe.error ?? 'live',
      probe_results: Array.isArray(probe) ? probe[0]?.data?.length : null,
    })
  }

  // /api/openfigi/lookup?type=ID_ISIN&value=...
  if (action === 'lookup') {
    const idType = url.searchParams.get('type') || 'ID_ISIN'
    const idValue = url.searchParams.get('value')
    if (!idValue) {
      return NextResponse.json({ ok: false, error: 'value parameter required' })
    }
    const data = await openfigiMapping([{ idType, idValue }])
    if (data?.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OpenFIGI', data.error),
      })
    }
    const first = Array.isArray(data) ? data[0] : null
    return NextResponse.json({
      ok: true,
      id_type: idType,
      id_value: idValue,
      data_quality: quality('live', 'OpenFIGI'),
      n_results: first?.data?.length ?? 0,
      results: first?.data || [],
      warning: first?.warning,
      error: first?.error,
    })
  }

  // /api/openfigi/search?q=...
  if (action === 'search') {
    const q = url.searchParams.get('q')
    if (!q) {
      return NextResponse.json({ ok: false, error: 'q parameter required' })
    }
    const data = await openfigiSearch(q)
    if (data?.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OpenFIGI', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      q,
      data_quality: quality('live', 'OpenFIGI Search'),
      n_results: data?.data?.length ?? 0,
      results: data?.data || [],
      next_url: data?.next,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/openfigi/health',
        'GET /api/openfigi/lookup?type=ID_ISIN&value=ES0113900J37',
        'GET /api/openfigi/lookup?type=TICKER&value=SAN',
        'GET /api/openfigi/search?q=Banco+Santander',
      ],
      common_id_types: [
        'ID_ISIN', 'ID_BB_GLOBAL', 'ID_CUSIP', 'ID_SEDOL', 'TICKER', 'BASE_TICKER',
      ],
    },
    { status: 404 },
  )
}
