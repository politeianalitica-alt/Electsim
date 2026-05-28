/**
 * /api/geopolitica/conflict-news/[iso3] · Sprint G16 item 5
 *
 * Devuelve noticias recientes (GDELT DOC v2) sobre el conflicto del país,
 * para el sub-tab "Noticias" del drawer de Conflictos. El usuario reportó
 * que en el drawer de Etiopía aparecía "Datos insuficientes para timeline"
 * cuando GDELT no traía suficiente serie diaria. Esta ruta complementa
 * con una lista de artículos para "seguir la actualidad del conflicto".
 *
 * Estrategia de query:
 *   - Sin theme filter (más permisivo · captura más cobertura).
 *   - Query principal: nombre_en del país.
 *   - Si tenemos seed UCDP, añadir conflict_label como segundo término OR.
 *   - timespan 7d, sort=datedesc, maxrecords default 20 (configurable).
 *
 * Cache: s-maxage=600 (10 min, noticias se mueven rápido).
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate, clampGdeltTone } from '@/lib/gdelt/build-query'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getUcdpConflictByIso } from '@/lib/geopolitica/ucdp-active-conflicts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface Article {
  title: string
  url: string
  domain: string
  language?: string
  sourcecountry?: string
  seendate?: string
  tone?: number
}

interface GdeltDocArticle {
  title?: string
  url?: string
  domain?: string
  language?: string
  sourcecountry?: string
  seendate?: string
  tone?: number
}

export async function GET(
  req: NextRequest,
  { params }: { params: { iso3: string } },
) {
  const startedAt = new Date().toISOString()
  const iso3 = (params.iso3 || '').toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json(
      { ok: false, error: `iso3_unknown · ${iso3} no en catálogo`, articles: [] },
      { status: 404 },
    )
  }
  const limit = Math.min(
    50,
    Math.max(5, Number(req.nextUrl.searchParams.get('limit') ?? 20)),
  )
  const timespan = req.nextUrl.searchParams.get('timespan') || '7d'

  // Construir query: nombre_en + (opcional) conflict_label del seed UCDP
  const seed = getUcdpConflictByIso(iso3)
  let query = `"${coord.name_en}"`
  if (seed) {
    // El conflict_label contiene términos específicos del conflicto · útil para
    // recuperar artículos sobre actores armados, no genéricos del país.
    const label = seed.conflict_label.replace(/['"`]/g, '')
    query = `${query} OR "${label}"`
  }

  // GDELT DOC artlist sin theme filter (más permisivo)
  const url = buildGdeltDocUrl({
    query,
    timespan,
    mode: 'artlist',
    maxrecords: limit,
    sort: 'datedesc',
  })

  try {
    const json = await fetchGdeltJson<{ articles?: GdeltDocArticle[] }>(url, {
      timeoutMs: 10_000,
      maxRetries: 1,
    })

    const raw = json?.articles ?? []
    const articles: Article[] = raw
      .filter((a) => a.title && a.url)
      .map((a) => ({
        title: String(a.title || '').slice(0, 300),
        url: String(a.url || ''),
        domain: String(a.domain || ''),
        language: a.language,
        sourcecountry: a.sourcecountry,
        seendate: normalizeGdeltDate(a.seendate),
        tone: typeof a.tone === 'number' ? clampGdeltTone(a.tone) : undefined,
      }))

    return NextResponse.json(
      {
        ok: true,
        iso3,
        country: coord.name_es,
        query_used: query,
        timespan,
        n_articles: articles.length,
        articles,
        fetched_at: startedAt,
        _meta: {
          source: 'GDELT DOC v2 artlist',
          source_url: 'https://api.gdeltproject.org/api/v2/doc/doc',
          seed_label_used: seed?.conflict_label || null,
          cache_ttl_seconds: 600,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      },
    )
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      iso3,
      country: coord.name_es,
      articles: [],
      error:
        err instanceof Error
          ? err.message.slice(0, 200)
          : 'gdelt_fetch_failed',
      _meta: {
        source: 'GDELT DOC v2 artlist',
        suggestion: 'GDELT rate-limited o sin cobertura. Reintentar en 5 min.',
      },
    })
  }
}
