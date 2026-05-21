/**
 * /api/gdelt/[...path] · GDELT DOC API 2.0 — cobertura global multilingüe.
 *
 * Fuente: api.gdeltproject.org/api/v2/doc/doc
 * Sin auth · gratuita · global · 65+ idiomas · 5min update lag.
 *
 * GDELT cubre TV news + worldwide press en tiempo real con tone -10..+10,
 * themes detectados, ubicaciones, organizaciones, personas mencionadas.
 *
 * Rutas:
 *   GET /api/gdelt/health
 *   GET /api/gdelt/articles?query=X&timespan=24h&maxrows=50
 *     → search articles globally
 *   GET /api/gdelt/timeline?query=X&timespan=7d
 *     → timeline volume per day
 *   GET /api/gdelt/tone?query=X&timespan=7d
 *     → tone evolution (sentiment GDELT -10..+10)
 *
 * Timespan formats: 1h, 24h, 7d, 1mon, 3mon, 6mon, 1y, 5y, ALL
 * Doc API docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 300 // 5min — GDELT updates rápido

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'

async function gdeltFetch(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString()
  try {
    const r = await fetch(`${GDELT_BASE}?${qs}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)',
      },
      next: { revalidate: 300 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const text = await r.text()
    if (!text || text.trim().length === 0) return { error: 'empty body' }
    try {
      return JSON.parse(text)
    } catch {
      return { error: 'invalid json · GDELT may have returned HTML for invalid query' }
    }
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

  if (action === 'health') {
    const probe = await gdeltFetch({ query: 'Spain', mode: 'ArtList', maxrecords: '1', format: 'json' })
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      backend: 'GDELT DOC API 2.0',
      probe_status: probe.error ?? 'live',
      probe_n_articles: probe?.articles?.length ?? null,
    })
  }

  // /api/gdelt/articles · search articles globally
  if (action === 'articles') {
    const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '24h'
    const maxrows = url.searchParams.get('maxrows') || '50'
    const sourcelang = url.searchParams.get('sourcelang') || ''
    const sort = url.searchParams.get('sort') || 'datedesc'
    const data = await gdeltFetch({
      query,
      mode: 'ArtList',
      maxrecords: maxrows,
      format: 'json',
      timespan,
      sort,
      ...(sourcelang ? { sourcelang } : {}),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT DOC API', data.error),
      })
    }
    const articles = (data.articles || []).map((a: any) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      language: a.language,
      sourcecountry: a.sourcecountry,
      seendate: a.seendate,
      socialimage: a.socialimage,
    }))
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT DOC API 2.0'),
      n_articles: articles.length,
      articles,
    })
  }

  // /api/gdelt/timeline · volumen agregado por día
  if (action === 'timeline') {
    const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '7d'
    const data = await gdeltFetch({
      query,
      mode: 'TimelineVol',
      format: 'json',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT DOC API', data.error),
      })
    }
    const timeline = (data.timeline?.[0]?.data || []).map((p: any) => ({
      date: p.date,
      value: p.value,
    }))
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT TimelineVol'),
      n_points: timeline.length,
      timeline,
    })
  }

  // /api/gdelt/tone · evolución del tono (-10..+10 GDELT scale)
  if (action === 'tone') {
    const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '7d'
    const data = await gdeltFetch({
      query,
      mode: 'TimelineTone',
      format: 'json',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT DOC API', data.error),
      })
    }
    const timeline = (data.timeline?.[0]?.data || []).map((p: any) => ({
      date: p.date,
      tone: p.value,
    }))
    const avgTone = timeline.length ? timeline.reduce((s: number, p: any) => s + p.tone, 0) / timeline.length : null
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT TimelineTone'),
      n_points: timeline.length,
      avg_tone: avgTone,
      timeline,
      methodology: 'GDELT tone -10 (very negative) a +10 (very positive) · agregado mediante NLP propia GDELT',
    })
  }

  // /api/gdelt/sources · ranking de medios cubriendo el tema
  if (action === 'sources') {
    const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '24h'
    const data = await gdeltFetch({
      query,
      mode: 'TimelineSourceCountry',
      format: 'json',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT DOC API', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT TimelineSourceCountry'),
      timeline: data.timeline || [],
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/gdelt/health',
        'GET /api/gdelt/articles?query=España+crisis&timespan=24h&maxrows=50&sort=datedesc',
        'GET /api/gdelt/timeline?query=España&timespan=7d  · volume per day',
        'GET /api/gdelt/tone?query=España&timespan=7d      · tone -10..+10',
        'GET /api/gdelt/sources?query=España&timespan=24h  · source country ranking',
      ],
      docs: 'https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/',
    },
    { status: 404 },
  )
}
