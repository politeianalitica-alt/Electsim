import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DossierNewsItem {
  id: string
  titulo: string
  fuente: string
  url: string
  fecha: string
  sentimiento: number   // -1 to 1
  resumen: string | null
}

export interface DossierActividad {
  tipo: 'intervencion' | 'iniciativa' | 'votacion' | 'comparecencia'
  titulo: string
  fecha: string
  url?: string
  organo?: string
}

export interface DossierRelacion {
  nombre: string
  tipo: 'aliado' | 'rival' | 'neutral'
  partido?: string
  n_coocurrencias: number
}

export interface DossierRelacionEstructural {
  tipo: string
  etiqueta: string
  categoria: 'organica' | 'parlamentaria' | 'poder_informal' | 'dependencia' | 'mediatica' | 'economica' | 'co_mencion'
  destino: string
  signo: 'positivo' | 'negativo' | 'neutro' | 'ambivalente'
  fuerza: number
  descripcion: string
  desde: string
  fuente_tipo: 'estructural' | 'parlamentaria' | 'co_mencion'
}

export interface DossierDafo {
  fortalezas: Array<{ titulo: string; descripcion: string; evidencia: string }>
  debilidades: Array<{ titulo: string; descripcion: string; evidencia: string }>
  oportunidades: Array<{ titulo: string; descripcion: string; horizonte: string }>
  amenazas: Array<{ titulo: string; descripcion: string; probabilidad: string; horizonte: string }>
  riesgo_judicial: { nivel: string; causas: string[]; descripcion: string }
  riesgo_interno_partido: { nivel: string; descripcion: string; actores_internos_criticos: string[] }
  riesgo_coalicion: { nivel: string; descripcion: string; socios_en_tension: string[] }
  riesgo_electoral: { nivel: string; intencion_voto_actual: number | null; tendencia: string; descripcion: string }
  sintesis_riesgo: string
}

export interface DossierCargo {
  cargo: string
  organismo: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string | null
  descripcion: string
  relevancia: number
}

export interface DossierDossier {
  // Identidad
  slug: string
  nombre: string
  cargo: string
  partido: string
  partido_color: string
  foto_url: string | null

  // Scores (0-100)
  score_influencia: number
  score_riesgo: number
  score_mediacion: number   // presencia media últimas 48h

  // Score descriptions
  score_influencia_desc: string
  score_riesgo_desc: string

  // Fuente de datos de scores
  scores_fuente: 'real' | 'estimado'

  // Wikipedia
  bio: string
  bio_fuente: string
  bio_url: string

  // Posicionamiento ideológico (CHES o estimado)
  eje_izq_dcha: number    // -10 (izquierda) a +10 (derecha)
  eje_autoritario: number // -10 (libertario) a +10 (autoritario)
  posicionamiento_fuente: 'ches_2024' | 'estimado'

  // Actividad parlamentaria
  actividad: DossierActividad[]
  actividad_score: number   // intensidad 0-100

  // Media
  noticias: DossierNewsItem[]
  n_noticias_24h: number
  sentimiento_media: number  // promedio -1..1
  tono_predominante: 'positivo' | 'negativo' | 'neutro'

  // Relaciones por co-mención en noticias
  relaciones: DossierRelacion[]

  // Relaciones estructurales curadas
  relaciones_estructurales: DossierRelacionEstructural[]

  // DAFO curado
  dafo: DossierDafo | null

  // Trayectoria profesional
  cargos: DossierCargo[] | null

  // Agenda (próximos eventos de Congreso/Senado RSS)
  agenda: Array<{ titulo: string; fecha: string; tipo: string; url?: string }>

  // Riesgo narrativo
  riesgo_narrativo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  señales_riesgo: string[]

  timestamp: string
}

// ── Curated data loaders ──────────────────────────────────────────────────────

interface RawRelacion {
  origen: string
  destino: string
  tipo: string
  etiqueta: string
  categoria: string
  signo: string
  fuerza: number
  activa: boolean
  desde: string
  descripcion: string
  fuente_tipo: string
}

