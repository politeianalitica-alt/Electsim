/**
 * /api/factcheck/[...path] · Google Fact Check Tools API.
 *
 * Fuente: factchecktools.googleapis.com/v1alpha1/claims:search
 * Auth: GOOGLE_FACTCHECK_KEY (Google Cloud · API key)
 * Activación: https://developers.google.com/fact-check/tools/api
 *
 * Indexa claims verificados por +90 organizaciones de fact-checking
 * mundiales (incluyendo Maldita, Newtral, EFE Verifica, Verificat ES).
 *
 * Rutas:
 *   GET /api/factcheck/health
 *   GET /api/factcheck/search?query=X&languageCode=es&pageSize=20
 *     → claims verificados
 *   GET /api/factcheck/by-publisher?domain=newtral.es
 *     → claims de un publisher concreto (filtro client-side)
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 3600 // 1h

const FACTCHECK_BASE = 'https://factchecktools.googleapis.com/v1alpha1/claims:search'

async function factcheckFetch(params: Record<string, string>): Promise<any> {
  const apiKey = process.env.GOOGLE_FACTCHECK_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) return { error: 'no_api_key' }
  const qs = new URLSearchParams({ ...params, key: apiKey })
  try {
    const r = await fetch(`${FACTCHECK_BASE}?${qs}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)',
      },
      next: { revalidate: 3600 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 401 || r.status === 403) return { error: 'unauthorized' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function mapClaim(c: any) {
  const review = (c.claimReview || [])[0] || {}
  return {
    text: c.text,
    claimant: c.claimant,
    claimDate: c.claimDate,
    publisher: {
      name: review.publisher?.name,
      site: review.publisher?.site,
    },
    review_url: review.url,
    review_title: review.title,
    review_date: review.reviewDate,
    rating: review.textualRating,
    language: review.languageCode,
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    const hasKey = !!(process.env.GOOGLE_FACTCHECK_KEY || process.env.GOOGLE_API_KEY)
    if (!hasKey) {
      return NextResponse.json({
        ok: false,
        has_api_key: false,
        hint: 'Configura GOOGLE_FACTCHECK_KEY · Google Cloud Console → APIs & Services → Library → Fact Check Tools API',
        registration_url: 'https://developers.google.com/fact-check/tools/api',
      })
    }
    const probe = await factcheckFetch({ query: 'España', languageCode: 'es', pageSize: '1' })
    return NextResponse.json({
      ok: !probe.error,
      has_api_key: true,
      probe_status: probe.error ?? 'live',
      probe_n_claims: probe?.claims?.length ?? 0,
    })
  }

  if (action === 'search') {
    const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
    const languageCode = url.searchParams.get('languageCode') || 'es'
    const pageSize = url.searchParams.get('pageSize') || '20'
    const maxAgeDays = url.searchParams.get('maxAgeDays') || ''
    const data = await factcheckFetch({
      query, languageCode, pageSize,
      ...(maxAgeDays ? { maxAgeDays } : {}),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        query,
        data_quality: quality('missing', 'Google Fact Check Tools', data.error),
        ...(data.error === 'no_api_key' ? {
          activation_steps: [
            '1. Crea proyecto Google Cloud + activa Fact Check Tools API',
            '2. Genera API key restringida a este API',
            '3. Añade GOOGLE_FACTCHECK_KEY a Vercel env vars',
          ],
        } : {}),
      })
    }
    const claims = (data.claims || []).map(mapClaim)
    return NextResponse.json({
      ok: true,
      query,
      languageCode,
      data_quality: quality('live', 'Google Fact Check Tools API'),
      n_claims: claims.length,
      claims,
    })
  }

  if (action === 'by-publisher') {
    const domain = url.searchParams.get('domain') || ''
    const query = url.searchParams.get('query') || 'España'
    if (!domain) return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 })
    const data = await factcheckFetch({ query, languageCode: 'es', pageSize: '50' })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Google Fact Check Tools', data.error),
      })
    }
    const filtered = (data.claims || [])
      .map(mapClaim)
      .filter((c: any) => c.publisher?.site?.includes(domain))
    return NextResponse.json({
      ok: true,
      query, domain,
      data_quality: quality('live', `Google Fact Check · ${domain}`),
      n_claims: filtered.length,
      claims: filtered,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/factcheck/health',
        'GET /api/factcheck/search?query=España&languageCode=es&pageSize=20',
        'GET /api/factcheck/by-publisher?domain=newtral.es&query=Sánchez',
      ],
      docs: 'https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search',
    },
    { status: 404 },
  )
}
