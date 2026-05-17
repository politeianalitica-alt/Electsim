/**
 * GET /api/sectores/infraestructuras/resumen
 * Indicadores transporte+infraestructura España.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'
import { getSerie as getIneSerie } from '@/lib/sources/ine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  // IS.AIR.PSGR = Air transport, passengers carried
  // IS.AIR.GOOD.MT.K1 = Air transport, freight (million ton-km)
  const [psgr, freight, ipco] = await Promise.all([
    getSerie('ESP', 'IS.AIR.PSGR', 2010),
    getSerie('ESP', 'IS.AIR.GOOD.MT.K1', 2010),
    getIneSerie('IPCO1', 24),
  ])
  const lastPsgr = psgr.filter(p => p.value != null).pop()
  const lastFreight = freight.filter(p => p.value != null).pop()
  const lastIpco = ipco.last
  return NextResponse.json({
    kpis: {
      pasajeros_aereo: lastPsgr?.value,
      pasajeros_year: lastPsgr?.year,
      carga_aerea_mtonkm: lastFreight?.value,
      carga_year: lastFreight?.year,
      ipco_indice: lastIpco?.valor,
      ipco_periodo: lastIpco?.periodo_label,
    },
    serie_pasajeros: psgr.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_ipco: ipco.points.map(p => ({ t: p.periodo_label, v: p.valor })),
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank IS.AIR + INE IPCO1',
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}
