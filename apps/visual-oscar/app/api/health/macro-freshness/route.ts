/**
 * /api/health/macro-freshness · Sprint W.5
 *
 * Endpoint de monitoreo continuo del catálogo macro (277 indicadores).
 * Devuelve para cada indicador su estado actual (fresh/stale/empty/error)
 * tras probarlo con fetchPulsoIndicator() — el mismo fetcher que usa el
 * dashboard en runtime.
 *
 * Diferencia con scripts/data-probe.ts (offline, manual):
 *   · este endpoint es ONLINE y CONSUMIDO por monitoring automático
 *   · puede ser pollado por Vercel Cron, Datadog, Slack, etc.
 *   · sirve para alertar cuando empty > umbral o error > 0
 *
 * Query params:
 *   - `concurrency` (default 4): peticiones paralelas
 *   - `families` (csv): filtra por familia de fuente (ej. eurostat,ine)
 *   - `format` (default json): json | summary
 *
 * Cache: s-maxage=300 (5 min) — frecuencia suficiente para monitoreo.
 *
 * Auth: público (en PUBLIC_PREFIXES del middleware).
 */
import { NextRequest, NextResponse } from 'next/server'
import { SUBTAB_REGISTRY } from '@/lib/macro/subtab-registry'
import { fetchPulsoIndicator } from '@/lib/macro/pulso-fetcher'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type ProbeStatus = 'fresh' | 'stale' | 'empty' | 'error'

interface IndicatorHealth {
  catalog: string
  id: string
  status: ProbeStatus
  n_points: number
  last_period: string | null
  days_since_last: number | null
  expected_max_days: number
  source: string
  family: string
  error?: string
}

const FRESHNESS: Record<string, number> = {
  daily: 7,
  monthly: 75,
  quarterly: 150,
  annual: 540,
}

function periodToDate(period: string): Date | null {
  if (!period) return null
  const s = period.trim()
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 11, 31)
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, mo] = s.split('-').map(Number)
    return new Date(y, mo - 1, 28)
  }
  const q = s.match(/^(\d{4})[-_]?Q?(\d)$/i)
  if (q) {
    const y = Number(q[1])
    const qi = Number(q[2])
    return new Date(y, (qi - 1) * 3 + 2, 28)
  }
  const iso = new Date(s)
  if (!isNaN(iso.getTime())) return iso
  return null
}

function detectFamily(endpoint: string): string {
  if (endpoint.startsWith('/api/eurostat/')) return 'eurostat'
  if (endpoint.startsWith('/api/ine/')) return 'ine'
  if (endpoint.startsWith('/api/imf/')) return 'imf'
  if (endpoint.startsWith('/api/bde/')) return 'bde'
  if (endpoint.startsWith('/api/ecb/')) return 'ecb'
  if (endpoint.startsWith('/api/aemet/')) return 'aemet'
  if (endpoint.startsWith('/api/esios/')) return 'esios'
  if (endpoint.startsWith('/api/bis/')) return 'bis'
  if (endpoint.startsWith('/api/finnhub/')) return 'finnhub'
  if (endpoint.startsWith('/api/oecd/')) return 'oecd'
  if (endpoint.startsWith('/api/worldbank/')) return 'worldbank'
  if (endpoint.startsWith('/api/cis/')) return 'cis'
  if (endpoint.startsWith('/api/cis-snapshot/')) return 'cis-snapshot'
  if (endpoint.startsWith('/api/tesoro/')) return 'tesoro'
  if (endpoint.startsWith('/api/macro/')) return 'macro-internal'
  if (endpoint.startsWith('/api/spanish-stats/')) return 'spanish-stats'
  return 'otros'
}

