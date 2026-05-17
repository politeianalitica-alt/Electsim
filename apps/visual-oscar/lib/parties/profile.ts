/**
 * Constructor de perfil dinámico de partido.
 *
 * Combina en paralelo:
 *   - Bio Wikipedia
 *   - Iniciativas legislativas que ha propuesto (Congreso + Senado)
 *   - Noticias recientes RSS que mencionan al partido
 *   - Composición: cuántos diputados/senadores tiene (vía catálogo enumerado +
 *     dinámico si está disponible)
 *   - Líderes (vía catálogo de figuras)
 *   - Coaliciones de gobierno autonómicas donde participa
 */

import { getPartyBySlug, type PartyMeta } from './catalog'
import { fetchWikipediaSummary, searchWikipediaBestMatch } from '@/lib/figures/wikipedia'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { getAllInitiatives } from '@/lib/legislative/aggregator'
import { getExpandedCatalog } from '@/lib/figures/catalog'
import { getNicheCatalog } from '@/lib/figures/catalog-extended'

export interface PartyProfile {
  meta: PartyMeta
  bio: {
    extract: string
    source: string | null
    sourceUrl: string | null
  }
  noticias: Array<{
    titulo: string
    medio: string
    fecha: string | null
    url: string
    sentiment: 'positive' | 'negative' | 'neutral'
    sentiment_score: number
  }>
  iniciativas: Array<{
    titulo: string
    expediente: string
    ambito: string
    materia: string
    fechaRegistro: string | null
    stage: string
    url: string | null
  }>
  lideres: Array<{
    id: string
    nombre: string
    cargo: string
    organizacion: string
    influencia: number
  }>
  sentimientoAgregado: {
    positivo: number
    negativo: number
    neutral: number
    score: number
    tendencia: 'up' | 'down' | 'stable'
  }
  /** Tags clave que aparecen en su cobertura */
  tagsCobertura: string[]
  /** Métricas */
  metrics: {
    nIniciativas: number
    nNoticias7d: number
    nLideres: number
  }
  updatedAt: string
}

export async function buildPartyProfile(slug: string): Promise<PartyProfile | null> {
  const meta = getPartyBySlug(slug)
  if (!meta) return null

  const [bio, noticias, iniciativas, lideres] = await Promise.all([
    fetchBio(meta),
    fetchNoticias(meta),
    fetchIniciativas(meta),
    fetchLideres(meta),
  ])

  const sentimientoAgregado = computeAgregado(noticias)
  const tagsCobertura = extractTags(noticias)

  return {
    meta,
    bio,
    noticias,
    iniciativas,
    lideres,
    sentimientoAgregado,
    tagsCobertura,
    metrics: {
      nIniciativas: iniciativas.length,
      nNoticias7d: noticias.length,
      nLideres: lideres.length,
    },
    updatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchBio(meta: PartyMeta): Promise<PartyProfile['bio']> {
  let title: string | null = null
  if (meta.wikipedia) {
    const match = meta.wikipedia.match(/wiki\/(.+)$/)
    if (match) title = decodeURIComponent(match[1].replace(/_/g, ' '))
  }
  if (!title) {
    title = await searchWikipediaBestMatch(meta.nombre)
  }
  if (!title) return { extract: '', source: null, sourceUrl: null }
  const summary = await fetchWikipediaSummary(title)
  if (!summary?.extract) return { extract: '', source: null, sourceUrl: null }
  return { extract: summary.extract, source: 'Wikipedia', sourceUrl: summary.content_urls?.desktop?.page || meta.wikipedia || null }
}

async function fetchNoticias(meta: PartyMeta): Promise<PartyProfile['noticias']> {
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 168 })
    const tokens = meta.tokens.map(t => new RegExp(t, 'i'))
    const matched = articles.filter(a => {
      const txt = (a.title + ' ' + a.description).toLowerCase()
      return tokens.some(re => re.test(txt))
    })
    return matched
      .sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0))
      .slice(0, 30)
      .map(a => ({
        titulo: a.title,
        medio: a.medio.nombre,
        fecha: a.pub_date_iso,
        url: a.link,
        sentiment: a.sentiment,
        sentiment_score: a.sentiment_score,
      }))
  } catch {
    return []
  }
}

