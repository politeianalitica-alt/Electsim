/**
 * /api/geopolitica/pais/[iso3]/seguridad · Sprint GEO-RP C3
 *
 * Sub-tab 4 Seguridad & Conflicto · sustituyendo ACLED:
 *   - Eventos GDELT WAR_CONFLICT/TERROR/KILL filtrados por nombre país (90d)
 *   - Series temporales: eventos/semana, tono medio/semana
 *   - Actores extraídos por NER heurístico (top 5)
 *   - Top dominios cobertura
 *
 * ACLED no disponible (acceso denegado) · GDELT events code 18-20 + themes
 * proxy + V-Dem + SIPRI para contexto estructural.
 *
 * Cache: s-maxage=1800 (30 min).
 */
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { getSecurityIndicators } from '@/lib/geopolitica/security-indicators-seed'
import { getCountrySecuritySummary as getUcdpSummary } from '@/lib/ucdp/client'
import { getCountryAcledSummary } from '@/lib/acled/client'
import { getGcriEntry } from '@/lib/geopolitica/gcri-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'que', 'y'])

function extractActors(titles: string[]): Array<{ name: string; mentions: number }> {
  const counts = new Map<string, number>()
  for (const title of titles) {
    const matches = title.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    for (const m of matches) {
      if (m.length < 4) continue
      if (STOPWORDS.has(m.toLowerCase())) continue
      counts.set(m, (counts.get(m) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, mentions]) => ({ name, mentions }))
}

function aggregateByWeek(items: Array<{ datetime: string; tone?: number }>): Array<{ week_start: string; events: number; avg_tone: number }> {
  const byWeek = new Map<string, { events: number; toneSum: number; toneN: number }>()
  for (const it of items) {
    if (!it.datetime) continue
    const d = new Date(it.datetime)
    // Lunes de la semana
    const dow = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() - dow + 1)
    const key = d.toISOString().slice(0, 10)
    const cur = byWeek.get(key) || { events: 0, toneSum: 0, toneN: 0 }
    cur.events++
    if (typeof it.tone === 'number') { cur.toneSum += it.tone; cur.toneN++ }
    byWeek.set(key, cur)
  }
  return [...byWeek.entries()]
    .map(([week_start, v]) => ({
      week_start,
      events: v.events,
      avg_tone: v.toneN > 0 ? Math.round((v.toneSum / v.toneN) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
}

export async function GET(_req: NextRequest, { params }: { params: { iso3: string } }) {
  const iso3 = params.iso3.toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json({ ok: false, error: `iso3_unknown · ${iso3}` }, { status: 404 })
  }
  const startedAt = new Date().toISOString()

  // 2 queries GDELT · WAR_CONFLICT y PROTEST, 90 días
  const [warArts, protestArts] = await Promise.all([
    fetchGdeltJson<any>(
      buildGdeltDocUrl({
        query: coord.name_en,
        theme: 'WAR_CONFLICT',
        timespan: '90d',
        mode: 'artlist',
        maxrecords: 200,
        sort: 'datedesc',
      }),
      { timeoutMs: 9000, maxRetries: 1 },
    ).catch(() => null),
    fetchGdeltJson<any>(
      buildGdeltDocUrl({
        query: coord.name_en,
        theme: 'PROTEST',
        timespan: '90d',
        mode: 'artlist',
        maxrecords: 100,
        sort: 'datedesc',
      }),
      { timeoutMs: 9000, maxRetries: 1 },
    ).catch(() => null),
  ])

  const warArticles = (warArts?.articles || []) as any[]
  const protestArticles = (protestArts?.articles || []) as any[]

  // Normalizar fechas + extraer datos
  const warNormalized = warArticles.map((a) => ({
    title: a.title || '',
    domain: a.domain || '',
    url: a.url || '',
    tone: typeof a.tone === 'number' ? a.tone : null,
    datetime: normalizeGdeltDate(a.seendate) || '',
    source_country: (a.sourcecountry || '').toUpperCase(),
  }))
  const protestNormalized = protestArticles.map((a) => ({
    title: a.title || '',
    domain: a.domain || '',
    url: a.url || '',
    tone: typeof a.tone === 'number' ? a.tone : null,
    datetime: normalizeGdeltDate(a.seendate) || '',
  }))

  // Series semanales
  const warWeekly = aggregateByWeek(warNormalized.filter((a) => a.datetime).map((a) => ({ datetime: a.datetime, tone: a.tone || undefined })))
  const protestWeekly = aggregateByWeek(protestNormalized.filter((a) => a.datetime).map((a) => ({ datetime: a.datetime, tone: a.tone || undefined })))

  // Top dominios (cobertura mediática)
  const domainCount = new Map<string, number>()
  for (const a of warNormalized) {
    if (a.domain) domainCount.set(a.domain, (domainCount.get(a.domain) || 0) + 1)
  }
  const topDomains = [...domainCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([domain, count]) => ({ domain, count }))

  // Actores extraídos de titulares WAR
  const titles = warNormalized.map((a) => a.title).filter(Boolean)
  const actors = extractActors(titles)

  // Top eventos recientes (con URL)
  const recentEvents = warNormalized.slice(0, 10).map((a) => ({
    title: a.title,
    domain: a.domain,
    url: a.url,
    datetime: a.datetime,
    tone: a.tone,
  }))

  // Totales
  const totalEvents90d = warNormalized.length
  const totalProtests90d = protestNormalized.length
  const avgTone = warNormalized.reduce((s, a) => s + (a.tone ?? 0), 0) / Math.max(1, warNormalized.filter((a) => a.tone !== null).length)

  // G23 fix · enriquecimiento con security indicators seed (GPI/UNODC/GTD/CPI/FfP/RSF)
  // Reemplaza ACLED ausente con triangulación de 7 fuentes públicas curadas.
  const securitySeed = getSecurityIndicators(iso3)

  // G24 · UCDP REST API + ACLED API (env keys) + GCRI seed integrados
  const [ucdpData, acledData, gcriData] = await Promise.all([
    getUcdpSummary(coord.name_en).catch(() => null),
    getCountryAcledSummary(coord.name_es).catch(() => null),
    Promise.resolve(getGcriEntry(iso3)),
  ])

  return NextResponse.json({
    ok: true,
    iso3,
    country_name: coord.name_es,
    summary: {
      total_war_events_90d: totalEvents90d,
      total_protests_90d: totalProtests90d,
      avg_tone: Math.round(avgTone * 100) / 100,
    },
    war_series_weekly: warWeekly,
    protest_series_weekly: protestWeekly,
    top_actors: actors,
    top_domains: topDomains,
    recent_events: recentEvents,
    // G23 · indicadores estructurales seguridad (sin ACLED)
    structural: securitySeed,
    // G24 · UCDP + ACLED + GCRI integrados
    ucdp: ucdpData ?? { ok: false, source: 'UCDP unreachable' },
    acled: acledData ?? { ok: false, source: 'ACLED requires API key in env' },
    gcri: gcriData,
    fetched_at: startedAt,
    _meta: {
      sources: [
        'GDELT DOC v2 themes: WAR_CONFLICT + PROTEST · 90d',
        securitySeed ? 'GPI 2024 (Vision of Humanity) + UNODC homicide + GTD (END) + CPI (Transparency) + FfP State Fragility + RSF Press Freedom' : null,
      ].filter(Boolean) as string[],
      note: 'ACLED sustituido por GDELT events + 6 fuentes triangulación estructural curadas.',
      cache_ttl_seconds: 1800,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200' },
  })
}
