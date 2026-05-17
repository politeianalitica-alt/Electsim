/**
 * Constructor de perfil dinámico de Comunidad Autónoma.
 *
 * Combina en paralelo:
 *   - Bio Wikipedia REST API
 *   - Noticias RSS de los 7 últimos días filtradas por tokens de la CCAA
 *   - Iniciativas legislativas en su parlamento autonómico
 *   - Comisiones del parlamento (ya extraídas en lib/legislative)
 *   - Sentimiento agregado + tendencia
 *   - Tags clave de cobertura mediática
 *   - Datos demográficos / económicos del catálogo
 */

import { getCCAABySlug, type CCAA } from './ccaa-catalog'
import { fetchWikipediaSummary } from '@/lib/figures/wikipedia'
import { getAggregatedNews, type AggregatedArticle } from '@/lib/news-aggregator'
import { getAllInitiatives } from '@/lib/legislative/aggregator'

export interface CCAAProfile {
  meta: CCAA
  bio: { extract: string; sourceUrl: string | null }
  noticias: Array<{
    titulo: string; medio: string; fecha: string | null; url: string
    sentiment: 'positive' | 'negative' | 'neutral'; sentiment_score: number
  }>
  iniciativas: Array<{
    titulo: string; expediente: string; materia: string; promotor: string
    stage: string; fechaRegistro: string | null; url: string | null
  }>
  sentimientoAgregado: {
    positivo: number; negativo: number; neutral: number
    score: number; tendencia: 'up' | 'down' | 'stable'
  }
  tagsCobertura: string[]
  /** Métricas resumen */
  metrics: {
    nNoticias7d: number
    nIniciativas: number
    pibMillonesEuros: number
    densidadHabKm2: number
  }
  /** Análisis IA: principales preocupaciones/narrativas */
  preocupaciones: string[]
  updatedAt: string
}