function loadRelacionesEstructurales(slug: string): DossierRelacionEstructural[] {
  try {
    const p = join(process.cwd(), 'data', 'actores', 'relaciones_estructurales.json')
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as { relaciones: RawRelacion[] }
    return raw.relaciones
      .filter(r => r.origen === slug && r.activa !== false)
      .map(r => ({
        tipo: r.tipo,
        etiqueta: r.etiqueta,
        categoria: r.categoria as DossierRelacionEstructural['categoria'],
        destino: r.destino.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        signo: r.signo as DossierRelacionEstructural['signo'],
        fuerza: r.fuerza,
        descripcion: r.descripcion,
        desde: r.desde,
        fuente_tipo: r.fuente_tipo as DossierRelacionEstructural['fuente_tipo'],
      }))
  } catch { return [] }
}

function loadDafo(slug: string): DossierDafo | null {
  try {
    const p = join(process.cwd(), 'data', 'actores', 'dafo', `${slug}.json`)
    return JSON.parse(readFileSync(p, 'utf-8')) as DossierDafo
  } catch { return null }
}

function loadCargos(slug: string): DossierCargo[] | null {
  try {
    const p = join(process.cwd(), 'data', 'actores', 'cargos', `${slug}.json`)
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as { cargos: DossierCargo[] }
    return raw.cargos
  } catch { return null }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeFetch(url: string, ms = 7000): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Politeia/1.0' },
      cache: 'no-store',
    })
    if (!r.ok) return null
    return r.text()
  } catch { return null }
  finally { clearTimeout(t) }
}

function slugToName(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ')
}

// Simple sentiment from title keywords (Spanish)
function inferSentiment(text: string): number {
  const t = text.toLowerCase()
  const pos = ['éxito', 'logro', 'victoria', 'apoya', 'aprueba', 'avance', 'acuerdo', 'lidera', 'destaca', 'elogia', 'positivo', 'bien', 'mejora']
  const neg = ['corrupción', 'fracaso', 'crisis', 'dimisión', 'escándalo', 'acusado', 'condena', 'critica', 'protesta', 'falla', 'pierde', 'derrota', 'mentira', 'fraude', 'malo', 'critica']
  const posCount = pos.filter(w => t.includes(w)).length
  const negCount = neg.filter(w => t.includes(w)).length
  const total = posCount + negCount
  if (total === 0) return 0
  return (posCount - negCount) / total
}

// ── CHES 2024 party ideological coordinates ──────────────────────────────────

const CHES_COORDS: Record<string, { lr: number; gal: number }> = {
  'PP':      { lr: +3.8, gal: -1.2 },
  'PSOE':    { lr: -2.1, gal: +0.8 },
  'PSC':     { lr: -2.1, gal: +0.8 },
  'VOX':     { lr: +7.2, gal: +4.8 },
  'Sumar':   { lr: -5.4, gal: -2.1 },
  'Podemos': { lr: -5.8, gal: -1.9 },
  'ERC':     { lr: -3.2, gal: -0.5 },
  'Junts':   { lr: +1.1, gal: +1.0 },
  'PNV':     { lr: -0.4, gal: +0.2 },
  'EH Bildu':{ lr: -5.0, gal: -1.5 },
  'CC':      { lr: +1.5, gal: +0.9 },
  'BNG':     { lr: -4.1, gal: -1.0 },
  'PRC':     { lr: -0.8, gal: +0.5 },
  'UPN':     { lr: +2.5, gal: +1.5 },
}

