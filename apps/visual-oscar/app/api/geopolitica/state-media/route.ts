/**
 * Sprint G14 FASE 4 (ligera) · /api/geopolitica/state-media
 *
 * Devuelve los últimos N items de cada feed state-media catalogado, con tag
 * de régimen + país + caveat de fiabilidad. Cada item incluido server-side
 * con metadata MBFC mínima para evitar fetch async desde el cliente.
 *
 * Diseño defensivo:
 *  - Si rsshub.app cae o un feed da timeout, se devuelve array vacío sin
 *    romper el endpoint (silencio informativo)
 *  - Cache 6h por feed via Next fetch revalidate
 *  - Cap items por feed para no inflar payload
 *
 * Query:
 *   ?country=RUS,CHN     · filtra por ISO3
 *   ?regime=authoritarian· filtra por régimen
 *   ?language=es         · filtra por idioma
 *   ?limit_per_feed=10   · default 8, max 20
 */
import { NextResponse } from 'next/server'
import {
  STATE_MEDIA_FEEDS,
  STATE_MEDIA_CATALOG_VERSION,
  type StateMediaFeed,
} from '@/lib/geopolitica/state-media-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Parser RSS ligero · mismo patrón que el route principal de geopolitica. */
function parseRssLite(xml: string, max: number): Array<{ title: string; link: string; pubDate: string; description?: string }> {
  const out: Array<{ title: string; link: string; pubDate: string; description?: string }> = []
  if (!xml) return out
  // RSS 2.0
  const itemRx = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRx.exec(xml)) !== null && out.length < max) {
    const block = m[1]
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
      const mm = block.match(r)
      return mm ? mm[1].trim().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 350) : ''
    }
    const title = get('title')
    const link = get('link')
    const pubDate = get('pubDate') || get('dc:date')
    const description = get('description')
    if (title) out.push({ title, link, pubDate, description: description || undefined })
  }
  // Atom fallback
  if (out.length === 0) {
    const entryRx = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRx.exec(xml)) !== null && out.length < max) {
      const block = m[1]
      const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const linkM = block.match(/<link[^>]*href="([^"]+)"/i)
      const dateM = block.match(/<(?:updated|published)[^>]*>([\s\S]*?)<\/(?:updated|published)>/i)
      const summaryM = block.match(/<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/i)
      const title = titleM ? titleM[1].trim().replace(/<[^>]+>/g, '').slice(0, 350) : ''
      if (title) {
        out.push({
          title,
          link: linkM ? linkM[1] : '',
          pubDate: dateM ? dateM[1].trim() : '',
          description: summaryM ? summaryM[1].replace(/<[^>]+>/g, '').trim().slice(0, 350) : undefined,
        })
      }
    }
  }
  return out
}

async function fetchFeedItems(feed: StateMediaFeed, limit: number) {
  try {
    const r = await fetch(feed.feed_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      next: { revalidate: 21600 }, // 6h cache
      signal: AbortSignal.timeout(8000),
    } as RequestInit)
    if (!r.ok) return { items: [], error: `HTTP ${r.status}` }
    const xml = await r.text()
    return { items: parseRssLite(xml, limit), error: null }
  } catch (e) {
    return { items: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitPerFeed = Math.min(20, Math.max(1, Number(url.searchParams.get('limit_per_feed') || 8)))
  const countryFilter = url.searchParams.get('country')?.split(',').filter(Boolean).map((s) => s.trim().toUpperCase())
  const regimeFilter = url.searchParams.get('regime')
  const languageFilter = url.searchParams.get('language')

  let feeds = STATE_MEDIA_FEEDS.slice()
  if (countryFilter?.length) feeds = feeds.filter((f) => countryFilter.includes(f.country_iso3))
  if (regimeFilter) feeds = feeds.filter((f) => f.regime === regimeFilter)
  if (languageFilter) feeds = feeds.filter((f) => f.language === languageFilter)

  // Pull paralelo · cada feed independiente, fallos no contagian
  const results = await Promise.all(
    feeds.map(async (f) => {
      const { items, error } = await fetchFeedItems(f, limitPerFeed)
      return {
        feed_id: f.id,
        feed_name: f.name,
        country_iso3: f.country_iso3,
        country_name: f.country_name,
        language: f.language,
        regime: f.regime,
        press_freedom: f.press_freedom,
        via_rsshub: f.via_rsshub,
        relevance_to_spain: f.relevance_to_spain,
        reliability_note: f.reliability_note,
        topics: f.topics,
        items_count: items.length,
        items,
        fetch_status: error ? 'error' : 'ok',
        fetch_error: error,
      }
    }),
  )

  const totals = {
    n_feeds_requested: feeds.length,
    n_feeds_ok: results.filter((r) => r.fetch_status === 'ok').length,
    n_feeds_error: results.filter((r) => r.fetch_status === 'error').length,
    n_items_total: results.reduce((s, r) => s + r.items_count, 0),
    n_items_authoritarian: results
      .filter((r) => r.regime === 'authoritarian')
      .reduce((s, r) => s + r.items_count, 0),
  }

  return NextResponse.json(
    {
      ok: true,
      _meta: {
        source_mode: 'rss_media',
        layer: 'media_attention',
        version: STATE_MEDIA_CATALOG_VERSION,
        what_it_means:
          'Cobertura cruda de medios estatales / régimen autoritario sobre temas geopolíticos. Útil para detectar líneas oficiales y framing cross-país.',
        what_it_does_not_mean:
          'NO ES FUENTE FACTUAL. Cada item lleva caveat de régimen. NO usar como ground truth · usar SÓLO para análisis de narrativa.',
        warnings: [
          ...(totals.n_feeds_error > 0
            ? [`${totals.n_feeds_error}/${totals.n_feeds_requested} feeds fallaron (rsshub.app puede tener rate-limit · normal si caducó cache)`]
            : []),
          'Feeds vía rsshub.app son instancia pública · estabilidad no garantizada. Para producción robusta migrar a Docker self-host.',
        ],
      },
      totals,
      feeds: results,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600', // 3h fresh, 6h stale
      },
    },
  )
}
