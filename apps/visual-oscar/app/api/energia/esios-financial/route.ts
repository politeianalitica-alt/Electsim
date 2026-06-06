/**
 * /api/energia/esios-financial · Energía v3 · E2-data
 *
 * Indicadores ESIOS de mercado de ajuste / financieros aún NO usados por las
 * vistas: servicios de ajuste (banda secundaria, terciaria), restricciones
 * técnicas, gestión de desvíos e intercambios bilaterales por frontera. Cada
 * indicador degrada por separado (un 404 no rompe el conjunto). Ver
 * `lib/energia/esios-financial.ts`.
 *
 * Query:
 *   - ?hours=N  → ventana hacia atrás en horas (default 48, clamp 6-168)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso degradado):
 *   { ok, data: { ajuste[], bilateral[], ok_count, total_count }, fetched_at, _meta }
 *   `ok` global = true si al menos un indicador respondió; cada indicador trae su
 *   propio ok/error.
 *
 * Cache: s-maxage=1800 (30 min · indicadores horarios de ajuste).
 * Auth: requiere ESIOS_API_KEY (server-side). Sin ella todos degradan con no_key.
 */
import { NextResponse } from 'next/server'
import { fetchEsiosFinancial } from '@/lib/energia/esios-financial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hoursRaw = parseInt(searchParams.get('hours') || '48', 10)
  const hoursBack = Number.isFinite(hoursRaw) ? Math.max(6, Math.min(168, hoursRaw)) : 48

  try {
    const res = await fetchEsiosFinancial({ hoursBack })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'esios',
          source_label: 'ESIOS · servicios de ajuste, restricciones, desvíos, intercambios bilaterales',
          env_hint: 'ESIOS_API_KEY',
          cache_ttl_seconds: 1800,
          note: 'Indicadores ESIOS no usados aún en las vistas. Degradación por-indicador: un 404 deja ese indicador en ok:false sin romper el resto.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.esios.ree.es/es/analisis',
      },
      { status: 200 },
    )
  }
}
