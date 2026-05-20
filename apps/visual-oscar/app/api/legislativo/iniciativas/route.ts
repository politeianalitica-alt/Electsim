import { NextRequest, NextResponse } from 'next/server'
import { fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Iniciativa {
  id: string
  numero_expediente: string
  tipo: string
  titulo: string
  titulo_corto: string
  estado: string
  fase_actual: string
  comision: string
  fecha_presentacion: string
  grupo_proponente: string | null
  score_importancia: number
  url_congreso: string
  fecha_extraccion: string
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeScore(tipo: string, fase: string): number {
  let base: number
  switch (tipo) {
    case 'proyecto_ley':    base = 8; break
    case 'decreto_ley':     base = 9; break
    case 'proposicion_ley': base = 6; break
    case 'reforma_estatuto':base = 7; break
    default:                base = 5; break
  }

  let boost = 0
  const faseLower = (fase || '').toLowerCase()
  if (faseLower.includes('pleno')) boost += 1.5
  else if (faseLower.includes('comisión') || faseLower.includes('comision')) boost += 1.0
  else if (faseLower.includes('senado')) boost += 0.5

  return Math.min(10, Math.round((base + boost) * 10) / 10)
}

// ─── Normalize tipo from Congreso API ────────────────────────────────────────

function normalizeTipo(raw: string): string {
  const r = (raw || '').toLowerCase()
  if (r.includes('decreto') && r.includes('ley')) return 'decreto_ley'
  if (r.includes('proyecto')) return 'proyecto_ley'
  if (r.includes('proposici')) return 'proposicion_ley'
  if (r.includes('estatuto') || r.includes('reform')) return 'reforma_estatuto'
  return 'otro'
}

// ─── Fetch one "tipo_iniciativa" from Congreso ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCongresoTipo(tipo: string): Promise<any[]> {
  const url = new URL(
 'https://www.congreso.es/es/busqueda-de-iniciativas'
  )
  url.searchParams.set('p_p_id', 'iniciativas')
  url.searchParams.set('p_p_lifecycle', '2')
  url.searchParams.set('p_p_resource_id', 'filtrarListado')
  url.searchParams.set('tipo_iniciativa', tipo)
  url.searchParams.set('estado', 'enTramitacion')
  url.searchParams.set('legislatura', '15')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
 'Accept': 'application/json, text/javascript, */*',
 'User-Agent': 'Mozilla/5.0 (compatible; ElectSim/1.0)',
 'Referer': 'https://www.congreso.es/es/busqueda-de-iniciativas',
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('json')) return []
    const data = await res.json()
    // The API may return { lista: [...] } or an array directly
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.lista)) return data.lista
    if (data && Array.isArray(data.iniciativas)) return data.iniciativas
    return []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

// ─── Map raw Congreso item → Iniciativa ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCongresoItem(item: any, fechaExtraccion: string): Iniciativa {
  const expediente: string = item.expediente || item.numeroExpediente || item.id || String(Math.random())
  const titulo: string = item.titulo || item.title || ''
  const tipoRaw: string = item.tipo || item.tipoIniciativa || ''
  const tipo = normalizeTipo(tipoRaw)
  const fase: string = item.fase || item.faseActual || item.estado || ''
  const estado: string = item.estado || 'en_tramitacion'
  const comision: string = item.comision || item.organo || ''
  const fechaStr: string = item.fechaPresentacion || item.fecha || ''
  const grupo: string | null = item.grupo || item.grupoProponente || null

  return {
    id: expediente,
    numero_expediente: expediente,
    tipo,
    titulo,
    titulo_corto: titulo.slice(0, 60),
    estado,
    fase_actual: fase,
    comision,
    fecha_presentacion: fechaStr,
    grupo_proponente: grupo,
    score_importancia: computeScore(tipo, fase),
    url_congreso: item.urlDetalle || item.url || `https://www.congreso.es/es/busqueda-de-iniciativas`,
    fecha_extraccion: fechaExtraccion,
  }
}

// ─── Fallback: map /api/laws/timeline items ───────────────────────────────────

interface LawsTimelineItem {
  id: string
  titulo: string
  fecha: string
  tipo: string
  departamento?: string
  url?: string
  url_html?: string
  estado?: string
  impact?: number
}

