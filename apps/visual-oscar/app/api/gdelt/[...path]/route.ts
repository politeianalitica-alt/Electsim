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

// GDELT rate-limits agresivamente (1 req/5s por bloque IP). Cache 1h
// para minimizar hits y poder servir desde caché en producción.
export const revalidate = 3600

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'
const GDELT_SUMMARY_BASE = 'https://api.gdeltproject.org/api/v2/summary/summary'
const GDELT_TV_BASE = 'https://api.gdeltproject.org/api/v2/tv/tv'

// ─── GKG Themes catalog (Sprint G12) ─────────────────────────────────
// Subset curado de GDELT GKG themes útiles para geopolítica / política.
// El usuario puede pasar uno o varios separados por coma · combinamos
// con OR dentro del query GDELT (theme:X OR theme:Y) AND original_q.
// Lista completa: http://data.gdeltproject.org/api/v2/guides/LOOKUP-GKGTHEMES.TXT
const GKG_THEMES_CATALOG: Record<string, string> = {
  // Conflicto y seguridad
  INTERNAL_CONFLICT:      'Internal political conflict (civil war, insurgency)',
  EXTERNAL_RELATIONS:     'Diplomacy, foreign relations, treaties',
  PROTEST:                'Protests, demonstrations, civil unrest',
  TERROR:                 'Terrorism, attacks, militant groups',
  KILL:                   'Killings, deaths, casualties',
  WOUND:                  'Wounding, injuries',
  MILITARY:               'Military operations, deployments',
  ARMEDCONFLICT:          'Armed conflict events',
  WAR_OFFENSIVE:          'Military offensives',
  NATO_MILITARY:          'NATO military activity',
  GENERAL_GOVERNMENT:     'Government activity general',
  // Política
  ELECTION_FRAUD:         'Election fraud allegations',
  GOV_DICTATORSHIP:       'Authoritarian governance',
  GOV_DIVISIONOFPOWERS:   'Separation of powers issues',
  REBELLION:              'Rebellion, uprising',
  COUP:                   'Coup d\'état',
  // Económico/financiero
  ECON_INFLATION:         'Inflation',
  ECON_RECESSION:         'Recession',
  ECON_UNEMPLOYMENT:      'Unemployment',
  ECON_SUBSIDIES:         'Subsidies, fiscal aid',
  ECON_DEVELOPMENTORGS:   'IMF/World Bank/development orgs',
  ECON_BANKRUPTCY:        'Bankruptcies',
  ECON_TRADE_DISPUTE:     'Trade disputes, tariffs',
  // Migración / fronteras
  MIGRATION:              'Migration flows',
  REFUGEES:               'Refugees, displacement',
  HUMAN_TRAFFICKING:      'Human trafficking',
  BORDER:                 'Border issues, security',
  // Energía / commodities
  ENV_OIL:                'Oil sector',
  ENV_GAS:                'Natural gas sector',
  ENV_NUCLEARPOWER:       'Nuclear power',
  ENV_RENEWABLEENERGY:    'Renewable energy',
  COMMODITY_PRICES:       'Commodity price movements',
  // Tech / ciber
  CYBER:                  'Cyber attacks, cyber security',
  TECH_AI:                'Artificial intelligence',
  TECH_SOCIAL_MEDIA:      'Social media activity',
  // Sanitario
  EPIDEMIC:               'Disease outbreaks, epidemics',
  // Sanciones
  SANCTIONS:              'Economic sanctions',
}

// Helper · construye sub-query GDELT con themes opcionales.
// theme="INTERNAL_CONFLICT,PROTEST" → "(theme:INTERNAL_CONFLICT OR theme:PROTEST)"
function buildThemeFilter(themesStr: string): string {
  if (!themesStr) return ''
  const themes = themesStr.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
  if (themes.length === 0) return ''
  if (themes.length === 1) return `theme:${themes[0]}`
  return `(${themes.map((t) => `theme:${t}`).join(' OR ')})`
}

// Combina theme filter + query libre en un solo string GDELT
function applyThemes(baseQuery: string, themesStr: string): string {
  const tf = buildThemeFilter(themesStr)
  if (!tf) return baseQuery
  if (!baseQuery || baseQuery.trim() === '') return tf
  return `${tf} ${baseQuery}`
}

