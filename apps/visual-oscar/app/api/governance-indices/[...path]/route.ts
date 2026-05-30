/**
 * /api/governance-indices/[...path] · snapshots de índices de gobernanza global.
 *
 * Igual que UNDP HDI, estos índices NO publican JSON API estándar — distribuyen
 * resultados anuales como PDF + Excel + CSV. Embed snapshot estático con
 * datos públicos verificables. Update manual cuando publican nuevo informe.
 *
 * Fuentes:
 *  - Transparency International CPI (https://www.transparency.org/en/cpi)
 *  - World Justice Project Rule of Law Index (https://worldjusticeproject.org/rule-of-law-index)
 *
 * Sprint C6+C9 (2026-05-30): snapshot inicial con datos 2014-2023.
 *
 * Rutas:
 *   GET /api/governance-indices/health
 *   GET /api/governance-indices/cpi?country=ESP
 *   GET /api/governance-indices/wjp?country=ESP
 *
 * Cache HTTP 24h.
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400

/**
 * TI CPI · puntuación 0-100 (mayor = menos corrupto).
 * Snapshot: TI CPI Reports 2014-2023.
 *
 * Update: tras publicación TI CPI (típicamente enero/febrero) añadir
 * nueva columna por país.
 */
const CPI_SNAPSHOT: Record<string, Record<string, number | null>> = {
  ESP: {
    '2014': 60, '2015': 58, '2016': 58, '2017': 57, '2018': 58,
    '2019': 62, '2020': 62, '2021': 61, '2022': 60, '2023': 60,
  },
  DEU: {
    '2014': 79, '2015': 81, '2016': 81, '2017': 81, '2018': 80,
    '2019': 80, '2020': 80, '2021': 80, '2022': 79, '2023': 78,
  },
  FRA: {
    '2014': 69, '2015': 70, '2016': 69, '2017': 70, '2018': 72,
    '2019': 69, '2020': 69, '2021': 71, '2022': 72, '2023': 71,
  },
  ITA: {
    '2014': 43, '2015': 44, '2016': 47, '2017': 50, '2018': 52,
    '2019': 53, '2020': 53, '2021': 56, '2022': 56, '2023': 56,
  },
  PRT: {
    '2014': 63, '2015': 64, '2016': 62, '2017': 63, '2018': 64,
    '2019': 62, '2020': 61, '2021': 62, '2022': 62, '2023': 61,
  },
  GBR: {
    '2014': 78, '2015': 81, '2016': 81, '2017': 82, '2018': 80,
    '2019': 77, '2020': 77, '2021': 78, '2022': 73, '2023': 71,
  },
  USA: {
    '2014': 74, '2015': 76, '2016': 74, '2017': 75, '2018': 71,
    '2019': 69, '2020': 67, '2021': 67, '2022': 69, '2023': 69,
  },
  DNK: {
    '2014': 92, '2015': 91, '2016': 90, '2017': 88, '2018': 88,
    '2019': 87, '2020': 88, '2021': 88, '2022': 90, '2023': 90,
  },
}
const CPI_LATEST = '2023'

/**
 * WJP Rule of Law Index · puntuación 0-1 (mayor = mejor).
 * Snapshot: WJP Rule of Law Reports 2017-2024.
 *
 * Update: tras publicación WJP (típicamente octubre) añadir columna nueva.
 */
const WJP_SNAPSHOT: Record<string, Record<string, number | null>> = {
  ESP: {
    '2017': 0.71, '2018': 0.70, '2019': 0.70, '2020': 0.71,
    '2021': 0.69, '2022': 0.69, '2023': 0.71, '2024': 0.71,
  },
  DEU: {
    '2017': 0.83, '2018': 0.81, '2019': 0.84, '2020': 0.84,
    '2021': 0.83, '2022': 0.83, '2023': 0.83, '2024': 0.83,
  },
  FRA: {
    '2017': 0.74, '2018': 0.72, '2019': 0.73, '2020': 0.73,
    '2021': 0.73, '2022': 0.72, '2023': 0.73, '2024': 0.71,
  },
  ITA: {
    '2017': 0.65, '2018': 0.63, '2019': 0.64, '2020': 0.66,
    '2021': 0.66, '2022': 0.66, '2023': 0.66, '2024': 0.66,
  },
  PRT: {
    '2017': 0.70, '2018': 0.70, '2019': 0.71, '2020': 0.71,
    '2021': 0.70, '2022': 0.69, '2023': 0.71, '2024': 0.69,
  },
  GBR: {
    '2017': 0.80, '2018': 0.79, '2019': 0.79, '2020': 0.79,
    '2021': 0.78, '2022': 0.78, '2023': 0.78, '2024': 0.78,
  },
  DNK: {
    '2017': 0.89, '2018': 0.89, '2019': 0.90, '2020': 0.90,
    '2021': 0.90, '2022': 0.90, '2023': 0.90, '2024': 0.90,
  },
}
const WJP_LATEST = '2024'

interface YearPoint { time: string; value: number }

function buildSeries(map: Record<string, number | null>): { points: YearPoint[]; last: YearPoint | null } {
  const points: YearPoint[] = Object.entries(map)
    .filter(([, v]) => v != null)
    .map(([time, value]) => ({ time, value: value as number }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return { points, last: points.length ? points[points.length - 1] : null }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (!action || action === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'Politeia governance indices (snapshot)',
      indices: ['cpi (TI 2014-2023)', 'wjp (WJP 2017-2024)'],
      countries: ['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'GBR', 'USA', 'DNK'],
    })
  }

  if (action === 'cpi') {
    const country = (url.searchParams.get('country') || 'ESP').toUpperCase()
    const map = CPI_SNAPSHOT[country]
    if (!map) {
      return NextResponse.json(
        { ok: false, error: `country_${country}_not_in_snapshot` },
        { status: 404 },
      )
    }
    const { points, last } = buildSeries(map)
    return NextResponse.json({
      ok: true,
      country,
      source: 'Transparency International CPI',
      data_quality: quality('live', `TI CPI snapshot · ${country}`),
      n_points: points.length,
      points,
      last,
      latest_year: CPI_LATEST,
      snapshot_note:
        'Snapshot manual. Update tras publicación TI CPI (enero/febrero). https://www.transparency.org/en/cpi',
    })
  }

  if (action === 'wjp') {
    const country = (url.searchParams.get('country') || 'ESP').toUpperCase()
    const map = WJP_SNAPSHOT[country]
    if (!map) {
      return NextResponse.json(
        { ok: false, error: `country_${country}_not_in_snapshot` },
        { status: 404 },
      )
    }
    const { points, last } = buildSeries(map)
    return NextResponse.json({
      ok: true,
      country,
      source: 'World Justice Project Rule of Law Index',
      data_quality: quality('live', `WJP snapshot · ${country}`),
      n_points: points.length,
      points,
      last,
      latest_year: WJP_LATEST,
      snapshot_note:
        'Snapshot manual. Update tras publicación WJP (octubre). https://worldjusticeproject.org/rule-of-law-index',
    })
  }

  return NextResponse.json(
    { ok: false, error: 'unknown action', available: ['health', 'cpi', 'wjp'] },
    { status: 400 },
  )
}