function mapBackendItem(item: LawsTimelineItem, fechaExtraccion: string): Iniciativa {
  const tipo = normalizeTipo(item.tipo || '')
  const fase = item.estado || 'en_tramitacion'
  return {
    id: item.id,
    numero_expediente: item.id,
    tipo,
    titulo: item.titulo,
    titulo_corto: item.titulo.slice(0, 60),
    estado: item.estado || 'en_tramitacion',
    fase_actual: fase,
    comision: item.departamento || '',
    fecha_presentacion: item.fecha,
    grupo_proponente: null,
    score_importancia: computeScore(tipo, fase),
    url_congreso: item.url_html || item.url || '',
    fecha_extraccion: fechaExtraccion,
  }
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function mockIniciativas(fechaExtraccion: string): Iniciativa[] {
  return [
    {
      id: '121/000034', numero_expediente: '121/000034',
      tipo: 'proyecto_ley',
      titulo: 'Proyecto de Ley de Reforma del IRPF y rentas del capital para el ejercicio 2026',
      titulo_corto: 'Proyecto de Ley de Reforma del IRPF y rentas del c',
      estado: 'en_tramitacion', fase_actual: 'Pleno Congreso',
      comision: 'Comisión de Hacienda',
      fecha_presentacion: '2026-03-12', grupo_proponente: 'Grupo Parlamentario Socialista',
      score_importancia: 9.5, url_congreso: 'https://www.congreso.es',
      fecha_extraccion: fechaExtraccion,
    },
    {
      id: '121/000041', numero_expediente: '121/000041',
      tipo: 'proyecto_ley',
      titulo: 'Proyecto de Ley de Vivienda · ampliación de zonas tensionadas del mercado residencial',
      titulo_corto: 'Proyecto de Ley de Vivienda · ampliación de zonas t',
      estado: 'en_tramitacion', fase_actual: 'Senado',
      comision: 'Comisión de Vivienda',
      fecha_presentacion: '2026-02-04', grupo_proponente: 'Gobierno',
      score_importancia: 8.5, url_congreso: 'https://www.congreso.es',
      fecha_extraccion: fechaExtraccion,
    },
    {
      id: '121/000037', numero_expediente: '121/000037',
      tipo: 'decreto_ley',
      titulo: 'Real Decreto-ley 4/2026, de medidas urgentes de apoyo al sector agroalimentario',
      titulo_corto: 'Real Decreto-ley 4/2026, de medidas urgentes de apo',
      estado: 'en_tramitacion', fase_actual: 'Pleno Congreso · Convalidación',
      comision: 'Pleno',
      fecha_presentacion: '2026-04-18', grupo_proponente: 'Gobierno',
      score_importancia: 9, url_congreso: 'https://www.congreso.es',
      fecha_extraccion: fechaExtraccion,
    },
    {
      id: '122/000019', numero_expediente: '122/000019',
      tipo: 'proposicion_ley',
      titulo: 'Proposición de Ley de reforma constitucional para la supresión de aforamientos',
      titulo_corto: 'Proposición de Ley de reforma constitucional para l',
      estado: 'en_tramitacion', fase_actual: 'Comisión · Ponencia',
      comision: 'Comisión de Justicia',
      fecha_presentacion: '2026-03-25', grupo_proponente: 'GP Sumar',
      score_importancia: 7, url_congreso: 'https://www.congreso.es',
      fecha_extraccion: fechaExtraccion,
    },
    {
      id: '121/000045', numero_expediente: '121/000045',
      tipo: 'proyecto_ley',
      titulo: 'Proyecto de Ley Orgánica de Universidades · revisión integral de la LOSU',
      titulo_corto: 'Proyecto de Ley Orgánica de Universidades · revisió',
      estado: 'en_tramitacion', fase_actual: 'Comisión · Enmiendas',
      comision: 'Comisión de Educación',
      fecha_presentacion: '2026-04-01', grupo_proponente: 'Gobierno',
      score_importancia: 7.5, url_congreso: 'https://www.congreso.es',
      fecha_extraccion: fechaExtraccion,
    },
  ]
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const fechaExtraccion = new Date().toISOString()

  // 1. Try Congreso API (3 tipos in parallel)
  const results = await Promise.allSettled([
    fetchCongresoTipo('proyectosLey'),
    fetchCongresoTipo('decretosLey'),
    fetchCongresoTipo('proposicionesLey'),
  ])

  const congresoRaw = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))

  if (congresoRaw.length > 0) {
    const items = congresoRaw.map(i => mapCongresoItem(i, fechaExtraccion))
    // Sort by score desc
    items.sort((a, b) => b.score_importancia - a.score_importancia)
    return NextResponse.json({
      items,
      total: items.length,
      fuente: 'congreso' as const,
      fecha_extraccion: fechaExtraccion,
    })
  }

  // 2. Fallback: try backend /api/laws/timeline
  const backendData = await fromBackend<{ items: LawsTimelineItem[] }>('/api/laws/timeline')
  if (backendData?.items && backendData.items.length > 0) {
    const items = backendData.items.map(i => mapBackendItem(i, fechaExtraccion))
    items.sort((a, b) => b.score_importancia - a.score_importancia)
    return NextResponse.json({
      items,
      total: items.length,
      fuente: 'backend' as const,
      fecha_extraccion: fechaExtraccion,
    })
  }

  // 3. Final fallback: mock
  const items = mockIniciativas(fechaExtraccion)
  return NextResponse.json({
    items,
    total: items.length,
    fuente: 'mock' as const,
    fecha_extraccion: fechaExtraccion,
  })
}
