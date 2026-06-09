/**
 * GET /api/agro/precios?fuente=yahoo|fred|eu
 *
 * Snapshot de precios de los productos agrícolas del catálogo
 * `lib/agro/catalogos/productos-agro.json` desde TRES fuentes seleccionables:
 *
 *   - yahoo (default) → futuros CME/Euronext/ICE en vivo (Yahoo Finance).
 *   - fred            → último dato IMF Global Price (FRED CSV, mensual, USD).
 *   - eu              → precio físico europeo (EU Agri-food Data Portal, €).
 *
 * Las tres devuelven la MISMA forma `productos[]` con un `snapshot` homogéneo
 * {price, previous_close, change, change_pct, currency, ts, spark} para que la
 * vista los renderice igual. Cero datos inventados: si una fuente no devuelve
 * un producto, su snapshot queda `null` y la tarjeta lo marca «sin dato».
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO, type ProductoAgro } from '@/lib/agro/catalogos'
import { fetchYahooSnapshots } from '@/lib/agro/sources/yahoo-agro'
import { fetchFredAgro } from '@/lib/agro/sources/fred-agro'
import { fetchAgrifoodPrices, type AgrifoodSector } from '@/lib/agro/sources/eu-agrifood'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Fuente = 'yahoo' | 'fred' | 'eu'

interface HomogSnapshot {
  symbol: string
  price: number | null
  previous_close: number | null
  change: number | null
  change_pct: number | null
  currency: string | null
  ts: number | null
  spark: number[]
  periodo?: string | null
}

function baseProducto(p: ProductoAgro) {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    unidad: p.unidad,
    contrato: p.contrato,
    rol_espana: p.rol_espana,
    color: p.color,
    ticker: p.ticker,
  }
}

async function viaYahoo() {
  const tickers = PRODUCTOS_AGRO.map((p) => p.ticker).filter((t): t is string => !!t)
  const snaps = await fetchYahooSnapshots(tickers)
  const bySymbol = new Map(snaps.map((s) => [s.symbol, s.snapshot]))
  const productos = PRODUCTOS_AGRO.map((p) => ({
    ...baseProducto(p),
    snapshot: p.ticker ? bySymbol.get(p.ticker) ?? null : null,
  }))
  return {
    productos,
    fuente: 'Yahoo Finance · futuros CME / Euronext / ICE',
    fuente_url: 'https://finance.yahoo.com/commodities',
  }
}

async function viaFred() {
  const withFred = PRODUCTOS_AGRO.filter((p) => p.fred_slug)
  const series = await Promise.all(
    withFred.map(async (p) => ({ slug: p.fred_slug!, serie: await fetchFredAgro(p.fred_slug!) }))
  )
  const bySlug = new Map(series.map((s) => [s.slug, s.serie]))
  const productos = PRODUCTOS_AGRO.map((p) => {
    const serie = p.fred_slug ? bySlug.get(p.fred_slug) ?? null : null
    let snapshot: HomogSnapshot | null = null
    if (serie) {
      const pts = serie.points.filter((x) => x.value != null)
      const last = pts[pts.length - 1]
      const prev = pts[pts.length - 2]
      if (last) {
        const price = last.value
        const previous = prev?.value ?? null
        const change = price != null && previous != null ? Number((price - previous).toFixed(2)) : null
        const change_pct =
          price != null && previous != null && previous !== 0
            ? Number((((price - previous) / previous) * 100).toFixed(2))
            : null
        snapshot = {
          symbol: serie.id,
          price,
          previous_close: previous,
          change,
          change_pct,
          currency: serie.unidad.startsWith('USD') ? 'USD' : serie.unidad,
          ts: null,
          spark: pts.slice(-8).map((x) => x.value as number),
          periodo: last.date,
        }
      }
    }
    return { ...baseProducto(p), snapshot }
  })
  return {
    productos,
    fuente: 'FRED · IMF Global Price Index (mensual, USD)',
    fuente_url: 'https://fred.stlouisfed.org/release/tables?rid=486',
  }
}

async function viaEu() {
  const sectores = Array.from(
    new Set(PRODUCTOS_AGRO.map((p) => p.agrifood_sector).filter((s): s is string => !!s))
  ) as AgrifoodSector[]
  const fetched = await Promise.all(
    sectores.map(async (s) => ({ sector: s, res: await fetchAgrifoodPrices(s) }))
  )
  // Para cada sector: precio físico más reciente representativo.
  const bySector = new Map<string, { precio: number | null; unidad: string | null; periodo: string | null; serie: number[] }>()
  for (const { sector, res } of fetched) {
    if (!res.ok || res.points.length === 0) {
      bySector.set(sector, { precio: null, unidad: null, periodo: null, serie: [] })
      continue
    }
    const conPrecio = res.points.filter((p) => p.precio != null)
    const ult = conPrecio[conPrecio.length - 1]
    const prev = conPrecio[conPrecio.length - 2]
    bySector.set(sector, {
      precio: ult?.precio ?? null,
      unidad: ult?.unidad ?? null,
      periodo: ult?.periodo ?? null,
      serie: conPrecio.slice(-8).map((p) => p.precio as number),
    })
    void prev
  }
  const productos = PRODUCTOS_AGRO.map((p) => {
    let snapshot: HomogSnapshot | null = null
    if (p.agrifood_sector) {
      const s = bySector.get(p.agrifood_sector)
      if (s && s.precio != null) {
        const serie = s.serie
        const prev = serie.length >= 2 ? serie[serie.length - 2] : null
        const change = prev != null ? Number((s.precio - prev).toFixed(2)) : null
        const change_pct = prev != null && prev !== 0 ? Number((((s.precio - prev) / prev) * 100).toFixed(2)) : null
        snapshot = {
          symbol: p.agrifood_sector,
          price: s.precio,
          previous_close: prev,
          change,
          change_pct,
          currency: s.unidad || 'EUR',
          ts: null,
          spark: serie,
          periodo: s.periodo,
        }
      }
    }
    return { ...baseProducto(p), snapshot }
  })
  return {
    productos,
    fuente: 'EU Agri-food Data Portal · precio físico representativo (€)',
    fuente_url: 'https://agriculture.ec.europa.eu/data-and-analysis/markets/price-data_en',
  }
}

export async function GET(req: NextRequest) {
  const fuente = (req.nextUrl.searchParams.get('fuente') || 'yahoo').toLowerCase() as Fuente
  const handler = fuente === 'fred' ? viaFred : fuente === 'eu' ? viaEu : viaYahoo
  const { productos, fuente: fuenteLabel, fuente_url } = await handler()

  const n_con_precio = productos.filter((p) => p.snapshot?.price != null).length
  const fuentes_error: string[] = []
  if (n_con_precio === 0) fuentes_error.push(`${fuente} · sin respuesta para ningún producto`)

  return NextResponse.json(
    {
      ok: productos.length > 0,
      data: { productos, n_total: productos.length, n_con_precio, fuente_id: fuente },
      fuente: fuenteLabel,
      fuente_url,
      fuentes_error,
      generado_en: 'ISR · cache 10 min',
    },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
  )
}
