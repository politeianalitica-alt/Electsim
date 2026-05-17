/**
 * Dossier builder · combina datos reales de múltiples fuentes:
 *   - Wikipedia bio (vía REST API)
 *   - Noticias RSS recientes que mencionan a la figura (vía news-aggregator)
 *   - Intervenciones parlamentarias (vía dataset Congreso)
 *   - Votos (vía dataset votaciones Congreso · futuro)
 *   - Comisiones a las que pertenece (vía aggregator comisiones)
 *   - Conexiones con otras figuras (mismo partido, comisión, etc.)
 *
 * Nada hardcodeado salvo el catálogo enumerado de figuras (que define
 * los identificadores). El contenido es 100% derivado de fuentes vivas.
 */

import type { Figure, FigureDossier } from './types'
import { getExpandedCatalog, getIbexCeosCatalog } from './catalog'
import { fetchWikipediaSummary, searchWikipediaBestMatch } from './wikipedia'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { fetchCommissionComparecientes } from '@/lib/legislative/interventions'
import { getAllCommissions } from '@/lib/legislative/aggregator'
import { fetchCommissionComposition } from '@/lib/legislative/congreso'

/**
 * Carga un dossier completo de una figura por su id.
 */
export async function buildFigureDossier(id: string): Promise<FigureDossier | null> {
  const catalog = [...getExpandedCatalog(), ...getIbexCeosCatalog()]
  const figure = catalog.find(f => f.id === id)
  if (!figure) return null

  // En paralelo: bio + noticias + intervenciones + comisiones
  const [bio, noticias, intervenciones, comisionesAfines, conexiones] = await Promise.all([
    fetchBio(figure),
    fetchNoticias(figure),
    fetchIntervenciones(figure),
    fetchComisionesDelFigure(figure),
    findConexiones(figure, catalog),
  ])

  // Agregar sentimiento de noticias
  const sentimientoAgregado = computeAgregado(noticias)

  // Tags de cobertura: palabras clave repetidas en titulares
  const tagsCobertura = extractTagsFromNoticias(noticias)

  return {
    figure,
    bio,
    noticias,
    intervenciones,
    votos: [], // pendiente: cargar de dataset votaciones
    comisiones: comisionesAfines,
    declaracionBienes: { fecha: null, url: null, resumen: null },
    cargosPrevios: [],
    conexiones,
    sentimientoAgregado,
    tagsCobertura,
    updatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchBio(figure: Figure): Promise<FigureDossier['bio']> {
  // 1) Si la figura ya tiene URL de Wikipedia, sacarle el título
  let title: string | null = null
  if (figure.wikipedia) {
    const match = figure.wikipedia.match(/wiki\/(.+)$/)
    if (match) title = decodeURIComponent(match[1].replace(/_/g, ' '))
  }
  // 2) Si no, buscar el mejor match en Wikipedia
  if (!title) {
    title = await searchWikipediaBestMatch(figure.nombre + ' ' + (figure.organizacion || ''))
  }
  if (!title) return { extract: '', source: null, sourceUrl: null }

  const summary = await fetchWikipediaSummary(title)
  if (!summary || !summary.extract) return { extract: '', source: null, sourceUrl: null }

  return {
    extract: summary.extract,
    source: 'Wikipedia',
    sourceUrl: summary.content_urls?.desktop?.page || figure.wikipedia || null,
  }
}

async function fetchNoticias(figure: Figure): Promise<FigureDossier['noticias']> {
  try {
    const articles = await getAggregatedNews({ maxSources: 35, hoursBack: 168 })  // 7 días
    const nameLower = figure.nombre.toLowerCase()
    const apellidos = nameLower.split(/\s+/).slice(-2).join(' ')
    const matched = articles.filter(a => {
      const text = (a.title + ' ' + a.description).toLowerCase()
      return text.includes(nameLower) || (apellidos.length > 5 && text.includes(apellidos))
    })
    return matched
      .sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0))
      .slice(0, 20)
      .map(a => ({
        titulo: a.title,
        medio: a.medio.nombre,
        fecha: a.pub_date_iso,
        url: a.link,
        sentiment: a.sentiment,
        sentiment_score: a.sentiment_score,
        resumen: a.description.slice(0, 300),
      }))
  } catch {
    return []
  }
}

async function fetchIntervenciones(figure: Figure): Promise<FigureDossier['intervenciones']> {
  // Sólo aplica a políticos / institucionales que han hablado en Congreso
  if (!['politico', 'institucional', 'judicial', 'lobbista'].includes(figure.category)) return []
  try {
    // Buscar intervenciones donde el ORADOR contenga el apellido
    const apellidos = figure.nombre.split(/\s+/).slice(-2).join(' ')
    const comparecientes = await fetchCommissionComparecientes(apellidos)
    return comparecientes.slice(0, 10).map(c => ({
      fecha: c.ultimaSesion || '',
      organo: 'Congreso',
      fase: 'Comparecencia',
      inicio: '',
      videoUrl: null,
      pdfUrl: null,
    }))
  } catch {
    return []
  }
}