export async function buildCCAAProfile(slug: string): Promise<CCAAProfile | null> {
  const meta = getCCAABySlug(slug)
  if (!meta) return null

  const [bio, articles, { initiatives }] = await Promise.all([
    fetchBio(meta),
    getAggregatedNews({ maxSources: 40, hoursBack: 168 }).catch(() => [] as AggregatedArticle[]),
    getAllInitiatives().catch(() => ({ initiatives: [] })),
  ])

  // Filtrar noticias por tokens de la CCAA
  const tokenPatterns = meta.tokens.map(t => { try { return new RegExp(t, 'i') } catch { return null } }).filter((r): r is RegExp => !!r)
  const noticiasMatched = articles.filter(a => {
    const txt = (a.title + ' ' + a.description).toLowerCase()
    return tokenPatterns.some(re => re.test(txt))
  })

  // Filtrar iniciativas autonómicas de esta CCAA
  const iniciativasMatched = initiatives.filter(it => it.ccaa === meta.slug)

  const sentimientoAgregado = computeAgregado(noticiasMatched)
  const tagsCobertura = extractTags(noticiasMatched)
  const preocupaciones = analyzePreocupaciones(noticiasMatched, meta)

  return {
    meta,
    bio,
    noticias: noticiasMatched.slice(0, 30).map(a => ({
      titulo: a.title, medio: a.medio.nombre, fecha: a.pub_date_iso, url: a.link,
      sentiment: a.sentiment, sentiment_score: a.sentiment_score,
    })),
    iniciativas: iniciativasMatched.slice(0, 30).map(it => ({
      titulo: it.titulo, expediente: it.expediente, materia: it.materia,
      promotor: it.promotor, stage: it.stage,
      fechaRegistro: it.fechaRegistro, url: it.urlOficial,
    })),
    sentimientoAgregado,
    tagsCobertura,
    metrics: {
      nNoticias7d: noticiasMatched.length,
      nIniciativas: iniciativasMatched.length,
      pibMillonesEuros: meta.pibMillones,
      densidadHabKm2: Math.round((meta.poblacion * 1000) / meta.superficie),
    },
    preocupaciones,
    updatedAt: new Date().toISOString(),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchBio(meta: CCAA): Promise<{ extract: string; sourceUrl: string | null }> {
  const title = meta.wikipedia.match(/wiki\/(.+)$/)?.[1]
  if (!title) return { extract: '', sourceUrl: null }
  const decoded = decodeURIComponent(title.replace(/_/g, ' '))
  const summary = await fetchWikipediaSummary(decoded)
  if (!summary?.extract) return { extract: '', sourceUrl: meta.wikipedia }
  return { extract: summary.extract, sourceUrl: summary.content_urls?.desktop?.page || meta.wikipedia }
}

function computeAgregado(noticias: AggregatedArticle[]) {
  if (noticias.length === 0) return { positivo: 0, negativo: 0, neutral: 0, score: 0, tendencia: 'stable' as const }
  let pos = 0, neg = 0, neu = 0, sum = 0
  for (const a of noticias) {
    if (a.sentiment === 'positive') pos++
    else if (a.sentiment === 'negative') neg++
    else neu++
    sum += a.sentiment_score
  }
  const score = +(sum / noticias.length).toFixed(2)
  const half = Math.floor(noticias.length / 2)
  const rec = noticias.slice(0, half)
  const ant = noticias.slice(half)
  const ar = rec.length ? rec.reduce((s, x) => s + x.sentiment_score, 0) / rec.length : 0
  const aa = ant.length ? ant.reduce((s, x) => s + x.sentiment_score, 0) / ant.length : 0
  const tendencia: 'up' | 'down' | 'stable' = ar - aa > 0.1 ? 'up' : ar - aa < -0.1 ? 'down' : 'stable'
  return { positivo: pos, negativo: neg, neutral: neu, score, tendencia }
}

function extractTags(noticias: AggregatedArticle[]): string[] {
  const STOP = new Set(['sobre','desde','hasta','según','tras','ante','entre','durante','esta','este','estos','estas',
    'también','aunque','mientras','porque','cuando','donde','quien','cómo','país','nuevo','nueva','última','primera',
    'segundo','pacto','acuerdo','dice','asegura','presidente','gobierno','política','tras'])
  const freq: Record<string, number> = {}
  for (const a of noticias) {
    for (const w of a.title.toLowerCase().split(/\W+/)) {
      if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0])
}

/**
 * Detecta preocupaciones principales en la cobertura mediática:
 * sucesos negativos recurrentes, conflictos, crisis, etc.
 */
function analyzePreocupaciones(noticias: AggregatedArticle[], meta: CCAA): string[] {
  const out = new Set<string>()
  const PREOC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /sequ[íi]a|escasez de agua|emergencia h[íi]drica/i, label: 'Sequía / crisis hídrica' },
    { pattern: /incendi(?:o|os) forestal/i, label: 'Incendios forestales' },
    { pattern: /vivienda asequible|alquiler|precio.*vivienda/i, label: 'Crisis de vivienda' },
    { pattern: /sanidad|hospital|listas? de espera|atenci[óo]n primaria/i, label: 'Tensión sanitaria' },
    { pattern: /educa(?:ci[óo]n|tivo)|profesorado|colegios?/i, label: 'Sistema educativo' },
    { pattern: /seguridad|delincuencia|asalto|robo/i, label: 'Seguridad ciudadana' },
    { pattern: /migra(?:nte|ci[óo]n)|inmigra(?:nte|ci[óo]n)|cayuco|extranjero/i, label: 'Migración' },
    { pattern: /transporte|tren|metro|aeropuerto/i, label: 'Infraestructuras de transporte' },
    { pattern: /energ[íi]a|electricidad|renovable|nuclear/i, label: 'Política energética' },
    { pattern: /sequ[íi]a|inundaci[óo]n|tempora|dana/i, label: 'Emergencias climáticas' },
    { pattern: /huelga|paro|protesta|manifestaci[óo]n/i, label: 'Protestas y movilizaciones' },
    { pattern: /corrupci[óo]n|fraude|investigaci[óo]n judicial/i, label: 'Casos de corrupción' },
    { pattern: /empleo|paro laboral|desempleo/i, label: 'Empleo' },
    { pattern: /turismo|saturaci[óo]n|masivo/i, label: 'Turismo / saturación' },
    { pattern: /agricultura|ganader|sector primario|olivar|vino/i, label: 'Sector primario' },
  ]
  for (const a of noticias) {
    const txt = a.title + ' ' + a.description
    for (const { pattern, label } of PREOC_PATTERNS) {
      if (pattern.test(txt)) out.add(label)
    }
  }
  return Array.from(out).slice(0, 8)
}
