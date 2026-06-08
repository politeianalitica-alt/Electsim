/**
 * GET /api/vivienda/bde-precio-real
 *
 * Precio de la vivienda libre · serie nominal y REAL (deflactada por IPC)
 * desde el Boletín Estadístico del Banco de España, tabla 25.10.
 *
 * Permite distinguir el aumento de precio "nominal" del verdadero aumento
 * en términos reales, una vez descontada la inflación. Es la fuente clásica
 * para responder "¿estamos en burbuja?" sin caer en el nominal puro.
 *
 * Respuesta:
 *   {
 *     ok: boolean,
 *     data: {
 *       points: Array<BdePoint>,
 *       latest: BdePoint | null,
 *       max_real: BdePoint | null,
 *       distancia_al_max_real_pct: number | null,
 *     } | null,
 *     fuente: "BdE Boletín Estadístico 25.10",
 *     fuentes_error: string[]
 *   }
 */
import { NextResponse } from 'next/server'
import { fetchBdePrecioVivienda, type BdePoint } from '@/lib/vivienda/sources/bde-vivienda'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const r = await fetchBdePrecioVivienda()
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`bde 25.10 · ${r.error}`)

  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'BdE · Boletín Estadístico · tabla 25.10 (precio vivienda libre nominal y real)',
        fuente_url: 'https://www.bde.es/webbde/es/estadis/infoest/series/',
        fuentes_error,
        generado_en: 'ISR · cache 12h',
      },
      { headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' } }
    )
  }

  const points = r.points
  const latest = points.length > 0 ? points[points.length - 1] : null

  // Máximo histórico real (para responder "¿cuán cerca estamos del pico?")
  let max_real: BdePoint | null = null
  for (const p of points) {
    if (p.real == null) continue
    if (!max_real || (max_real.real != null && p.real > max_real.real)) max_real = p
  }
  const distancia_al_max_real_pct =
    latest && latest.real != null && max_real && max_real.real != null
      ? Number((((latest.real - max_real.real) / max_real.real) * 100).toFixed(2))
      : null

  return NextResponse.json(
    {
      ok: true,
      data: { points, latest, max_real, distancia_al_max_real_pct },
      fuente: 'BdE · Boletín Estadístico · tabla 25.10 (precio vivienda libre nominal y real)',
      fuente_url: 'https://www.bde.es/webbde/es/estadis/infoest/series/',
      fuentes_error,
      generado_en: 'ISR · cache 12h',
    },
    { headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' } }
  )
}