function getPositioning(partido: string): { lr: number; gal: number; fuente: 'ches_2024' | 'estimado' } {
  const c = CHES_COORDS[partido]
  if (c) return { lr: c.lr, gal: c.gal, fuente: 'ches_2024' }
  return { lr: 0.0, gal: 0.0, fuente: 'estimado' }
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────

async function fetchWikipedia(nombre: string): Promise<{ bio: string; foto: string | null; url: string }> {
  const encoded = encodeURIComponent(nombre.replace(/ /g, '_'))
  const raw = await safeFetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encoded}`, 5000)
  if (raw) {
    try {
      const json = JSON.parse(raw) as {
        extract?: string
        thumbnail?: { source?: string }
        content_urls?: { desktop?: { page?: string } }
      }
      if (json.extract && json.extract.length > 30) {
        return {
          bio: json.extract.slice(0, 600),
          foto: json.thumbnail?.source ?? null,
          url: json.content_urls?.desktop?.page ?? `https://es.wikipedia.org/wiki/${encoded}`,
        }
      }
    } catch { /* ignore */ }
  }

  // Try English Wikipedia as fallback for known politicians
  const rawEn = await safeFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, 5000)
  if (rawEn) {
    try {
      const json = JSON.parse(rawEn) as {
        extract?: string
        thumbnail?: { source?: string }
        content_urls?: { desktop?: { page?: string } }
      }
      if (json.extract && json.extract.length > 30) {
        return {
          bio: json.extract.slice(0, 600),
          foto: json.thumbnail?.source ?? null,
          url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
        }
      }
    } catch { /* ignore */ }
  }

  return { bio: '', foto: null, url: '' }
}

// ── Google News ───────────────────────────────────────────────────────────────

