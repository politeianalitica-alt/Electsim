/**
 * /api/turismo/impacto-economico · Turismo v3 · Sprint T2-cross
 *
 * Cruza Turismo con MACRO: %PIB turístico (Eurostat bop_its6_det · Travel),
 * empleo HORECA (Eurostat lfsq_egan2 · NACE I) y gasto público PERTE/planes
 * (curado+datado). Reutiliza el mismo dataset/parser que el catálogo macro.
 * Ver `lib/turismo/impacto-economico.ts`.
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: ImpactoEconomicoData | null, fetched_at, source_url, _meta }
 *
 * Degrada por bloque: si Eurostat falla, los % quedan null y el bloque PERTE
 * (curado) sigue disponible.
 */
import { NextResponse } from 'next/server'
import { fetchImpactoEconomico } from '@/lib/turismo/impacto-economico'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchImpactoEconomico()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'eurostat+curado',
          source_label: 'Eurostat (bop_its6_det · lfsq_egan2) + PERTE Turismo curado',
          cross_module: 'macro',
          cache_ttl_seconds: 43200,
          note: '%PIB turístico + empleo HORECA en vivo (Eurostat); gasto público PERTE curado+datado.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://ec.europa.eu/eurostat',
      },
      { status: 200 },
    )
  }
}
