/**
 * /api/iati/spain-overview · Snapshot de cooperación internacional española
 * vía IATI (International Aid Transparency Initiative).
 *
 * Server-side fetch · la `IATI_API_KEY` no se expone al cliente.
 *
 * Usa Solr facets para obtener en UNA SOLA llamada:
 *   - Total actividades reportadas por orgs españolas
 *   - Top 15 organizaciones por nº de actividades
 *   - Top 15 países beneficiarios
 *   - Top 10 sectores
 *
 * Cache HTTP 1h · respuesta estable (datos cambian mensualmente).
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1h ISR
const IATI_API = 'https://api.iatistandard.org/datastore/activity/select'

// Spanish reporting orgs (subset · ID IATI conocidos)
const SPANISH_ORGS_FILTER = [
  'XM-DAC-7',               // Spain government / AECID
  'ES-DIR3-EA0011488',       // AECID
  'ES-CIF-G81164105',        // Acción Contra el Hambre
  'ES-CIF-G28021679',        // Cruz Roja Española
  'ES-CIF-G80345349',        // MSF España
  'ES-CIF-G81233101',        // Oxfam Intermón
  'ES-CIF-G81787493',        // Save the Children España
  'ES-CIF-G28160124',        // Cáritas Española
  'ES-CIF-G84451087',        // UNICEF Comité Español
  'ES-CIF-G28567790',        // Manos Unidas
]

interface IatiOverview {
  total_activities: number
  by_org: Array<{ ref: string; count: number; name?: string }>
  top_countries: Array<{ iso2: string; count: number }>
  top_sectors: Array<{ code: string; count: number }>
  fetched_at: string
  data_quality: {
    source_type: 'live' | 'cache' | 'missing'
    source_name: string
    note?: string
  }
}

const ORG_NAMES: Record<string, string> = {
  'XM-DAC-7': 'Gobierno de España (AECID)',
  'ES-DIR3-EA0011488': 'AECID',
  'ES-CIF-G81164105': 'Acción Contra el Hambre',
  'ES-CIF-G28021679': 'Cruz Roja Española',
  'ES-CIF-G80345349': 'Médicos Sin Fronteras España',
  'ES-CIF-G81233101': 'Oxfam Intermón',
  'ES-CIF-G81787493': 'Save the Children España',
  'ES-CIF-G28160124': 'Cáritas Española',
  'ES-CIF-G84451087': 'UNICEF Comité Español',
  'ES-CIF-G28567790': 'Manos Unidas',
}

export async function GET() {
  const key = process.env.IATI_API_KEY
  if (!key) {
    return NextResponse.json<IatiOverview>({
      total_activities: 0,
      by_org: [],
      top_countries: [],
      top_sectors: [],
      fetched_at: new Date().toISOString(),
      data_quality: {
        source_type: 'missing',
        source_name: 'IATI',
        note: 'IATI_API_KEY no configurada · contactar admin',
      },
    })
  }

  // Una sola query Solr · facetas múltiples
  const orgClause = SPANISH_ORGS_FILTER.map((o) => `"${o}"`).join(' OR ')
  const params = new URLSearchParams({
    q: `reporting_org_ref:(${orgClause})`,
    rows: '0',
    wt: 'json',
    'facet': 'true',
    'facet.field': 'reporting_org_ref',
    // Múltiples facet.field requieren añadir al array · Solr lo acepta repetido
  })
  // Append multiple facet.field manually
  params.append('facet.field', 'recipient_country_code')
  params.append('facet.field', 'sector_code')
  params.set('facet.limit', '15')
  params.set('facet.mincount', '1')

  try {
    const r = await fetch(`${IATI_API}?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })
    if (!r.ok) {
      return NextResponse.json<IatiOverview>({
        total_activities: 0,
        by_org: [],
        top_countries: [],
        top_sectors: [],
        fetched_at: new Date().toISOString(),
        data_quality: {
          source_type: 'missing',
          source_name: 'IATI',
          note: `HTTP ${r.status} · rate-limit u otro error`,
        },
      })
    }
    const j: any = await r.json()
    const facets = j?.facet_counts?.facet_fields ?? {}

    const parseFacet = (arr: any): Array<{ key: string; count: number }> => {
      // Solr facet · ['key1', count1, 'key2', count2, ...]
      const out: Array<{ key: string; count: number }> = []
      if (!Array.isArray(arr)) return out
      for (let i = 0; i < arr.length - 1; i += 2) {
        out.push({ key: String(arr[i]), count: Number(arr[i + 1]) })
      }
      return out
    }

    const byOrg = parseFacet(facets.reporting_org_ref).map((x) => ({
      ref: x.key,
      count: x.count,
      name: ORG_NAMES[x.key] ?? x.key,
    }))
    const topCountries = parseFacet(facets.recipient_country_code).map((x) => ({
      iso2: x.key.toUpperCase(),
      count: x.count,
    }))
    const topSectors = parseFacet(facets.sector_code).map((x) => ({
      code: x.key,
      count: x.count,
    }))

    return NextResponse.json<IatiOverview>({
      total_activities: j?.response?.numFound ?? 0,
      by_org: byOrg,
      top_countries: topCountries,
      top_sectors: topSectors,
      fetched_at: new Date().toISOString(),
      data_quality: {
        source_type: 'live',
        source_name: 'IATI Datastore',
        note: '1 query Solr con facets · cache 1h.',
      },
    })
  } catch (e: any) {
    return NextResponse.json<IatiOverview>({
      total_activities: 0,
      by_org: [],
      top_countries: [],
      top_sectors: [],
      fetched_at: new Date().toISOString(),
      data_quality: {
        source_type: 'missing',
        source_name: 'IATI',
        note: `Error: ${String(e?.message ?? e).slice(0, 160)}`,
      },
    })
  }
}
