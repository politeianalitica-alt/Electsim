/**
 * GET /api/agro/cosecha
 *
 * "¿Cómo ha ido la cosecha?" derivado de DATOS REALES (Eurostat apro_cpshr,
 * nivel nacional ES): producción cosechada y rendimiento de los principales
 * cultivos en los últimos años, con variación interanual. El estado de la
 * cosecha (buena/normal/floja/mala) se calcula de la variación de producción,
 * no de una narrativa: es honesto y se actualiza solo.
 *
 * strucpro: HPRD_HUMD_EU_THS_T (producción, miles t) + YLD_HUMD_EU_T_HA
 * (rendimiento, t/ha). Sin auth. Degradación honesta por cultivo.
 */
import { NextResponse } from 'next/server'
import { CULTIVOS_EUROSTAT } from '@/lib/agro/sources/eurostat-agro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/apro_cpshr'

interface Punto {
  time: string
  value: number | null
}

async function fetchSerieES(crop: string, strucpro: string): Promise<Punto[] | null> {
  const url = `${EUROSTAT}?format=JSON&geo=ES&crops=${crop}&strucpro=${strucpro}&lastTimePeriod=4`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Politeia-Analitica/1.0' }, signal: ctrl.signal, next: { revalidate: 21600 } })
    clearTimeout(timer)
    if (!r.ok) return null
    const j = await r.json()
    const idx: Record<string, number> | undefined = j?.dimension?.time?.category?.index
    const vals: Record<string, number> | undefined = j?.value
    if (!idx || !vals) return null
    const times = Object.entries(idx).sort((a, b) => a[1] - b[1]).map(([c]) => c)
    return times.map((t, i) => ({ time: t, value: typeof vals[i] === 'number' ? vals[i] : null }))
  } catch {
    clearTimeout(timer)
    return null
  }
}

function lastTwo(pts: Punto[] | null): { last: { t: string; v: number } | null; prev: { t: string; v: number } | null } {
  if (!pts) return { last: null, prev: null }
  const valid = pts.filter((p) => p.value != null) as Array<{ time: string; value: number }>
  const last = valid[valid.length - 1] ?? null
  const prev = valid[valid.length - 2] ?? null
  return {
    last: last ? { t: last.time, v: last.value } : null,
    prev: prev ? { t: prev.time, v: prev.value } : null,
  }
}

function estado(yoy: number | null): { id: string; label: string } {
  if (yoy == null) return { id: 'sin_dato', label: 'sin dato' }
  if (yoy >= 15) return { id: 'record', label: 'cosecha excepcional' }
  if (yoy >= 4) return { id: 'buena', label: 'buena cosecha' }
  if (yoy > -4) return { id: 'normal', label: 'cosecha estable' }
  if (yoy > -15) return { id: 'floja', label: 'cosecha floja' }
  return { id: 'mala', label: 'mala cosecha' }
}

export async function GET() {
  const rows = await Promise.all(
    CULTIVOS_EUROSTAT.map(async (c) => {
      const [prod, yld] = await Promise.all([
        fetchSerieES(c.code, 'HPRD_HUMD_EU_THS_T'),
        fetchSerieES(c.code, 'YLD_HUMD_EU_T_HA'),
      ])
      const p = lastTwo(prod)
      const y = lastTwo(yld)
      const prodYoY = p.last && p.prev && p.prev.v !== 0 ? Number((((p.last.v - p.prev.v) / p.prev.v) * 100).toFixed(1)) : null
      const yldYoY = y.last && y.prev && y.prev.v !== 0 ? Number((((y.last.v - y.prev.v) / y.prev.v) * 100).toFixed(1)) : null
      const est = estado(prodYoY)
      return {
        code: c.code,
        nombre: c.nombre,
        color: c.color,
        anio: p.last?.t ?? null,
        produccion_t: p.last ? Math.round(p.last.v * 1000) : null,
        produccion_yoy_pct: prodYoY,
        rendimiento_t_ha: y.last ? Number(y.last.v.toFixed(2)) : null,
        rendimiento_yoy_pct: yldYoY,
        estado: est.id,
        estado_label: est.label,
      }
    })
  )
  const conDato = rows.filter((r) => r.produccion_t != null)
  return NextResponse.json(
    {
      ok: conDato.length > 0,
      data: { cultivos: rows, n_con_dato: conDato.length },
      fuente: 'Eurostat · apro_cpshr (producción + rendimiento nacional ES)',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr/default/table',
      fuentes_error: conDato.length === 0 ? ['Eurostat apro_cpshr sin respuesta'] : [],
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}
