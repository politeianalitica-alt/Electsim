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

function dateOffset(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}
function dateForward(daysAhead: number): { fecha: string; dia_semana: string } {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  return { fecha: d.toISOString().slice(0, 10), dia_semana: dias[d.getDay()] }
}

const MOCK_LAWS: LawItem[] = [
  { id: 'BOE-A-2026-9876', titulo: 'Real Decreto-ley 5/2026, de medidas urgentes en materia de vivienda y alquiler', fecha: dateOffset(0),  tipo: 'RDL', seccion: '1', departamento: 'Ministerio de Vivienda',          url_html: 'https://boe.es', estado: 'aprobada',     categoria: 'Social',     impact: 88 },
  { id: 'BOE-A-2026-9870', titulo: 'Reforma del IRPF y rentas del capital · ejercicio 2026',                          fecha: dateOffset(1),  tipo: 'PL',  seccion: '1', departamento: 'Ministerio de Hacienda',          url_html: 'https://boe.es', estado: 'proxima_voto', categoria: 'Económica',  impact: 84 },
  { id: 'BOE-A-2026-9863', titulo: 'Decreto-ley 4/2026 · ayudas al sector agroalimentario tras aranceles EE.UU.',     fecha: dateOffset(2),  tipo: 'RDL', seccion: '1', departamento: 'Ministerio de Agricultura',     url_html: 'https://boe.es', estado: 'en_tramite',   categoria: 'Agraria',    impact: 78 },
  { id: 'BOE-A-2026-9854', titulo: 'Ley Orgánica de modificación del régimen de aforamientos',                         fecha: dateOffset(3),  tipo: 'LO',  seccion: '1', departamento: 'Ministerio de Justicia',          url_html: 'https://boe.es', estado: 'en_tramite',   categoria: 'Justicia',   impact: 72 },
  { id: 'BOE-A-2026-9847', titulo: 'Acuerdo entre España y Canadá sobre protección de información clasificada',        fecha: dateOffset(4),  tipo: 'Tratado', seccion: '1', departamento: 'Ministerio de Asuntos Exteriores', url_html: 'https://boe.es', estado: 'aprobada', categoria: 'Internacional', impact: 56 },
  { id: 'BOE-A-2026-9841', titulo: 'Ley 4/2026, de 24 de marzo, de Patrimonio Cultural de Andalucía',                  fecha: dateOffset(6),  tipo: 'Ley', seccion: '1', departamento: 'Comunidad Autónoma de Andalucía', url_html: 'https://boe.es', estado: 'aprobada',     categoria: 'Territorial', impact: 64 },
  { id: 'BOE-A-2026-9832', titulo: 'Real Decreto 312/2026 · plan de eficiencia energética en edificios públicos',      fecha: dateOffset(7),  tipo: 'RD',  seccion: '1', departamento: 'Ministerio de Transición Ecológica', url_html: 'https://boe.es', estado: 'aprobada',  categoria: 'Energía',    impact: 52 },
  { id: 'BOE-A-2026-9821', titulo: 'Resolución del Congreso de los Diputados sobre regulación de la IA aplicada a procesos electorales', fecha: dateOffset(9), tipo: 'Resolución', seccion: '1', departamento: 'Congreso de los Diputados', url_html: 'https://boe.es', estado: 'aprobada', categoria: 'Digital', impact: 70 },
  { id: 'BOE-A-2026-9812', titulo: 'Ley 3/2026 de movilidad sostenible y transporte',                                  fecha: dateOffset(11), tipo: 'Ley', seccion: '1', departamento: 'Ministerio de Transportes',       url_html: 'https://boe.es', estado: 'aprobada',     categoria: 'Energía',    impact: 67 },
  { id: 'BOE-A-2026-9803', titulo: 'Recurso de inconstitucionalidad 2781-2026 contra el artículo 2 del Decreto-ley 4/2026', fecha: dateOffset(12), tipo: 'Otro', seccion: '1', departamento: 'Tribunal Constitucional', url_html: 'https://boe.es', estado: 'en_tramite', categoria: 'Justicia', impact: 75 },
  { id: 'BOE-A-2026-9792', titulo: 'Reforma del CGPJ · proposición de ley',                                            fecha: dateOffset(14), tipo: 'PPL', seccion: '1', departamento: 'GP Popular',                       url_html: 'https://boe.es', estado: 'vetada',      categoria: 'Justicia',   impact: 80 },
  { id: 'BOE-A-2026-9785', titulo: 'Ley de Vivienda · ampliación de zonas tensionadas',                                fecha: dateOffset(16), tipo: 'PL',  seccion: '1', departamento: 'Ministerio de Vivienda',          url_html: 'https://boe.es', estado: 'proxima_voto', categoria: 'Social',     impact: 88 },
  { id: 'BOE-A-2026-9776', titulo: 'Ley de Sanidad Universal · cobertura migrantes',                                   fecha: dateOffset(18), tipo: 'PL',  seccion: '1', departamento: 'Ministerio de Sanidad',           url_html: 'https://boe.es', estado: 'en_tramite',   categoria: 'Sanidad',    impact: 62 },
  { id: 'BOE-A-2026-9764', titulo: 'Ley Orgánica de Universidades · revisión LOSU',                                    fecha: dateOffset(20), tipo: 'LO',  seccion: '1', departamento: 'Ministerio de Educación',         url_html: 'https://boe.es', estado: 'en_tramite',   categoria: 'Educación',  impact: 58 },
]

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
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/laws/timeline${params ? '?' + params : ''}`
  const real = await fromBackend<LawsTimelineResponse>(path)
  if (real && real.items && real.items.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    items: MOCK_LAWS,
    stats: statsOf(MOCK_LAWS),
    next_plenos: [dateForward(2), dateForward(4), dateForward(8), dateForward(11)],
    fetched_at: new Date().toISOString(),
    sources: ['BOE Datos Abiertos', 'Congreso · Orden del día', 'Senado'],
  }, 'mock'))
}