async function fetchNoticias(nombre: string): Promise<DossierNewsItem[]> {
  const q = encodeURIComponent(nombre)
  const xml = await safeFetch(
    `https://news.google.com/rss/search?q=${q}&hl=es&gl=ES&ceid=ES:es`,
    6000
  )
  if (!xml) return []

  const items: DossierNewsItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  let count = 0

  while ((m = itemRe.exec(xml)) !== null && count < 10) {
    const block = m[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
    if (!title || title.length < 10) continue
    const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim() ?? ''
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() ?? 'Google Noticias'
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
    const descRaw = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? ''
    const resumen = descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || null

    // Only items from last 72h
    if (pubDate) {
      try {
        const age = (Date.now() - new Date(pubDate).getTime()) / 3600000
        if (age > 72) { count++; continue }
      } catch { /* ignore */ }
    }

    items.push({
      id: `gn_${count}`,
      titulo: title.slice(0, 150),
      fuente: source,
      url: link,
      fecha: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentimiento: inferSentiment(title + ' ' + (resumen ?? '')),
      resumen,
    })
    count++
  }
  return items
}

// ── Congreso RSS (actividad parlamentaria) ────────────────────────────────────

async function fetchActividadCongreso(nombre: string): Promise<DossierActividad[]> {
  const apellido = nombre.split(' ').slice(1).join('+') || nombre.split(' ')[0]
  const xml = await safeFetch(
    `https://www.congreso.es/busqueda-de-iniciativas?p_p_id=iniciativas&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_iniciativas_mode=mostrarListadoIniciatitivasFiltro&_iniciativas_filterAutor=${apellido}&format=rss`,
    5000
  )

  const items: DossierActividad[] = []
  if (!xml) return items

  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  let count = 0
  while ((m = itemRe.exec(xml)) !== null && count < 8) {
    const block = m[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
    if (!title || title.length < 5) continue
    const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim()
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
    const categoria = block.match(/<category>(.*?)<\/category>/)?.[1]?.toLowerCase() ?? ''

    const tipo: DossierActividad['tipo'] = categoria.includes('pregunta') || categoria.includes('interpelaci') ? 'intervencion'
      : categoria.includes('proposici') || categoria.includes('mocio') ? 'iniciativa'
      : categoria.includes('comparec') ? 'comparecencia'
      : 'iniciativa'

    items.push({
      tipo,
      titulo: title.slice(0, 200),
      fecha: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link,
    })
    count++
  }
  return items
}

// ── Agenda (Congreso + Senado próximas convocatorias) ────────────────────────

async function fetchAgenda(nombre: string): Promise<Array<{ titulo: string; fecha: string; tipo: string; url?: string }>> {
  const apellido = encodeURIComponent(nombre.split(' ').slice(-1)[0] ?? nombre)
  const xml = await safeFetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent(nombre)}+congreso+senado&hl=es&gl=ES&ceid=ES:es`,
    5000
  )
  if (!xml) return []

  const events: Array<{ titulo: string; fecha: string; tipo: string; url?: string }> = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  let count = 0
  while ((m = itemRe.exec(xml)) !== null && count < 5) {
    const block = m[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
    if (!title || title.length < 10) continue
    const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim()
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
    const t = title.toLowerCase()
    const tipo = t.includes('comisi') ? 'Comisión' : t.includes('pleno') ? 'Pleno' : t.includes('debate') ? 'Debate' : 'Acto'
    events.push({ titulo: title.slice(0, 150), fecha: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), tipo, url: link })
    count++
  }

  void apellido
  return events
}

// ── Relaciones por co-mención ─────────────────────────────────────────────────

const POLITICOS_CONOCIDOS = ['Sánchez', 'Feijóo', 'Díaz', 'Abascal', 'Puigdemont', 'Junqueras', 'Illa', 'Ayuso', 'Calviño', 'García-Página', 'Clavijo', 'Mazón', 'Rueda', 'Pradales', 'Mañueco']

async function fetchRelaciones(nombre: string, noticias: DossierNewsItem[]): Promise<DossierRelacion[]> {
  const coCount: Record<string, number> = {}
  const allText = noticias.map(n => n.titulo + ' ' + (n.resumen ?? '')).join(' ')
  for (const p of POLITICOS_CONOCIDOS) {
    if (nombre.includes(p)) continue
    const re = new RegExp(p, 'gi')
    const m = allText.match(re)
    if (m && m.length > 0) coCount[p] = m.length
  }

  return Object.entries(coCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([n, cnt]) => ({
      nombre: n,
      tipo: cnt > 3 ? 'aliado' : 'neutral' as DossierRelacion['tipo'],
      n_coocurrencias: cnt,
    }))
}

// ── Score computation ─────────────────────────────────────────────────────────

function computeScores(
  noticias: DossierNewsItem[],
  actividad: DossierActividad[],
): { influencia: number; riesgo: number; mediacion: number; tono: 'positivo' | 'negativo' | 'neutro' } {
  const n24 = noticias.filter(n => {
    try { return (Date.now() - new Date(n.fecha).getTime()) < 86400000 } catch { return false }
  }).length

  const mediacion = Math.min(100, Math.round(n24 * 12 + noticias.length * 4))

  const avgSent = noticias.length > 0
    ? noticias.reduce((s, n) => s + n.sentimiento, 0) / noticias.length
    : 0

  const actividadScore = Math.min(100, actividad.length * 12)
  const influencia = Math.min(100, Math.round((mediacion * 0.5 + actividadScore * 0.3 + 20)))

  const negNoticias = noticias.filter(n => n.sentimiento < -0.2).length
  const negRatio = noticias.length > 0 ? negNoticias / noticias.length : 0
  const riesgo = Math.min(100, Math.round(negRatio * 80 + (1 - (avgSent + 1) / 2) * 30))

  const tono: 'positivo' | 'negativo' | 'neutro' = avgSent > 0.1 ? 'positivo' : avgSent < -0.1 ? 'negativo' : 'neutro'

  return { influencia, riesgo, mediacion, tono }
}

function computeRiesgoNarrativo(
  riesgo: number,
  noticias: DossierNewsItem[],
  nombres_señal: string[],
): { nivel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'; señales: string[] } {
  const señales: string[] = []
  const allText = noticias.map(n => n.titulo.toLowerCase()).join(' ')

  if (/corrupci|escándalo|acusado|dimisi|investigado/.test(allText)) señales.push('Narrativa de corrupción activa')
  if (/crisis|fracaso|derrota|dimisi/.test(allText)) señales.push('Narrativa de crisis de liderazgo')
  if (riesgo > 60) señales.push('Cobertura negativa sostenida')
  if (noticias.filter(n => n.sentimiento < -0.3).length > 3) señales.push('Alto volumen de noticias negativas')

  void nombres_señal

  const nivel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO' =
    señales.length >= 3 || riesgo >= 75 ? 'CRITICO' :
    señales.length >= 2 || riesgo >= 55 ? 'ALTO' :
    señales.length >= 1 || riesgo >= 35 ? 'MEDIO' : 'BAJO'

  return { nivel, señales }
}

// ── Main GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const nombre = slugToName(slug)

  // Extraer partido de query param (viene del frontend que ya tiene los datos estáticos)
  const partido = req.nextUrl.searchParams.get('partido') ?? 'PP'
  const cargo = req.nextUrl.searchParams.get('cargo') ?? 'Cargo desconocido'
  const color = req.nextUrl.searchParams.get('color') ?? '#1F4E8C'

  const [wikiResult, noticiasResult, actividadResult, agendaResult] = await Promise.allSettled([
    fetchWikipedia(nombre),
    fetchNoticias(nombre),
    fetchActividadCongreso(nombre),
    fetchAgenda(nombre),
  ])

  const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : { bio: '', foto: null, url: '' }
  const noticias = noticiasResult.status === 'fulfilled' ? noticiasResult.value : []
  const actividad = actividadResult.status === 'fulfilled' ? actividadResult.value : []
  const agenda = agendaResult.status === 'fulfilled' ? agendaResult.value : []

  const relaciones = await fetchRelaciones(nombre, noticias)
  const scores = computeScores(noticias, actividad)
  const pos = getPositioning(partido)
  const riesgoNarrativo = computeRiesgoNarrativo(scores.riesgo, noticias, [])

  // Load curated data
  const relaciones_estructurales = loadRelacionesEstructurales(slug)
  const dafo = loadDafo(slug)
  const cargos = loadCargos(slug)

  // Enhance riesgo score based on DAFO risk dimensions
  let riesgoAjustado = scores.riesgo
  if (dafo) {
    if (dafo.riesgo_coalicion.nivel === 'alto') riesgoAjustado = Math.min(100, riesgoAjustado + 20)
    if (dafo.riesgo_judicial.nivel === 'alto' || dafo.riesgo_judicial.nivel === 'critico') riesgoAjustado = Math.min(100, riesgoAjustado + 30)
  }

  const bio = wiki.bio || `${nombre} es ${cargo} de ${partido}.`

  const dossier: DossierDossier = {
    slug,
    nombre,
    cargo,
    partido,
    partido_color: color,
    foto_url: wiki.foto,

    score_influencia: scores.influencia,
    score_riesgo: riesgoAjustado,
    score_mediacion: scores.mediacion,
    score_influencia_desc: 'Capacidad de condicionar decisiones políticas en su espacio de poder',
    score_riesgo_desc: 'Probabilidad de pérdida de cargo o relevancia política en 12 meses',
    scores_fuente: noticias.length > 0 || actividad.length > 0 ? 'real' : 'estimado',

    bio,
    bio_fuente: wiki.url ? 'Wikipedia ES' : 'Generado',
    bio_url: wiki.url,

    eje_izq_dcha: pos.lr,
    eje_autoritario: pos.gal,
    posicionamiento_fuente: pos.fuente,

    actividad,
    actividad_score: Math.min(100, actividad.length * 12),

    noticias,
    n_noticias_24h: noticias.filter(n => {
      try { return (Date.now() - new Date(n.fecha).getTime()) < 86400000 } catch { return false }
    }).length,
    sentimiento_media: noticias.length > 0
      ? noticias.reduce((s, n) => s + n.sentimiento, 0) / noticias.length
      : 0,
    tono_predominante: scores.tono,

    relaciones,
    relaciones_estructurales,
    dafo,
    cargos,
    agenda,

    riesgo_narrativo: riesgoNarrativo.nivel,
    señales_riesgo: riesgoNarrativo.señales,

    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(dossier)
}
