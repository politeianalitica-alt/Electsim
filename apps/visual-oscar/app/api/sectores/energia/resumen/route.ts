/**
 * GET /api/sectores/energia/resumen
 *
 * KPIs en vivo del sector eléctrico para el hero del dashboard:
 *   - demanda_actual_mw  · último valor de demanda peninsular (MW)
 *   - mix_renovable_pct  · % renovables en la generación reciente
 *   - precio_pvpc_eur    · precio PVPC más reciente (€/MWh)
 *   - emisiones_co2_g    · emisiones medias (g CO2 / kWh)
 *
 * Fan-out paralelo a 4 endpoints REE con cache 10 min.
 */
import { NextResponse } from 'next/server'
import {
  demandaTiempoReal, mixGeneracion, preciosMercado, emisionesCO2,
} from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const RENOVABLES_KEYS = [
  'Hidráulica', 'Eólica', 'Solar fotovoltaica', 'Solar térmica',
  'Hidroeólica', 'Otras renovables', 'Residuos renovables',
]

export async function GET() {
  const t0 = Date.now()
  const [dem, mix, prc, em] = await Promise.all([
    demandaTiempoReal(1),
    mixGeneracion(2),
    preciosMercado(1),
    emisionesCO2(2),
  ])

  // Demanda actual
  const demSerie = dem.series.find(s => /Real|tiempo/i.test(s.title)) || dem.series[0]
  const demanda_actual_mw = demSerie?.last_value ?? null
  const demanda_datetime = demSerie?.last_datetime ?? null

  // Mix renovable
  let mix_renovable_pct: number | null = null
  if (mix.ok && mix.series.length) {
    const total = mix.series.reduce((acc, s) => acc + (s.total || 0), 0)
    const renov = mix.series
      .filter(s => RENOVABLES_KEYS.some(k => s.title.includes(k)))
      .reduce((acc, s) => acc + (s.total || 0), 0)
    mix_renovable_pct = total > 0 ? Math.round((renov / total) * 1000) / 10 : null
  }

  // Precio PVPC
  const pvpcSerie = prc.series.find(s => /PVPC/i.test(s.title))
  const spotSerie = prc.series.find(s => /spot/i.test(s.title))
  const precio_pvpc_eur = pvpcSerie?.last_value ?? null
  const precio_spot_eur = spotSerie?.last_value ?? null

  // Emisiones
  const emisionesSerie = em.series.find(s => /Total|medias|Promedio/i.test(s.title)) || em.series[0]
  const emisiones_co2_g = emisionesSerie?.last_value ?? null

  return NextResponse.json({
    kpis: {
      demanda_actual_mw,
      demanda_datetime,
      mix_renovable_pct,
      precio_pvpc_eur,
      precio_spot_eur,
      emisiones_co2_g,
    },
    sources: {
      demanda: { ok: dem.ok, error: dem.error },
      mix: { ok: mix.ok, error: mix.error, series: mix.series.length },
      precio: { ok: prc.ok, error: prc.error },
      emisiones: { ok: em.ok, error: em.error },
    },
    fetch_ms: Date.now() - t0,
    fuente: 'Red Eléctrica de España · apidatos.ree.es',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}
