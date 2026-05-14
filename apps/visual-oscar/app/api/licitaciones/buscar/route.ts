/**
 * GET /api/licitaciones/buscar
 *
 * Búsqueda agregada en vivo sobre 4 fuentes públicas:
 *   - CATALUNYA_SOCRATA · 1M+ contratos (Open Data Generalitat)
 *   - PLACSP            · feed atom nacional (últimas publicaciones del Estado)
 *   - VALENCIA_CKAN     · ~24k/año × 13 años (Generalitat Valenciana CKAN)
 *   - TED               · diario UE (notices con buyer-country=ESP)
 *
 * Filtros canónicos: q, type, ccaa, anio, cpv_div, tipo_contrato,
 * procedimiento, source, es_pyme, importe_min/max, sort.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchCatalunya, countCatalunya,
  type NormalizedContrato, type SocrataFilters, type FuenteCode,
} from '@/lib/socrata-catalunya'
import { fetchPlacspFeed } from '@/lib/placsp'
import { searchValencia } from '@/lib/sources/valencia'
import { searchTed } from '@/lib/sources/ted'
import { searchAndalucia } from '@/lib/sources/andalucia'

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

  // ¿Qué fuentes activar?  Si filtran por CCAA o por source, restringimos.
  const wantCatalunya = (sourceParam === 'all' || sourceParam === 'CATALUNYA_SOCRATA') && (ccaa === '' || ccaa === 'CT')
  const wantAndalucia = (sourceParam === 'all' || sourceParam === 'ANDALUCIA')         && (ccaa === '' || ccaa === 'AN')
  const wantValencia  = (sourceParam === 'all' || sourceParam === 'VALENCIA_CKAN')     && (ccaa === '' || ccaa === 'VC')
  const wantPlacsp    = (sourceParam === 'all' || sourceParam === 'PLACSP')            && ccaa === ''
  const wantTed       = (sourceParam === 'all' || sourceParam === 'TED')               && ccaa === ''

  const limit = clamp(numOrUndef(sp.get('page_size')) ?? numOrUndef(sp.get('limit')) ?? 50, 1, 200)
  const page = Math.max(1, numOrUndef(sp.get('page')) ?? 1)
  const offset = (page - 1) * limit
  const sort = (sp.get('sort') || 'date_desc') as
    'relevance' | 'date_desc' | 'date_asc' | 'imp_desc' | 'imp_asc'

  const orderSocrata = mapOrderSocrata(sort)

  // ─── Fan-out paralelo ─────────────────────────────────────
  const promises: Array<Promise<{
    fuente: FuenteCode; ok: boolean; items: NormalizedContrato[]; ms: number; error?: string
  }>> = []

  if (wantCatalunya) {
    promises.push(
      searchCatalunya({ ...filters, limit, offset, order: orderSocrata }, 8000)
        .then(r => ({ fuente: 'CATALUNYA_SOCRATA' as FuenteCode, ...r })),
    )
  }

  if (wantAndalucia) {
    promises.push(
      searchAndalucia({
        q: filters.q,
        desde: filters.desde,
        hasta: filters.hasta,
        cpv_div: filters.cpv_div,
        cpv: filters.cpv,
        tipo_contrato: filters.tipo_contrato,
        organo: filters.organo,
        adjudicatario_nif: filters.adjudicatario_nif,
        importe_min: filters.importe_min,
        importe_max: filters.importe_max,
        limit: Math.min(80, Math.ceil(limit / 2)),
        offset: 0,
        order: sort === 'date_asc' ? 'date_asc'
          : sort === 'imp_desc' ? 'imp_desc'
          : sort === 'imp_asc' ? 'imp_asc'
          : 'date_desc',
      }, 8000).then(r => ({ fuente: 'ANDALUCIA' as FuenteCode, ok: r.ok, items: r.items, ms: r.ms, error: r.error })),
    )
  }

  if (wantValencia) {
    promises.push(
      searchValencia({
        q: filters.q,
        anio: filters.anio,
        desde: filters.desde,
        hasta: filters.hasta,
        cpv_div: filters.cpv_div,
        tipo_contrato: filters.tipo_contrato,
        procedimiento: filters.procedimiento,
        organo: filters.organo,
        adjudicatario_nif: filters.adjudicatario_nif,
        importe_min: filters.importe_min,
        importe_max: filters.importe_max,
        es_pyme: filters.es_pyme,
        limit: Math.min(50, Math.ceil(limit / 2)),
      }, 8000).then(r => ({ fuente: 'VALENCIA_CKAN' as FuenteCode, ...r })),
    )
  }

  if (wantTed) {
    promises.push(
      searchTed({
        q: filters.q,
        desde: filters.desde,
        hasta: filters.hasta,
        cpv_div: filters.cpv_div,
        organo: filters.organo,
        limit: Math.min(30, Math.ceil(limit / 3)),
      }, 8000).then(r => ({ fuente: 'TED' as FuenteCode, ...r })),
    )
  }

  if (wantPlacsp && offset === 0) {
    // PLACSP atom solo entrega últimas N publicadas; añadir solo en página 1.
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
        return { fuente: 'PLACSP' as FuenteCode, ok: r.ok, items, ms: 0, error: r.error }
      }),
    )
  }

  const results = await Promise.all(promises)
  let merged: NormalizedContrato[] = results.flatMap(r => r.items)

  // ─── Re-aplicar filtros que no soportan PLACSP/TED ────────
  if (filters.q) {
    const ql = filters.q.toLowerCase()
    merged = merged.filter(it => {
      // Catalunya, Valencia y TED ya filtraron en query · solo refiltrar PLACSP
      if (it.fuente !== 'PLACSP') return true
      const haystack = `${it.objeto} ${it.organo} ${it.adjudicatario || ''} ${it.expediente}`.toLowerCase()
      return haystack.includes(ql)
    })
  }
  if (filters.cpv_div || filters.cpv) {
    const prefix = filters.cpv_div || filters.cpv!
    merged = merged.filter(it => {
      // Cataluña, Valencia y TED ya filtran por cpv en query
      if (it.fuente !== 'PLACSP') return true
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

  // Cuenta total (Catalunya soporta count exacto · Valencia/TED son aproximados)
  let total_estimado: number | null = null
  if (wantCatalunya && !wantValencia && !wantTed) {
    total_estimado = await countCatalunya(filters, 4000)
  } else if (wantCatalunya) {
    // suma estimada
    const cnt = await countCatalunya(filters, 4000)
    total_estimado = cnt != null ? cnt : null
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
    case 'relevance': return ':id ASC'
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
