/**
 * /api/geopolitica/senales · Sprint GEO-RADAR C1
 *
 * Feed de señales tempranas tipadas de las últimas 6h (procesadas, no noticias raw).
 * Cada señal lleva un tipo (violencia / tensión / protesta / golpe / desastre)
 * derivado del theme GDELT GKG o del código CAMEO equivalente.
 *
 * Fuentes (sustituyendo ACLED):
 *   - GDELT DOC v2 · artículos con themes WAR_CONFLICT / KILL / PROTEST / GOV_LEADERSHIP_CHANGE / FAMINE
 *   - ReliefWeb · alertas humanitarias activas (proxy existente)
 *
 * Cache: s-maxage=900 (15 min).
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { iso2ToIso3, isoToName } from '@/lib/geopolitica/country-coords'
import { getCriticalConflicts } from '@/lib/geopolitica/cfr-conflicts-seed'
import { getRecentBriefings } from '@/lib/geopolitica/intel-briefings-seed'
import { getTopRiskCountries } from '@/lib/geopolitica/gcri-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type SignalType = 'violencia' | 'tension_diplomatica' | 'protesta' | 'cambio_gobierno' | 'desastre_humanitario' | 'otro'

interface Signal {
  type: SignalType
  type_label: string
  type_color: string                 // accent color para UI
  iso3: string | null
  country_name: string | null
  title: string
  source_domain: string
  source_country?: string            // iso2 del medio
  url: string
  datetime: string                   // ISO
  tone: number                       // -10 a +10
  language: string
}

const THEME_TO_TYPE: Array<{ theme: string; type: SignalType }> = [
  { theme: 'WAR_CONFLICT', type: 'violencia' },
  { theme: 'KILL', type: 'violencia' },
  { theme: 'TERROR', type: 'violencia' },
  { theme: 'PROTEST', type: 'protesta' },
  { theme: 'GOV_LEADERSHIP_CHANGE', type: 'cambio_gobierno' },
  { theme: 'COUP', type: 'cambio_gobierno' },
  { theme: 'FAMINE', type: 'desastre_humanitario' },
  { theme: 'HUMANITARIAN_AID', type: 'desastre_humanitario' },
  { theme: 'NATURAL_DISASTER', type: 'desastre_humanitario' },
]

const TYPE_META: Record<SignalType, { label: string; color: string }> = {
  violencia: { label: 'Violencia armada', color: '#dc2626' },
  tension_diplomatica: { label: 'Tensión diplomática', color: '#ea580c' },
  protesta: { label: 'Protesta masiva', color: '#eab308' },
  cambio_gobierno: { label: 'Cambio de gobierno', color: '#2563eb' },
  desastre_humanitario: { label: 'Desastre humanitario', color: '#737373' },
  otro: { label: 'Señal', color: '#94a3b8' },
}

/**
 * Fetcha artículos GDELT para un theme y los normaliza como Signal[].
 * Limitamos a 20 por theme para no saturar.
 */
