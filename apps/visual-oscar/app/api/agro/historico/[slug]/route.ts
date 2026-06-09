/**
 * GET /api/agro/historico/[slug]
 *
 * Serie histórica larga (mensual, IMF Global Price vía FRED CSV) de un producto
 * agro. Sirve como FALLBACK de la vista de detalle de «Lonjas y Precios» cuando
 * Yahoo Finance no devuelve OHLC (p.ej. bloqueo de IP desde el datacenter):
 * así el detalle SIEMPRE muestra un gráfico de precio aunque falte el candle.
 *
 * FRED CSV es público y no bloquea IPs de servidor. Degradación honesta.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'
import { fetchFredAgro } from '@/lib/agro/sources/fred-agro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const producto = PRODUCTOS_AGRO.find((p) => p.id === params.slug)
  if (!producto) {
    return NextResponse.json(
      { ok: false, data: null, error: `producto desconocido: ${params.slug}`, fuente: 'catálogo Politeia' },
      { status: 404 }
    )
  }
  if (!producto.fred_slug) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'FRED',
        fuentes_error: ['producto sin serie FRED (IMF Global Price)'],
        producto: { id: producto.id, nombre: producto.nombre },
      },
      { headers: { 'Cache-Control': 's-maxage=600' } }
    )
  }
  // Histórico de ~8 años para contexto.
  const obsStart = `${new Date().getFullYear() - 8}-01-01`
  const serie = await fetchFredAgro(producto.fred_slug, obsStart)
  if (!serie || serie.points.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'FRED · IMF Global Price',
        fuente_url: 'https://fred.stlouisfed.org',
        fuentes_error: [`FRED sin datos para ${producto.fred_slug}`],
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=43200' } }
    )
  }
  const pts = serie.points.filter((p) => p.value != null)
  return NextResponse.json(
    {
      ok: true,
      data: {
        producto: { id: producto.id, nombre: producto.nombre, color: producto.color },
        label: serie.label,
        unidad: serie.unidad,
        // formato compatible con LineChart: {t, value}
        points: pts.map((p) => ({ t: p.date.slice(0, 7), value: p.value })),
        n: pts.length,
      },
      fuente: `FRED · ${serie.label}`,
      fuente_url: `https://fred.stlouisfed.org/series/${serie.id}`,
      generado_en: 'ISR · cache 12h',
    },
    { headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' } }
  )
}
