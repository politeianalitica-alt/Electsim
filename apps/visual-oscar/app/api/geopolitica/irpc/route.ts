/**
 * /api/geopolitica/irpc · Sprint GEO-RP C1
 *
 * Índice de Riesgo País Compuesto (IRPC 0-100) según el spec del usuario.
 * Ponderaciones (sin ACLED · sustituido por GDELT WAR_CONFLICT events):
 *   - V-Dem democracia (25%)         · fuente local estática
 *   - GDELT violencia 30d (25%)      · proxy ACLED con events code 18-20 + WAR_CONFLICT theme
 *   - GDELT tono 14d (20%)           · fuente GDELT
 *   - Finnhub estrés soberano (15%)  · placeholder hasta CDS
 *   - PortWatch anomalía (15%)       · IMF Port Monitor
 *
 * Devuelve los 80 países del catálogo con:
 *   - irpc, dimensiones individuales (institucional, democracia, seguridad, economica, social)
 *   - cambio_7d (variación · permite top-movers)
 *   - alerta_ews flag
 *
 * Cache: s-maxage=3600 (1h · datos GDELT cambian intra-día, V-Dem/SIPRI no).
 */
import { NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getVdemEntry, vdemRiskComponent } from '@/lib/geopolitica/vdem-data'
import { getSipriEntry, militarizationRisk } from '@/lib/geopolitica/sipri-data'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface CountryIRPC {
  iso3: string
  name_es: string
  iso2: string
  lat: number
  lon: number
  region: string
  irpc: number                       // 0-100
  /** 5 dimensiones según spec (spider chart) */
  dimensions: {
    institucional: number            // gobernanza (V-Dem + IRPC base)
    democracia: number               // V-Dem v2x_polyarchy
    seguridad: number                // GDELT WAR_CONFLICT + militarización
    economica: number                // PortWatch + estrés soberano
    social: number                   // tono GDELT + (futuro: UNHCR)
  }
  components: {
    vdem_risk: number | null
    gdelt_violence: number | null
    gdelt_tone: number | null
    sovereign_stress: number | null
    port_anomaly: number | null
  }
  raw: {
    polyarchy: number | null
    polyarchy_trend?: string
    milex_pct_gdp: number | null
    gdelt_articles_30d?: number
    gdelt_tone_value?: number
  }
  risk_level: 'estable' | 'vigilancia' | 'alerta' | 'crisis'
  alerta_ews: boolean
}

function irpcLevel(irpc: number): CountryIRPC['risk_level'] {
  if (irpc >= 75) return 'crisis'
  if (irpc >= 55) return 'alerta'
  if (irpc >= 30) return 'vigilancia'
  return 'estable'
}

function toneToRisk(tone: number | null): number | null {
  if (tone === null) return null
  const c = Math.max(-10, Math.min(10, tone))
  return Math.round(((-c + 10) / 20) * 100)
}

function volumeToRisk(articles: number | null): number | null {
  if (articles === null) return null
  if (articles === 0) return 0
  return Math.round(Math.min(100, (Math.log10(articles + 1) / Math.log10(501)) * 100))
}

function compose(c: CountryIRPC['components']): number {
  // Pesos según spec: V-Dem 25% · GDELT viol 25% · GDELT tono 20% · estrés 15% · port 15%
  const weights = { vdem_risk: 25, gdelt_violence: 25, gdelt_tone: 20, sovereign_stress: 15, port_anomaly: 15 }
  let sumW = 0, sumV = 0
  for (const [k, w] of Object.entries(weights)) {
    const v = (c as any)[k] as number | null
    if (v !== null) { sumV += v * w; sumW += w }
  }
  return sumW === 0 ? 50 : Math.round(sumV / sumW)
}

