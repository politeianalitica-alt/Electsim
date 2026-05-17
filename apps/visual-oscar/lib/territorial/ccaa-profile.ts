/**
 * Perfil ENRIQUECIDO de Comunidad Autónoma.
 *
 * Combina en paralelo TODAS las fuentes disponibles:
 *   - Wikipedia REST API (bio + foto)
 *   - Wikidata SPARQL (presidente actual + foto)
 *   - RSS news (50+ medios filtrados por tokens CCAA)
 *   - Open Data Congreso/Senado (iniciativas autonómicas)
 *   - Clustering IA de noticias → narrativas
 *   - Score de estabilidad política
 *   - Preocupaciones detectadas (heurística sobre titulares)
 *   - Tags clave de cobertura (TF-IDF)
 */

import { getCCAABySlug, type CCAA } from './ccaa-catalog'
import { fetchWikipediaSummary } from '@/lib/figures/wikipedia'
import { getAggregatedNews, type AggregatedArticle } from '@/lib/news-aggregator'
import { getAllInitiatives } from '@/lib/legislative/aggregator'
import { fetchPresidenteCcaa, fetchFotoPersona, type WikidataGobernante } from './sources/wikidata'
import { detectarNarrativas, scoreEstabilidad, type Narrativa } from './ai/narrativas'
import { getHistoricoElectoralCCAA, indiceCompetitividad, type ResultadoEleccion } from './sources/electoral'

export interface CCAAProfile {
  meta: CCAA
  bio: { extract: string; sourceUrl: string | null }
  presidente: WikidataGobernante | null
  presidenteFoto: string | null
  noticias: Array<{
    titulo: string; medio: string; fecha: string | null; url: string
    sentiment: 'positive' | 'negative' | 'neutral'; sentiment_score: number
    descripcion: string
  }>
  iniciativas: Array<{
    titulo: string; expediente: string; materia: string; promotor: string
    stage: string; fechaRegistro: string | null; url: string | null
  }>
  sentimientoAgregado: {
    positivo: number; negativo: number; neutral: number
    score: number; tendencia: 'up' | 'down' | 'stable'
  }
  narrativas: Narrativa[]
  estabilidad: { score: number; banda: 'baja' | 'media' | 'alta'; razones: string[] }
  tagsCobertura: string[]
  preocupaciones: string[]
  /** Resumen IA del estado actual */
  resumenIA: string
  /** Histórico electoral (generales + autonómicas) */
  historicoElectoral: Array<ResultadoEleccion & { competitividad: number }>
  metrics: {
    nNoticias7d: number
    nIniciativas: number
    pibMillonesEuros: number
    densidadHabKm2: number
  }
  updatedAt: string
}

