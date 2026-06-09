/**
 * GET /api/agro/inflacion-alimentos?n=24
 *
 * Inflación de alimentos vs general (HICP, Eurostat prc_hicp_manr · tasa anual
 * mensual). Devuelve cuatro series: España alimentos (CP011), España general
 * (CP00), UE-27 alimentos y UE-27 general. Alimenta el panel de márgenes /
 * inflación alimentaria de la pestaña Cadena de Valor.
 *
 * Cada serie se pide por separado (coicop+geo fijos, sólo varía el tiempo) para
 * mapear value[i] ↔ time[i] sin tener que indexar el producto cartesiano.
 *
 * Sin auth. Degradación honesta: cada serie cae por separado.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr'

interface SeriePoint {
  time: string
  value: number | null
}

async function fetchHicp(coicop: string, geo: string, n: number): Promise<SeriePoint[] | null> {
  const url = `${EUROSTAT}?format=JSON&unit=RCH_A&coicop=${coicop}&geo=${geo}&lastTimePeriod=${n}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Politeia-Analitica/1.0' },
      signal: ctrl.signal,
      next: { revalidate: 21600 },
    })
    clearTimeout(timer)
    if (!r.ok) return null
    const j = await r.json()
    const idx: Record<string, number> | undefined = j?.dimension?.time?.category?.index
    const vals: Record<string, number> | undefined = j?.value
    if (!idx || !vals) return null
    const times = Object.entries(idx)
      .sort((a, b) => a[1] - b[1])
      .map(([code]) => code)
    return times.map((t, i) => ({ time: t, value: typeof vals[i] === 'number' ? vals[i] : null }))
  } catch {
    clearTimeout(timer)
    return null
  }
}

function last(points: SeriePoint[] | null): { time: string; value: number } | null {
  if (!points) return null
  const v = [...points].reverse().find((p) => p.value != null)
  return v ? { time: v.time, value: v.value as number } : null
}

export async function GET(req: NextRequest) {
  const n = Math.min(48, Math.max(6, Number(req.nextUrl.searchParams.get('n') || 24)))
  const [esFood, esGen, euFood, euGen] = await Promise.all([
    fetchHicp('CP011', 'ES', n),
    fetchHicp('CP00', 'ES', n),
    fetchHicp('CP011', 'EU27_2020', n),
    fetchHicp('CP00', 'EU27_2020', n),
  ])

  const series = [
    { geo: 'ES_FOOD', label: 'Alimentos España', color: '#16A34A', points: esFood ?? [] },
    { geo: 'ES_GEN', label: 'IPC general España', color: '#1F4E8C', points: esGen ?? [] },
    { geo: 'EU_FOOD', label: 'Alimentos UE-27', color: '#F59E0B', points: euFood ?? [] },
  ]
  const allEmpty = series.every((s) => s.points.length === 0)

  const lEsFood = last(esFood)
  const lEsGen = last(esGen)
  const lEuFood = last(euFood)

  return NextResponse.json(
    {
      ok: !allEmpty,
      data: allEmpty
        ? null
        : {
            series,
            latest: {
              es_food: lEsFood,
              es_general: lEsGen,
              eu_food: lEuFood,
              brecha_food_vs_general: lEsFood && lEsGen ? Number((lEsFood.value - lEsGen.value).toFixed(1)) : null,
              brecha_es_vs_eu: lEsFood && lEuFood ? Number((lEsFood.value - lEuFood.value).toFixed(1)) : null,
            },
          },
      fuente: 'Eurostat · HICP prc_hicp_manr (tasa anual)',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table',
      fuentes_error: allEmpty ? ['Eurostat HICP sin respuesta'] : [],
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}
