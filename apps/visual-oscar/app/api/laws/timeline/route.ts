import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/laws/timeline${params ? '?' + params : ''}`
  const real = await fromBackend<LawsTimelineResponse>(path)
  if (real && real.items) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    items: [], stats: { total: 0, by_estado: {}, by_categoria: {}, by_tipo: {}, high_impact: 0 },
    next_plenos: [], fetched_at: new Date().toISOString(), sources: [],
  }, 'mock'))
}
