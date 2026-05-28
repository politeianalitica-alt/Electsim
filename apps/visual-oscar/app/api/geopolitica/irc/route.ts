/**
 * /api/geopolitica/irc · Sprint GEO-RADAR C1
 *
 * Índice de Riesgo Compuesto (IRC) por país, escala 0-100.
 *
 * Componentes del IRC (ponderaciones):
 *   - V-Dem · riesgo autocrático (1 - v2x_polyarchy)        [40%]  fuente estática local
 *   - SIPRI · militarización (>5% PIB tensiona el sistema)  [15%]  fuente estática local
 *   - GDELT GKG · tono mediático país últimas 48h (invertido) [30%]  fuente API
 *   - GDELT volumen conflictos (themes: WAR_CONFLICT, KILL)  [15%]  fuente API
 *
 * Sustituye a ACLED (sin acceso) con UCDP estructural cuando esté disponible.
 * Sin ACLED en UI · cita explícita V-Dem + SIPRI + GDELT + ReliefWeb.
 *
 * Cache: s-maxage=1800 (30 min · datos cambian poco intra-día).
 * Si GDELT falla: devuelve componentes estáticos (V-Dem + SIPRI) + nota.
 */
import { NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getVdemEntry, vdemRiskComponent, VDEM_COUNTRIES_COUNT } from '@/lib/geopolitica/vdem-data'
import { getSipriEntry, militarizationRisk, SIPRI_COUNTRIES_COUNT } from '@/lib/geopolitica/sipri-data'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface CountryIRC {
  iso3: string
  name_es: string
  name_en: string
  iso2: string
  lat: number
  lon: number
  region: string
  irc: number                        // 0-100 score compuesto
  components: {
    vdem_risk: number | null         // 0-100 (1 - polyarchy) * 100
    militarization: number | null    // 0-100 según % GDP militar
    gdelt_tone: number | null        // 0-100 invertido (más negativo = más alto)
    gdelt_volume: number | null      // 0-100 según volumen artículos conflicto
  }
  raw: {
    polyarchy: number | null         // 0-1 V-Dem
    polyarchy_trend?: string         // 'mejora'|'regresion'|...
    milex_pct_gdp: number | null     // %
    milex_usd_bn: number | null
    gdelt_tone_value?: number        // -10 a +10 raw
    gdelt_articles_48h?: number
  }
  risk_level: 'bajo' | 'moderado' | 'alto' | 'critico'
}

function ircLevel(irc: number): CountryIRC['risk_level'] {
  if (irc >= 75) return 'critico'
  if (irc >= 55) return 'alto'
  if (irc >= 35) return 'moderado'
  return 'bajo'
}

/** Convierte tono GDELT (-10 a +10) a score riesgo (0-100). Más negativo = más alto. */
function gdeltToneToRisk(tone: number | null): number | null {
  if (tone === null) return null
  // tone -10 → risk 100, tone 0 → risk 50, tone +10 → risk 0
  const clamped = Math.max(-10, Math.min(10, tone))
  return Math.round(((-clamped + 10) / 20) * 100)
}

/** Convierte volumen artículos a score riesgo (0-100) con curva log. */
function volumeToRisk(articles: number | null): number | null {
  if (articles === null) return null
  // 0 articulos → 0, 100 → 50, 1000+ → 100 (log scale)
  if (articles === 0) return 0
  const logged = Math.log10(articles + 1) / Math.log10(1001)
  return Math.round(Math.min(100, logged * 100))
}

/** Combina componentes con ponderaciones · ignora nulls redistribuyendo pesos. */
function computeIRC(c: CountryIRC['components']): number {
  const weights = { vdem_risk: 40, militarization: 15, gdelt_tone: 30, gdelt_volume: 15 }
  let sumWeights = 0, sumValues = 0
  if (c.vdem_risk !== null) { sumValues += c.vdem_risk * weights.vdem_risk; sumWeights += weights.vdem_risk }
  if (c.militarization !== null) { sumValues += c.militarization * weights.militarization; sumWeights += weights.militarization }
  if (c.gdelt_tone !== null) { sumValues += c.gdelt_tone * weights.gdelt_tone; sumWeights += weights.gdelt_tone }
  if (c.gdelt_volume !== null) { sumValues += c.gdelt_volume * weights.gdelt_volume; sumWeights += weights.gdelt_volume }
  return sumWeights === 0 ? 50 : Math.round(sumValues / sumWeights)
}

