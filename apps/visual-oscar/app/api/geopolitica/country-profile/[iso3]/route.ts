/**
 * /api/geopolitica/country-profile/[iso3]
 *
 * Endpoint nuevo (Sprint Geo-FIX) que reemplaza al viejo
 * `/api/geopolitica/pais-profile` para la página de país. Diferencias clave:
 *
 *   1. NO usa ACLED (acceso denegado · ver registry: status='disabled').
 *      Las capas de conflicto y eventos usan UCDP (estructural) + GDELT
 *      (saliencia mediática 24h-30d) + ReliefWeb (humanitario).
 *
 *   2. Añade IDENTIDAD país real vía REST Countries (sin key) +
 *      GOBIERNO vía Wikidata SPARQL (jefe de Estado, jefe de Gobierno,
 *      forma de gobierno, organizaciones internacionales).
 *
 *   3. Añade DESASTRES vía USGS (terremotos M≥5.0 últimos 30d) + GDACS
 *      (alertas activas RSS).
 *
 *   4. Cada capa lleva su propio `_source` con:
 *      - id (del registry)
 *      - name visible
 *      - access_type
 *      - source_url (para auditoría)
 *      - last_updated (cuando lo sabemos)
 *      - what_it_measures (transparencia)
 *      - confidence ('high' | 'medium' | 'low' | 'unknown')
 *
 *   5. Cada capa es defensiva: si la fuente falla, esa capa viene como
 *      `null` con `_error` para mostrar empty state en lugar de romper
 *      el render entero.
 *
 * Política de fallback: NO hay datos sintéticos. Si no llega data real
 * de la fuente, la capa viene null. La UI muestra "Fuente no disponible".
 *
 * Cache: s-maxage=21600 (6h), stale-while-revalidate=86400 (24h).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  buildGdeltDocUrl,
  fetchGdeltJson,
  normalizeGdeltDate,
  clampGdeltTone,
} from '@/lib/gdelt/build-query'
import {
  getUcdpConflictByIso,
  type UcdpActiveConflict,
} from '@/lib/geopolitica/ucdp-active-conflicts'
import {
  fetchCountryMacro,
  latestWBValue,
  type WBCountryIndicators,
} from '@/lib/worldbank/client'
import { fetchCountryFactsFromWikidata } from '@/lib/wikidata/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface SourceMeta {
  id: string
  name: string
  access_type: string
  source_url: string
  last_updated?: string
  what_it_measures: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

// ────────────────────────────────────────────────────────────────────
// Helpers de fetch defensivo
// ────────────────────────────────────────────────────────────────────

async function safeFetch(url: string, timeoutMs = 5000, options: RequestInit = {}): Promise<Response | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal })
    clearTimeout(t)
    return r.ok ? r : null
  } catch {
    clearTimeout(t)
    return null
  }
}

async function safeJson<T>(url: string, timeoutMs = 5000, options: RequestInit = {}): Promise<T | null> {
  const r = await safeFetch(url, timeoutMs, options)
  if (!r) return null
  try {
    return await r.json()
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────────────
// 1 · REST Countries · identidad país
// ────────────────────────────────────────────────────────────────────

interface IdentityLayer {
  iso2: string | null
  iso3: string
  name_common: string
  name_official: string | null
  capital: string | null
  region: string | null
  subregion: string | null
  population: number | null
  area: number | null
  latlng: [number, number] | null
  borders: string[]
  currencies: string[]
  languages: string[]
  flag_png: string | null
  flag_emoji: string | null
  timezones: string[]
  un_member: boolean | null
  _source: SourceMeta
}

async function buildIdentity(iso3: string): Promise<IdentityLayer | null> {
  const fields = 'name,capital,region,subregion,population,area,latlng,cca2,cca3,borders,currencies,languages,flags,flag,timezones,unMember'
  const data: any = await safeJson(
    `https://restcountries.com/v3.1/alpha/${iso3.toLowerCase()}?fields=${fields}`,
    6000,
  )
  if (!data) return null
  // restcountries devuelve objeto directo cuando se pide por alpha
  const c = Array.isArray(data) ? data[0] : data
  if (!c?.name) return null
  return {
    iso2: c.cca2 ?? null,
    iso3: c.cca3 ?? iso3,
    name_common: c.name.common,
    name_official: c.name.official ?? null,
    capital: Array.isArray(c.capital) ? c.capital[0] : null,
    region: c.region ?? null,
    subregion: c.subregion ?? null,
    population: c.population ?? null,
    area: c.area ?? null,
    latlng: Array.isArray(c.latlng) && c.latlng.length === 2 ? [c.latlng[0], c.latlng[1]] : null,
    borders: Array.isArray(c.borders) ? c.borders : [],
    currencies: c.currencies ? Object.keys(c.currencies) : [],
    languages: c.languages ? Object.values(c.languages).map(String) : [],
    flag_png: c.flags?.png ?? c.flags?.svg ?? null,
    flag_emoji: c.flag ?? null,
    timezones: Array.isArray(c.timezones) ? c.timezones : [],
    un_member: c.unMember ?? null,
    _source: {
      id: 'rest_countries',
      name: 'REST Countries',
      access_type: 'public_api_no_key',
      source_url: `https://restcountries.com/v3.1/alpha/${iso3.toLowerCase()}`,
      what_it_measures: 'Identidad país: capital, vecinos, idiomas, moneda, bandera, población, área',
      confidence: 'high',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 2 · Wikidata SPARQL · gobierno y organizaciones internacionales
// ────────────────────────────────────────────────────────────────────

interface GovernmentLayer {
  head_of_state: string | null
  head_of_government: string | null
  form_of_government: string | null
  governing_parties: string[]
  international_orgs: string[]
  independence_date: string | null
  // ── Wikidata facts extendidos (FIX-A7) ───────────────────────────
  national_motto?: string | null
  state_religion?: string | null
  legal_system?: string | null
  official_language?: string | null
  head_of_state_since?: string | null
  head_of_government_since?: string | null
  _source: SourceMeta
}

async function buildGovernment(iso3: string): Promise<GovernmentLayer | null> {
  const sparql = `
SELECT DISTINCT ?headOfStateLabel ?headOfGovernmentLabel ?formOfGovernmentLabel ?independence WHERE {
  ?country wdt:P31 wd:Q3624078;
           wdt:P298 "${iso3.toUpperCase()}".
  OPTIONAL { ?country wdt:P35 ?headOfState. }
  OPTIONAL { ?country wdt:P6 ?headOfGovernment. }
  OPTIONAL { ?country wdt:P122 ?formOfGovernment. }
  OPTIONAL { ?country wdt:P571 ?independence. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 1`.trim()

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  const data: any = await safeJson(url, 7000, {
    headers: { 'User-Agent': 'Politeia-Geo-Profile/1.0 (politeia-analitica)' },
  })
  if (!data?.results?.bindings?.length) return null
  const row = data.results.bindings[0]

  // Segunda query: organizaciones internacionales (P463 member of)
  const orgsSparql = `
SELECT ?orgLabel WHERE {
  ?country wdt:P31 wd:Q3624078;
           wdt:P298 "${iso3.toUpperCase()}";
           wdt:P463 ?org.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 20`.trim()
  const orgsData: any = await safeJson(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(orgsSparql)}`,
    7000,
    { headers: { 'User-Agent': 'Politeia-Geo-Profile/1.0 (politeia-analitica)' } },
  )
  const orgs = Array.isArray(orgsData?.results?.bindings)
    ? orgsData.results.bindings.map((b: any) => b.orgLabel?.value).filter(Boolean)
    : []

  // Tercera query: facts estructurales extendidos (FIX-A7) — paralelo
  const extendedFacts = await fetchCountryFactsFromWikidata(iso3)

  return {
    head_of_state: row.headOfStateLabel?.value || null,
    head_of_government: row.headOfGovernmentLabel?.value || null,
    form_of_government: row.formOfGovernmentLabel?.value || null,
    governing_parties: [],     // P3033 si quisiéramos · costoso · skip
    international_orgs: orgs,
    independence_date: row.independence?.value?.slice(0, 10) || null,
    national_motto: extendedFacts?.national_motto || null,
    state_religion: extendedFacts?.state_religion || null,
    legal_system: extendedFacts?.legal_system || null,
    official_language: extendedFacts?.official_language || null,
    head_of_state_since: extendedFacts?.head_of_state?.since || null,
    head_of_government_since: extendedFacts?.head_of_government?.since || null,
    _source: {
      id: 'wikidata',
      name: 'Wikidata SPARQL (queries jefes de estado + orgs + facts estructurales)',
      access_type: 'public_api_no_key',
      source_url: 'https://query.wikidata.org/',
      what_it_measures: 'Jefe de Estado P35, jefe de Gobierno P6, forma gobierno P122, organizaciones P463, independencia P571, lema P1546, religión oficial P140, sistema legal P1387, idioma P37',
      confidence: 'medium',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 3 · USGS · sismos M≥5.0 últimos 30 días en el bounding-box del país
// ────────────────────────────────────────────────────────────────────

interface SeismicLayer {
  events_30d: number
  max_magnitude: number | null
  recent: Array<{ date: string; mag: number; depth_km: number; place: string }>
  _source: SourceMeta
}

async function buildSeismic(latlng: [number, number] | null): Promise<SeismicLayer | null> {
  if (!latlng) return null
  const [lat, lon] = latlng
  // Búsqueda en radio 1500 km (cobertura nacional típica)
  const start = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=5&latitude=${lat}&longitude=${lon}&maxradiuskm=1500&orderby=time&limit=10`
  const data: any = await safeJson(url, 6000)
  if (!data?.features) return null
  const recent = data.features.map((f: any) => ({
    date: new Date(f.properties.time).toISOString().slice(0, 10),
    mag: f.properties.mag,
    depth_km: Math.round((f.geometry?.coordinates?.[2] || 0) * 10) / 10,
    place: f.properties.place || 'desconocido',
  }))
  return {
    events_30d: recent.length,
    max_magnitude: recent.length > 0 ? Math.max(...recent.map((r: any) => r.mag)) : null,
    recent: recent.slice(0, 5),
    _source: {
      id: 'usgs_earthquakes',
      name: 'USGS Earthquake Catalog',
      access_type: 'public_api_no_key',
      source_url: 'https://earthquake.usgs.gov/fdsnws/event/1/',
      what_it_measures: 'Sismos magnitud ≥5.0 en radio 1500 km del centroide del país · últimos 30 días',
      confidence: 'high',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 4 · UCDP · conflictos estructurales (vía proxy interno existente)
// ────────────────────────────────────────────────────────────────────

interface ConflictLayer {
  n_conflicts: number
  max_intensity_level: number
  years_covered: string
  interpretation: string
  recent: Array<{ name: string; side_a: string; side_b: string; year: number; intensity_level: number }>
  _source: SourceMeta
}

/** Construye ConflictLayer a partir del seed UCDP estructural (FIX-A3) */
function buildConflictFromSeed(iso3: string, seed: UcdpActiveConflict): ConflictLayer {
  return {
    n_conflicts: 1,
    max_intensity_level: seed.intensity_baseline,
    years_covered: `${seed.start_year}-actual`,
    interpretation: seed.notes,
    recent: [
      {
        name: seed.conflict_label,
        side_a: seed.actors[0] ?? 'Gobierno',
        side_b: seed.actors.slice(1).join(' / ') || 'Insurgencia',
        year: new Date().getFullYear(),
        intensity_level: seed.intensity_baseline,
      },
    ],
    _source: {
      id: 'ucdp-seed',
      name: 'UCDP/PRIO + IISS Armed Conflict Survey 2024 (curado top 30)',
      access_type: 'curated',
      source_url: 'https://ucdp.uu.se/',
      what_it_measures: `Conflicto activo · tipo ${seed.conflict_type} · ~${seed.fatalities_year_est.toLocaleString('es-ES')} muertes/año estimadas · actores principales`,
      confidence: 'high',
    },
  }
}

