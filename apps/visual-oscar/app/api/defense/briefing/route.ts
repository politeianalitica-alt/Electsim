/**
 * GET /api/defense/briefing
 * Agregador especializado de medios de defensa (8 fuentes RSS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBriefingDefensa } from '@/lib/defense/medios-defensa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(150, Number(sp.get('limit') || 80))
  const q = (sp.get('q') || '').toLowerCase().trim()
  const dom = sp.get('dom')
  const pais = sp.get('pais')
  const minR = Number(sp.get('minR') || 0)

  const report = await getBriefingDefensa(limit)
  let items = report.items
  if (q) items = items.filter(i => (i.titulo + ' ' + i.excerpt).toLowerCase().includes(q))
  if (dom) items = items.filter(i => i.dominios.includes(dom as never))
  if (pais) items = items.filter(i => i.paises_mencionados.includes(pais))
  if (minR > 0) items = items.filter(i => i.relevancia >= minR)

  // Recalcular el agregado sobre los items ya filtrados para que los KPIs y
  // paneles laterales (por medio/dominio/país) reflejen los filtros activos.
  const porMedio: Record<string, number> = {}
  const porDominio: Record<string, number> = {}
  const porPais: Record<string, number> = {}
  const porTipo: Record<string, number> = {}
  let altaRelevancia = 0
  for (const it of items) {
    porMedio[it.medio_nombre] = (porMedio[it.medio_nombre] || 0) + 1
    for (const d of it.dominios) porDominio[d] = (porDominio[d] || 0) + 1
    for (const p of it.paises_mencionados) porPais[p] = (porPais[p] || 0) + 1
    porTipo[it.tipo_contenido] = (porTipo[it.tipo_contenido] || 0) + 1
    if (it.relevancia > 80) altaRelevancia++
  }
  const agregado = { totalItems: items.length, porMedio, porDominio, porPais, porTipo, altaRelevancia }

  return NextResponse.json(
    { ...report, items, agregado, query: { q, dom, pais, minR, limit } },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900' } },
  )
}