// ─── TV API fetcher (Sprint G12) ──────────────────────────────────────
// GDELT TV API monitorea broadcasts de news (CNN, Fox, BBC, MSNBC, etc.).
// Útil para narrative tracking que NO aparece en web articles (TV diferente).
async function gdeltTvFetch(params: Record<string, string>, attempt = 1): Promise<any> {
  const qs = new URLSearchParams({ ...params, format: 'json' }).toString()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const r = await fetch(`${GDELT_TV_BASE}?${qs}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    } as RequestInit)
    clearTimeout(timeout)
    if (!r.ok) return { error: `HTTP ${r.status}`, attempt }
    const text = await r.text()
    if (!text || text.trim().length === 0) return { error: 'empty body', attempt }
    if (text.startsWith('Please limit') || text.includes('one every 5 seconds')) {
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 6000))
        return gdeltTvFetch(params, attempt + 1)
      }
      return { error: 'rate_limited_by_gdelt', attempt }
    }
    try {
      return JSON.parse(text)
    } catch {
      return { error: `non_json_response: ${text.slice(0, 120)}`, attempt }
    }
  } catch (e: any) {
    clearTimeout(timeout)
    const msg = String(e?.message ?? e).slice(0, 160)
    if (attempt < 2 && (msg.includes('fetch failed') || msg.includes('aborted') || msg.includes('ECONNRESET'))) {
      await new Promise((res) => setTimeout(res, 1500))
      return gdeltTvFetch(params, attempt + 1)
    }
    return { error: msg, attempt }
  }
}

// ─── Summary API fetcher (Sprint G11 · cubre gap auditado) ──────────
// La Summary API devuelve articleList + timeline + tone + top images +
// top sharers + GKG (themes/persons/orgs/locations) + keywords en 1 sola
// llamada. Reemplaza N llamadas separadas a DOC API.
async function gdeltSummaryFetch(params: Record<string, string>, attempt = 1): Promise<any> {
  const qs = new URLSearchParams({ ...params, format: 'json' }).toString()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const r = await fetch(`${GDELT_SUMMARY_BASE}?${qs}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    } as RequestInit)
    clearTimeout(timeout)
    if (!r.ok) return { error: `HTTP ${r.status}`, attempt }
    const text = await r.text()
    if (!text || text.trim().length === 0) return { error: 'empty body', attempt }
    if (text.startsWith('Please limit') || text.includes('one every 5 seconds')) {
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 6000))
        return gdeltSummaryFetch(params, attempt + 1)
      }
      return { error: 'rate_limited_by_gdelt', attempt }
    }
    try {
      return JSON.parse(text)
    } catch {
      return { error: `non_json_response: ${text.slice(0, 120)}`, attempt }
    }
  } catch (e: any) {
    clearTimeout(timeout)
    const msg = String(e?.message ?? e).slice(0, 160)
    if (attempt < 2 && (msg.includes('fetch failed') || msg.includes('aborted') || msg.includes('ECONNRESET'))) {
      await new Promise((res) => setTimeout(res, 1500))
      return gdeltSummaryFetch(params, attempt + 1)
    }
    return { error: msg, attempt }
  }
}

