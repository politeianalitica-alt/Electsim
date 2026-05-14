/**
 * GET /api/licitaciones/buscar
 *
 * Búsqueda en vivo en Catalunya Open Data + PLACSP nacional.
 * Filtros canónicos compatibles con el UX de buscalicitaciones.com.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchCatalunya, countCatalunya,
  type NormalizedContrato, type SocrataFilters,
} from '@/lib/socrata-catalunya'
import { fetchPlacspFeed } from '@/lib/placsp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const t0 = Date.now()

  const filters: SocrataFilters = {
    q: sp.get('q')?.trim() || undefined,
    type: (sp.get('type') as SocrataFilters['type']) || undefined,
    desde: sp.get('desde') || undefined,
    hasta: sp.get('hasta') || undefined,
    anio: numOrUndef(sp.get('anio')),
    cpv_div: sp.get('cpv_div') || undefined,
    cpv: sp.get('cpv') || undefined,
    tipo_contrato: sp.get('tipo_contrato') || undefined,
    procedimiento: sp.get('procedimiento') || undefined,
    organo: sp.get('organo') || undefined,
    adjudicatario_nif: sp.get('adjudicatario_nif') || undefined,
    importe_min: numOrUndef(sp.get('importe_min')),
    importe_max: numOrUndef(sp.get('importe_max')),
    es_pyme: sp.get('es_pyme') === '1' ? true : sp.get('es_pyme') === '0' ? false : undefined,
  }

  const sourceParam = sp.get('source') || 'all'
  const ccaa = sp.get('ccaa') || ''

  // Si pidieron explícitamente una CCAA != Cataluña → solo PLACSP
  // (Cataluña vía Socrata; el resto sólo está cubierto por PLACSP de momento)
  const useCatalunya = sourceParam !== 'PLACSP' && (ccaa === '' || ccaa === 'CT')
  const usePlacsp    = sourceParam !== 'CATALUNYA_SOCRATA'

  const limit = clamp(numOrUndef(sp.get('page_size')) ?? numOrUndef(sp.get('limit')) ?? 50, 1, 200)
  const page = Math.max(1, numOrUndef(sp.get('page')) ?? 1)
  const offset = (page - 1) * limit
  const sort = (sp.get('sort') || 'date_desc') as
    'relevance' | 'date_desc' | 'date_asc' | 'imp_desc' | 'imp_asc'

  const orderSocrata = mapOrderSocrata(sort)

  const promises: Array<Promise<{
    fuente: string; ok: boolean; items: NormalizedContrato[]; ms: number; error?: string
  }>> = []

  if (useCatalunya) {
    promises.push(
      searchCatalunya({ ...filters, limit, offset, order: orderSocrata }, 8000)
        .then(r => ({ fuente: 'CATALUNYA_SOCRATA', ...r })),
    )
  }

  if (usePlacsp && offset === 0) {
    // PLACSP atom solo entrega últimas N publicadas. Lo añadimos a la
    // primera página para no contaminar la paginación de Socrata.
    promises.push(
      fetchPlacspFeed('licitacion', 8000).then(r => {
        const items: NormalizedContrato[] = (r.items || []).map(it => ({
          id: `PL-${it.id}`,
          fuente: 'PLACSP',
          fuente_label: 'Plataforma Nacional',
          expediente: it.expediente,
          organo: it.organismo,
          objeto: it.titulo,
          cpv: it.cpv ?? undefined,
          cpv_div: it.cpv?.slice(0, 2),
          importe_licitacion: it.importe || undefined,
          estado: it.estado_label,
          fecha_publicacion: it.fecha?.slice(0, 10),
          anio: it.fecha ? Number(it.fecha.slice(0, 4)) : undefined,
          url: it.url_detalle,
          lugar_ejecucion: it.ciudad ?? undefined,
        }))
        return { fuente: 'PLACSP', ok: r.ok, items, ms: 0, error: r.error }
      }),
    )
  }

  const results = await Promise.all(promises)
  let merged: NormalizedContrato[] = results.flatMap(r => r.items)

  // Re-aplicar filtros que PLACSP no entiende
  if (filters.q) {
    const ql = filters.q.toLowerCase()
    merged = merged.filter(it => {
      if (it.fuente === 'CATALUNYA_SOCRATA') return true
      const haystack = `${it.objeto} ${it.organo} ${it.adjudicatario || ''} ${it.expediente}`.toLowerCase()
      return haystack.includes(ql)
    })
  }
  if (filters.cpv_div || filters.cpv) {
    const prefix = filters.cpv_div || filters.cpv!
    merged = merged.filter(it => {
      if (it.fuente === 'CATALUNYA_SOCRATA') return true
      return it.cpv?.startsWith(prefix) ?? false
    })
  }
  if (typeof filters.importe_min === 'number') {
    merged = merged.filter(it => (it.importe_adjudicacion ?? it.importe_licitacion ?? 0) >= filters.importe_min!)
  }
  if (typeof filters.importe_max === 'number') {
    merged = merged.filter(it => {
      const v = it.importe_adjudicacion ?? it.importe_licitacion ?? 0
      return v > 0 && v <= filters.importe_max!
    })
  }

  merged = sortMerged(merged, sort)

  // Cuenta total (solo Catalunya soporta count exacto)
  let total_estimado: number | null = null
  if (useCatalunya) {
    total_estimado = await countCatalunya(filters, 4000)
  }

  const stats = {
    total: merged.length,
    importe_total_M: Math.round(
      merged.reduce((s, it) => s + (it.importe_adjudicacion ?? it.importe_licitacion ?? 0), 0) / 100_000,
    ) / 10,
    por_fuente: countBy(merged, 'fuente'),
    por_tipo: countBy(merged, 'tipo_contrato'),
    fetch_ms: Date.now() - t0,
    sources: results.map(r => ({
      fuente: r.fuente, ok: r.ok, items: r.items.length, ms: r.ms, error: r.error,
    })),
  }

  return NextResponse.json(
    {
      items: merged.slice(0, limit),
      stats,
      pagination: { page, page_size: limit, offset, total_estimado },
      filters: { ...filters, source: sourceParam, ccaa, sort },
    },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
  )
}

function numOrUndef(s: string | null): number | undefined {
  if (s == null || s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
function mapOrderSocrata(s: string): string {
  switch (s) {
    case 'date_asc':  return 'data_publicacio_contracte ASC NULL LAST'
    case 'imp_desc':  return 'import_adjudicacio_amb_iva DESC NULL LAST'
    case 'imp_asc':   return 'import_adjudicacio_amb_iva ASC NULL LAST'
    case 'relevance': return ':id ASC'   // Socrata pseudo-orden
    case 'date_desc':
    default:          return 'data_publicacio_contracte DESC NULL LAST'
  }
}
function sortMerged(items: NormalizedContrato[], s: string): NormalizedContrato[] {
  if (s === 'imp_desc' || s === 'imp_asc') {
    const sgn = s === 'imp_desc' ? -1 : 1
    return items.sort((a, b) => {
      const va = a.importe_adjudicacion ?? a.importe_licitacion ?? 0
      const vb = b.importe_adjudicacion ?? b.importe_licitacion ?? 0
      return sgn * (va - vb)
    })
  }
  if (s === 'date_asc') {
    return items.sort((a, b) => (a.fecha_publicacion || '').localeCompare(b.fecha_publicacion || ''))
  }
  // date_desc / relevance default
  return items.sort((a, b) => (b.fecha_publicacion || '').localeCompare(a.fecha_publicacion || ''))
}
function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const k = String(it[key] ?? '—')
    out[k] = (out[k] || 0) + 1
  }
  return out
}
