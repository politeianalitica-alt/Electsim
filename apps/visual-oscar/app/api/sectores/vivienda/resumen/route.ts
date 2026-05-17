/**
 * GET /api/sectores/vivienda/resumen
 *
 * KPIs en vivo del sector vivienda:
 *   - ipv_var_anual    · Variación anual del IPV (%)
 *   - ipv_indice       · Índice IPV nacional (base 2015 = 100)
 *   - compraventas_mes · Compraventas viviendas último mes (libre + protegida)
 *   - alquiler_var     · Variación anual precios alquiler (IPVA %)
 *
 * Cache CDN 6h.
 */
import { NextResponse } from 'next/server'
import { getSerie, INE_SERIES_VIVIENDA } from '@/lib/sources/ine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const [ipvIdx, ipvVar, libre, prot, alqVar] = await Promise.all([
    getSerie(INE_SERIES_VIVIENDA.IPV_INDICE, 4),
    getSerie(INE_SERIES_VIVIENDA.IPV_VAR_ANUAL, 4),
    getSerie(INE_SERIES_VIVIENDA.COMPRA_LIBRE, 2),
    getSerie(INE_SERIES_VIVIENDA.COMPRA_PROTEGIDA, 2),
    getSerie(INE_SERIES_VIVIENDA.ALQUILER_VAR, 2),
  ])

  const compraventasMes = (libre.last?.valor ?? 0) + (prot.last?.valor ?? 0)
  const compraventasMesEtiqueta = libre.last?.periodo_label || ''

  return NextResponse.json({
    kpis: {
      ipv_indice: ipvIdx.last?.valor ?? null,
      ipv_indice_periodo: ipvIdx.last?.periodo_label,
      ipv_var_anual: ipvVar.last?.valor ?? null,
      ipv_var_anual_periodo: ipvVar.last?.periodo_label,
      compraventas_mes: compraventasMes > 0 ? Math.round(compraventasMes) : null,
      compraventas_mes_periodo: compraventasMesEtiqueta,
      alquiler_var_anual: alqVar.last?.valor ?? null,
      alquiler_var_anual_periodo: alqVar.last?.periodo_label,
    },
    sources: {
      ipv: { ok: ipvIdx.points.length > 0 },
      compraventas: { ok: libre.points.length > 0 },
      alquiler: { ok: alqVar.points.length > 0 },
    },
    fetch_ms: Date.now() - t0,
    fuente: 'INE TempUS · IPV + ETDP + IPVA',
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}
