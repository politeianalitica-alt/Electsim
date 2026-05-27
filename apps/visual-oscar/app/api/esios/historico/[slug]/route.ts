/**
 * /api/esios/historico/[slug] · Sprint ESIOS-DEEP S5
 *
 * Serie histórica de cualquier indicador del catálogo con stats agregadas:
 *
 *   GET /api/esios/historico/pvpc?range=7d           · 7 días horario
 *   GET /api/esios/historico/pvpc?range=30d          · 30 días horario (downsample a 6h)
 *   GET /api/esios/historico/pvpc?range=1y           · 1 año (downsample a diario)
 *   GET /api/esios/historico/pvpc?range=7d&geo=8742  · 7d Canarias
 *
 * Devuelve:
 *   - serie (downsampled si rango grande para no inflar payload)
 *   - stats: avg, min, max, std, p10, p50, p90
 *   - daily_buckets si range=7d/30d para chart de tendencia diaria
 *
 * Cache adaptativa: 600s para 7d, 3600s para 30d/1y.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEsiosIndicator } from '@/lib/esios/client'
import { ESIOS_CATALOG, type EsiosSlug } from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type Range = '24h' | '7d' | '30d' | '1y'

interface Stats {
  count: number
  avg: number
  min: number
  max: number
  std: number
  p10: number
  p50: number
  p90: number
}
interface DailyBucket {
  date: string
  avg: number
  min: number
  max: number
  count: number
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function calcStats(values: number[]): Stats | null {
  if (values.length === 0) return null
  const n = values.length
  const sum = values.reduce((s, v) => s + v, 0)
  const avg = sum / n
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const sorted = [...values].sort((a, b) => a - b)
  return {
    count: n,
    avg: round2(avg),
    min: round2(sorted[0]),
    max: round2(sorted[sorted.length - 1]),
    std: round2(std),
    p10: round2(percentile(sorted, 0.1)),
    p50: round2(percentile(sorted, 0.5)),
    p90: round2(percentile(sorted, 0.9)),
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function bucketByDay(values: Array<{ value: number; datetime: string }>): DailyBucket[] {
  const map = new Map<string, Array<{ value: number; datetime: string }>>()
  for (const v of values) {
    const day = v.datetime.slice(0, 10)
    const arr = map.get(day) || []
    arr.push(v)
    map.set(day, arr)
  }
  const buckets: DailyBucket[] = []
  for (const [day, arr] of map) {
    const vals = arr.map((x) => x.value)
    const sum = vals.reduce((s, v) => s + v, 0)
    buckets.push({
      date: day,
      avg: round2(sum / vals.length),
      min: round2(Math.min(...vals)),
      max: round2(Math.max(...vals)),
      count: vals.length,
    })
  }
  return buckets.sort((a, b) => a.date.localeCompare(b.date))
}

/** Downsample tomando 1 de cada N */
function downsample<T>(arr: T[], maxLen: number): T[] {
  if (arr.length <= maxLen) return arr
  const stride = Math.ceil(arr.length / maxLen)
  return arr.filter((_, i) => i % stride === 0)
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug as EsiosSlug
  const item = ESIOS_CATALOG[slug]
  if (!item) {
    return NextResponse.json({
      ok: false,
      error: `slug_unknown · disponibles: ${Object.keys(ESIOS_CATALOG).length} indicadores`,
      available_slugs: Object.keys(ESIOS_CATALOG),
    }, { status: 400 })
  }

  const { searchParams } = req.nextUrl
  const range = (searchParams.get('range') || '7d') as Range
  const geo = Number(searchParams.get('geo') || item.geo_default)

  const now = new Date()
  let hoursBack: number
  let timeTrunc: 'hour' | 'day' = 'hour'
  let cacheTtl = 600
  let maxSerieLen = 200

  switch (range) {
    case '24h':
      hoursBack = 24
      cacheTtl = 300
      maxSerieLen = 96
      break
    case '7d':
      hoursBack = 24 * 7
      cacheTtl = 600
      maxSerieLen = 200
      break
    case '30d':
      hoursBack = 24 * 30
      cacheTtl = 3600
      maxSerieLen = 240
      break
    case '1y':
      hoursBack = 24 * 365
      timeTrunc = 'day'
      cacheTtl = 3600
      maxSerieLen = 365
      break
    default:
      hoursBack = 24 * 7
  }

  const start = new Date(now.getTime() - hoursBack * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 1 * 3600_000).toISOString().slice(0, 16)

  const r = await fetchEsiosIndicator(item.id, {
    startDate: start,
    endDate: end,
    geoIds: [geo],
    timeTrunc,
  })

  const apiKey = process.env.ESIOS_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  if (!r.ok || !r.indicator) {
    return NextResponse.json({
      ok: false,
      error: r.error || 'no_indicator',
      meta: {
        slug: item.slug, label: item.label, short: item.short, unit: item.unit,
        category: item.category, geo_id: geo, range, hours_back: hoursBack,
      },
    }, {
      headers: { 'Cache-Control': `public, s-maxage=${cacheTtl}` },
    })
  }

  const values = r.indicator.values
  const vals = values.map((v) => v.value)
  const stats = calcStats(vals)
  const daily = (range === '7d' || range === '30d') ? bucketByDay(values) : null
  const serieDS = downsample(values.map((p) => ({ t: p.datetime, v: round2(p.value) })), maxSerieLen)

  return NextResponse.json({
    ok: true,
    slug: item.slug,
    range,
    geo_id: geo,
    hours_back: hoursBack,
    series_count: values.length,
    serie: serieDS,
    serie_downsampled: serieDS.length < values.length,
    stats,
    daily,
    meta: {
      slug: item.slug, label: item.label, short: item.short, unit: item.unit,
      frequency: item.frequency, category: item.category, use_case: item.use_case,
      higher_is_worse: item.higher_is_worse,
    },
    fetched_at: new Date().toISOString(),
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: r.source_url,
      cache_ttl_seconds: cacheTtl,
      max_serie_length: maxSerieLen,
    },
  }, {
    headers: { 'Cache-Control': `public, s-maxage=${cacheTtl}, stale-while-revalidate=${cacheTtl * 6}` },
  })
}
