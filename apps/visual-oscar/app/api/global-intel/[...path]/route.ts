/**
 * /api/global-intel/[...path] · Proxy catch-all server-side a las 10 fuentes
 * de etl/sources/global_intel/ y etl/sources/markets/.
 *
 * Diseñado para mantener UNA SOLA serverless function (Vercel Hobby limit)
 * mientras expone todos los endpoints útiles. Server-side fetch · ninguna
 * key llega al cliente.
 *
 * Rutas soportadas:
 *
 *   GET /api/global-intel/fred/snapshot
 *     → 10 indicadores macro USA top (GDP, UNRATE, CPI, DGS10, VIX, …)
 *
 *   GET /api/global-intel/fred/series/{series_id}?limit=50
 *     → Serie temporal FRED (ej. UNRATE, CPIAUCSL, GDP, DGS10)
 *
 *   GET /api/global-intel/wikidata/search?q=...&lang=es&limit=10
 *     → Búsqueda de entidades Wikidata (devuelve QIDs)
 *
 *   GET /api/global-intel/wikidata/politicians?country=Q29&limit=50
 *     → Políticos vivos del país (default Q29 España)
 *
 *   GET /api/global-intel/owid/indicator/{slug}?country=Spain
 *     → Serie OWID para indicador y país
 *
 *   GET /api/global-intel/sec-edgar/search?q=...&limit=20
 *     → SEC EDGAR full-text search
 *
 *   GET /api/global-intel/iati/spain-overview
 *     → Snapshot cooperación internacional ES (redirige a /api/iati/...)
 *
 *   GET /api/global-intel/owid/charts
 *     → Lista charts populares pre-mapeados
 *
 *   GET /api/global-intel/alpha-vantage/quote/{symbol}
 *     → Quote actual de un ticker (rate-limited 25/día)
 *
 * Cache HTTP varía por endpoint (FRED 12h, OWID 24h, Wikidata 24h,
 * SEC 6h, Alpha Vantage 15min, IATI 1h).
 *
 * Todos devuelven `{ data_quality: { source_type, source_name, note? } }`.
 */
import { NextResponse } from 'next/server'

export const revalidate = 0 // controlado por endpoint específico

const FRED_BASE = 'https://api.stlouisfed.org/fred'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'
const OWID_BASE = 'https://ourworldindata.org/grapher'
const EDGAR_SEARCH = 'https://efts.sec.gov/LATEST/search-index'
const AV_BASE = 'https://www.alphavantage.co/query'
const USER_AGENT = 'Politeia-Analitica/1.0 (https://politeia-visual-oscar.vercel.app)'

const POPULAR_INDICATORS = [
  'GDPC1', 'CPIAUCSL', 'UNRATE', 'DFF', 'DGS10',
  'DGS2', 'VIXCLS', 'DCOILWTICO', 'DEXUSEU', 'PAYEMS',
]

const OWID_POPULAR_CHARTS: Record<string, string> = {
  life_expectancy: 'life-expectancy',
  hdi: 'human-development-index',
  democracy_index: 'electoral-democracy',
  gdp_per_capita: 'gdp-per-capita-worldbank',
  corruption_perception: 'corruption-perception-index',
  press_freedom: 'press-freedom-index',
  gov_spending_gdp: 'share-of-government-spending-of-gdp',
  internet_users: 'share-of-individuals-using-the-internet',
  co2_emissions_per_capita: 'co-emissions-per-capita',
  income_inequality: 'income-inequality',
}

function quality(
  source_type: 'live' | 'cache' | 'missing' | 'rate_limited',
  source_name: string,
  note?: string,
) {
  return { source_type, source_name, ...(note ? { note } : {}) }
}