async function probeOne(
  catalog: string,
  ind: PulsoIndicatorMeta,
  baseUrl: string,
): Promise<IndicatorHealth> {
  const expectedMax = FRESHNESS[ind.frequency] || 365
  const family = detectFamily(ind.endpoint)
  try {
    const res = await fetchPulsoIndicator(ind, { baseUrl })
    if (!res.ok) {
      return {
        catalog,
        id: ind.id,
        status: 'error',
        n_points: 0,
        last_period: null,
        days_since_last: null,
        expected_max_days: expectedMax,
        error: res.error || 'no_data',
        source: ind.source,
        family,
      }
    }
    if (res.series.length === 0 || !res.last) {
      return {
        catalog,
        id: ind.id,
        status: 'empty',
        n_points: 0,
        last_period: null,
        days_since_last: null,
        expected_max_days: expectedMax,
        source: ind.source,
        family,
      }
    }
    const lastPeriod = String(res.last.period)
    const d = periodToDate(lastPeriod)
    const days = d ? Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)) : null
    const status: ProbeStatus = days != null && days > expectedMax ? 'stale' : 'fresh'
    return {
      catalog,
      id: ind.id,
      status,
      n_points: res.series.length,
      last_period: lastPeriod,
      days_since_last: days,
      expected_max_days: expectedMax,
      source: ind.source,
      family,
    }
  } catch (e: any) {
    return {
      catalog,
      id: ind.id,
      status: 'error',
      n_points: 0,
      last_period: null,
      days_since_last: null,
      expected_max_days: expectedMax,
      error: String(e?.message ?? e).slice(0, 200),
      source: ind.source,
      family,
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const concurrency = Math.max(1, Math.min(8, Number(url.searchParams.get('concurrency') || '4')))
  const familiesParam = url.searchParams.get('families')
  const familiesFilter = familiesParam ? new Set(familiesParam.split(',').map((s) => s.trim().toLowerCase())) : null
  const format = url.searchParams.get('format') || 'json'

  const startedAt = Date.now()
  // baseUrl: el endpoint corre en el mismo origin que el frontend
  const origin = req.nextUrl.origin
  const baseUrl = origin

  // Aplanar registry → lista de (catalog, indicator), filtrando por familia.
  const tasks: { catalog: string; ind: PulsoIndicatorMeta }[] = []
  for (const [slug, sub] of Object.entries(SUBTAB_REGISTRY)) {
    for (const ind of sub.indicators) {
      if (familiesFilter) {
        const fam = detectFamily(ind.endpoint)
        if (!familiesFilter.has(fam)) continue
      }
      tasks.push({ catalog: slug, ind })
    }
  }

  const results: IndicatorHealth[] = []
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      const t = tasks[i]
      const r = await probeOne(t.catalog, t.ind, baseUrl)
      results.push(r)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  const counts = {
    fresh: results.filter((r) => r.status === 'fresh').length,
    stale: results.filter((r) => r.status === 'stale').length,
    empty: results.filter((r) => r.status === 'empty').length,
    error: results.filter((r) => r.status === 'error').length,
  }
  const total = results.length
  const elapsedMs = Date.now() - startedAt

  // Status semáforo del endpoint propio
  let healthStatus: 'ok' | 'degraded' | 'critical' = 'ok'
  if (counts.error > 10 || counts.empty / total > 0.5) healthStatus = 'critical'
  else if (counts.error > 0 || counts.empty / total > 0.3) healthStatus = 'degraded'

  if (format === 'summary') {
    return NextResponse.json(
      {
        ok: healthStatus !== 'critical',
        health: healthStatus,
        total,
        counts,
        coverage_fresh: total > 0 ? Number((counts.fresh / total).toFixed(3)) : 0,
        elapsed_ms: elapsedMs,
        ts: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      },
    )
  }

  // formato json completo · útil para dashboards de monitoreo + drill-down
  // por familia / catálogo / indicador específico
  const byFamily: Record<string, Record<ProbeStatus, number>> = {}
  const byCatalog: Record<string, Record<ProbeStatus, number>> = {}
  for (const r of results) {
    if (!byFamily[r.family]) byFamily[r.family] = { fresh: 0, stale: 0, empty: 0, error: 0 }
    if (!byCatalog[r.catalog]) byCatalog[r.catalog] = { fresh: 0, stale: 0, empty: 0, error: 0 }
    byFamily[r.family][r.status]++
    byCatalog[r.catalog][r.status]++
  }

  return NextResponse.json(
    {
      ok: healthStatus !== 'critical',
      health: healthStatus,
      total,
      counts,
      coverage_fresh: total > 0 ? Number((counts.fresh / total).toFixed(3)) : 0,
      elapsed_ms: elapsedMs,
      ts: new Date().toISOString(),
      by_family: byFamily,
      by_catalog: byCatalog,
      results,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    },
  )
}