async function gdeltFetch(params: Record<string, string>, attempt = 1): Promise<any> {
  const qs = new URLSearchParams(params).toString()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const r = await fetch(`${GDELT_BASE}?${qs}`, {
      headers: {
        Accept: 'application/json',
        // GDELT exige UA realista · sin esto a veces devuelve HTML
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    } as RequestInit)
    clearTimeout(timeout)
    if (!r.ok) return { error: `HTTP ${r.status}`, attempt }
    const text = await r.text()
    if (!text || text.trim().length === 0) return { error: 'empty body', attempt }
    // GDELT a veces devuelve aviso de rate-limit como texto plano
    if (text.startsWith('Please limit') || text.includes('one every 5 seconds')) {
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 6000))
        return gdeltFetch(params, attempt + 1)
      }
      return { error: 'rate_limited_by_gdelt', attempt }
    }
    try {
      return JSON.parse(text)
    } catch {
      return { error: `non_json_response: ${text.slice(0, 120)}`, attempt }
    }
  } catch (e: any) {
    clearTimeout(timeout)
    const msg = String(e?.message ?? e).slice(0, 160)
    // Retry transient network errors una vez
    if (attempt < 2 && (msg.includes('fetch failed') || msg.includes('aborted') || msg.includes('ECONNRESET'))) {
      await new Promise((res) => setTimeout(res, 1500))
      return gdeltFetch(params, attempt + 1)
    }
    return { error: msg, attempt }
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

  // /api/gdelt/articles · search articles globally · ?theme=PROTEST,INTERNAL_CONFLICT (Sprint G12)
  if (action === 'articles') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || url.searchParams.get('themes') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
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
      themes_applied: themes || null,
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

  // /api/gdelt/themes-catalog · listado de GKG themes curados disponibles (Sprint G12)
  if (action === 'themes-catalog') {
    return NextResponse.json({
      ok: true,
      n_themes: Object.keys(GKG_THEMES_CATALOG).length,
      themes: Object.entries(GKG_THEMES_CATALOG).map(([code, desc]) => ({ code, description: desc })),
      usage: 'Pasa "theme=CODE" o "theme=CODE1,CODE2" en cualquier endpoint articles/summary/gkg-entities/tv-* · combina con OR si son varios.',
      full_catalog_url: 'http://data.gdeltproject.org/api/v2/guides/LOOKUP-GKGTHEMES.TXT',
    })
  }

  // /api/gdelt/tv-clips · TV news clips matching query (Sprint G12)
  if (action === 'tv-clips') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '24h'
    const maxrecords = url.searchParams.get('maxrows') || '20'
    const data = await gdeltTvFetch({
      query,
      mode: 'clipgallery',
      maxrecords,
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT TV API', data.error),
      })
    }
    const clips = Array.isArray(data?.clips) ? data.clips : []
    return NextResponse.json({
      ok: true,
      query,
      themes_applied: themes || null,
      timespan,
      data_quality: quality('live', 'GDELT TV API · clipgallery'),
      n_clips: clips.length,
      clips: clips.map((c: any) => ({
        date: c.date,
        station: c.station,
        show: c.show,
        snippet: c.snippet || c.preview,
        url: c.previewurl || c.url,
        image_url: c.image,
      })),
    })
  }

  // /api/gdelt/tv-timeline · timeline mentions of query on TV news
  if (action === 'tv-timeline') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '7d'
    const data = await gdeltTvFetch({
      query,
      mode: 'timelinevol',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT TV API', data.error),
      })
    }
    const timeline = Array.isArray(data?.timeline?.[0]?.data) ? data.timeline[0].data : []
    return NextResponse.json({
      ok: true,
      query,
      themes_applied: themes || null,
      timespan,
      data_quality: quality('live', 'GDELT TV API · timelinevol'),
      n_points: timeline.length,
      timeline: timeline.map((p: any) => ({ date: p.date, value: Number(p.value) || 0 })),
      methodology: 'Volumen de menciones del tema en TV news (CNN, Fox, BBC, MSNBC, etc.) · 1 punto cada 15 min según timespan.',
    })
  }

  // /api/gdelt/tv-stations · ranking por estación TV
  if (action === 'tv-stations') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '24h'
    const data = await gdeltTvFetch({
      query,
      mode: 'stationchart',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT TV API', data.error),
      })
    }
    const stations = Array.isArray(data?.stations) ? data.stations
      : Array.isArray(data?.timeline) ? data.timeline
      : []
    return NextResponse.json({
      ok: true,
      query,
      themes_applied: themes || null,
      timespan,
      data_quality: quality('live', 'GDELT TV API · stationchart'),
      n_stations: stations.length,
      stations,
      methodology: 'Ranking de estaciones TV por número de menciones del tema. Útil para detectar narrative bias (qué redes amplifican más X tema).',
    })
  }

  // /api/gdelt/tv-tone · evolución tono en TV news
  if (action === 'tv-tone') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '7d'
    const data = await gdeltTvFetch({
      query,
      mode: 'timelinetone',
      timespan,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT TV API', data.error),
      })
    }
    const timeline = Array.isArray(data?.timeline?.[0]?.data) ? data.timeline[0].data : []
    const avgTone = timeline.length ? timeline.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0) / timeline.length : null
    return NextResponse.json({
      ok: true,
      query,
      themes_applied: themes || null,
      timespan,
      data_quality: quality('live', 'GDELT TV API · timelinetone'),
      n_points: timeline.length,
      avg_tone: avgTone,
      timeline: timeline.map((p: any) => ({ date: p.date, tone: Number(p.value) || 0 })),
      methodology: 'Tono en TV broadcasts (-10 a +10). Diferente al tono web · TV tiende a más extremos.',
    })
  }

  // /api/gdelt/summary · Summary API · todo en 1 call (Sprint G11)
  // Reemplaza N calls separados a DOC API por 1 call rico que devuelve
  // articleList + timeline + tone + topImages + topSharers + topDomains +
  // topKeywords + GKG (topPersons + topOrganizations + topLocations + topThemes)
  if (action === 'summary') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || url.searchParams.get('t') || ''
    const themes = url.searchParams.get('theme') || url.searchParams.get('themes') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || url.searchParams.get('ts') || '24h'
    const sourcelang = url.searchParams.get('sourcelang') || ''
    const domain = url.searchParams.get('domain') || url.searchParams.get('d') || ''
    const data = await gdeltSummaryFetch({
      t: query,
      ts: timespan,
      ...(sourcelang ? { sl: sourcelang } : {}),
      ...(domain ? { d: domain } : {}),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT Summary API', data.error),
      })
    }
    // Summary API devuelve mucho contenido · normalizamos shape compacto
    const articleList = Array.isArray(data?.articleList) ? data.articleList : []
    const timelineVol = Array.isArray(data?.timelinevol?.[0]?.data) ? data.timelinevol[0].data : []
    const timelineTone = Array.isArray(data?.timelinetone?.[0]?.data) ? data.timelinetone[0].data : []
    const avgTone = timelineTone.length ? timelineTone.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0) / timelineTone.length : null
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT Summary API'),
      summary: {
        n_articles: articleList.length,
        articles: articleList.slice(0, 30).map((a: any) => ({
          title: a.title,
          url: a.url,
          domain: a.domain,
          language: a.language,
          sourcecountry: a.sourcecountry,
          seendate: a.seendate,
          socialimage: a.socialimage,
        })),
        timeline_volume: timelineVol.slice(-30),
        timeline_tone: timelineTone.slice(-30),
        avg_tone: avgTone,
        top_images: Array.isArray(data?.topimages) ? data.topimages.slice(0, 12) : [],
        top_shared_images: Array.isArray(data?.topsharedimages) ? data.topsharedimages.slice(0, 12) : [],
        top_domains: Array.isArray(data?.topdomains) ? data.topdomains.slice(0, 20) : [],
        top_sharers: Array.isArray(data?.topsharers) ? data.topsharers.slice(0, 20) : [],
        // GKG · Global Knowledge Graph entities (lo importante)
        top_persons: Array.isArray(data?.toppersons) ? data.toppersons.slice(0, 25) : [],
        top_organizations: Array.isArray(data?.toporganizations) ? data.toporganizations.slice(0, 25) : [],
        top_locations: Array.isArray(data?.toplocations) ? data.toplocations.slice(0, 25) : [],
        top_themes: Array.isArray(data?.topthemes) ? data.topthemes.slice(0, 25) : [],
        top_keywords: Array.isArray(data?.topkeywords) ? data.topkeywords.slice(0, 30) : [],
      },
      methodology: 'GDELT Summary API · 1 call devuelve articleList + timeline vol/tone + top images/sharers/domains + GKG entities (persons/orgs/locations/themes/keywords). Reemplaza 4-5 calls a DOC API.',
    })
  }

  // /api/gdelt/gkg-entities · extrae solo GKG (persons/orgs/locations/themes)
  // del Summary API · útil para Stakeholder Graph y Top Risks con entidades reales
  if (action === 'gkg-entities') {
    const queryRaw = url.searchParams.get('query') || url.searchParams.get('q') || ''
    const themes = url.searchParams.get('theme') || url.searchParams.get('themes') || ''
    const query = applyThemes(queryRaw, themes)
    if (!query) return NextResponse.json({ ok: false, error: 'query or theme required' }, { status: 400 })
    const timespan = url.searchParams.get('timespan') || '24h'
    const data = await gdeltSummaryFetch({ t: query, ts: timespan })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'GDELT Summary API', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      query,
      timespan,
      data_quality: quality('live', 'GDELT GKG (vía Summary API)'),
      persons: Array.isArray(data?.toppersons) ? data.toppersons.slice(0, 30) : [],
      organizations: Array.isArray(data?.toporganizations) ? data.toporganizations.slice(0, 30) : [],
      locations: Array.isArray(data?.toplocations) ? data.toplocations.slice(0, 30) : [],
      themes: Array.isArray(data?.topthemes) ? data.topthemes.slice(0, 30) : [],
      keywords: Array.isArray(data?.topkeywords) ? data.topkeywords.slice(0, 40) : [],
      note: 'GKG entities derivadas vía Summary API · NLP de GDELT identifica personas, orgs, ubicaciones y themes citados en cobertura global del tema.',
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
        'GET /api/gdelt/summary?query=Ukraine&timespan=7d  · TODO EN 1 CALL (Sprint G11)',
        'GET /api/gdelt/gkg-entities?query=Sahel&timespan=7d · persons+orgs+locations+themes (Sprint G11)',
        'GET /api/gdelt/themes-catalog · listado de GKG themes curados (Sprint G12)',
        'GET /api/gdelt/tv-clips?query=Ukraine&timespan=24h&maxrows=20 · TV news clips (Sprint G12)',
        'GET /api/gdelt/tv-timeline?query=Ukraine&timespan=7d · TV mentions over time (Sprint G12)',
        'GET /api/gdelt/tv-stations?query=Ukraine&timespan=24h · ranking por estación (Sprint G12)',
        'GET /api/gdelt/tv-tone?query=Ukraine&timespan=7d · tono TV news (Sprint G12)',
        'NB: cualquier endpoint acepta ?theme=INTERNAL_CONFLICT,PROTEST · combina con OR · ver /themes-catalog (Sprint G12)',
      ],
      docs: 'https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ · https://blog.gdeltproject.org/announcing-the-gdelt-summary-api/',
    },
    { status: 404 },
  )
}
