/**
 * GET /api/agro/precipitacion
 *
 * Snapshot de precipitación para los puntos agrícolas de referencia (capitales
 * y comarcas productoras por CCAA): pronóstico de lluvia a 7 días (Open-Meteo
 * forecast) + acumulado de los últimos 30 días (Open-Meteo archive ERA5) como
 * proxy de déficit hídrico. Alimenta la capa de SEQUÍA del mapa agro.
 *
 * Sin API key. Degradación honesta: cada punto sin dato queda null.
 */
import { NextResponse } from 'next/server'
import { fetchPrecipSnapshots } from '@/lib/agro/sources/open-meteo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  // Ventana de archivo: últimos ~35 días (ERA5 tiene 5 días de retardo).
  const hoy = new Date()
  const end = new Date(hoy)
  end.setDate(end.getDate() - 5)
  const start = new Date(end)
  start.setDate(start.getDate() - 30)

  const puntos = await fetchPrecipSnapshots({ start: ymd(start), end: ymd(end) })
  const n_con_dato = puntos.filter((p) => p.precip_7d_mm != null || p.precip_30d_mm != null).length

  // Ranking de sequía: menor acumulado 30d = más seco.
  const conAcumulado = puntos.filter((p) => p.precip_30d_mm != null)
  const masSecos = [...conAcumulado].sort((a, b) => (a.precip_30d_mm ?? 0) - (b.precip_30d_mm ?? 0)).slice(0, 5)

  return NextResponse.json(
    {
      ok: n_con_dato > 0,
      data: {
        puntos,
        n_total: puntos.length,
        n_con_dato,
        ventana_archivo: { inicio: ymd(start), fin: ymd(end) },
        mas_secos: masSecos.map((p) => ({ id: p.id, nombre: p.nombre, ccaa: p.ccaa, precip_30d_mm: p.precip_30d_mm })),
      },
      fuente: 'Open-Meteo · forecast + archive ERA5',
      fuente_url: 'https://open-meteo.com',
      fuentes_error: n_con_dato === 0 ? ['open-meteo · sin respuesta para ningún punto'] : [],
      generado_en: 'ISR · cache 1h',
    },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=10800' } }
  )
}
