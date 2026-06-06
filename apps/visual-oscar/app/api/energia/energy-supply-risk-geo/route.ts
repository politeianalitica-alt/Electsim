/**
 * /api/energia/energy-supply-risk-geo · Sprint Energía v3 · E2-cross
 *
 * Riesgo geopolítico del aprovisionamiento energético de España: mapea los
 * países proveedores de crudo (CORES) y de GNL (Enagás/CORES) a un score de
 * riesgo país (V-Dem + sanciones, vía datasets seed de geopolítica) y lo
 * pondera por su cuota de importación.
 *
 * Lee las cuotas (solo lectura) de `PETROLEO_DEPENDENCIA_ES` y
 * `GNL_ESPANA.origenes` (catalog.ts) e importa los seeds de
 * `lib/geopolitica/*` directamente (sin red). ACLED/UCDP en vivo requieren el
 * backend de geopolítica → el score es estructural, marcado en `source`.
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data:{ petroleo, gas, riesgo_ponderado_petroleo, riesgo_ponderado_gas, nota },
 *     fetched_at, source, _meta }
 */
import { NextResponse } from 'next/server'
import { fetchEnergySupplyRiskGeo } from '@/lib/energia/energy-supply-risk-geo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchEnergySupplyRiskGeo()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'geopolitica_seeds',
          source_label: 'Geopolítica (V-Dem + sanciones seed) × cuotas import CORES/Enagás',
          cache_ttl_seconds: 21600,
          note:
            'Riesgo país ponderado por cuota de importación. Componente principal V-Dem ' +
            '(autocracia → riesgo) + sanciones conocidas (seed). Sin ACLED/UCDP en vivo. ' +
            'Cuotas: orden de magnitud (varían mes a mes).',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source: 'geopolitica_seeds',
      },
      { status: 200 },
    )
  }
}