function missing(source: string, reason: string) {
  return NextResponse.json({
    ok: false,
    data_quality: quality('missing', source, reason),
    items: [],
  })
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segments = params.path || []
  const [source, action, ...rest] = segments

  try {
    // ─── FRED ────────────────────────────────────────────────────────
    if (source === 'fred') {
      const key = process.env.FRED_API_KEY
      if (!key) return missing('FRED', 'FRED_API_KEY no configurada')

      if (action === 'snapshot') {
        // Carga 10 series en paralelo · cache 12h
        const results = await Promise.all(
          POPULAR_INDICATORS.map(async (sid) => {
            try {
              const r = await fetch(
                `${FRED_BASE}/series/observations?series_id=${sid}&limit=1&sort_order=desc&api_key=${key}&file_type=json`,
                { next: { revalidate: 43200 } },
              )
              if (!r.ok) return null
              const j: any = await r.json()
              const obs = j?.observations?.[0]
              if (!obs) return null
              // metadata en otra call para title + units
              const rm = await fetch(
                `${FRED_BASE}/series?series_id=${sid}&api_key=${key}&file_type=json`,
                { next: { revalidate: 86400 } },
              )
              const meta: any = rm.ok ? (await rm.json())?.seriess?.[0] : null
              return {
                series_id: sid,
                title: meta?.title ?? sid,
                units: meta?.units_short ?? '',
                frequency: meta?.frequency_short ?? '',
                date: obs.date,
                value: obs.value !== '.' ? parseFloat(obs.value) : null,
              }
            } catch {
              return null
            }
          }),
        )
        const items = results.filter(Boolean)
        return NextResponse.json({
          ok: true,
          n_items: items.length,
          items,
          data_quality: quality('live', 'FRED', 'Cache 12h por serie.'),
        })
      }

      if (action === 'series' && rest[0]) {
        const seriesId = rest[0]
        const limit = parseInt(url.searchParams.get('limit') || '100', 10)
        const r = await fetch(
          `${FRED_BASE}/series/observations?series_id=${seriesId}&limit=${limit}&sort_order=desc&api_key=${key}&file_type=json`,
          { next: { revalidate: 43200 } },
        )
        if (!r.ok) return missing('FRED', `HTTP ${r.status}`)
        const j: any = await r.json()
        return NextResponse.json({
          ok: true,
          series_id: seriesId,
          n_obs: j?.observations?.length ?? 0,
          observations: j?.observations ?? [],
          data_quality: quality('live', 'FRED'),
        })
      }
    }

    // ─── Wikidata ────────────────────────────────────────────────────
    if (source === 'wikidata') {
      if (action === 'search') {
        const q = url.searchParams.get('q')
        const lang = url.searchParams.get('lang') || 'es'
        const limit = parseInt(url.searchParams.get('limit') || '10', 10)
        if (!q) return missing('Wikidata', 'param ?q requerido')
        const r = await fetch(
          `${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(q)}&language=${lang}&limit=${limit}&format=json`,
          { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } },
        )
        if (!r.ok) return missing('Wikidata', `HTTP ${r.status}`)
        const j: any = await r.json()
        return NextResponse.json({
          ok: true,
          n_items: (j?.search || []).length,
          items: (j?.search || []).map((h: any) => ({
            qid: h.id,
            label: h.label,
            description: h.description,
            url: h.concepturi,
          })),
          data_quality: quality('live', 'Wikidata'),
        })
      }

      if (action === 'politicians') {
        const country = url.searchParams.get('country') || 'Q29' // ES default
        const limit = parseInt(url.searchParams.get('limit') || '50', 10)
        const sparql = `
          SELECT ?p ?pLabel ?party ?partyLabel ?position ?positionLabel ?birth
          WHERE {
            ?p wdt:P31 wd:Q5;
               wdt:P27 wd:${country};
               wdt:P106 wd:Q82955.
            OPTIONAL { ?p wdt:P102 ?party. }
            OPTIONAL { ?p wdt:P39 ?position. }
            OPTIONAL { ?p wdt:P569 ?birth. }
            FILTER NOT EXISTS { ?p wdt:P570 ?death. }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
          }
          LIMIT ${limit}
        `
        const r = await fetch(
          `${WIKIDATA_SPARQL}?query=${encodeURIComponent(sparql)}&format=json`,
          { headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' }, next: { revalidate: 86400 } },
        )
        if (!r.ok) return missing('Wikidata SPARQL', `HTTP ${r.status}`)
        const j: any = await r.json()
        const items = (j?.results?.bindings || []).map((b: any) => ({
          qid: b.p?.value?.split('/').pop(),
          name: b.pLabel?.value,
          party: b.partyLabel?.value,
          position: b.positionLabel?.value,
          birth_date: (b.birth?.value || '').slice(0, 10) || null,
        }))
        return NextResponse.json({
          ok: true,
          country_qid: country,
          n_items: items.length,
          items,
          data_quality: quality('live', 'Wikidata SPARQL'),
        })
      }
    }

    // ─── OWID ────────────────────────────────────────────────────────
    if (source === 'owid') {
      if (action === 'charts') {
        return NextResponse.json({
          ok: true,
          n_items: Object.keys(OWID_POPULAR_CHARTS).length,
          items: Object.entries(OWID_POPULAR_CHARTS).map(([k, v]) => ({ slug: k, owid_slug: v })),
          data_quality: quality('live', 'OWID'),
        })
      }

      if (action === 'indicator' && rest[0]) {
        const indicator = rest[0]
        const country = url.searchParams.get('country') || 'Spain'
        const owidSlug = OWID_POPULAR_CHARTS[indicator] || indicator
        const r = await fetch(`${OWID_BASE}/${owidSlug}.csv`, {
          next: { revalidate: 86400 },
        })
        if (!r.ok) return missing('OWID', `chart "${owidSlug}" no encontrado (${r.status})`)
        const text = await r.text()
        const lines = text.split('\n').filter(Boolean)
        const header = lines.shift()?.split(',') || []
        const rows = lines
          .map((l) => l.split(','))
          .filter((cols) => cols[0]?.toLowerCase() === country.toLowerCase())
          .map((cols) => Object.fromEntries(header.map((h, i) => [h, cols[i]])))
        return NextResponse.json({
          ok: true,
          indicator,
          owid_slug: owidSlug,
          country,
          n_rows: rows.length,
          rows: rows.slice(-30),
          data_quality: quality('live', 'OWID'),
        })
      }
    }

    // ─── SEC EDGAR ───────────────────────────────────────────────────
    if (source === 'sec-edgar' && action === 'search') {
      const q = url.searchParams.get('q')
      const limit = parseInt(url.searchParams.get('limit') || '20', 10)
      if (!q) return missing('SEC EDGAR', 'param ?q requerido')
      const r = await fetch(
        `${EDGAR_SEARCH}?q=${encodeURIComponent(q)}&from=0&to=${limit - 1}`,
        { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 21600 } },
      )
      if (!r.ok) return missing('SEC EDGAR', `HTTP ${r.status}`)
      const j: any = await r.json()
      const hits = j?.hits?.hits || []
      return NextResponse.json({
        ok: true,
        n_items: hits.length,
        items: hits.map((h: any) => ({
          id: h._id,
          form: h._source?.form,
          company: (h._source?.display_names || ['?'])[0],
          cik: (h._source?.ciks || [null])[0],
          filed_at: h._source?.file_date,
        })),
        data_quality: quality('live', 'SEC EDGAR'),
      })
    }

    // ─── Alpha Vantage ───────────────────────────────────────────────
    if (source === 'alpha-vantage' && action === 'quote' && rest[0]) {
      const key = process.env.ALPHA_VANTAGE_KEY
      if (!key) return missing('Alpha Vantage', 'ALPHA_VANTAGE_KEY no configurada')
      const symbol = rest[0]
      const r = await fetch(
        `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`,
        { next: { revalidate: 900 } },
      )
      if (!r.ok) return missing('Alpha Vantage', `HTTP ${r.status}`)
      const j: any = await r.json()
      const q = j?.['Global Quote']
      if (!q || !q['05. price']) {
        return missing('Alpha Vantage', j?.Note ? 'rate limit (25/día)' : 'ticker no encontrado')
      }
      return NextResponse.json({
        ok: true,
        symbol: q['01. symbol'] ?? symbol,
        price: parseFloat(q['05. price']),
        change: parseFloat(q['09. change'] || '0'),
        change_percent: q['10. change percent'],
        latest_trading_day: q['07. latest trading day'],
        data_quality: quality('live', 'Alpha Vantage'),
      })
    }

    // ─── IATI · redirige al endpoint dedicado ───────────────────────
    if (source === 'iati') {
      // Recomendado: usar /api/iati/spain-overview directamente
      return NextResponse.json({
        ok: false,
        redirect_to: '/api/iati/spain-overview',
        message: 'IATI tiene endpoint propio · usa /api/iati/spain-overview',
      })
    }

    // Fallback · ruta desconocida
    return NextResponse.json({
      ok: false,
      available_sources: [
        'fred/snapshot',
        'fred/series/{series_id}',
        'wikidata/search?q=...',
        'wikidata/politicians?country=Q29',
        'owid/charts',
        'owid/indicator/{slug}?country=Spain',
        'sec-edgar/search?q=...',
        'alpha-vantage/quote/{symbol}',
      ],
      received: segments.join('/'),
    }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: String(e?.message ?? e).slice(0, 200),
      data_quality: quality('missing', 'global-intel'),
    }, { status: 502 })
  }
}