async function fetchComisionesDelFigure(figure: Figure): Promise<FigureDossier['comisiones']> {
  if (figure.category !== 'politico') return []
  try {
    const { commissions } = await getAllCommissions()
    const apellidos = figure.nombre.split(/\s+/).slice(-2).join(' ').toLowerCase()
    const matches: FigureDossier['comisiones'] = []
    // Solo probar comisiones del Congreso por el endpoint de composición
    const congresoComs = commissions.filter(c => c.camara === 'congreso').slice(0, 20)
    for (const c of congresoComs) {
      try {
        const comp = await fetchCommissionComposition(c.codigo, '1')
        if (!comp) continue
        const member = comp.members.find(m => m.nombre.toLowerCase().includes(apellidos))
        if (member) {
          matches.push({
            codigo: c.codigo,
            nombre: c.nombre,
            cargo: member.cargo,
            camara: 'Congreso',
          })
        }
      } catch {/* siguiente */}
      if (matches.length >= 6) break
    }
    return matches
  } catch {
    return []
  }
}

async function findConexiones(figure: Figure, catalog: Figure[]): Promise<FigureDossier['conexiones']> {
  const conn: FigureDossier['conexiones'] = []

  // Misma organización / afiliación → conexión "lobby" o "mismo-medio" o "misma-empresa"
  if (figure.afiliacion) {
    for (const other of catalog) {
      if (other.id === figure.id) continue
      if (other.afiliacion === figure.afiliacion) {
        const rel: FigureDossier['conexiones'][number]['relacion'] =
          figure.category === 'mediatico' || figure.category === 'periodista' ? 'mismo-medio'
          : figure.category === 'empresario' ? 'misma-empresa'
          : figure.category === 'lobbista' ? 'lobby'
          : figure.category === 'fondo' ? 'mismo-sector'
          : 'mismo-partido'
        conn.push({
          figureId: other.id,
          nombre: other.nombre,
          relacion: rel,
          intensidad: 0.8,
          detalle: figure.afiliacion,
        })
      }
    }
  }

  // Mismo sector (tags overlap)
  if (figure.tags.length > 0) {
    for (const other of catalog) {
      if (other.id === figure.id) continue
      if (conn.find(c => c.figureId === other.id)) continue
      const shared = figure.tags.filter(t => other.tags.includes(t))
      if (shared.length >= 2) {
        conn.push({
          figureId: other.id,
          nombre: other.nombre,
          relacion: 'mismo-sector',
          intensidad: Math.min(1, shared.length / 5),
          detalle: shared.join(', '),
        })
      }
    }
  }

  return conn.slice(0, 15)
}

function computeAgregado(noticias: FigureDossier['noticias']): FigureDossier['sentimientoAgregado'] {
  if (noticias.length === 0) return { positivo: 0, negativo: 0, neutral: 0, score: 0, tendencia: 'stable' }
  let pos = 0, neg = 0, neu = 0, sumScore = 0
  for (const n of noticias) {
    if (n.sentiment === 'positive') pos++
    else if (n.sentiment === 'negative') neg++
    else neu++
    sumScore += n.sentiment_score
  }
  const score = +(sumScore / noticias.length).toFixed(2)
  // Tendencia: comparar primera mitad (más antiguas) con segunda mitad (más recientes)
  const half = Math.floor(noticias.length / 2)
  const recientes = noticias.slice(0, half)
  const antiguas = noticias.slice(half)
  const avgR = recientes.length ? recientes.reduce((s, x) => s + x.sentiment_score, 0) / recientes.length : 0
  const avgA = antiguas.length ? antiguas.reduce((s, x) => s + x.sentiment_score, 0) / antiguas.length : 0
  const tendencia: 'up' | 'down' | 'stable' = avgR - avgA > 0.1 ? 'up' : avgR - avgA < -0.1 ? 'down' : 'stable'
  return { positivo: pos, negativo: neg, neutral: neu, score, tendencia }
}

function extractTagsFromNoticias(noticias: FigureDossier['noticias']): string[] {
  if (noticias.length === 0) return []
  const STOP = new Set(['sobre', 'desde', 'hasta', 'según', 'según', 'tras', 'ante', 'entre', 'durante',
    'esta', 'este', 'estos', 'estas', 'también', 'aunque', 'mientras', 'porque', 'cuando',
    'donde', 'quien', 'cómo', 'país', 'nuevo', 'nueva', 'última', 'primera', 'segundo'])
  const freq: Record<string, number> = {}
  for (const n of noticias) {
    for (const w of n.titulo.toLowerCase().split(/\W+/)) {
      if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => e[0])
}
