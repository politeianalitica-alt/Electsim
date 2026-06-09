/**
 * GET /api/farma/ensayos
 *
 * Ensayos clínicos · ClinicalTrials.gov API v2.
 *
 * Query:
 *   ?pais=Spain (default)
 *   ?query=...   (term libre · oncology, diabetes, etc.)
 *   ?estado=RECRUITING | ACTIVE_NOT_RECRUITING | COMPLETED | …
 *   ?pageSize=50 (max 100)
 *
 * Respuesta:
 *   { ok, data: { studies, total, kpis }, fuente, fuente_url, fuentes_error }
 *
 * KPIs derivados:
 *   - por_fase: distribución por Phase
 *   - por_sponsor: top 10 sponsors (lead)
 *   - por_condicion: top 10 condiciones
 *   - n_industria: nº con sponsor INDUSTRY
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchClinicalTrials } from '@/lib/farma/sources/clinical-trials'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const pais = req.nextUrl.searchParams.get('pais') || 'Spain'
  const query = req.nextUrl.searchParams.get('query') || undefined
  const estadoRaw = req.nextUrl.searchParams.get('estado') || undefined
  const allowedEstados = new Set([
    'RECRUITING',
    'ACTIVE_NOT_RECRUITING',
    'COMPLETED',
    'TERMINATED',
    'WITHDRAWN',
    'UNKNOWN',
  ])
  const estado = allowedEstados.has(estadoRaw || '') ? (estadoRaw as Parameters<typeof fetchClinicalTrials>[0]['estado']) : undefined
  const pageSize = clamp(Number(req.nextUrl.searchParams.get('pageSize') || 50), 5, 100)

  const r = await fetchClinicalTrials({ pais, query, estado, pageSize })
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`clinicaltrials.gov · ${r.error}`)

  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'ClinicalTrials.gov API v2',
        fuente_url: 'https://clinicaltrials.gov/',
        fuentes_error,
      },
      { headers: { 'Cache-Control': 's-maxage=14400, stale-while-revalidate=28800' } }
    )
  }

  const studies = r.studies
  // KPIs
  const por_fase: Record<string, number> = {}
  const por_sponsor: Record<string, number> = {}
  const por_condicion: Record<string, number> = {}
  let n_industria = 0
  for (const s of studies) {
    const fase = (s.fase && s.fase.length > 0 ? s.fase.join('·') : 'N/A')
    por_fase[fase] = (por_fase[fase] ?? 0) + 1
    if (s.sponsor_principal) por_sponsor[s.sponsor_principal] = (por_sponsor[s.sponsor_principal] ?? 0) + 1
    for (const c of s.condiciones) por_condicion[c] = (por_condicion[c] ?? 0) + 1
    if (s.sponsor_clase === 'INDUSTRY') n_industria++
  }
  const topSponsors = Object.entries(por_sponsor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, n]) => ({ name, n }))
  const topCondiciones = Object.entries(por_condicion)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, n]) => ({ name, n }))

  return NextResponse.json(
    {
      ok: true,
      data: {
        studies,
        total: r.total,
        kpis: {
          n_listados: studies.length,
          n_total: r.total,
          n_industria,
          por_fase,
          top_sponsors: topSponsors,
          top_condiciones: topCondiciones,
        },
      },
      fuente: 'ClinicalTrials.gov · API v2 · estudios por país y filtros',
      fuente_url: `https://clinicaltrials.gov/search?country=${encodeURIComponent(pais)}${
        query ? `&cond=${encodeURIComponent(query)}` : ''
      }${estado ? `&aggFilters=status:${estado.toLowerCase()}` : ''}`,
      fuentes_error,
      generado_en: 'ISR · cache 4h',
    },
    { headers: { 'Cache-Control': 's-maxage=14400, stale-while-revalidate=28800' } }
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