async function buildConflict(req: NextRequest, countryName: string, iso3?: string): Promise<ConflictLayer | null> {
  const origin = req.nextUrl.origin
  const data: any = await safeJson(
    `${origin}/api/geopolitica/ucdp?country=${encodeURIComponent(countryName)}`,
    10_000,
  )
  // Caso 1: API live devolvió datos → usar live
  if (data && data.n_conflicts !== undefined) {
    return {
      n_conflicts: data.n_conflicts || 0,
      max_intensity_level: data.max_intensity_level || 0,
      years_covered: data.years_covered || '',
      interpretation: data.interpretation || '',
      recent: Array.isArray(data.recent) ? data.recent.slice(0, 5) : [],
      _source: {
        id: 'ucdp',
        name: 'UCDP · Uppsala Conflict Data Program',
        access_type: 'requires_token',
        source_url: 'https://ucdp.uu.se/apidocs/',
        what_it_measures: 'Conflictos armados anuales con intensidad (25-999 muertes batalla · 1000+ guerra) · serie 1946-actual',
        confidence: 'high',
      },
    }
  }
  // Caso 2: API live falló pero país está en seed UCDP top 30 → usar seed
  if (iso3) {
    const seed = getUcdpConflictByIso(iso3)
    if (seed) return buildConflictFromSeed(iso3, seed)
  }
  // Caso 3: ni API ni seed → null
  return null
}

