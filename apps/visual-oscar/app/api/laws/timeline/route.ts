import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { fetchBoeLastNDays } from '@/lib/boe'
import { scoreNorma } from '@/lib/legis-scoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export interface LawItem {
  id: string
  titulo: string
  fecha: string
  tipo: string
  seccion?: string
  departamento: string
  url?: string
  url_html?: string
  estado: 'aprobada' | 'en_tramite' | 'proxima_voto' | 'vetada'
  categoria: string
  impact: number
}

export interface LawsTimelineResponse {
  items: LawItem[]
  stats: {
    total: number
    by_estado: Record<string, number>
    by_categoria: Record<string, number>
    by_tipo: Record<string, number>
    high_impact: number
  }
  next_plenos: { fecha: string; dia_semana: string }[]
  fetched_at: string
  sources: string[]
}

function dateForward(daysAhead: number): { fecha: string; dia_semana: string } {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  return { fecha: d.toISOString().slice(0, 10), dia_semana: dias[d.getDay()] }
}

function statsOf(items: LawItem[]) {
  const out = { total: items.length, by_estado: {} as Record<string, number>, by_categoria: {} as Record<string, number>, by_tipo: {} as Record<string, number>, high_impact: 0 }
  for (const it of items) {
    out.by_estado[it.estado] = (out.by_estado[it.estado] || 0) + 1
    out.by_categoria[it.categoria] = (out.by_categoria[it.categoria] || 0) + 1
    out.by_tipo[it.tipo] = (out.by_tipo[it.tipo] || 0) + 1
    if (it.impact >= 70) out.high_impact++
  }
  return out
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const path = `/api/laws/timeline${params.toString() ? '?' + params.toString() : ''}`
  const real = await fromBackend<LawsTimelineResponse>(path)
  if (real && real.items && real.items.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const days = Math.min(30, Number(params.get('days') || 21))
  const limit = Math.min(200, Number(params.get('limit') || 80))
  try {
    const boeItems = await fetchBoeLastNDays(days, 8000)
    const scored = boeItems.map(scoreNorma)
    // Solo Sección I (disposiciones generales) y dedup
    const seen = new Set<string>()
    const items: LawItem[] = []
    for (const s of scored) {
      if (s.seccion_codigo !== '1') continue
      if (seen.has(s.id)) continue
      seen.add(s.id)
      items.push({
        id: s.id,
        titulo: s.titulo,
        fecha: s.fecha,
        tipo: s.tipo,
        seccion: s.seccion_codigo,
        departamento: s.departamento,
        url_html: s.url_html,
        estado: 'aprobada', // BOE = ya publicada → aprobada
        categoria: s.materia,
        impact: s.importance,
      })
    }
    // Orden por importance · top N
    items.sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact
      return b.fecha.localeCompare(a.fecha)
    })
    const top = items.slice(0, limit)
    return NextResponse.json(withMeta({
      items: top,
      stats: statsOf(top),
      next_plenos: [dateForward(2), dateForward(4), dateForward(8), dateForward(11)],
      fetched_at: new Date().toISOString(),
      sources: ['BOE Datos Abiertos'],
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({
      items: [], stats: { total: 0, by_estado: {}, by_categoria: {}, by_tipo: {}, high_impact: 0 },
      next_plenos: [], fetched_at: new Date().toISOString(), sources: [],
    }, 'mock'))
  }
}