async function fetchIniciativas(meta: PartyMeta): Promise<PartyProfile['iniciativas']> {
  try {
    const { initiatives } = await getAllInitiatives()
    // Filtrar iniciativas donde el promotor coincide con los tokens del partido
    const partyPattern = new RegExp(meta.tokens.join('|'), 'i')
    const matched = initiatives.filter(it => {
      return partyPattern.test(it.promotor) || partyPattern.test(it.titulo)
    })
    return matched.slice(0, 25).map(it => ({
      titulo: it.titulo,
      expediente: it.expediente,
      ambito: it.ambito,
      materia: it.materia,
      fechaRegistro: it.fechaRegistro,
      stage: it.stage,
      url: it.urlOficial,
    }))
  } catch {
    return []
  }
}

async function fetchLideres(meta: PartyMeta): Promise<PartyProfile['lideres']> {
  try {
    const catalog = [...getExpandedCatalog(), ...getNicheCatalog()]
    // Filtrar figuras cuyas afiliaciones coincidan con el partido
    const matched = catalog.filter(f => {
      if (!f.afiliacion) return false
      const af = f.afiliacion.toLowerCase()
      return meta.tokens.some(t => {
        try { return new RegExp(t, 'i').test(af) } catch { return false }
      })
    })
    // Añadir los enumerados en meta.liderazgos
    for (const nombreLider of meta.liderazgos) {
      if (!matched.find(f => f.nombre.toLowerCase() === nombreLider.toLowerCase())) {
        const found = catalog.find(f => f.nombre.toLowerCase().includes(nombreLider.toLowerCase()))
        if (found) matched.push(found)
        else {
          // Crear entrada ligera
          matched.push({
            id: `lite-${nombreLider.toLowerCase().replace(/\s+/g, '-')}`,
            nombre: nombreLider,
            category: 'politico',
            cargo: 'Liderazgo',
            organizacion: meta.nombre,
            afiliacion: meta.siglas,
            color: meta.color,
            ejeX: meta.ideologia, ejeY: meta.centralizacion,
            influencia: 70, exposicion: 60, tags: [],
          })
        }
      }
    }
    return matched
      .sort((a, b) => b.influencia - a.influencia)
      .slice(0, 12)
      .map(f => ({
        id: f.id,
        nombre: f.nombre,
        cargo: f.cargo,
        organizacion: f.organizacion,
        influencia: f.influencia,
      }))
  } catch {
    return []
  }
}

function computeAgregado(noticias: PartyProfile['noticias']) {
  if (noticias.length === 0) return { positivo: 0, negativo: 0, neutral: 0, score: 0, tendencia: 'stable' as const }
  let pos = 0, neg = 0, neu = 0, sum = 0
  for (const n of noticias) {
    if (n.sentiment === 'positive') pos++
    else if (n.sentiment === 'negative') neg++
    else neu++
    sum += n.sentiment_score
  }
  const score = +(sum / noticias.length).toFixed(2)
  const half = Math.floor(noticias.length / 2)
  const recientes = noticias.slice(0, half)
  const antiguas = noticias.slice(half)
  const avgR = recientes.length ? recientes.reduce((s, x) => s + x.sentiment_score, 0) / recientes.length : 0
  const avgA = antiguas.length ? antiguas.reduce((s, x) => s + x.sentiment_score, 0) / antiguas.length : 0
  const tendencia: 'up' | 'down' | 'stable' = avgR - avgA > 0.1 ? 'up' : avgR - avgA < -0.1 ? 'down' : 'stable'
  return { positivo: pos, negativo: neg, neutral: neu, score, tendencia }
}

function extractTags(noticias: PartyProfile['noticias']): string[] {
  const STOP = new Set(['sobre','desde','hasta','según','según','tras','ante','entre','durante',
    'esta','este','estos','estas','también','aunque','mientras','porque','cuando','donde','quien',
    'cómo','país','nuevo','nueva','última','primera','segundo','pacto','acuerdo','dice','asegura',
    'sánchez','feijóo','abascal','díaz','psoe','popular','populares','vox','sumar','partido'])
  const freq: Record<string, number> = {}
  for (const n of noticias) {
    for (const w of n.titulo.toLowerCase().split(/\W+/)) {
      if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0])
}