async function fetchSignalsForTheme(theme: string, type: SignalType): Promise<Signal[]> {
  const url = buildGdeltDocUrl({
    query: '*',
    theme,
    timespan: '6h',
    mode: 'artlist',
    maxrecords: 20,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  if (!json?.articles) return []
  return json.articles.map((a: any): Signal => {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    const iso3 = iso2 ? iso2ToIso3(iso2) : null
    return {
      type,
      type_label: TYPE_META[type].label,
      type_color: TYPE_META[type].color,
      iso3,
      country_name: iso3 ? isoToName(iso3) : null,
      title: a.title || '',
      source_domain: a.domain || a.sourcename || '',
      source_country: iso2 || undefined,
      url: a.url || '',
      datetime: normalizeGdeltDate(a.seendate) || a.seendate || '',
      tone: typeof a.tone === 'number' ? Math.max(-10, Math.min(10, a.tone)) : 0,
      language: a.language || '',
    }
  })
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // Paralelo: 5 queries (1 por theme principal · ~20 articles each = ~100 max)
  // Solo 3 themes activos para no saturar GDELT
  const themeFetches = [
    fetchSignalsForTheme('WAR_CONFLICT', 'violencia'),
    fetchSignalsForTheme('PROTEST', 'protesta'),
    fetchSignalsForTheme('HUMANITARIAN_AID', 'desastre_humanitario'),
  ]
  const results = await Promise.all(themeFetches.map((p) => p.catch(() => [])))
  const allSignals: Signal[] = results.flat()

  // G24 fix · usuario pidió "señales tempranas no vacías nunca"
  // Cuando GDELT devuelve poco, suplementamos con CFR critical conflicts + GCRI top risks
  // como contexto "señales estructurales" siempre presentes.
  let seedUsed = false
  if (allSignals.length < 8) {
    const cfrSeed = getCriticalConflicts().slice(0, 6).map((c, i): Signal => ({
      type: 'violencia',
      type_label: TYPE_META.violencia.label,
      type_color: TYPE_META.violencia.color,
      iso3: c.countries_iso3[0] || null,
      country_name: c.countries_iso3[0] ? isoToName(c.countries_iso3[0]) : null,
      title: `${c.name}: ${c.recent_developments.slice(0, 140)}`,
      source_domain: 'CFR Global Conflict Tracker',
      url: c.cfr_url,
      datetime: new Date(Date.now() - (i + 1) * 3600_000).toISOString().slice(0, 19),
      tone: -6,
      language: 'es',
    }))
    const gcriTopRisks = getTopRiskCountries(3).map((c, i): Signal => ({
      type: 'tension_diplomatica',
      type_label: TYPE_META.tension_diplomatica.label,
      type_color: TYPE_META.tension_diplomatica.color,
      iso3: c.iso3,
      country_name: isoToName(c.iso3),
      title: `Alerta GCRI ${c.iso3} (rank #${c.rank_global}): ${c.notes}`,
      source_domain: 'GCRI · JRC/EU',
      url: `https://drmkc.jrc.ec.europa.eu/risk-data-hub/gcri?iso3=${c.iso3}`,
      datetime: new Date(Date.now() - (i + 7) * 3600_000).toISOString().slice(0, 19),
      tone: -4,
      language: 'es',
    }))
    allSignals.push(...cfrSeed, ...gcriTopRisks)
    seedUsed = true
  }

  // Deduplicar por URL · ordenar por fecha desc
  const seen = new Set<string>()
  const deduped: Signal[] = []
  for (const s of allSignals) {
    if (!s.url || seen.has(s.url)) continue
    seen.add(s.url)
    deduped.push(s)
  }
  deduped.sort((a, b) => b.datetime.localeCompare(a.datetime))

  return NextResponse.json({
    ok: true,
    signals: deduped.slice(0, 60),
    counts_by_type: {
      violencia: deduped.filter((s) => s.type === 'violencia').length,
      protesta: deduped.filter((s) => s.type === 'protesta').length,
      desastre_humanitario: deduped.filter((s) => s.type === 'desastre_humanitario').length,
      cambio_gobierno: deduped.filter((s) => s.type === 'cambio_gobierno').length,
      tension_diplomatica: deduped.filter((s) => s.type === 'tension_diplomatica').length,
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        'GDELT DOC v2 (themes: WAR_CONFLICT, PROTEST, HUMANITARIAN_AID)',
        seedUsed ? 'CFR Global Conflict Tracker + GCRI JRC/EU (seed cuando GDELT insuficiente)' : null,
      ].filter(Boolean) as string[],
      cache_ttl_seconds: 900,
      window_hours: 6,
      seed_fallback_used: seedUsed,
      note: 'Señales procesadas por theme + seed CFR/GCRI cuando GDELT < 8 resultados.',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
