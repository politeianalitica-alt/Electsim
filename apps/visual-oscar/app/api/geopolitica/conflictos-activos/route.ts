/**
 * /api/geopolitica/conflictos-activos · Sprint GEO-NEXT FIX-A3
 *
 * Mapa de conflictos armados activos · top 30 globales.
 *
 * Arquitectura defensiva en dos capas:
 *
 *   CAPA 1 (estructural, siempre presente):
 *     - UCDP/PRIO + IISS top 30 conflictos activos (baseline 2025-Q4)
 *     - Intensidad, tipo, actores, fatalidades anuales, themes UCDP
 *     - Cruzado con V-Dem v15 + SIPRI 2024 + COUNTRY_COORDS
 *
 *   CAPA 2 (táctica, mejor esfuerzo):
 *     - Eventos GDELT WAR_CONFLICT últimos 30d para volumen/tono/themes
 *     - Tendencia 7d vs 30d
 *     - Top medios de cobertura
 *     - Si GDELT está rate-limited, se omite esta capa pero el mapa NO queda vacío
 *
 * Esto garantiza que el mapa siempre muestre los conflictos UCDP aunque GDELT
 * devuelva 429. Cuando GDELT responde, los datos se enriquecen con señal en
 * tiempo real (volumen mediático, tono, tendencia).
 *
 * Reemplaza el endpoint anterior que dependía 100% de GDELT.
 *
 * Cache: s-maxage=3600.
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'
import {
  COUNTRY_COORDS,
  iso2ToIso3,
} from '@/lib/geopolitica/country-coords'
import { getVdemEntry } from '@/lib/geopolitica/vdem-data'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'
import {
  UCDP_ACTIVE_CONFLICTS,
  type UcdpActiveConflict,
  type UcdpIntensity,
} from '@/lib/geopolitica/ucdp-active-conflicts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface ConflictActive {
  iso3: string
  name_es: string
  iso2: string
  lat: number
  lon: number
  region: string
  // ── Datos UCDP estructurales (siempre presentes) ─────────────────
  conflict_label: string
  conflict_type: 'state-based' | 'non-state' | 'one-sided'
  intensity: UcdpIntensity
  intensity_baseline: UcdpIntensity
  start_year: number
  actors: string[]
  fatalities_year_est: number
  notes: string
  // ── Datos GDELT (opcionales, null si rate-limited) ───────────────
  events_30d: number
  events_7d: number
  trend: 'subida' | 'estable' | 'bajada'
  avg_tone: number   // 0 si has_gdelt_signal=false
  top_themes: string[]
  top_sources: string[]
  // ── Datos estructurales contexto ─────────────────────────────────
  vdem_polyarchy: number | null
  milex_pct_gdp: number | null
  // ── Diagnóstico transparencia ────────────────────────────────────
  has_gdelt_signal: boolean
  source: 'ucdp-baseline' | 'ucdp+gdelt' | 'gdelt-only'
}

/** Recalcula intensidad combinando baseline UCDP con volumen GDELT. */
function intensityCombined(
  baseline: UcdpIntensity,
  events30d: number,
): UcdpIntensity {
  // Si GDELT muestra fuerte escalada (>150 eventos), sube 1 nivel respecto a baseline
  if (events30d > 150 && baseline < 5) return (baseline + 1) as UcdpIntensity
  // Si GDELT muestra silencio absoluto (<5 eventos) y baseline alto, mantenemos baseline
  // (no bajamos por falta de cobertura mediática, puede ser censura/restricción info)
  return baseline
}

function trendFrom(
  events7d: number,
  events30d: number,
): ConflictActive['trend'] {
  if (events30d === 0) return 'estable'
  const expected7d = (events30d / 30) * 7
  if (events7d > expected7d * 1.3) return 'subida'
  if (events7d < expected7d * 0.7) return 'bajada'
  return 'estable'
}

/** Fetcha artículos GDELT WAR_CONFLICT, agrega por país. Devuelve null si falla. */
async function fetchConflictArticles(
  timespan: string,
): Promise<Map<string, Array<{ themes?: string; domain?: string; tone?: number }>> | null> {
  const url = buildGdeltDocUrl({
    query: '*',
    theme: 'WAR_CONFLICT',
    timespan,
    mode: 'artlist',
    maxrecords: 250,
    toneFilter: '<-2',
  })
  try {
    const json = await fetchGdeltJson<{
      articles?: Array<{
        sourcecountry?: string
        themes?: string
        domain?: string
        tone?: number
      }>
    }>(url, { timeoutMs: 12000, maxRetries: 1 })
    if (!json?.articles) return null
    const byCountry = new Map<string, Array<{ themes?: string; domain?: string; tone?: number }>>()
    for (const a of json.articles) {
      const iso2 = (a.sourcecountry || '').toUpperCase()
      if (!iso2) continue
      const arr = byCountry.get(iso2) || []
      arr.push(a)
      byCountry.set(iso2, arr)
    }
    return byCountry
  } catch {
    return null
  }
}

