/**
 * /api/legislativo/published — Leyes y normas publicadas en BOE.
 *
 * Fuente: API Datos Abiertos del BOE (oficial)
 * https://www.boe.es/datosabiertos/api/boe/sumario/{YYYYMMDD}
 *
 * Filtros:
 *   ?days=N        últimos N días (default 30, max 90)
 *   ?materia=...   filtrar por materia inferida
 *   ?tipo=Ley|RDL|RD|LO|...
 *   ?q=texto-libre
 *   ?limit=N       (default 100, max 300)
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchBoeLastNDays } from '@/lib/boe'
import { scoreNorma, type ScoredNorma } from '@/lib/legis-scoring'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const days = Math.min(90, Math.max(1, Number(params.get('days') || 30)))
  const materiaF = params.get('materia')
  const tipoF = params.get('tipo')
  const q = (params.get('q') || '').toLowerCase().trim()
  const limit = Math.min(300, Math.max(10, Number(params.get('limit') || 100)))

  try {
    const items = await fetchBoeLastNDays(days, 12000)
    let scored: ScoredNorma[] = items.map(scoreNorma)

    // Solo Sección I (Disposiciones generales) por defecto
    const onlySectionI = params.get('only_section_i') !== 'false'
    if (onlySectionI) scored = scored.filter(s => s.seccion_codigo === '1')

    if (tipoF) scored = scored.filter(s => s.tipo === tipoF)
    if (materiaF) scored = scored.filter(s => s.materia === materiaF)
    if (q) scored = scored.filter(s =>
      s.titulo.toLowerCase().includes(q) ||
      s.departamento.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    )

    // Dedup
    const seen = new Set<string>()
    scored = scored.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

    // Orden por fecha desc + importancia
    scored.sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
      return b.importance - a.importance
    })

    const top = scored.slice(0, limit)

    // Stats agregadas
    const porTipo: Record<string, number> = {}
    const porMateria: Record<string, number> = {}
    const porDept: Record<string, number> = {}
    for (const s of scored) {
      porTipo[s.tipo] = (porTipo[s.tipo] || 0) + 1
      porMateria[s.materia] = (porMateria[s.materia] || 0) + 1
      porDept[s.departamento] = (porDept[s.departamento] || 0) + 1
    }

    return NextResponse.json(withMeta({
      items: top,
      stats: {
        total: scored.length,
        returned: top.length,
        days,
        porTipo,
        porMateria,
        porDept,
        highImpact: scored.filter(s => s.importance >= 70).length,
        fetchedAt: new Date().toISOString(),
      },
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({
      items: [],
      stats: { total: 0, returned: 0, days, porTipo: {}, porMateria: {}, porDept: {}, highImpact: 0, fetchedAt: new Date().toISOString() },
      error: String(e),
    }, 'error'))
  }
}