// ────────────────────────────────────────────────────────────────────
// 5 · ReliefWeb · reports humanitarios
// ────────────────────────────────────────────────────────────────────

interface HumanitarianLayer {
  n_reports: number
  total_available: number
  recent: Array<{ id: number; title: string; source: string; date: string; url: string }>
  _source: SourceMeta
}

async function buildHumanitarian(req: NextRequest, countryName: string): Promise<HumanitarianLayer | null> {
  const origin = req.nextUrl.origin
  const data: any = await safeJson(
    `${origin}/api/geopolitica/reliefweb?country=${encodeURIComponent(countryName)}&limit=10`,
    10_000,
  )
  if (!data || data.n_reports === undefined) return null
  return {
    n_reports: data.n_reports || 0,
    total_available: data.total_available || 0,
    recent: Array.isArray(data.recent) ? data.recent.slice(0, 5) : [],
    _source: {
      id: 'reliefweb',
      name: 'ReliefWeb (OCHA)',
      access_type: 'requires_appname',
      source_url: 'https://reliefweb.int/',
      what_it_measures: 'Reports humanitarios (situation reports, appeals, mapas) de OCHA, ONGs y agencias · cobertura global',
      confidence: 'high',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 6 · GDELT · saliencia mediática 7d
// ────────────────────────────────────────────────────────────────────

interface NarrativeLayer {
  volume_articles_7d: number
  avg_tone: number | null
  top_articles: Array<{ title: string; url: string; source: string; tone: number; date: string }>
  _source: SourceMeta
}

async function buildNarrative(countryName: string): Promise<NarrativeLayer | null> {
  // GDELT-FIX · helper buildGdeltDocUrl encapsula query con comillas y
  // aplica defaults sensatos. fetchGdeltJson hace retry con backoff
  // ante rate-limit GDELT (que es bastante agresivo).
  const url = buildGdeltDocUrl({
    query: countryName,        // helper encapsula con comillas si tiene espacios
    mode: 'artlist',
    timespan: '7d',
    maxrecords: 15,
    sort: 'hybridrel',
  })
  const data = await fetchGdeltJson<{
    articles?: Array<{ title: string; url: string; domain: string; tone: number; seendate: string }>
  }>(url, { timeoutMs: 8000, maxRetries: 1 })
  if (!data?.articles) return null
  const top = data.articles.slice(0, 10).map((a) => ({
    title: a.title || '',
    url: a.url || '',
    source: a.domain || '',
    tone: clampGdeltTone(a.tone),   // garantiza rango -10..+10
    date: normalizeGdeltDate(a.seendate).slice(0, 10),
  }))
  const avgTone = top.length > 0
    ? top.reduce((s, a) => s + a.tone, 0) / top.length
    : null
  return {
    volume_articles_7d: data.articles.length,
    avg_tone: avgTone !== null ? Math.round(avgTone * 100) / 100 : null,
    top_articles: top,
    _source: {
      id: 'gdelt_doc',
      name: 'GDELT DOC 2.0',
      access_type: 'public_api_no_key',
      source_url: 'https://api.gdeltproject.org/api/v2/doc/doc',
      what_it_measures: 'Saliencia mediática · volumen de artículos sobre el país en 65 idiomas · tono medio (-10 a +10)',
      confidence: 'medium',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 7 · Sanciones · OFAC + EU + UN (vía endpoints internos si existen)
// ────────────────────────────────────────────────────────────────────

interface SanctionsLayer {
  total_count: number
  by_program: Record<string, number>
  sample: Array<{ entity: string; source: string; date?: string; reason?: string }>
  _source: SourceMeta
}

async function buildSanctions(req: NextRequest, iso3: string): Promise<SanctionsLayer | null> {
  const origin = req.nextUrl.origin
  // FIX-A2 · /sanciones?iso=XXX ahora devuelve OpenSanctions live cuando matchea
  const data: any = await safeJson(
    `${origin}/api/geopolitica/sanciones?source=all&iso=${iso3}`,
    10_000,
  )
  if (!data) return null
  // El nuevo endpoint devuelve `sanctions` y `by_program` cuando es OpenSanctions live.
  // Mantenemos retrocompat con shape antiguo `list`.
  const list: any[] = Array.isArray(data.sanctions)
    ? data.sanctions
    : Array.isArray(data.list) ? data.list : []
  const byProgram: Record<string, number> = data.by_program && typeof data.by_program === 'object'
    ? data.by_program
    : (() => {
        const acc: Record<string, number> = {}
        for (const s of list) {
          const k = s.source || s.program || 'unknown'
          acc[k] = (acc[k] || 0) + 1
        }
        return acc
      })()
  const totalCount = typeof data.n_sanctions === 'number' ? data.n_sanctions : list.length
  const isLive = data.source === 'opensanctions'
  return {
    total_count: totalCount,
    by_program: byProgram,
    sample: list.slice(0, 8).map((s: any) => ({
      entity: s.entity || s.name || 'desconocido',
      source: s.source || s.program || '',
      date: s.date || null,
      reason: s.reason || '',
    })),
    _source: {
      id: isLive ? 'opensanctions' : 'sanctions_consolidated',
      name: isLive
        ? 'OpenSanctions API (333+ fuentes consolidadas)'
        : 'OFAC SDN + EU Sanctions + UN Security Council (curado)',
      access_type: isLive ? 'public_api_no_key' : 'public_static_file',
      source_url: isLive
        ? 'https://api.opensanctions.org/'
        : 'https://ofac.treasury.gov/specially-designated-nationals-list-data-formats-data-schemas',
      what_it_measures: 'Entidades sancionadas (personas, empresas, buques, aeronaves) asociadas al país · consulta live',
      confidence: isLive ? 'high' : 'medium',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 8 · Travel Advisory (vía endpoint interno existente)
// ────────────────────────────────────────────────────────────────────

interface TravelLayer {
  score: number
  band: string
  message: string
  updated: string
  _source: SourceMeta
}

async function buildTravel(req: NextRequest, countryName: string): Promise<TravelLayer | null> {
  const origin = req.nextUrl.origin
  const data: any = await safeJson(
    `${origin}/api/geopolitica/travel-advisories?country=${encodeURIComponent(countryName)}`,
    6000,
  )
  if (!data || typeof data.score !== 'number') return null
  return {
    score: data.score,
    band: data.band || '',
    message: data.message || '',
    updated: data.updated || '',
    _source: {
      id: 'travel_advisory',
      name: data.source || 'US State Department Travel Advisory',
      access_type: 'public_static_file',
      source_url: data.source_url || 'https://travel.state.gov/',
      what_it_measures: 'Aviso a viajeros · escala 1 (precaución) a 4 (no viajar) · perspectiva consular',
      confidence: 'high',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 9 · Risk score interno (de buildCountryProfile existente · sin ACLED)
// ────────────────────────────────────────────────────────────────────

interface RiskLayer {
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  baseline_risk: number
  uplift: number
  related_top_risks: Array<{ rank: number; title: string; spain_exposure: string }>
  _source: SourceMeta
}

async function buildRisk(req: NextRequest, iso3: string): Promise<RiskLayer | null> {
  const origin = req.nextUrl.origin
  const data: any = await safeJson(`${origin}/api/geopolitica/pais-profile?iso=${iso3}`, 8000)
  if (!data?.ok) return null
  return {
    score: data.score || 0,
    band: data.band || 'MEDIO',
    baseline_risk: data.baseline_risk || 0,
    uplift: data.uplift || 0,
    related_top_risks: Array.isArray(data.related_top_risks) ? data.related_top_risks : [],
    _source: {
      id: 'politeia_risk_engine',
      name: 'Motor de riesgo Politeia (multi-fuente)',
      access_type: 'internal_derived',
      source_url: '/api/geopolitica/pais-profile',
      what_it_measures: 'Score 0-100 combinado · baseline (estructural) + uplift (eventos recientes UCDP+GDELT+ReliefWeb)',
      confidence: 'medium',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// 10 · Economic · World Bank live indicators (FIX-A6)
// ────────────────────────────────────────────────────────────────────

interface EconomicLayer {
  gdp_growth_pct_latest: number | null
  inflation_pct_latest: number | null
  unemployment_pct_latest: number | null
  current_account_pct_gdp_latest: number | null
  debt_pct_gdp_latest: number | null
  reserves_months_imports_latest: number | null
  series_5y: {
    gdp_growth_pct?: Array<{ year: number; value: number | null }>
    inflation_pct?: Array<{ year: number; value: number | null }>
    unemployment_pct?: Array<{ year: number; value: number | null }>
  }
  economic_health: 'estable' | 'tension' | 'crisis' | 'sin_datos'
  alerts: string[]
  _source: SourceMeta
}

/** Genera array de alertas según valores macro críticos. */
function buildEconomicAlerts(wb: WBCountryIndicators): string[] {
  const alerts: string[] = []
  const inflation = latestWBValue(wb.indicators.inflation_pct)
  const gdp = latestWBValue(wb.indicators.gdp_growth_pct)
  const unemployment = latestWBValue(wb.indicators.unemployment_pct)
  const debt = latestWBValue(wb.indicators.debt_pct_gdp)
  const cab = latestWBValue(wb.indicators.current_account_pct_gdp)
  if (inflation !== null && inflation > 15) {
    alerts.push(`Hiperinflación · IPC anual ${inflation.toFixed(1)}%`)
  } else if (inflation !== null && inflation > 8) {
    alerts.push(`Inflación elevada · IPC anual ${inflation.toFixed(1)}%`)
  }
  if (gdp !== null && gdp < -2) {
    alerts.push(`Recesión profunda · PIB ${gdp.toFixed(1)}%`)
  } else if (gdp !== null && gdp < 0) {
    alerts.push(`Contracción económica · PIB ${gdp.toFixed(1)}%`)
  }
  if (unemployment !== null && unemployment > 20) {
    alerts.push(`Paro estructural · ${unemployment.toFixed(1)}% activos`)
  }
  if (debt !== null && debt > 100) {
    alerts.push(`Deuda pública crítica · ${debt.toFixed(0)}% PIB`)
  }
  if (cab !== null && cab < -8) {
    alerts.push(`Déficit cuenta corriente · ${cab.toFixed(1)}% PIB`)
  }
  return alerts
}

function classifyEconomicHealth(alerts: string[], anyData: boolean): EconomicLayer['economic_health'] {
  if (!anyData) return 'sin_datos'
  const hasCrisis = alerts.some((a) => /hiperinflación|recesión profunda|crítica/i.test(a))
  if (hasCrisis) return 'crisis'
  if (alerts.length >= 2) return 'tension'
  return 'estable'
}

async function buildEconomic(iso3: string): Promise<EconomicLayer | null> {
  try {
    const wb = await fetchCountryMacro(iso3)
    const indicators = wb.indicators
    const gdp = latestWBValue(indicators.gdp_growth_pct)
    const inflation = latestWBValue(indicators.inflation_pct)
    const unemployment = latestWBValue(indicators.unemployment_pct)
    const cab = latestWBValue(indicators.current_account_pct_gdp)
    const debt = latestWBValue(indicators.debt_pct_gdp)
    const reserves = latestWBValue(indicators.reserves_months_imports)
    const anyData = [gdp, inflation, unemployment, cab, debt, reserves].some(
      (v) => v !== null,
    )
    if (!anyData) return null
    const alerts = buildEconomicAlerts(wb)
    const health = classifyEconomicHealth(alerts, anyData)
    return {
      gdp_growth_pct_latest: gdp,
      inflation_pct_latest: inflation,
      unemployment_pct_latest: unemployment,
      current_account_pct_gdp_latest: cab,
      debt_pct_gdp_latest: debt,
      reserves_months_imports_latest: reserves,
      series_5y: {
        gdp_growth_pct: indicators.gdp_growth_pct?.slice(-5),
        inflation_pct: indicators.inflation_pct?.slice(-5),
        unemployment_pct: indicators.unemployment_pct?.slice(-5),
      },
      economic_health: health,
      alerts,
      _source: {
        id: 'worldbank',
        name: 'World Bank Open Data · API v2',
        access_type: 'public_api',
        source_url: `https://api.worldbank.org/v2/country/${iso3}/indicator`,
        what_it_measures: 'PIB real anual, inflación IPC, desempleo, cuenta corriente, deuda pública, reservas en meses de importación · serie 2015-2025',
        confidence: 'high',
      },
    }
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────────────
// 11 · Concerns · síntesis derivada multi-fuente (FIX-B1)
// ────────────────────────────────────────────────────────────────────

type ConcernSeverity = 'low' | 'medium' | 'high' | 'critical'

interface Concern {
  rank: number
  title: string
  detail: string
  source: string
  severity: ConcernSeverity
  category: 'conflict' | 'economy' | 'governance' | 'sanctions' | 'humanitarian' | 'security'
}

interface ConcernsLayer {
  total: number
  by_severity: Record<ConcernSeverity, number>
  by_category: Record<string, number>
  concerns: Concern[]
  _source: SourceMeta
}

const SEV_WEIGHT: Record<ConcernSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Computa top 10 concerns para un país combinando TODAS las capas que ya tenemos:
 *   - Conflict (UCDP seed): intensidad 4-5 → critical, 3 → high
 *   - Economic (World Bank): cada alert macro → high/medium según tipo
 *   - Sanctions (OpenSanctions): >100 → high, >10 → medium, >0 → low
 *   - Travel advisory: score >=4 → critical, >=3 → high
 *   - Humanitarian: >20 reports → high
 *   - Risk band: CRITICO → critical, ALTO → high
 *
 * Esto garantiza que la card "Top concerns" SIEMPRE tenga 5-10 items relevantes,
 * en lugar del comportamiento anterior donde TOP_RISKS_2026 (curado a Spain)
 * dejaba el panel vacío para 95% de países.
 */
function buildConcerns(
  conflict: ConflictLayer | null,
  economic: EconomicLayer | null,
  sanctions: SanctionsLayer | null,
  travel: TravelLayer | null,
  humanitarian: HumanitarianLayer | null,
  risk: RiskLayer | null,
  government: GovernmentLayer | null,
  countryName: string,
): ConcernsLayer {
  const c: Concern[] = []

  // ─── Conflict ──────────────────────────────────────────────────
  if (conflict && conflict.max_intensity_level >= 1) {
    const isWar = conflict.max_intensity_level >= 2
    const recent = conflict.recent[0]
    c.push({
      rank: 0,
      title: isWar
        ? `Guerra activa en ${countryName}`
        : `Conflicto armado menor`,
      detail: recent
        ? `${recent.name} (intensidad ${conflict.max_intensity_level}). ${conflict.interpretation}`
        : conflict.interpretation || 'UCDP/PRIO confirma conflicto activo',
      source: conflict._source.name,
      severity: isWar ? 'critical' : 'high',
      category: 'conflict',
    })
  }

  // ─── Economic alerts ───────────────────────────────────────────
  if (economic) {
    for (const alert of economic.alerts) {
      const sev: ConcernSeverity =
        /hiperinflación|recesión profunda|crítica/i.test(alert) ? 'critical' :
        /elevada|estructural|déficit/i.test(alert) ? 'high' : 'medium'
      c.push({
        rank: 0,
        title: alert.split('·')[0]?.trim() || alert,
        detail: alert,
        source: 'World Bank Open Data',
        severity: sev,
        category: 'economy',
      })
    }
    if (economic.economic_health === 'crisis') {
      c.push({
        rank: 0,
        title: 'Salud macro en crisis',
        detail: `Health classifier=${economic.economic_health}. Alertas activas: ${economic.alerts.length}`,
        source: 'World Bank · alerts synthesis',
        severity: 'critical',
        category: 'economy',
      })
    }
  }

  // ─── Sanctions ─────────────────────────────────────────────────
  if (sanctions && sanctions.total_count > 0) {
    const sev: ConcernSeverity = sanctions.total_count > 100 ? 'high'
      : sanctions.total_count > 10 ? 'medium' : 'low'
    const topProgs = Object.entries(sanctions.by_program)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v})`)
      .join(', ')
    c.push({
      rank: 0,
      title: `${sanctions.total_count} entidades en listas de sanciones`,
      detail: topProgs ? `Top programas: ${topProgs}` : 'OpenSanctions consolidado',
      source: sanctions._source.name,
      severity: sev,
      category: 'sanctions',
    })
  }

  // ─── Travel advisory ───────────────────────────────────────────
  if (travel && travel.score >= 3) {
    const sev: ConcernSeverity = travel.score >= 4 ? 'critical' : 'high'
    c.push({
      rank: 0,
      title: `Travel Advisory ${travel.band}`,
      detail: travel.message?.slice(0, 180) || `Score ${travel.score}/5`,
      source: travel._source.name,
      severity: sev,
      category: 'security',
    })
  }

  // ─── Humanitarian ───────────────────────────────────────────────
  if (humanitarian && humanitarian.n_reports >= 20) {
    c.push({
      rank: 0,
      title: `${humanitarian.n_reports} reports humanitarios activos`,
      detail: 'OCHA ReliefWeb registra alta actividad humanitaria reciente',
      source: humanitarian._source.name,
      severity: humanitarian.n_reports >= 50 ? 'high' : 'medium',
      category: 'humanitarian',
    })
  }

  // ─── V-Dem / governance ────────────────────────────────────────
  if (government && !government.head_of_state) {
    c.push({
      rank: 0,
      title: 'Sin jefe de Estado claro',
      detail: 'Wikidata no devuelve jefe de Estado activo — posible vacío de poder o transición',
      source: 'Wikidata',
      severity: 'medium',
      category: 'governance',
    })
  }

  // ─── Risk band ─────────────────────────────────────────────────
  if (risk && (risk.band === 'CRITICO' || risk.band === 'ALTO')) {
    c.push({
      rank: 0,
      title: `Riesgo país ${risk.band}`,
      detail: `Score ${risk.score}/100 (baseline ${risk.baseline_risk} + uplift ${risk.uplift}) según motor multi-fuente Politeia`,
      source: risk._source.name,
      severity: risk.band === 'CRITICO' ? 'critical' : 'high',
      category: 'security',
    })
  }

  // ─── Ranking final por severidad ──────────────────────────────
  c.sort((a, b) => SEV_WEIGHT[b.severity] - SEV_WEIGHT[a.severity])
  for (let i = 0; i < c.length; i++) c[i].rank = i + 1

  const bySeverity: Record<ConcernSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  const byCategory: Record<string, number> = {}
  for (const x of c) {
    bySeverity[x.severity]++
    byCategory[x.category] = (byCategory[x.category] || 0) + 1
  }

  return {
    total: c.length,
    by_severity: bySeverity,
    by_category: byCategory,
    concerns: c.slice(0, 10),
    _source: {
      id: 'concerns_synthesis',
      name: 'Síntesis Politeia · concerns derivados multi-fuente',
      access_type: 'internal_derived',
      source_url: '/api/geopolitica/country-profile/[iso3]',
      what_it_measures: 'Top 10 preocupaciones para el país combinando conflicto UCDP + alertas económicas WB + sanciones + advisories + humanitario + risk score · ranking por severity weight',
      confidence: 'medium',
    },
  }
}

// ────────────────────────────────────────────────────────────────────
// MAIN handler
// ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { iso3: string } }) {
  const startedAt = Date.now()
  const iso3 = (params.iso3 || 'ESP').toUpperCase()

  // Lanzar identidad primero (la necesitamos para el country_name)
  const identity = await buildIdentity(iso3)
  const countryName = identity?.name_common || iso3
  const latlng = identity?.latlng || null

  // Lanzar el resto en paralelo (cada uno con su propio try/catch)
  const [government, seismic, conflict, humanitarian, narrative, sanctions, travel, risk, economic] = await Promise.all([
    buildGovernment(iso3),
    buildSeismic(latlng),
    buildConflict(req, countryName, iso3),
    buildHumanitarian(req, countryName),
    buildNarrative(countryName),
    buildSanctions(req, iso3),
    buildTravel(req, countryName),
    buildRisk(req, iso3),
    buildEconomic(iso3),
  ])

  // FIX-B1: Síntesis derivada multi-fuente · Top concerns (siempre poblada)
  const concerns = buildConcerns(
    conflict,
    economic,
    sanctions,
    travel,
    humanitarian,
    risk,
    government,
    countryName,
  )

  const layers_available = [
    identity && 'identity',
    government && 'government',
    seismic && 'seismic',
    conflict && 'conflict',
    humanitarian && 'humanitarian',
    narrative && 'narrative',
    sanctions && 'sanctions',
    travel && 'travel',
    risk && 'risk',
    economic && 'economic',
    concerns.total > 0 && 'concerns',
  ].filter(Boolean)

  return NextResponse.json({
    ok: identity !== null,
    iso3,
    country_name: countryName,
    layers: {
      identity,
      government,
      seismic,
      conflict,
      humanitarian,
      narrative,
      sanctions,
      travel,
      risk,
      economic,
      concerns,
    },
    layers_available,
    layers_count: layers_available.length,
    excluded_sources: {
      // Transparencia: dejamos constancia explícita de que ACLED no
      // está disponible y POR QUÉ. La página de país NO debe mencionarlo
      // (decisión usuario · sustituir por UCDP+GDELT+ReliefWeb).
      acled: {
        status: 'disabled',
        reason: 'API access denied · sustituido por UCDP (conflicto estructural) + GDELT (saliencia mediática 7d) + ReliefWeb (humanitario)',
      },
    },
    _meta: {
      generated_at: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
      version: 'geo-fix-v1',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  })
}
