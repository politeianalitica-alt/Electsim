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

/**
 * Sprint G14 FASE 4 cont · scoring de relevancia España.
 *
 * Cada item del feed se escanea contra keywords ES (multilenguaje) y devuelve
 * un score 0..3 + categorías matched. Esto permite filtrar la avalancha
 * estatal por "qué está diciendo Pekín/Moscú sobre nuestros temas".
 *
 * Patrones · case-insensitive + multilenguaje (EN/ES/AR/ZH transliterado donde aplica):
 *  - Spain directa: España, Spain, Espagne, Spagna, Espanha, 西班牙
 *  - Territorios España: Catalunya/Catalonia, Sáhara/Sahara, Ceuta, Melilla, Canarias, Baleares
 *  - Vecinos críticos: Marruecos/Morocco/Maghreb, Argelia/Algeria, Portugal
 *  - Bloques ES: UE/EU, OTAN/NATO + Spain co-mention
 *  - Figuras gobierno ES (Sanchez/Albares/Felipe VI)
 *  - Idiomas hispanos LATAM: Venezuela/Cuba/Mexico/Argentina/Colombia (cobertura desde régimen)
 */
const SPAIN_DIRECT_RX = /\b(espa[ñn]a|spain|espagne|spagna|espanha|西班牙|إسبانيا|испания)\b/i
const SPAIN_TERRITORY_RX = /\b(catalu[ñn]a|catalonia|s[áa]hara|sahara|ceuta|melilla|canarias|baleares|gibraltar|euskadi|basque)\b/i
const SPAIN_NEIGHBOR_RX = /\b(marruecos|morocco|maroc|maghreb|magreb|argelia|algeria|alg[ée]rie|portugal|francia\s+y\s+espa[ñn]a)\b/i
const SPAIN_FIGURES_RX = /\b(s[áa]nchez|albares|aagesen|borrell|moncloa|maec|felipe\s+vi|cuerpo)\b/i
const LATAM_HISPANIC_RX = /\b(venezuela|cuba|m[ée]xico|mexico|argentina|colombia|per[uú]|chile|ecuador|bolivia)\b/i

interface SpainRelevance {
  score: number // 0..3 ranking
  matched: string[] // categorías matched
}

function scoreSpainRelevance(title: string, description?: string): SpainRelevance {
  const text = `${title} ${description || ''}`.toLowerCase()
  const matched: string[] = []
  let score = 0
  if (SPAIN_DIRECT_RX.test(text)) { matched.push('españa'); score += 3 }
  if (SPAIN_TERRITORY_RX.test(text)) { matched.push('territorio_es'); score += 3 }
  if (SPAIN_FIGURES_RX.test(text)) { matched.push('gobierno_es'); score += 3 }
  if (SPAIN_NEIGHBOR_RX.test(text)) { matched.push('vecino'); score += 1 }
  if (LATAM_HISPANIC_RX.test(text)) { matched.push('latam_hispana'); score += 1 }
  // Cap
  return { score: Math.min(3, score), matched }
}

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
    const raw = parseRssLite(xml, limit)
    // Sprint G14 FASE 4 cont · enriquecer cada item con score de relevancia ES
    const items = raw.map((it) => ({
      ...it,
      spain_relevance: scoreSpainRelevance(it.title, it.description),
    }))
    return { items, error: null }
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

  // Sprint G14 FASE 4 cont · agregados de relevancia España cross-feeds
  const allItems = results.flatMap((r) => r.items.map((it: any) => ({
    ...it,
    feed_id: r.feed_id,
    feed_name: r.feed_name,
    country_iso3: r.country_iso3,
    regime: r.regime,
  })))
  const esRelevant = allItems.filter((it: any) => it.spain_relevance?.score >= 1)
  const esCritical = allItems.filter((it: any) => it.spain_relevance?.score >= 3)

  const totals = {
    n_feeds_requested: feeds.length,
    n_feeds_ok: results.filter((r) => r.fetch_status === 'ok').length,
    n_feeds_error: results.filter((r) => r.fetch_status === 'error').length,
    n_items_total: results.reduce((s, r) => s + r.items_count, 0),
    n_items_authoritarian: results
      .filter((r) => r.regime === 'authoritarian')
      .reduce((s, r) => s + r.items_count, 0),
    n_items_es_relevant: esRelevant.length,
    n_items_es_critical: esCritical.length,
  }

  // Top items relevantes ES · pre-sorted para que la UI no tenga que filtrar
  const es_relevant_items_top = esRelevant
    .sort((a: any, b: any) => (b.spain_relevance.score - a.spain_relevance.score))
    .slice(0, 20)

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
      es_relevant_items_top,
      feeds: results,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600', // 3h fresh, 6h stale
      },
    },
  )
}