interface GdeltAggregate {
  tones: Map<string, { sum: number; n: number }>   // iso2 → tone medio (todas las noticias)
  volumes: Map<string, number>                     // iso2 → artículos conflict (48h)
}

/**
 * Obtiene tono medio + volumen de conflictos por país en UNA SOLA pasada.
 *
 * Estrategia: una única query GDELT DOC artlist con maxrecords=250 que
 * captura una muestra global de noticias internacionales. Por cada artículo
 * agregamos:
 *   - sourcecountry + tone → tones aggregator (todas las noticias)
 *   - sourcecountry + theme contiene WAR_CONFLICT → volumes counter
 *
 * Esto sustituye al planteamiento anterior de 2 queries paralelas (una
 * para timelinesourcecountry que no parseaba bien y otra para
 * conflict artlist). Con 1 query reducimos rate-limit risk de Vercel a
 * GDELT a la mitad y obtenemos datos reales en lugar de timeline vacío.
 *
 * Fallback: si la query falla devolvemos maps vacíos · IRC se calcula
 * con V-Dem + SIPRI solo (los componentes GDELT serán null y se
 * redistribuye el peso).
 */
async function fetchGdeltAggregate(): Promise<GdeltAggregate> {
  const tones = new Map<string, { sum: number; n: number }>()
  const volumes = new Map<string, number>()

  // Query amplia: noticias globales 48h, ordenadas por tono más negativo
  // (mejor cobertura de temas críticos vs feed generalista)
  const url = buildGdeltDocUrl({
    query: '*',
    timespan: '48h',
    mode: 'artlist',
    maxrecords: 250,
    sort: 'tonedesc',  // priorizar tono extremo (positivo o negativo)
  })

  try {
    const json = await fetchGdeltJson<{
      articles?: Array<{
        sourcecountry?: string
        tone?: number
        themes?: string
      }>
    }>(url, { timeoutMs: 9000, maxRetries: 1 })
    if (!json?.articles) return { tones, volumes }

    for (const a of json.articles) {
      const iso2 = (a.sourcecountry || '').toUpperCase()
      if (!iso2) continue

      // Acumular tono solo si es número válido
      if (typeof a.tone === 'number' && !isNaN(a.tone)) {
        const cur = tones.get(iso2) ?? { sum: 0, n: 0 }
        cur.sum += a.tone
        cur.n += 1
        tones.set(iso2, cur)
      }

      // Contar artículos con tema WAR_CONFLICT/KILL/INSURGENCY
      const themes = (a.themes || '').toUpperCase()
      if (
        themes.includes('WAR_CONFLICT') ||
        themes.includes('KILL') ||
        themes.includes('INSURGENCY') ||
        themes.includes('TERROR_ATTACK') ||
        themes.includes('PROTEST')
      ) {
        volumes.set(iso2, (volumes.get(iso2) || 0) + 1)
      }
    }
  } catch {
    // GDELT fallido · devolver maps vacíos · IRC usa solo V-Dem+SIPRI
  }
  return { tones, volumes }
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 1 SOLA query GDELT que devuelve tones y volumes por país (FIX-A4)
  // (antes: 2 queries y la de tone retornaba siempre vacía por bug parsing)
  const { tones: tonesByISO2, volumes: volumesByISO2 } = await fetchGdeltAggregate()
  const gdeltAvailable = tonesByISO2.size > 0 || volumesByISO2.size > 0

  // Calcular IRC para cada país del catálogo
  const countries: CountryIRC[] = []
  for (const [iso3, coord] of Object.entries(COUNTRY_COORDS)) {
    const vdem = getVdemEntry(iso3)
    const sipri = getSipriEntry(iso3)
    const toneEntry = tonesByISO2.get(coord.iso2)
    const tone = toneEntry && toneEntry.n > 0
      ? Math.round((toneEntry.sum / toneEntry.n) * 100) / 100
      : null
    const volume = volumesByISO2.get(coord.iso2) ?? null

    const components = {
      vdem_risk: vdem ? vdemRiskComponent(iso3) : null,
      militarization: sipri ? militarizationRisk(iso3) : null,
      gdelt_tone: gdeltToneToRisk(tone),
      gdelt_volume: volumeToRisk(volume),
    }
    const irc = computeIRC(components)

    countries.push({
      iso3, name_es: coord.name_es, name_en: coord.name_en, iso2: coord.iso2,
      lat: coord.lat, lon: coord.lon, region: coord.region,
      irc, components,
      raw: {
        polyarchy: vdem?.v2x_polyarchy ?? null,
        polyarchy_trend: vdem?.trend_5y,
        milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
        milex_usd_bn: sipri?.milex_usd_bn ?? null,
        gdelt_tone_value: tone ?? undefined,
        gdelt_articles_48h: volume ?? undefined,
      },
      risk_level: ircLevel(irc),
    })
  }

  // Métricas agregadas
  const criticalCount = countries.filter((c) => c.risk_level === 'critico').length
  const highCount = countries.filter((c) => c.risk_level === 'alto').length
  const globalTone = countries
    .map((c) => c.raw.gdelt_tone_value)
    .filter((t): t is number => typeof t === 'number')
  const avgGlobalTone = globalTone.length > 0
    ? Math.round((globalTone.reduce((s, t) => s + t, 0) / globalTone.length) * 100) / 100
    : null

  // Total artículos conflict últimas 48h (suma absoluta)
  const totalConflictArticles48h = Array.from(volumesByISO2.values()).reduce(
    (s, n) => s + n,
    0,
  )

  return NextResponse.json({
    ok: true,
    countries,
    summary: {
      total_countries: countries.length,
      critical_risk_count: criticalCount,
      high_risk_count: highCount,
      avg_global_tone: avgGlobalTone,
      total_conflict_articles_48h: totalConflictArticles48h,
      countries_with_gdelt_signal: tonesByISO2.size,
      vdem_coverage: VDEM_COUNTRIES_COUNT,
      sipri_coverage: SIPRI_COUNTRIES_COUNT,
      gdelt_available: gdeltAvailable,
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'V-Dem Institute v15 (2024)', url: 'https://v-dem.net/data/', weight_pct: 40, role: 'riesgo autocrático' },
        { name: 'SIPRI Military Expenditure 2024', url: 'https://www.sipri.org/databases/milex', weight_pct: 15, role: 'militarización' },
        { name: 'GDELT DOC v2 (artlist 250 sample 48h)', url: 'https://api.gdeltproject.org/api/v2/doc/doc', weight_pct: 30, role: 'tono mediático 48h · 1 query agregada' },
        { name: 'GDELT artículos WAR_CONFLICT/KILL/PROTEST', url: 'https://api.gdeltproject.org/', weight_pct: 15, role: 'volumen conflictos · derivado del mismo sample' },
      ],
      cache_ttl_seconds: 1800,
      methodology: 'IRC = ponderado ignorando nulls · escala 0-100 · niveles: <35 bajo, 35-55 moderado, 55-75 alto, ≥75 crítico · 1 query GDELT con sample 250 artículos sort=tonedesc cubre tone+volume',
      note: 'ACLED no disponible (acceso denegado mayo 2026) · sustituido por V-Dem + GDELT + SIPRI con UCDP en endpoints específicos',
      version: 'FIX-A4 · 1 query GDELT agregada (tone+volume) · pre: 2 queries con bug parsing en timelinesourcecountry',
      capa_gdelt_status: gdeltAvailable ? 'ok' : 'rate-limited',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200' },
  })
}
