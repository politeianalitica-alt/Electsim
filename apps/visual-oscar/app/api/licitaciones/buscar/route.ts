/**
 * GET /api/licitaciones/buscar
 *
 * Búsqueda en vivo de licitaciones públicas españolas, agregando:
 *   - Generalitat Catalunya · Socrata Open Data (1M+ registros · texto libre)
 *   - PLACSP nacional · Atom feed (últimas publicaciones)
 *
 * Estrategia inspirada en BquantFinance/licitaciones-espana v2026.02:
 * en lugar de descargar parquet de 1.5GB, atacamos los endpoints públicos
 * en tiempo real desde el servidor con normalización a un schema común.
 *
 * Query params:
 *   q=texto                  (full text en objeto/órgano/adjudicatario)
 *   desde=YYYY-MM-DD         (fecha publicación mínima)
 *   hasta=YYYY-MM-DD
 *   cpv=33                   (prefijo CPV)
 *   tipo=Serveis|Obres|...
 *   organo=texto             (organismo contratante contiene)
 *   min_importe=N            (filtra adjudicaciones >= N EUR)
 *   max_importe=N
 *   fuente=catalunya|placsp|all  (default all)
 *   limit=50                 (max 200, default 50)
 *   offset=0
 *   order=fecha_desc|fecha_asc|importe_desc|importe_asc
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchCatalunya, countCatalunya, type NormalizedContrato } from '@/lib/socrata-catalunya'
import { fetchPlacspFeed } from '@/lib/placsp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const t0 = Date.now()

  const q = searchParams.get('q')?.trim() || undefined
  const desde = searchParams.get('desde') || undefined
  const hasta = searchParams.get('hasta') || undefined
  const cpv = searchParams.get('cpv') || undefined
  const tipo = searchParams.get('tipo') || undefined
  const organo = searchParams.get('organo') || undefined
  const minImporte = numOrUndef(searchParams.get('min_importe'))
  const maxImporte = numOrUndef(searchParams.get('max_importe'))
  const fuente = (searchParams.get('fuente') || 'all') as 'catalunya' | 'placsp' | 'all'
  const limit = clamp(numOrUndef(searchParams.get('limit')) ?? 50, 1, 200)
  const offset = Math.max(0, numOrUndef(searchParams.get('offset')) ?? 0)
  const orderParam = searchParams.get('order') || 'fecha_desc'

  const orderSocrata = mapOrder(orderParam)

  // ─── Lanzar fetches en paralelo según fuente ─────────────
  const promises: Array<Promise<{
    fuente: string
    ok: boolean
    items: NormalizedContrato[]
    ms: number
    error?: string
  }>> = []

  if (fuente === 'catalunya' || fuente === 'all') {
    promises.push(
      searchCatalunya(
        { q, desde, hasta, cpv, tipo, organo, limit, offset, order: orderSocrata },
        8000,
      ).then(r => ({ fuente: 'CATALUNYA_SOCRATA', ...r })),
    )
  }

  if (fuente === 'placsp' || fuente === 'all') {
    promises.push(
      fetchPlacspFeed('licitacion', 8000).then(r => {
        const items: NormalizedContrato[] = (r.items || []).map(it => ({
          id: `PL-${it.id}`,
          fuente: 'PLACSP',
          fuente_label: 'PLACSP · Estado',
          expediente: it.expediente,
          organo: it.organismo,
          objeto: it.titulo,
          cpv: it.cpv ?? undefined,
          importe_licitacion: it.importe || undefined,
          estado: it.estado_label,
          fecha_publicacion: it.fecha?.slice(0, 10),
          url: it.url_detalle,
          lugar_ejecucion: it.ciudad ?? undefined,
        }))
        return { fuente: 'PLACSP', ok: r.ok, items, ms: 0, error: r.error }
      }),
    )
  }

  const results = await Promise.all(promises)

  // Merge todos los items
  let merged: NormalizedContrato[] = results.flatMap(r => r.items)

  // Filtros que sólo se aplican client-side (importes y q sobre PLACSP)
  if (q && fuente !== 'catalunya') {
    const ql = q.toLowerCase()
    merged = merged.filter(it => {
      // Catalunya ya viene filtrado por $q; sólo refiltrar PLACSP
      if (it.fuente === 'CATALUNYA_SOCRATA') return true
      return (
        it.objeto?.toLowerCase().includes(ql) ||
        it.organo?.toLowerCase().includes(ql) ||
        it.adjudicatario?.toLowerCase().includes(ql) ||
        it.expediente?.toLowerCase().includes(ql)
      )
    })
  }
  if (cpv && fuente !== 'catalunya') {
    merged = merged.filter(it => {
      if (it.fuente === 'CATALUNYA_SOCRATA') return true
      return it.cpv?.startsWith(cpv) ?? false
    })
  }
  if (typeof minImporte === 'number') {
    merged = merged.filter(it => {
      const v = it.importe_adjudicacion ?? it.importe_licitacion ?? 0
      return v >= minImporte
    })
  }
  if (typeof maxImporte === 'number') {
    merged = merged.filter(it => {
      const v = it.importe_adjudicacion ?? it.importe_licitacion ?? 0
      return v > 0 && v <= maxImporte
    })
  }

  // Reorden agregado
  merged = sortMerged(merged, orderParam)

  // Stats
  const stats = {
    total: merged.length,
    importe_total_M: Math.round(
      merged.reduce((s, it) => s + (it.importe_adjudicacion ?? it.importe_licitacion ?? 0), 0) /
        100_000,
    ) / 10,
    por_fuente: countBy(merged, 'fuente'),
    por_tipo: countBy(merged, 'tipo_contrato'),
    fetch_ms: Date.now() - t0,
    sources: results.map(r => ({
      fuente: r.fuente,
      ok: r.ok,
      items: r.items.length,
      ms: r.ms,
      error: r.error,
    })),
  }

  // Si Catalunya está incluido, intentamos devolver count total estimado para paginación
  let total_estimado: number | null = null
  if (fuente !== 'placsp') {
    total_estimado = await countCatalunya(
      { q, desde, hasta, cpv, tipo, organo },
      4000,
    )
  }

  return NextResponse.json(
    {
      items: merged.slice(0, limit),
      stats,
      pagination: { limit, offset, total_estimado },
      filters: {
        q, desde, hasta, cpv, tipo, organo,
        min_importe: minImporte, max_importe: maxImporte,
        fuente, order: orderParam,
      },
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
function mapOrder(o: string): string {
  switch (o) {
    case 'fecha_asc':    return 'data_publicacio_contracte ASC NULL LAST'
    case 'importe_desc': return 'import_adjudicacio_amb_iva DESC NULL LAST'
    case 'importe_asc':  return 'import_adjudicacio_amb_iva ASC NULL LAST'
    case 'fecha_desc':
    default:             return 'data_publicacio_contracte DESC NULL LAST'
  }
}
function sortMerged(items: NormalizedContrato[], order: string): NormalizedContrato[] {
  const sgn = order.endsWith('_desc') ? -1 : 1
  if (order.startsWith('importe')) {
    return items.sort((a, b) => {
      const va = a.importe_adjudicacion ?? a.importe_licitacion ?? 0
      const vb = b.importe_adjudicacion ?? b.importe_licitacion ?? 0
      return sgn * (va - vb)
    })
  }
  return items.sort((a, b) => {
    const va = a.fecha_publicacion || ''
    const vb = b.fecha_publicacion || ''
    return sgn * va.localeCompare(vb)
  })
}
function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const k = String(it[key] ?? '—')
    out[k] = (out[k] || 0) + 1
  }
  return out
}