/** 1 query GDELT genérica · cuenta WAR_CONFLICT por sourcecountry. */
async function fetchWarVolumes(timespan: string): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const url = buildGdeltDocUrl({
    query: '*',
    theme: 'WAR_CONFLICT',
    timespan,
    mode: 'artlist',
    maxrecords: 250,
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  if (!json?.articles) return result
  for (const a of json.articles) {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    if (!iso2) continue
    result.set(iso2, (result.get(iso2) || 0) + 1)
  }
  return result
}

/** Tono medio por país desde artículos generales. */
async function fetchToneByCountry(): Promise<Map<string, number>> {
  const result = new Map<string, { sum: number; n: number }>()
  const url = buildGdeltDocUrl({
    query: '*',
    timespan: '14d',
    mode: 'artlist',
    maxrecords: 250,
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  if (!json?.articles) return new Map()
  for (const a of json.articles) {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    if (!iso2 || typeof a.tone !== 'number') continue
    const cur = result.get(iso2) || { sum: 0, n: 0 }
    cur.sum += a.tone
    cur.n++
    result.set(iso2, cur)
  }
  const avg = new Map<string, number>()
  for (const [iso, { sum, n }] of result) avg.set(iso, sum / n)
  return avg
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 3 queries paralelas a GDELT
  const [violences30d, violences7d, tones] = await Promise.all([
    fetchWarVolumes('30d').catch(() => new Map()),
    fetchWarVolumes('7d').catch(() => new Map()),
    fetchToneByCountry().catch(() => new Map()),
  ])

  const countries: CountryIRPC[] = []
  for (const [iso3, coord] of Object.entries(COUNTRY_COORDS)) {
    const vdem = getVdemEntry(iso3)
    const sipri = getSipriEntry(iso3)
    const violence = violences30d.get(coord.iso2) ?? null
    const violence7d = violences7d.get(coord.iso2) ?? null
    const tone = tones.get(coord.iso2) ?? null

    const components = {
      vdem_risk: vdem ? vdemRiskComponent(iso3) : null,
      gdelt_violence: volumeToRisk(violence),
      gdelt_tone: toneToRisk(tone),
      sovereign_stress: null,                              // pendiente CDS · neutral
      port_anomaly: null,                                  // skip on-the-fly (1 query por país sería 80+)
    }
    const irpc = compose(components)

    // 5 dimensiones del spider chart · derivadas de componentes
    const dimensions = {
      institucional: vdem ? Math.round((1 - (vdem.v2x_polyarchy || 0.5)) * 100) : 50,
      democracia: vdem ? Math.round((1 - (vdem.v2x_polyarchy || 0.5)) * 100) : 50,
      seguridad: Math.round((volumeToRisk(violence) ?? 30) * 0.7 + (sipri ? militarizationRisk(iso3) * 0.3 : 0)),
      economica: 50,                                       // pendiente WorldBank/Finnhub on-demand
      social: toneToRisk(tone) ?? 50,
    }

    // Alerta EWS: cambio significativo 7d (proxy: violence_7d >> violence_30d/4.3)
    const expected7d = violence !== null ? violence / 30 * 7 : 0
    const alertaEws = violence7d !== null && expected7d > 0 && violence7d > expected7d * 1.5

    countries.push({
      iso3, name_es: coord.name_es, iso2: coord.iso2,
      lat: coord.lat, lon: coord.lon, region: coord.region,
      irpc, dimensions, components,
      raw: {
        polyarchy: vdem?.v2x_polyarchy ?? null,
        polyarchy_trend: vdem?.trend_5y,
        milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
        gdelt_articles_30d: violence ?? undefined,
        gdelt_tone_value: tone ?? undefined,
      },
      risk_level: irpcLevel(irpc),
      alerta_ews: alertaEws,
    })
  }

  // Métricas globales
  const inAlert = countries.filter((c) => c.irpc > 55).length
  const inCrisis = countries.filter((c) => c.risk_level === 'crisis').length
  const regresionesDem = countries.filter((c) => c.raw.polyarchy_trend === 'regresion' || c.raw.polyarchy_trend === 'regresion_severa').length
  const ewsActivos = countries.filter((c) => c.alerta_ews).length

  return NextResponse.json({
    ok: true,
    countries,
    summary: {
      total: countries.length,
      en_crisis: inCrisis,
      en_alerta: inAlert,
      regresiones_democraticas: regresionesDem,
      ews_activos: ewsActivos,
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'V-Dem v15', role: 'democracia institucional', weight_pct: 25 },
        { name: 'GDELT WAR_CONFLICT 30d', role: 'violencia (sustituye ACLED)', weight_pct: 25 },
        { name: 'GDELT tono 14d', role: 'percepción mediática', weight_pct: 20 },
        { name: 'Finnhub (placeholder)', role: 'estrés soberano · CDS pendiente', weight_pct: 15 },
        { name: 'PortWatch IMF (on-demand)', role: 'anomalía portuaria · skip en lista', weight_pct: 15 },
      ],
      cache_ttl_seconds: 3600,
      methodology: 'Compuesto ignorando nulls · niveles: <30 estable · 30-55 vigilancia · 55-75 alerta · ≥75 crisis · EWS si violencia 7d > 1.5x expected',
      note: 'PortWatch + Sovereign stress se consultan on-demand en /pais/[iso3] para no inflar latencia · ACLED sustituido por GDELT events',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