function enrichFromUcdp(
  entry: UcdpActiveConflict,
  arts30d: Map<string, Array<{ themes?: string; domain?: string; tone?: number }>> | null,
  arts7d: Map<string, Array<{ themes?: string; domain?: string; tone?: number }>> | null,
): ConflictActive | null {
  const coord = COUNTRY_COORDS[entry.iso3]
  if (!coord) return null

  const articles30d = arts30d?.get(coord.iso2.toUpperCase()) ?? []
  const articles7d = arts7d?.get(coord.iso2.toUpperCase()) ?? []
  const events30d = articles30d.length
  const events7d = articles7d.length

  // Tono medio si hay artículos (0 cuando no hay señal GDELT)
  let avgTone = 0
  if (articles30d.length > 0) {
    const tones = articles30d
      .map((a) => a.tone)
      .filter((t): t is number => typeof t === 'number')
    if (tones.length > 0) {
      avgTone = Math.round(
        (tones.reduce((s, t) => s + t, 0) / tones.length) * 100,
      ) / 100
    }
  }

  // Top themes y sources de los artículos
  const themeCount = new Map<string, number>()
  const sourceCount = new Map<string, number>()
  for (const a of articles30d) {
    const themes = (a.themes || '').split(';').filter(Boolean)
    for (const t of themes) themeCount.set(t, (themeCount.get(t) || 0) + 1)
    if (a.domain) sourceCount.set(a.domain, (sourceCount.get(a.domain) || 0) + 1)
  }
  const topThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
  const topSources = [...sourceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)

  // Si GDELT no tiene themes, usamos los del baseline UCDP
  const finalThemes = topThemes.length > 0 ? topThemes : entry.themes.slice(0, 3)

  const vdem = getVdemEntry(entry.iso3)
  const sipri = getSipriEntry(entry.iso3)

  return {
    iso3: entry.iso3,
    name_es: coord.name_es,
    iso2: coord.iso2,
    lat: coord.lat,
    lon: coord.lon,
    region: coord.region,
    conflict_label: entry.conflict_label,
    conflict_type: entry.conflict_type,
    intensity: intensityCombined(entry.intensity_baseline, events30d),
    intensity_baseline: entry.intensity_baseline,
    start_year: entry.start_year,
    actors: entry.actors,
    fatalities_year_est: entry.fatalities_year_est,
    notes: entry.notes,
    events_30d: events30d,
    events_7d: events7d,
    trend: trendFrom(events7d, events30d),
    avg_tone: avgTone,
    top_themes: finalThemes,
    top_sources: topSources,
    vdem_polyarchy: vdem?.v2x_polyarchy ?? null,
    milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
    has_gdelt_signal: events30d > 0,
    source: events30d > 0 ? 'ucdp+gdelt' : 'ucdp-baseline',
  }
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 2 queries paralelas: 30d full y 7d para tendencia
  // Si GDELT falla (429, timeout, parse), las maps serán null pero el seed UCDP sigue intacto
  const [arts30d, arts7d] = await Promise.all([
    fetchConflictArticles('30d'),
    fetchConflictArticles('7d'),
  ])

  const gdeltAvailable = arts30d !== null

  // CAPA 1: enriquecer cada conflicto UCDP del seed
  const conflicts: ConflictActive[] = []
  for (const entry of UCDP_ACTIVE_CONFLICTS) {
    const enriched = enrichFromUcdp(entry, arts30d, arts7d)
    if (enriched) conflicts.push(enriched)
  }

  // CAPA 2: añadir países con señal GDELT fuerte que NO están en seed UCDP
  // (catch para hotspots emergentes: crisis Bangladesh, Senegal, Georgia...)
  if (arts30d) {
    const ucdpIso3Set = new Set(UCDP_ACTIVE_CONFLICTS.map((c) => c.iso3))
    for (const [iso2, articles] of arts30d) {
      const iso3 = iso2ToIso3(iso2)
      if (!iso3) continue
      if (ucdpIso3Set.has(iso3)) continue
      const coord = COUNTRY_COORDS[iso3]
      if (!coord) continue
      // Solo añadir si tiene volumen significativo (>30 eventos negativos)
      if (articles.length < 30) continue

      const articles7d = arts7d?.get(iso2) ?? []
      const tones = articles
        .map((a) => a.tone)
        .filter((t): t is number => typeof t === 'number')
      const avgTone = tones.length > 0
        ? Math.round(
            (tones.reduce((s, t) => s + t, 0) / tones.length) * 100,
          ) / 100
        : 0

      const themeCount = new Map<string, number>()
      const sourceCount = new Map<string, number>()
      for (const a of articles) {
        const themes = (a.themes || '').split(';').filter(Boolean)
        for (const t of themes) themeCount.set(t, (themeCount.get(t) || 0) + 1)
        if (a.domain) sourceCount.set(a.domain, (sourceCount.get(a.domain) || 0) + 1)
      }
      const topThemes = [...themeCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k)
      const topSources = [...sourceCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k)

      const vdem = getVdemEntry(iso3)
      const sipri = getSipriEntry(iso3)

      conflicts.push({
        iso3,
        name_es: coord.name_es,
        iso2: coord.iso2,
        lat: coord.lat,
        lon: coord.lon,
        region: coord.region,
        conflict_label: `Señal GDELT — ${coord.name_es}`,
        conflict_type: 'one-sided',
        intensity: articles.length > 100 ? 3 : 2,
        intensity_baseline: 1,
        start_year: new Date().getFullYear(),
        actors: ['Sin clasificar (señal GDELT emergente)'],
        fatalities_year_est: 0,
        notes: 'País NO en seed UCDP pero con volumen sostenido de cobertura mediática negativa. Revisar manualmente para confirmar.',
        events_30d: articles.length,
        events_7d: articles7d.length,
        trend: trendFrom(articles7d.length, articles.length),
        avg_tone: avgTone,
        top_themes: topThemes,
        top_sources: topSources,
        vdem_polyarchy: vdem?.v2x_polyarchy ?? null,
        milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
        has_gdelt_signal: true,
        source: 'gdelt-only',
      })
    }
  }

  // Ordenar: 1º intensidad desc, 2º events_30d desc, 3º fatalities desc
  conflicts.sort((a, b) => {
    if (b.intensity !== a.intensity) return b.intensity - a.intensity
    if (b.events_30d !== a.events_30d) return b.events_30d - a.events_30d
    return b.fatalities_year_est - a.fatalities_year_est
  })

  // KPIs agregados
  const total = conflicts.length
  const totalWithGdelt = conflicts.filter((c) => c.has_gdelt_signal).length
  const totalEvents30d = conflicts.reduce((s, c) => s + c.events_30d, 0)
  const totalFatalities = conflicts.reduce((s, c) => s + c.fatalities_year_est, 0)
  const conflictsByIntensity: Record<UcdpIntensity, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }
  for (const c of conflicts) conflictsByIntensity[c.intensity]++

  return NextResponse.json(
    {
      ok: true,
      conflicts,
      // ── Backward compat con consumers anteriores ─────────────────────
      total_with_signal: totalWithGdelt,
      summary: {
        total_conflicts: total,
        total_with_gdelt_signal: totalWithGdelt,
        total_events_30d: totalEvents30d,
        total_fatalities_year_est: totalFatalities,
        by_intensity: conflictsByIntensity,
        gdelt_available: gdeltAvailable,
      },
      fetched_at: startedAt,
      _meta: {
        sources: [
          { name: 'UCDP/PRIO + IISS Armed Conflict Survey 2024', role: 'seed estructural 30 conflictos · intensity, type, actors, fatalities' },
          { name: 'GDELT DOC v2 (WAR_CONFLICT, tone<-2)', role: 'enriquecimiento táctico · events_30d, tone, themes, sources' },
          { name: 'V-Dem v15 (2024)', role: 'polyarchy contexto institucional' },
          { name: 'SIPRI 2024', role: 'milex_pct_gdp contexto militar' },
        ],
        method: gdeltAvailable
          ? 'top 30 UCDP/PRIO conflictos activos + enriquecimiento GDELT v2 (volumen, tono, themes, sources últimos 30d) + 7d para tendencia + países emergentes con >30 eventos GDELT no en seed'
          : 'top 30 UCDP/PRIO conflictos activos (GDELT no disponible — capa táctica omitida, seed estructural íntegro)',
        capa_a_status: 'ok',
        capa_b_status: gdeltAvailable ? 'ok' : 'rate-limited',
        cache_ttl_seconds: 3600,
        version: 'FIX-A3 · UCDP seed + GDELT augmentation',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800',
      },
    },
  )
}
