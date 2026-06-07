/**
 * /api/energia/empresas/[slug] · Sprint Energía S9
 *
 * Ficha drill-down de una empresa energética: catálogo + cotización Finnhub +
 * estructura societaria OpenCorporates (jurisdicción, nº registro, estado,
 * directivos, empresas relacionadas). Para `/sector-energia/empresas/[slug]`.
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si enriquecimiento degrada):
 *   { ok, data: EnergyCompanyFichaData, fetched_at }
 *   { ok:false, error:'not_found' }  · HTTP 404 si el slug no está en catálogo.
 *
 * Degradación honesta (CLAUDE.md): si Finnhub/OpenCorporates fallan, data.quote
 * es null y data.structure.available es false con note. El catálogo siempre va.
 */
import { NextResponse } from 'next/server'
import { getEnergyCompany } from '@/lib/energia/companies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = (params.slug || '').toLowerCase()
  const fetched_at = new Date().toISOString()

  try {
    const data = await getEnergyCompany(slug)
    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'not_found', slug, fetched_at },
        { status: 404 },
      )
    }
    return NextResponse.json(
      {
        ok: true,
        data,
        fetched_at,
        _meta: {
          quote_source: 'finnhub',
          structure_source: 'opencorporates',
          note: 'Catálogo curado + cotización Finnhub + estructura societaria OpenCorporates. Campos enriquecidos degradan honestamente si la API falla o falta key.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        slug,
        fetched_at,
      },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    )
  }
}
