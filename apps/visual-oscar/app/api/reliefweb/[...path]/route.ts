/**
 * /api/reliefweb/[...path] · ReliefWeb · informes humanitarios OCHA.
 *
 * Fuente: api.reliefweb.int · gestionada por OCHA (UN Office for the
 * Coordination of Humanitarian Affairs). Reportes en tiempo real de
 * crisis humanitarias, desastres, displacement, salud, hambre.
 *
 * Auth: ninguna · API pública gratis · sólo se pide `appname=politeia`
 *   como identificador no-secreto (no rate limit estricto).
 *
 * Rutas:
 *   GET /api/reliefweb/spain-context?limit=10
 *     → Últimos reportes con relevancia para España: Magreb, Sahel,
 *       Ucrania, LATAM, Oriente Medio. Filtra por país y ordena por
 *       fecha desc.
 *
 *   GET /api/reliefweb/disasters?limit=10
 *     → Desastres activos en el mundo (terremotos, inundaciones,
 *       sequías, conflictos). Útil para /crisis y /geopolitica.
 *
 *   GET /api/reliefweb/country?iso3=ESP&limit=10
 *     → Reportes asociados a un país concreto.
 *
 *   GET /api/reliefweb/search?q=climate&limit=10
 *     → Búsqueda libre.
 *
 *   GET /api/reliefweb/health
 *     → Diagnóstico.
 *
 * Cache HTTP 1h (reportes humanitarios cambian rápido).
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600

const RELIEFWEB_API = 'https://api.reliefweb.int/v2'
const APPNAME = 'politeia-analitica'

const SPAIN_CONTEXT_COUNTRIES = [
  'MAR', 'DZA', 'TUN', 'LBY', 'MRT', // Magreb
  'MLI', 'NER', 'BFA', 'SEN',        // Sahel
  'UKR', 'RUS',                       // Ucrania
  'VEN', 'COL', 'MEX', 'CUB',         // LATAM
  'ISR', 'PSE', 'LBN', 'SYR',         // Oriente Medio
  'GNQ', 'SDN', 'ETH',                // África
]

function quality(t: 'live' | 'cache' | 'missing', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

async function reliefwebFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ appname: APPNAME, ...params })
  try {
    const r = await fetch(`${RELIEFWEB_API}${path}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function mapReport(d: any) {
  const f = d.fields || {}
  return {
    id: d.id,
    title: f.title,
    date: f.date?.created || f.date?.original,
    url: f.url_alias || f.url,
    body_short: (f.body || f.body_html || '').slice(0, 400).replace(/<[^>]*>/g, ''),
    countries: (f.country || []).map((c: any) => ({
      name: c.name,
      iso3: c.iso3,
      shortname: c.shortname,
    })),
    primary_country: f.primary_country ? {
      name: f.primary_country.name,
      iso3: f.primary_country.iso3,
    } : null,
    source: (f.source || []).map((s: any) => s.shortname || s.name).slice(0, 3),
    themes: (f.theme || []).map((t: any) => t.name).slice(0, 5),
    format: f.format?.[0]?.name,
    language: f.language?.[0]?.code || 'en',
    disaster_types: (f.disaster_type || []).map((d: any) => d.name),
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/reliefweb/health
  if (action === 'health') {
    const probe = await reliefwebFetch('/reports', { limit: '1' })
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      probe_total: probe?.totalCount ?? null,
    })
  }

  // /api/reliefweb/spain-context
  if (action === 'spain-context') {
    const limit = url.searchParams.get('limit') || '15'
    // Filtro por país via query param array. ReliefWeb usa filter[field]=country.iso3 con OR semántico via query
    const countryQuery = SPAIN_CONTEXT_COUNTRIES.map((c) => `country.iso3:${c}`).join(' OR ')
    const data = await reliefwebFetch('/reports', {
      limit,
      'fields[include][]': 'title',
      'sort[]': 'date:desc',
      query: countryQuery,
      'query[operator]': 'OR',
      profile: 'full',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ReliefWeb', data.error),
      })
    }
    const reports = (data?.data || []).map(mapReport)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'ReliefWeb · OCHA'),
      total: data?.totalCount,
      n_items: reports.length,
      countries_filtered: SPAIN_CONTEXT_COUNTRIES,
      items: reports,
    })
  }

  // /api/reliefweb/disasters
  if (action === 'disasters') {
    const limit = url.searchParams.get('limit') || '15'
    const data = await reliefwebFetch('/disasters', {
      limit,
      'sort[]': 'date:desc',
      'filter[field]': 'status',
      'filter[value]': 'alert,current,past',
      profile: 'full',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ReliefWeb', data.error),
      })
    }
    const items = (data?.data || []).map((d: any) => {
      const f = d.fields || {}
      return {
        id: d.id,
        name: f.name,
        status: f.status,
        type: f.type?.[0]?.name,
        date: f.date?.event || f.date?.created,
        countries: (f.country || []).map((c: any) => ({ name: c.name, iso3: c.iso3 })),
        primary_country: f.primary_country?.name,
        url: f.url_alias || f.url,
        description: (f.description || '').slice(0, 500),
        glide: f.glide,
      }
    })
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'ReliefWeb · OCHA'),
      total: data?.totalCount,
      n_items: items.length,
      items,
    })
  }

  // /api/reliefweb/country?iso3=ESP
  if (action === 'country') {
    const iso3 = (url.searchParams.get('iso3') || 'ESP').toUpperCase()
    const limit = url.searchParams.get('limit') || '15'
    const data = await reliefwebFetch('/reports', {
      limit,
      'sort[]': 'date:desc',
      'filter[field]': 'primary_country.iso3',
      'filter[value]': iso3,
      profile: 'full',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ReliefWeb', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      iso3,
      data_quality: quality('live', 'ReliefWeb · OCHA'),
      total: data?.totalCount,
      n_items: (data?.data || []).length,
      items: (data?.data || []).map(mapReport),
    })
  }

  // /api/reliefweb/search?q=
  if (action === 'search') {
    const q = url.searchParams.get('q') || ''
    const limit = url.searchParams.get('limit') || '15'
    if (!q) {
      return NextResponse.json({ ok: false, error: 'q is required' })
    }
    const data = await reliefwebFetch('/reports', {
      limit,
      'sort[]': 'date:desc',
      query: q,
      profile: 'full',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ReliefWeb', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      q,
      data_quality: quality('live', 'ReliefWeb · OCHA'),
      total: data?.totalCount,
      n_items: (data?.data || []).length,
      items: (data?.data || []).map(mapReport),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/reliefweb/health',
        'GET /api/reliefweb/spain-context?limit=15',
        'GET /api/reliefweb/disasters?limit=15',
        'GET /api/reliefweb/country?iso3=ESP&limit=15',
        'GET /api/reliefweb/search?q=climate&limit=15',
      ],
    },
    { status: 404 },
  )
}
