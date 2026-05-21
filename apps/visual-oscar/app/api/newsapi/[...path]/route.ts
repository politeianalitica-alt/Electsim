/**
 * /api/newsapi/[...path] · NewsAPI headlines globales.
 *
 * Fuente: newsapi.org · 100+ países, 80+ idiomas, hundreds of sources.
 * Free tier: 100 req/día · paid: scale.
 *
 * Rutas:
 *   GET /api/newsapi/health
 *   GET /api/newsapi/top-spain?pageSize=15
 *     → Headlines top España (es-ES)
 *   GET /api/newsapi/top-world?pageSize=15
 *     → Headlines top globales (en)
 *   GET /api/newsapi/everything?q=...&from=...&pageSize=...
 *     → Búsqueda libre con NLP query syntax
 *
 * Auth: NEWSAPI_KEY como query param `apiKey=...` o header X-Api-Key.
 * Cache HTTP 30 min (news changes fast).
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 1800

const NEWSAPI_BASE = 'https://newsapi.org/v2'

async function newsapiFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) return { error: 'no_api_key' }
  const qs = new URLSearchParams({ ...params, apiKey })
  try {
    const r = await fetch(`${NEWSAPI_BASE}${path}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 401) return { error: 'unauthorized' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function mapArticle(a: any) {
  return {
    title: a.title,
    description: a.description,
    url: a.url,
    image: a.urlToImage,
    source: a.source?.name,
    author: a.author,
    published: a.publishedAt,
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/newsapi/health
  if (action === 'health') {
    const hasKey = !!process.env.NEWSAPI_KEY
    if (!hasKey) {
      return NextResponse.json({
        ok: false,
        has_api_key: false,
        hint: 'Configura NEWSAPI_KEY · newsapi.org/register',
      })
    }
    const probe = await newsapiFetch('/top-headlines', { country: 'es', pageSize: '1' })
    return NextResponse.json({
      ok: !probe.error,
      has_api_key: true,
      probe_status: probe.error ?? 'live',
      probe_total: probe?.totalResults ?? null,
    })
  }

  // /api/newsapi/top-spain
  if (action === 'top-spain') {
    const pageSize = url.searchParams.get('pageSize') || '15'
    const category = url.searchParams.get('category') || ''
    const data = await newsapiFetch('/top-headlines', {
      country: 'es',
      pageSize,
      ...(category ? { category } : {}),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'NewsAPI', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      country: 'es',
      data_quality: quality('live', 'NewsAPI · top-headlines ES'),
      total_results: data.totalResults,
      n_items: (data.articles || []).length,
      items: (data.articles || []).map(mapArticle),
    })
  }

  // /api/newsapi/top-world
  if (action === 'top-world') {
    const pageSize = url.searchParams.get('pageSize') || '15'
    const data = await newsapiFetch('/top-headlines', {
      language: 'en',
      pageSize,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'NewsAPI', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'NewsAPI · top-headlines world'),
      total_results: data.totalResults,
      n_items: (data.articles || []).length,
      items: (data.articles || []).map(mapArticle),
    })
  }

  // /api/newsapi/everything?q=...
  if (action === 'everything') {
    const q = url.searchParams.get('q') || ''
    if (!q) {
      return NextResponse.json({ ok: false, error: 'q parameter required' })
    }
    const pageSize = url.searchParams.get('pageSize') || '20'
    const sortBy = url.searchParams.get('sortBy') || 'publishedAt'
    const from = url.searchParams.get('from') || ''
    const language = url.searchParams.get('language') || 'es'
    const data = await newsapiFetch('/everything', {
      q, pageSize, sortBy, language,
      ...(from ? { from } : {}),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'NewsAPI', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      q,
      data_quality: quality('live', 'NewsAPI · everything'),
      total_results: data.totalResults,
      n_items: (data.articles || []).length,
      items: (data.articles || []).map(mapArticle),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/newsapi/health',
        'GET /api/newsapi/top-spain?pageSize=15&category=business|politics|technology',
        'GET /api/newsapi/top-world?pageSize=15',
        'GET /api/newsapi/everything?q=España+elecciones&pageSize=20&sortBy=publishedAt',
      ],
    },
    { status: 404 },
  )
}
