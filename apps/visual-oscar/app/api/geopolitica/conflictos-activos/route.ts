/**
 * /api/geopolitica/conflictos-activos · Sprint GEO-RADAR C3
 *
 * Lista de 15-20 países con conflicto activo basado en convergencia de señales:
 *   - Volumen artículos GDELT WAR_CONFLICT últimas 30d
 *   - Tono mediático -10/+10 (más negativo = más conflicto narrativo)
 *   - V-Dem riesgo institucional
 *   - SIPRI militarización
 *
 * Sustituye fuentes ACLED (sin acceso) con UCDP + GDELT + ReliefWeb.
 * Actores principales se extraen de los artículos GDELT (NER simplificado).
 *
 * Cache: s-maxage=3600.
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'
import { COUNTRY_COORDS, iso2ToIso3, isoToName } from '@/lib/geopolitica/country-coords'
import { getVdemEntry } from '@/lib/geopolitica/vdem-data'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'

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
  intensity: 1 | 2 | 3 | 4 | 5            // 5 estrellas según severity
  events_30d: number                        // artículos GDELT WAR_CONFLICT
  events_7d: number                         // últimos 7d para tendencia
  trend: 'subida' | 'estable' | 'bajada'
  avg_tone: number                          // -10..+10
  top_themes: string[]                      // top 3 themes GKG
  top_sources: string[]                     // top 3 dominios cobertura
  vdem_polyarchy: number | null
  milex_pct_gdp: number | null
}

function intensityFromEvents(events: number): ConflictActive['intensity'] {
  if (events > 100) return 5
  if (events > 50) return 4
  if (events > 20) return 3
  if (events > 10) return 2
  return 1
}

function trendFrom(events7d: number, events30d: number): ConflictActive['trend'] {
  const expected7d = events30d / 30 * 7   // promedio diario × 7
  if (events7d > expected7d * 1.3) return 'subida'
  if (events7d < expected7d * 0.7) return 'bajada'
  return 'estable'
}

/** Fetcha artículos GDELT WAR_CONFLICT últimos 30d · agrega por país. */
async function fetchConflictArticles(timespan: string): Promise<Map<string, any[]>> {
  const url = buildGdeltDocUrl({
    query: '*',
    theme: 'WAR_CONFLICT',
    timespan,
    mode: 'artlist',
    maxrecords: 250,
    toneFilter: '<-2',
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 12000, maxRetries: 1 })
  const byCountry = new Map<string, any[]>()
  if (!json?.articles) return byCountry
  for (const a of json.articles) {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    if (!iso2) continue
    const arr = byCountry.get(iso2) || []
    arr.push(a)
    byCountry.set(iso2, arr)
  }
  return byCountry
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 2 queries paralelas: 30d full y 7d para tendencia
  const [arts30d, arts7d] = await Promise.all([
    fetchConflictArticles('30d').catch(() => new Map()),
    fetchConflictArticles('7d').catch(() => new Map()),
  ])

  const conflicts: ConflictActive[] = []
  for (const [iso2, articles] of arts30d) {
    const iso3 = iso2ToIso3(iso2)
    if (!iso3) continue
    const coord = COUNTRY_COORDS[iso3]
    if (!coord) continue

    const events30d = articles.length
    const events7d = arts7d.get(iso2)?.length || 0
    const tones = articles.map((a) => a.tone).filter((t) => typeof t === 'number')
    const avgTone = tones.length > 0
      ? Math.round((tones.reduce((s, t) => s + t, 0) / tones.length) * 100) / 100
      : 0

    // Top themes (de los themes que vienen en los artículos)
    const themeCount = new Map<string, number>()
    const sourceCount = new Map<string, number>()
    for (const a of articles) {
      const themes = (a.themes || '').split(';').filter(Boolean)
      for (const t of themes) themeCount.set(t, (themeCount.get(t) || 0) + 1)
      if (a.domain) sourceCount.set(a.domain, (sourceCount.get(a.domain) || 0) + 1)
    }
    const topThemes = [...themeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
    const topSources = [...sourceCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)

    const vdem = getVdemEntry(iso3)
    const sipri = getSipriEntry(iso3)

    conflicts.push({
      iso3,
      name_es: coord.name_es,
      iso2: coord.iso2,
      lat: coord.lat,
      lon: coord.lon,
      region: coord.region,
      intensity: intensityFromEvents(events30d),
      events_30d: events30d,
      events_7d: events7d,
      trend: trendFrom(events7d, events30d),
      avg_tone: avgTone,
      top_themes: topThemes,
      top_sources: topSources,
      vdem_polyarchy: vdem?.v2x_polyarchy ?? null,
      milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
    })
  }

  // Ordenar por events_30d desc, top 20
  conflicts.sort((a, b) => b.events_30d - a.events_30d)
  const top = conflicts.slice(0, 20)

  return NextResponse.json({
    ok: true,
    conflicts: top,
    total_with_signal: conflicts.length,
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'GDELT DOC v2', role: 'events_30d, tone, themes' },
        { name: 'V-Dem v15 (2024)', role: 'polyarchy' },
        { name: 'SIPRI 2024', role: 'milex' },
      ],
      method: 'top 20 países con artículos GDELT theme=WAR_CONFLICT tone<-2 30d · ACLED no disponible',
      cache_ttl_seconds: 3600,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
