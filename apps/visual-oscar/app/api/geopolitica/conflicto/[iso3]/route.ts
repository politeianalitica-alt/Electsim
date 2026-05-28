/**
 * /api/geopolitica/conflicto/[iso3] · Sprint GEO-RADAR C3
 *
 * Detalle profundo de un conflicto por país. Combina:
 *   - GDELT WAR_CONFLICT events filtrado por sourcecountry (timeline + cobertura)
 *   - V-Dem + SIPRI estáticos
 *   - Actores extraídos de los titulares (split + dedup top 5)
 *
 * Devuelve datos para las 5 sub-tabs del drawer:
 *   resumen · timeline · cobertura · impacto · actores
 *
 * Cache: s-maxage=3600.
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { COUNTRY_COORDS, isoToName } from '@/lib/geopolitica/country-coords'
import { getVdemEntry } from '@/lib/geopolitica/vdem-data'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface ConflictDetail {
  iso3: string
  name_es: string
  name_en: string
  // Resumen
  summary: {
    fase_actual: 'baja_intensidad' | 'escalada' | 'activa' | 'critica'
    duration_estimate: string                 // ej "2 años"
    actors: string[]                           // top 5 actores extraídos
    description: string                        // 2-3 frases generadas heurísticamente
  }
  // Timeline
  timeline: {
    series_daily: Array<{ date: string; events: number; avg_tone: number }>
    peaks: Array<{ date: string; events: number; note?: string }>
  }
  // Cobertura mediática
  coverage: {
    total_articles: number
    by_source: Array<{ domain: string; count: number; avg_tone: number }>
    by_country: Array<{ iso2: string; count: number; share_pct: number }>
    top_themes: Array<{ theme: string; count: number }>
    western_vs_regional_tone?: { western: number; regional: number }
  }
  // Impacto económico
  impact: {
    milex_pct_gdp: number | null
    milex_usd_bn: number | null
    milex_change_pct: number | null
    sipri_rank: number | null
    pending_blocks: string[]                   // 'commodities', 'iati', 'ports'
  }
  // Actores corporativos
  corporate: {
    pending: true                              // OpenCorporates/Comtrade no integrados
    note: string
  }
  fetched_at: string
  _meta?: { source: string; cache_ttl_seconds: number }
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'says', 'said', 'after', 'before', 'today', 'yesterday',
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'que', 'y',
])

/** Extrae actores capitalizados de los titulares · heurística simple. */
function extractActors(titles: string[]): string[] {
  const counts = new Map<string, number>()
  for (const title of titles) {
    // Match secuencias de palabras Capitalizadas (2+ palabras o nombres conocidos)
    const matches = title.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    for (const m of matches) {
      const lower = m.toLowerCase()
      if (STOPWORDS.has(lower)) continue
      if (m.length < 4) continue
      counts.set(m, (counts.get(m) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)
}

function buildDescription(name: string, events: number, tone: number, themes: string[]): string {
  const themeStr = themes.slice(0, 2).map((t) => t.toLowerCase().replace(/_/g, ' ')).join(' y ')
  const intensityLabel = events > 100 ? 'alta intensidad mediática'
    : events > 50 ? 'cobertura sostenida'
    : events > 20 ? 'señales moderadas'
    : 'señales puntuales'
  const toneLabel = tone < -5 ? 'tono fuertemente negativo'
    : tone < -2 ? 'tono negativo'
    : tone < 2 ? 'tono mixto'
    : 'tono neutro'
  return `Situación en ${name} con ${intensityLabel} (${events} artículos GDELT últimos 30 días, ${toneLabel}). Temas predominantes: ${themeStr || 'sin temas dominantes'}. Datos generados a partir de cobertura mediática agregada, no del análisis cualitativo individual de cada incidente.`
}

function phaseFrom(events: number, tone: number): ConflictDetail['summary']['fase_actual'] {
  if (events > 100 && tone < -5) return 'critica'
  if (events > 50) return 'activa'
  if (events > 20) return 'escalada'
  return 'baja_intensidad'
}

function aggregateByDay(articles: any[]): Array<{ date: string; events: number; avg_tone: number }> {
  const map = new Map<string, { count: number; toneSum: number }>()
  for (const a of articles) {
    const date = (normalizeGdeltDate(a.seendate) || '').slice(0, 10)
    if (!date) continue
    const cur = map.get(date) || { count: 0, toneSum: 0 }
    cur.count++
    cur.toneSum += typeof a.tone === 'number' ? a.tone : 0
    map.set(date, cur)
  }
  const series = [...map.entries()].map(([date, v]) => ({
    date,
    events: v.count,
    avg_tone: Math.round((v.toneSum / v.count) * 100) / 100,
  }))
  return series.sort((a, b) => a.date.localeCompare(b.date))
}

function detectPeaks(series: { date: string; events: number }[]): Array<{ date: string; events: number; note?: string }> {
  if (series.length < 3) return []
  const max = Math.max(...series.map((s) => s.events))
  return series.filter((s) => s.events >= max * 0.7).map((s) => ({
    date: s.date,
    events: s.events,
    note: s.events === max ? 'pico máximo' : 'pico relevante',
  }))
}

export async function GET(req: NextRequest, { params }: { params: { iso3: string } }) {
  const startedAt = new Date().toISOString()
  const iso3 = params.iso3.toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json({
      ok: false,
      error: `iso3_unknown · pais ${iso3} no en catálogo`,
    }, { status: 404 })
  }

  // 1 query GDELT principal · 30d artículos del país
  const url = buildGdeltDocUrl({
    query: coord.name_en,
    theme: 'WAR_CONFLICT',
    timespan: '30d',
    mode: 'artlist',
    maxrecords: 250,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 12000, maxRetries: 1 })
  const articles = (json?.articles || []) as any[]

  const totalArticles = articles.length
  const tones = articles.map((a) => a.tone).filter((t) => typeof t === 'number')
  const avgTone = tones.length > 0
    ? Math.round((tones.reduce((s, t) => s + t, 0) / tones.length) * 100) / 100
    : 0

  // Themes y sources
  const themeCount = new Map<string, number>()
  const sourceCount = new Map<string, { count: number; toneSum: number }>()
  const sourceCountryCount = new Map<string, number>()
  for (const a of articles) {
    const themes = (a.themes || '').split(';').filter(Boolean) as string[]
    for (const t of themes) themeCount.set(t, (themeCount.get(t) || 0) + 1)
    if (a.domain) {
      const cur = sourceCount.get(a.domain) || { count: 0, toneSum: 0 }
      cur.count++
      cur.toneSum += typeof a.tone === 'number' ? a.tone : 0
      sourceCount.set(a.domain, cur)
    }
    const sc = (a.sourcecountry || '').toUpperCase()
    if (sc) sourceCountryCount.set(sc, (sourceCountryCount.get(sc) || 0) + 1)
  }

  const topThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([theme, count]) => ({ theme, count }))
  const bySource = [...sourceCount.entries()]
    .sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    .map(([domain, v]) => ({
      domain, count: v.count,
      avg_tone: Math.round((v.toneSum / v.count) * 100) / 100,
    }))
  const byCountry = [...sourceCountryCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([iso2, count]) => ({
      iso2, count,
      share_pct: totalArticles > 0 ? Math.round((count / totalArticles) * 1000) / 10 : 0,
    }))

  // Western vs regional tone (heurística: USA/UK/DE/FR vs todo lo demás)
  const westernCountries = new Set(['US', 'GB', 'DE', 'FR', 'NL', 'IT', 'ES', 'CA', 'AU'])
  let westernTone = 0, westernCount = 0, regionalTone = 0, regionalCount = 0
  for (const a of articles) {
    if (typeof a.tone !== 'number') continue
    const sc = (a.sourcecountry || '').toUpperCase()
    if (westernCountries.has(sc)) {
      westernTone += a.tone; westernCount++
    } else if (sc && sc !== coord.iso2) {
      regionalTone += a.tone; regionalCount++
    }
  }
  const westernVsRegional = westernCount > 0 && regionalCount > 0 ? {
    western: Math.round((westernTone / westernCount) * 100) / 100,
    regional: Math.round((regionalTone / regionalCount) * 100) / 100,
  } : undefined

  // Actores y resumen
  const titles = articles.map((a) => a.title).filter(Boolean) as string[]
  const actors = extractActors(titles)
  const description = buildDescription(coord.name_es, totalArticles, avgTone, topThemes.map((t) => t.theme))

  // Timeline
  const seriesDaily = aggregateByDay(articles)
  const peaks = detectPeaks(seriesDaily)

  // SIPRI
  const sipri = getSipriEntry(iso3)
  const milexChange = sipri?.change_vs_2022_pct ?? null

  const detail: ConflictDetail = {
    iso3,
    name_es: coord.name_es,
    name_en: coord.name_en,
    summary: {
      fase_actual: phaseFrom(totalArticles, avgTone),
      duration_estimate: totalArticles > 50 ? 'conflicto sostenido (>1 mes activo)' : 'señal reciente',
      actors,
      description,
    },
    timeline: {
      series_daily: seriesDaily,
      peaks,
    },
    coverage: {
      total_articles: totalArticles,
      by_source: bySource,
      by_country: byCountry,
      top_themes: topThemes,
      western_vs_regional_tone: westernVsRegional,
    },
    impact: {
      milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
      milex_usd_bn: sipri?.milex_usd_bn ?? null,
      milex_change_pct: milexChange,
      sipri_rank: sipri?.world_rank ?? null,
      pending_blocks: ['commodities (Alpha Vantage/FRED)', 'iati (ayuda humanitaria)', 'ports (rutas marítimas)'],
    },
    corporate: {
      pending: true,
      note: 'OpenCorporates + UN Comtrade no integrados en este sprint. Consultar manualmente en opencorporates.com y comtradeplus.un.org filtrando por país.',
    },
    fetched_at: startedAt,
    _meta: {
      source: 'GDELT DOC v2 + V-Dem v15 + SIPRI 2024',
      cache_ttl_seconds: 3600,
    },
  }

  return NextResponse.json({
    ok: true,
    detail,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
