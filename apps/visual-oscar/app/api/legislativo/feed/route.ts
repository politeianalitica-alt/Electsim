import { NextRequest, NextResponse } from 'next/server'
import { fetchBoeLastNDays } from '@/lib/boe'
import { scoreNorma, type ScoredNorma } from '@/lib/legis-scoring'
import { fromBackend, withMeta, backendConfigured } from '@/lib/backend'

// GET /api/legislativo/feed
//   ?days=7      últimos N días del BOE (default 7)
//   ?limit=50    máximo a devolver (default 80)
//   ?seccion=1   filtrar por sección (1=Disposiciones generales, 2A, 2B, 3, 4, 5)
//   ?tipo=Ley|RDL|RD|LO|...
//   ?materia=Económica|Social|...
//
// Combina:
//   - BOE: API de datos abiertos (real, oficial)
//   - Backend: si BACKEND_URL configurada, mezcla con /legislativo/{ws}/signal

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const days = Math.min(14, Math.max(1, Number(searchParams.get('days') || 7)))
  const limit = Math.min(200, Number(searchParams.get('limit') || 80))
  const seccion = searchParams.get('seccion')
  const tipoF = searchParams.get('tipo')
  const materiaF = searchParams.get('materia')

  // Fetch BOE en paralelo
  const t0 = Date.now()
  const boeItems = await fetchBoeLastNDays(days, 8000)
  let scored: ScoredNorma[] = boeItems.map(scoreNorma)

  // Filtros
  if (seccion)  scored = scored.filter(s => s.seccion_codigo === seccion)
  if (tipoF)    scored = scored.filter(s => s.tipo === tipoF)
  if (materiaF) scored = scored.filter(s => s.materia === materiaF)

  // Dedup por id
  const seen = new Set<string>()
  scored = scored.filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })

  // Orden por importance desc · luego por fecha desc
  scored.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    return b.fecha.localeCompare(a.fecha)
  })
  const top = scored.slice(0, limit)

  // Backend signal (si está, lo añadimos como metadata)
  let backendSignal: unknown = null
  if (backendConfigured()) {
    backendSignal = await fromBackend('/legislativo/default/signal')
  }

  // Stats agregadas
  const summary = {
    total_items: scored.length,
    returned: top.length,
    fetch_ms: Date.now() - t0,
    por_tipo: count(top, 'tipo'),
    por_materia: count(top, 'materia'),
    por_seccion: count(top, 'seccion_codigo'),
    top_importance: top[0]?.importance || 0,
    avg_importance: top.length > 0 ? Math.round(top.reduce((s, n) => s + n.importance, 0) / top.length) : 0,
    high_impact_count: top.filter(n => n.tags.includes('🚨 IMPACTO ALTO')).length,
    urgent_count: top.filter(n => n.tags.includes('⚡ URGENTE')).length,
    eu_count: top.filter(n => n.tags.includes('🇪🇺 EU')).length,
  }

  return NextResponse.json(withMeta({
    items: top,
    summary,
    backend_signal: backendSignal,
    filters: { days, limit, seccion, tipo: tipoF, materia: materiaF },
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
