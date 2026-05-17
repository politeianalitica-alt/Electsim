/**
 * Constructor de perfil dinámico de Municipio.
 *
 * Combina:
 *   - Bio Wikipedia REST API (auto-descarga)
 *   - Noticias RSS últimos 7d filtradas por tokens del municipio
 *   - Sentimiento agregado + preocupaciones detectadas
 *   - Datos demográficos del catálogo
 *   - Tags clave de cobertura mediática
 */

import { getMunicipioBySlug, type Municipio } from './municipios-catalog'
import { getCCAABySlug } from './ccaa-catalog'
import { fetchWikipediaSummary } from '@/lib/figures/wikipedia'
import { getAggregatedNews, type AggregatedArticle } from '@/lib/news-aggregator'

export interface MunicipioProfile {
  meta: Municipio
  ccaaNombre: string
  ccaaColor: string
  bio: { extract: string; sourceUrl: string | null }
  noticias: Array<{
    titulo: string; medio: string; fecha: string | null; url: string
    sentiment: string; sentiment_score: number
  }>
  sentimientoAgregado: {
    positivo: number; negativo: number; neutral: number
    score: number; tendencia: 'up' | 'down' | 'stable'
  }
  tagsCobertura: string[]
  preocupaciones: string[]
  metrics: {
    nNoticias7d: number
    densidadHabKm2: number
  }
  updatedAt: string
}

export async function buildMunicipioProfile(slug: string): Promise<MunicipioProfile | null> {
  const meta = getMunicipioBySlug(slug)
  if (!meta) return null
  const ccaa = getCCAABySlug(meta.ccaa)

  const [bio, articles] = await Promise.all([
    fetchBio(meta),
    getAggregatedNews({ maxSources: 40, hoursBack: 168 }).catch(() => [] as AggregatedArticle[]),
  ])

  const tokenPatterns = meta.tokens.map(t => { try { return new RegExp(t, 'i') } catch { return null } }).filter((r): r is RegExp => !!r)
  const noticiasMatched = articles.filter(a => {
    const txt = (a.title + ' ' + a.description).toLowerCase()
    return tokenPatterns.some(re => re.test(txt))
  })

  const sentimientoAgregado = computeAgregado(noticiasMatched)
  const tagsCobertura = extractTags(noticiasMatched)
  const preocupaciones = analyzePreocupaciones(noticiasMatched)

  return {
    meta,
    ccaaNombre: ccaa?.nombre || meta.ccaa,
    ccaaColor: ccaa?.color || '#525258',
    bio,
    noticias: noticiasMatched.slice(0, 25).map(a => ({
      titulo: a.title, medio: a.medio.nombre, fecha: a.pub_date_iso, url: a.link,
      sentiment: a.sentiment, sentiment_score: a.sentiment_score,
    })),
    sentimientoAgregado,
    tagsCobertura,
    preocupaciones,
    metrics: {
      nNoticias7d: noticiasMatched.length,
      densidadHabKm2: Math.round(meta.poblacion / meta.superficie),
    },
    updatedAt: new Date().toISOString(),
  }
}

async function fetchBio(meta: Municipio) {
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
    'también','aunque','mientras','porque','cuando','donde','quien','cómo','país','nuevo','nueva','última',
    'primera','segundo','pacto','acuerdo','dice','asegura','alcalde','ayuntamiento','ciudad'])
  const freq: Record<string, number> = {}
  for (const a of noticias) {
    for (const w of a.title.toLowerCase().split(/\W+/)) {
      if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0])
}

function analyzePreocupaciones(noticias: AggregatedArticle[]): string[] {
  const out = new Set<string>()
  const PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /vivienda|alquiler|precio.*vivienda/i, label: 'Vivienda asequible' },
    { pattern: /movilidad|tr[áa]fico|transporte p[úu]blico|metro|bus|peat/i, label: 'Movilidad y transporte' },
    { pattern: /turismo|turistas|saturaci[óo]n/i, label: 'Turismo y saturación' },
    { pattern: /seguridad|delincuencia|asalto|robo/i, label: 'Seguridad ciudadana' },
    { pattern: /limpieza|basura|residuos/i, label: 'Limpieza y residuos' },
    { pattern: /sanidad|hospital|atenci[óo]n primaria/i, label: 'Sanidad local' },
    { pattern: /educa(?:ci[óo]n|tivo)|escuelas/i, label: 'Educación' },
    { pattern: /protesta|huelga|manifestaci[óo]n/i, label: 'Protestas' },
    { pattern: /empleo|paro|desempleo/i, label: 'Empleo' },
    { pattern: /obras|infraestructura/i, label: 'Obras públicas' },
    { pattern: /agua|sequ[íi]a/i, label: 'Recursos hídricos' },
    { pattern: /emergencia|incendio|inundaci[óo]n|dana/i, label: 'Emergencias' },
    { pattern: /cultura|festival|patrimonio/i, label: 'Cultura y patrimonio' },
  ]
  for (const a of noticias) {
    const txt = a.title + ' ' + a.description
    for (const { pattern, label } of PATTERNS) {
      if (pattern.test(txt)) out.add(label)
    }
  }
  return Array.from(out).slice(0, 7)
}
