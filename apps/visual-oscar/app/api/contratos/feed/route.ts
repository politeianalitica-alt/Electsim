import { NextRequest, NextResponse } from 'next/server'
import { fetchPlacspFeed, type PlacspTipo } from '@/lib/placsp'
import { scoreContrato, type ScoredContrato } from '@/lib/contratos-scoring'
import { withMeta } from '@/lib/backend'

// GET /api/contratos/feed
//   ?tipo=licitacion|adjudicacion|both        (default both)
//   ?limit=50                                  (default 80)
//   ?estado=PUB|ADJ|RES|FORM|ANUL|DESI|...     (filtra por estado)
//   ?min_importe=100000                         (importe mínimo en EUR)
//   ?organismo=central|autonomico|local|...     (filtro organismo_tipo)
//
// Datos REALES de la Plataforma de Contratación del Sector Público (PLACSP)
// vía sus feeds Atom (CODICE format).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tipoParam = (searchParams.get('tipo') || 'both') as PlacspTipo | 'both'
  const limit = Math.min(200, Number(searchParams.get('limit') || 80))
  const estadoF = searchParams.get('estado')
  const minImporte = Number(searchParams.get('min_importe') || 0)
  const orgF = searchParams.get('organismo')

  const t0 = Date.now()
  const tipos: PlacspTipo[] = tipoParam === 'both'
    ? ['licitacion', 'adjudicacion']
    : [tipoParam as PlacspTipo]

  // Fetch en paralelo
  const fetches = await Promise.all(tipos.map(t => fetchPlacspFeed(t, 12000)))

  // Aplanar y puntuar
  let scored: ScoredContrato[] = []
  for (const f of fetches) {
    for (const it of f.items) scored.push(scoreContrato(it))
  }

  // Filtros
  if (estadoF)    scored = scored.filter(s => s.estado === estadoF)
  if (minImporte) scored = scored.filter(s => s.importe >= minImporte)
  if (orgF)       scored = scored.filter(s => s.organismo_tipo === orgF)

  // Dedup por id+tipo
  const seen = new Set<string>()
  scored = scored.filter(s => {
    const key = `${s.tipo}:${s.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Orden por importance desc, luego importe desc
  scored.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    return b.importe - a.importe
  })
  const top = scored.slice(0, limit)

  // Stats agregadas
  const summary = {
    fetch_ms: Date.now() - t0,
    sources_attempted: fetches.length,
    sources_ok: fetches.filter(f => f.ok).length,
    sources_failed_detail: fetches.filter(f => !f.ok).map(f => f.error).filter(Boolean),
    raw_items: fetches.reduce((s, f) => s + f.items.length, 0),
    scored_items: scored.length,
    returned: top.length,
    importe_total_M: round1(top.reduce((s, c) => s + c.importe, 0) / 1_000_000),
    top_importance: top[0]?.importance || 0,
    avg_importance: top.length > 0 ? Math.round(top.reduce((s, c) => s + c.importance, 0) / top.length) : 0,
    por_tipo: count(top, 'tipo'),
    por_estado: count(top, 'estado'),
    por_organismo_tipo: count(top, 'organismo_tipo'),
    megaproyectos: top.filter(c => c.tags.includes('🚨 MEGAPROYECTO')).length,
    gran_importe: top.filter(c => c.tags.includes('💰 GRAN IMPORTE')).length,
    gobierno_central: top.filter(c => c.tags.includes('🏛 GOBIERNO CENTRAL')).length,
  }

  return NextResponse.json(withMeta({
    items: top,
    summary,
    filters: { tipo: tipoParam, limit, estado: estadoF, min_importe: minImporte, organismo: orgF },
  }, 'mock'))
}

function count<T, K extends keyof T>(items: T[], key: K): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const v = String((it as Record<string, unknown>)[key as string] ?? 'null')
    out[v] = (out[v] || 0) + 1
  }
  return out
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
