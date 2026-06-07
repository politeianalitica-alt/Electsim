/**
 * GET /api/sectores/defensa/contratos-global
 * Unifica contratos de defensa de múltiples fuentes.
 *
 * Parámetros:
 *   days    = 90      (ventana temporal, máx 365)
 *   limit   = 40      (máx 100)
 *   fuente  = all | ES | US | EU   (filtro de fuente)
 *   min_m   = 0       (importe mínimo en millones EUR/USD)
 *   q       = ''      (búsqueda texto libre en objeto/título)
 *
 * Fuentes:
 *   - TED (EU) + PLACSP + Catalunya → contratos ES+EU existentes
 *   - USASpending.gov API v2        → contratos DoD USA
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchTed } from '@/lib/sources/ted'
import { searchCatalunya } from '@/lib/socrata-catalunya'
import { fetchPlacspFeed } from '@/lib/placsp'
import type { NormalizedContrato } from '@/lib/socrata-catalunya'

export const dynamic   = 'force-dynamic'
export const runtime   = 'nodejs'
export const maxDuration = 45

// PSC codes de defensa (DoD categories)
const DOD_PSC = ['1510','1520','1550','1905','1925','2350','1425','1440','5895','1080','D307']

async function fetchUSASpending(days: number, limit: number): Promise<NormalizedContrato[]> {
  try {
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0,10)
    const body = {
      filters: {
        time_period: [{ start_date: since, end_date: new Date().toISOString().slice(0,10) }],
        award_type_codes: ['A','B','C','D'],
        psc_codes: { require: [DOD_PSC] },
      },
      fields: [
        'Award ID','recipient_name','awarding_agency_name','Award Amount',
        'period_of_performance_start_date','period_of_performance_current_end_date',
        'Description','place_of_performance_city_name','place_of_performance_country_code',
        'psc_description','naics_description','Award Type',
      ],
      sort: 'Award Amount',
      order: 'desc',
      limit,
      page: 1,
    }
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.results || []).map((r: Record<string,unknown>) => ({
      id:                  `USA-${r['Award ID'] ?? Math.random()}`,
      fuente:              'USASPENDING',
      fuente_label:        'USASpending DoD',
      objeto:              String(r['Description'] || r['psc_description'] || 'Sin descripción'),
      organo:              String(r['awarding_agency_name'] || 'DoD'),
      adjudicatario:       String(r['recipient_name'] || ''),
      importe_adjudicacion: typeof r['Award Amount'] === 'number' ? r['Award Amount'] : undefined,
      fecha_publicacion:   String(r['period_of_performance_start_date'] || '').slice(0,10),
      lugar_ejecucion:     String(r['place_of_performance_city_name'] || ''),
      pais_iso2:           r['place_of_performance_country_code'] === 'USA' ? 'US' : String(r['place_of_performance_country_code'] || 'US'),
      lat:                 null,
      lon:                 null,
      url:                 r['Award ID'] ? `https://www.usaspending.gov/award/${r['Award ID']}/` : undefined,
    } as NormalizedContrato & { pais_iso2: string; lat: null; lon: null }))
  } catch {
    return []
  }
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const days   = clamp(Number(sp.get('days')  || 90),  7, 365)
  const limit  = clamp(Number(sp.get('limit') || 40),  5, 100)
  const fuente = sp.get('fuente') || 'all'
  const minM   = Number(sp.get('min_m') || 0)
  const q      = (sp.get('q') || '').toLowerCase().trim()
  const t0     = Date.now()

  const desde = new Date(Date.now() - days * 86400_000).toISOString().slice(0,10)

  const [ted, ct, placspRaw, usa] = await Promise.all([
    fuente === 'US' ? Promise.resolve({ items: [], ok: false, ms: 0 })
      : searchTed({ cpv_div: '35', desde, limit: 20 }, 10_000),
    fuente === 'US' ? Promise.resolve({ items: [], ok: false, ms: 0 })
      : searchCatalunya({ cpv_div: '35', desde, limit: 20, order: 'data_publicacio_contracte DESC NULL LAST' }, 10_000),
    fuente === 'US' ? Promise.resolve({ items: [], ok: false })
      : fetchPlacspFeed('licitacion', 10_000),
    fuente === 'ES' ? Promise.resolve([])
      : fetchUSASpending(days, 20),
  ])

  const placsp: NormalizedContrato[] = []
  for (const it of (placspRaw as { items?: Array<{ cpv?: string; id: string; organismo?: string; titulo: string; expediente?: string; importe?: number; estado_label?: string; fecha?: string; url_detalle?: string; ciudad?: string }> }).items || []) {
    if (it.cpv?.startsWith('35')) {
      placsp.push({
        id: `PL-${it.id}`,
        fuente: 'PLACSP', fuente_label: 'Plataforma Nacional',
        expediente: it.expediente, organo: it.organismo ?? '',
        objeto: it.titulo, cpv: it.cpv, cpv_div: it.cpv?.slice(0,2),
        importe_licitacion: it.importe,
        estado: it.estado_label, fecha_publicacion: it.fecha?.slice(0,10),
        anio: it.fecha ? Number(it.fecha.slice(0,4)) : undefined,
        url: it.url_detalle, lugar_ejecucion: it.ciudad ?? undefined,
      })
    }
  }

  let items: Array<NormalizedContrato & { pais_iso2?: string }> = [
    ...ted.items, ...ct.items, ...placsp, ...usa,
  ]

  // Filtros
  if (minM > 0) {
    items = items.filter(it => {
      const v = (it.importe_adjudicacion ?? it.importe_licitacion ?? 0)
      return v >= minM * 1_000_000
    })
  }
  if (q) {
    items = items.filter(it =>
      it.objeto?.toLowerCase().includes(q) ||
      it.organo?.toLowerCase().includes(q) ||
      (it as Record<string,unknown>).adjudicatario?.toString().toLowerCase().includes(q)
    )
  }

  items.sort((a,b) => (b.fecha_publicacion||'').localeCompare(a.fecha_publicacion||''))
  const total = items.length
  items = items.slice(0, limit)

  return NextResponse.json({
    items, total, mostrados: items.length,
    stats: {
      importe_total_M: Math.round(items.reduce((s,it) => s + (it.importe_adjudicacion ?? it.importe_licitacion ?? 0), 0) / 100_000) / 10,
      por_fuente: items.reduce((acc: Record<string,number>, it) => { acc[it.fuente] = (acc[it.fuente]||0)+1; return acc }, {}),
      sources: [
        { fuente: 'TED',           ok: ted.ok,       items: ted.items.length },
        { fuente: 'CATALUNYA',     ok: ct.ok,        items: ct.items.length  },
        { fuente: 'PLACSP',        ok: true,         items: placsp.length    },
        { fuente: 'USASPENDING',   ok: usa.length>0, items: usa.length       },
      ],
      fetch_ms: Date.now() - t0,
    },
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
}
