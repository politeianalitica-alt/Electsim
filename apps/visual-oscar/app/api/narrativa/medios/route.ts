import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import type { MediosNarrativaSnapshot, NarrativaMedio, FrameNarrativo, LineEditorial, SentimientoMedio, TipoMedio } from '@/types/narrativa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface BackendMedio {
  nombre: string
  ideologia_percibida: string
  audiencia_mensual_M?: number
  grupo_mediatico?: string
  tipo?: string
  n_articulos_recientes?: number
}
interface BackendCluster {
  categoria: string
  n_articulos: number
  velocidad_7d?: number
  velocidad_label?: string
  emocion_dominante?: string
  partidos_top?: string[]
  recomendacion?: string
}
interface BackendFeedItem {
  id: number | string
  titular: string
  fuente: string
  fecha_publicacion?: string
  sentimiento_score?: number
  relevancia_score?: number
  partidos_mencionados?: string
  categoria?: string
  scope?: string
}

function mapIdeologia(s: string): LineEditorial {
  const x = (s || '').toLowerCase()
  if (x === 'izquierda') return 'Izquierda'
  if (x === 'centroizquierda' || x === 'centro-izquierda') return 'Centro-izquierda'
  if (x === 'centroderecha' || x === 'centro-derecha') return 'Centro-derecha'
  if (x === 'derecha') return 'Derecha'
  if (x === 'centro') return 'Centro'
  return 'Independiente'
}

function inferTipo(s: string | undefined): TipoMedio {
  const x = (s || '').toLowerCase()
  if (x.includes('tv')) return 'TV'
  if (x.includes('radio')) return 'Radio'
  if (x.includes('agencia')) return 'Agencia'
  if (x.includes('digital')) return 'Digital'
  return 'Prensa'
}

function scoreToSent(score: number | undefined): SentimientoMedio {
  if (score == null) return 'Neutro'
  if (score < -0.15) return 'Negativo'
  if (score > 0.15) return 'Positivo'
  return 'Neutro'
}

export async function GET() {
  const [sesgoR, narrativasR, feedR] = await Promise.all([
    callBackend<{ medios: BackendMedio[] }>('/api/media-intel/sesgo-espectro'),
    callBackend<{ clusters: BackendCluster[] }>('/api/media-intel/narrativas'),
    callBackend<{ items: BackendFeedItem[] }>('/api/media-intel/feed?limit=200'),
  ])

  const headlinesByMedio: Record<string, BackendFeedItem> = {}
  const sentimentByMedio: Record<string, { sum: number; n: number; temas: Set<string> }> = {}
  const items = feedR.data?.items ?? []
  for (const it of items) {
    const m = it.fuente
    if (!m) continue
    if (!headlinesByMedio[m] || (it.relevancia_score ?? 0) > (headlinesByMedio[m].relevancia_score ?? 0)) {
      headlinesByMedio[m] = it
    }
    if (!sentimentByMedio[m]) sentimentByMedio[m] = { sum: 0, n: 0, temas: new Set() }
    if (typeof it.sentimiento_score === 'number') {
      sentimentByMedio[m].sum += it.sentimiento_score
      sentimentByMedio[m].n += 1
    }
    if (it.categoria) sentimentByMedio[m].temas.add(it.categoria)
  }

  // Build NarrativaMedio[] — start with backend list, then add any medio from feed not in list
  const seen = new Set<string>()
  const medios: NarrativaMedio[] = []
  for (const m of (sesgoR.data?.medios ?? [])) {
    const headline = headlinesByMedio[m.nombre] ?? null
    const sent = sentimentByMedio[m.nombre]
    const avgScore = sent && sent.n > 0 ? sent.sum / sent.n : undefined
    medios.push({
      medio: m.nombre,
      tipo: inferTipo(m.tipo),
      linea_editorial: mapIdeologia(m.ideologia_percibida),
      sentimiento: scoreToSent(avgScore),
      menciones_semana: m.n_articulos_recientes ?? sent?.n ?? 0,
      temas_principales: sent ? Array.from(sent.temas).slice(0, 4) : [],
      titular_destacado: headline?.titular ?? '—',
      url: undefined,
    })
    seen.add(m.nombre)
  }
  // Add additional medios that appear in feed but not in sesgo list
  for (const [nombre, sent] of Object.entries(sentimentByMedio)) {
    if (seen.has(nombre)) continue
    const headline = headlinesByMedio[nombre]
    const avgScore = sent.n > 0 ? sent.sum / sent.n : undefined
    medios.push({
      medio: nombre,
      tipo: 'Digital',
      linea_editorial: 'Independiente',
      sentimiento: scoreToSent(avgScore),
      menciones_semana: sent.n,
      temas_principales: Array.from(sent.temas).slice(0, 4),
      titular_destacado: headline?.titular ?? '—',
      url: undefined,
    })
  }

  const palette = ['#dc2626', '#f59e0b', '#1F4E8C', '#7c3aed', '#16a34a', '#ec4899', '#06b6d4', '#84cc16']
  const totalArticulos = (narrativasR.data?.clusters ?? []).reduce((a, c) => a + (c.n_articulos ?? 0), 0)
  const frames: FrameNarrativo[] = (narrativasR.data?.clusters ?? []).map((c, i) => {
    let tendencia: FrameNarrativo['tendencia'] = 'estable'
    if ((c.velocidad_7d ?? 0) > 30) tendencia = 'creciente'
    else if ((c.velocidad_7d ?? 0) < -10) tendencia = 'decreciente'
    return {
      id: `c-${c.categoria}`,
      nombre: c.categoria.charAt(0).toUpperCase() + c.categoria.slice(1),
      descripcion: c.recomendacion ?? `${c.n_articulos} artículos · velocidad ${c.velocidad_label ?? '-'} · sentimiento ${c.emocion_dominante ?? 'neutro'}`,
      presencia_pct: totalArticulos > 0 ? Math.round((c.n_articulos / totalArticulos) * 100) : 0,
      tendencia,
      medios_principales: medios.slice(0, 3).map(m => m.medio),
      color: palette[i % palette.length],
    }
  })

  const termCounts: Record<string, number> = {}
  for (const it of items) {
    const partidos = (it.partidos_mencionados ?? '').split(',').map(p => p.trim()).filter(Boolean)
    for (const p of partidos) {
      termCounts[p] = (termCounts[p] ?? 0) + 1
    }
  }
  const terminos_calientes = Object.entries(termCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([termino, volumen]) => ({ termino, volumen, delta_pct: 0 }))

  const snapshot: MediosNarrativaSnapshot = {
    generado_en: new Date().toISOString(),
    periodo: 'últimos 30 días',
    medios,
    frames,
    terminos_calientes,
  }

  const source = (sesgoR.data || narrativasR.data || feedR.data) ? 'backend' : 'mock'
  const warnings: string[] = []
  if (!sesgoR.data) warnings.push('sesgo_espectro_unavailable')
  if (!narrativasR.data) warnings.push('narrativas_unavailable')
  if (!feedR.data) warnings.push('feed_unavailable')

  return NextResponse.json(withMeta(snapshot, source, {
    warnings: warnings.length > 0 ? warnings : undefined,
    latency_ms: Math.max(sesgoR.latency_ms, narrativasR.latency_ms, feedR.latency_ms),
  }))
}
