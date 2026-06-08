/**
 * GET /api/sectores/farma/desabastecimientos?days=60&page=1&page_size=50
 * Listado de problemas de suministro de medicamentos (AEMPS).
 *
 * Devuelve también agregados por tipo y por mes para visualizaciones.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchDesabastecimientos, TIPO_PROBLEMA_LABEL, TIPO_PROBLEMA_COLOR,
} from '@/lib/sources/aemps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const days = clamp(Number(sp.get('days') || 60), 1, 365)
  const page = Math.max(1, Number(sp.get('page') || 1))
  const pageSize = clamp(Number(sp.get('page_size') || 50), 1, 200)

  const r = await searchDesabastecimientos(days, page, pageSize)
  if (!r.ok) return NextResponse.json({ error: 'fetch failed', items: [] }, { status: 200 })

  const mapItem = (it: Awaited<ReturnType<typeof searchDesabastecimientos>>['items'][number]) => ({
    cn: it.cn,
    nombre: it.nombre,
    tipo: it.tipoProblemaSuministro,
    tipo_label: it.tipoProblemaSuministro != null ? TIPO_PROBLEMA_LABEL[it.tipoProblemaSuministro] : '—',
    tipo_color: it.tipoProblemaSuministro != null ? TIPO_PROBLEMA_COLOR[it.tipoProblemaSuministro] : '#525258',
    fini: it.fini ? new Date(it.fini).toISOString().slice(0, 10) : null,
    ffin: it.ffin ? new Date(it.ffin).toISOString().slice(0, 10) : null,
    permanente: it.ffin == null,
    activo: it.activo === true,
    motivo: it.observ?.trim(),
  })

  // `items` = página pedida (para el listado reciente).
  const items = r.items.map(mapItem)

  // Agregados (por_tipo / por_mes) sobre el TOTAL del periodo, no solo la
  // primera página: CIMA tope a 200 filas por página, así que paginamos hasta
  // cubrir `total` para que el timeline y el desglose por tipo no estén
  // truncados (hay ~829 problemas vs ~200 de una sola página).
  const CIMA_MAX_PAGE = 200
  const aggAll = [...r.items]
  const totalPages = Math.min(8, Math.ceil((r.total || 0) / CIMA_MAX_PAGE))
  if (totalPages > 1) {
    const extra = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(p =>
        searchDesabastecimientos(days, p, CIMA_MAX_PAGE).then(res => (res.ok ? res.items : [])),
      ),
    )
    for (const chunk of extra) aggAll.push(...chunk)
  }
  const aggItems = aggAll.map(mapItem)

  // Agregados
  const por_tipo: Record<string, number> = {}
  const por_mes: Record<string, number> = {}
  for (const it of aggItems) {
    const k = String(it.tipo_label)
    por_tipo[k] = (por_tipo[k] || 0) + 1
    if (it.fini) {
      const m = it.fini.slice(0, 7)
      por_mes[m] = (por_mes[m] || 0) + 1
    }
  }

  return NextResponse.json({
    items,
    total: r.total,
    pagination: { page, page_size: pageSize, returned: items.length },
    por_tipo: Object.entries(por_tipo)
      .map(([label, n]) => ({
        label, n,
        color: aggItems.find(i => i.tipo_label === label)?.tipo_color || '#525258',
      }))
      .sort((a, b) => b.n - a.n),
    por_mes: Object.entries(por_mes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, n]) => ({ t, n })),
    days,
    fuente: 'AEMPS · CIMA · psuministro',
  }, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