export async function buildCCAAProfile(slug: string): Promise<CCAAProfile | null> {
  const meta = getCCAABySlug(slug)
  if (!meta) return null

  const [bio, articles, { initiatives }, presidente] = await Promise.all([
    fetchBio(meta),
    getAggregatedNews({ maxSources: 40, hoursBack: 168 }).catch(() => [] as AggregatedArticle[]),
    getAllInitiatives().catch(() => ({ initiatives: [] })),
    fetchPresidenteCcaa(meta.nombre).catch(() => null),
  ])

  // Foto del presidente
  const presidenteFoto = presidente?.qid ? await fetchFotoPersona(presidente.qid).catch(() => null) : null

  // Filtrar noticias por tokens
  const tokenPatterns = meta.tokens.map(t => { try { return new RegExp(t, 'i') } catch { return null } }).filter((r): r is RegExp => !!r)
  const noticiasMatched = articles.filter(a => {
    const txt = (a.title + ' ' + a.description).toLowerCase()
    return tokenPatterns.some(re => re.test(txt))
  })

  // Filtrar iniciativas autonómicas de esta CCAA
  const iniciativasMatched = initiatives.filter(it => it.ccaa === meta.slug)

  const sentimientoAgregado = computeAgregado(noticiasMatched)
  const tagsCobertura = extractTags(noticiasMatched)
  const preocupaciones = analyzePreocupaciones(noticiasMatched)
  const narrativas = detectarNarrativas(noticiasMatched, 6)
  const estabilidad = scoreEstabilidad({
    noticiasNegativas: sentimientoAgregado.negativo,
    noticiasTotal: noticiasMatched.length,
    preocupaciones: preocupaciones.length,
    narrativas,
  })
  const resumenIA = sintesisCCAA(meta, sentimientoAgregado, preocupaciones, narrativas, iniciativasMatched.length)

  const historicoBase = getHistoricoElectoralCCAA(slug)
  const historicoElectoral = historicoBase.map(e => ({ ...e, competitividad: indiceCompetitividad(e) }))

  return {
    meta,
    bio,
    presidente,
    presidenteFoto,
    noticias: noticiasMatched.slice(0, 40).map(a => ({
      titulo: a.title, medio: a.medio.nombre, fecha: a.pub_date_iso, url: a.link,
      sentiment: a.sentiment, sentiment_score: a.sentiment_score,
      descripcion: (a.description || '').slice(0, 200),
    })),
    iniciativas: iniciativasMatched.slice(0, 30).map(it => ({
      titulo: it.titulo, expediente: it.expediente, materia: it.materia,
      promotor: it.promotor, stage: it.stage,
      fechaRegistro: it.fechaRegistro, url: it.urlOficial,
    })),
    sentimientoAgregado,
    narrativas,
    estabilidad,
    tagsCobertura,
    preocupaciones,
    resumenIA,
    historicoElectoral,
    metrics: {
      nNoticias7d: noticiasMatched.length,
      nIniciativas: iniciativasMatched.length,
      pibMillonesEuros: meta.pibMillones,
      densidadHabKm2: Math.round((meta.poblacion * 1000) / meta.superficie),
    },
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

function analyzePreocupaciones(noticias: AggregatedArticle[]): string[] {
  const out = new Set<string>()
  const PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /sequ[íi]a|escasez de agua|emergencia h[íi]drica/i, label: 'Sequía / crisis hídrica' },
    { pattern: /incendi(?:o|os) forestal/i, label: 'Incendios forestales' },
    { pattern: /vivienda asequible|alquiler|precio.*vivienda/i, label: 'Crisis de vivienda' },
    { pattern: /sanidad|hospital|listas? de espera|atenci[óo]n primaria/i, label: 'Tensión sanitaria' },
    { pattern: /educa(?:ci[óo]n|tivo)|profesorado|colegios?/i, label: 'Sistema educativo' },
    { pattern: /seguridad|delincuencia|asalto|robo/i, label: 'Seguridad ciudadana' },
    { pattern: /migra(?:nte|ci[óo]n)|inmigra(?:nte|ci[óo]n)|cayuco|extranjero/i, label: 'Migración' },
    { pattern: /transporte|tren|metro|aeropuerto/i, label: 'Infraestructuras de transporte' },
    { pattern: /energ[íi]a|electricidad|renovable|nuclear/i, label: 'Política energética' },
    { pattern: /inundaci[óo]n|tempora|dana/i, label: 'Emergencias climáticas' },
    { pattern: /huelga|paro|protesta|manifestaci[óo]n/i, label: 'Protestas y movilizaciones' },
    { pattern: /corrupci[óo]n|fraude|investigaci[óo]n judicial/i, label: 'Casos de corrupción' },
    { pattern: /empleo|paro laboral|desempleo/i, label: 'Empleo' },
    { pattern: /turismo|saturaci[óo]n|masivo/i, label: 'Turismo / saturación' },
    { pattern: /agricultura|ganader|sector primario|olivar|vino/i, label: 'Sector primario' },
  ]
  for (const a of noticias) {
    const txt = a.title + ' ' + a.description
    for (const { pattern, label } of PATTERNS) {
      if (pattern.test(txt)) out.add(label)
    }
  }
  return Array.from(out).slice(0, 8)
}

function sintesisCCAA(
  meta: CCAA,
  s: { positivo: number; negativo: number; score: number; tendencia: string },
  preocupaciones: string[],
  narrativas: Narrativa[],
  nIniciativas: number,
): string {
  const total = s.positivo + s.negativo
  const tonoLabel = s.score > 0.1 ? 'positivo' : s.score < -0.1 ? 'negativo' : 'mixto'
  const tendLabel = s.tendencia === 'up' ? 'al alza' : s.tendencia === 'down' ? 'a la baja' : 'estable'

  let r = `${meta.nombre} (${meta.partidoGobierno}, gobierno presidido por ${meta.presidente}) registra ${total} apariciones en medios nacionales en los últimos 7 días`
  r += ` con un tono mediático ${tonoLabel} y tendencia ${tendLabel}.`

  if (nIniciativas > 0) r += ` Su parlamento tiene ${nIniciativas} iniciativas legislativas en tramitación.`

  if (narrativas.length > 0) {
    const top3 = narrativas.slice(0, 3).map(n => n.nombre).join(', ')
    r += ` Las narrativas dominantes en la cobertura son: ${top3}.`
  }

  if (preocupaciones.length > 0) {
    const top = preocupaciones.slice(0, 3).join(', ')
    r += ` Se detectan preocupaciones ciudadanas en torno a: ${top}.`
  }

  if (meta.sectoresClave.length > 0) {
    r += ` Económicamente destaca por ${meta.sectoresClave.slice(0, 3).join(', ')} (PIB ${meta.pibMillones.toLocaleString('es-ES')} M€).`
  }

  return r
}
