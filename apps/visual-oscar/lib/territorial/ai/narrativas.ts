/**
 * Clustering ligero de noticias → narrativas dominantes.
 *
 * Sin LLM externo (para evitar coste y latencia): usa TF-IDF sobre bigramas
 * de titulares + agrupación por similitud Jaccard de tokens.
 *
 * Devuelve hasta 6 narrativas con nombre, fuerza (n artículos) y tendencia
 * (sentimiento medio).
 */

import type { AggregatedArticle } from '@/lib/news-aggregator'

export interface Narrativa {
  nombre: string
  fuerza: number          // n artículos
  sentimiento: number     // promedio -1..+1
  tono: 'positivo' | 'negativo' | 'neutral'
  ejemplos: Array<{ titulo: string; medio: string; url: string }>
  tags: string[]
}

const STOP = new Set([
  'sobre','desde','hasta','según','tras','ante','entre','durante','esta','este','estos','estas',
  'también','aunque','mientras','porque','cuando','donde','quien','cómo','país','nuevo','nueva',
  'última','primera','segundo','pacto','acuerdo','dice','asegura','presidente','gobierno','política',
  'tras','para','contra','por','con','en','el','la','los','las','de','del','que','un','una','y',
  'o','su','sus','le','les','lo','al','ha','han','es','son','no','si','se','ya','más','muy','año',
  'años','mes','días','día','hoy','ayer','mañana','vez','años','tiene','tienen','según','según',
])

function tokens(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOP.has(w))
}

function bigrams(toks: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < toks.length - 1; i++) out.push(`${toks[i]} ${toks[i + 1]}`)
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

export function detectarNarrativas(articles: AggregatedArticle[], maxNarrativas = 6): Narrativa[] {
  if (articles.length < 3) return []

  // 1. Cada artículo → set de tokens (título + descripción primeros 200 chars)
  const docs = articles.map(a => {
    const txt = (a.title + ' ' + (a.description || '').slice(0, 200))
    return { article: a, set: new Set([...tokens(txt), ...bigrams(tokens(txt))]) }
  })

  // 2. Clustering greedy por similitud
  const clusters: Array<{ docs: typeof docs; topTerms: Set<string> }> = []
  for (const doc of docs) {
    let mejor = -1, mejorSim = 0
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccard(doc.set, clusters[i].topTerms)
      if (sim > mejorSim && sim > 0.18) { mejor = i; mejorSim = sim }
    }
    if (mejor >= 0) {
      clusters[mejor].docs.push(doc)
      // Actualizar términos top
      for (const t of doc.set) clusters[mejor].topTerms.add(t)
    } else {
      clusters.push({ docs: [doc], topTerms: new Set(doc.set) })
    }
  }

  // 3. Filtrar clusters pequeños y rankear
  const significant = clusters.filter(c => c.docs.length >= 2)
  significant.sort((a, b) => b.docs.length - a.docs.length)

  return significant.slice(0, maxNarrativas).map(c => {
    // Nombre: el bigrama más representativo
    const termFreq: Record<string, number> = {}
    for (const d of c.docs) for (const t of d.set) {
      if (t.includes(' ')) termFreq[t] = (termFreq[t] || 0) + 1
    }
    const topBigram = Object.entries(termFreq).sort((a, b) => b[1] - a[1])[0]
    const nombre = topBigram
      ? topBigram[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Narrativa'

    // Sentimiento medio
    const sentSum = c.docs.reduce((s, d) => s + d.article.sentiment_score, 0)
    const sentimiento = +(sentSum / c.docs.length).toFixed(2)
    const tono: 'positivo' | 'negativo' | 'neutral' = sentimiento > 0.15 ? 'positivo' : sentimiento < -0.15 ? 'negativo' : 'neutral'

    // Ejemplos
    const ejemplos = c.docs.slice(0, 3).map(d => ({
      titulo: d.article.title,
      medio: d.article.medio.nombre,
      url: d.article.link,
    }))

    // Top tags individuales (no bigramas)
    const tagFreq: Record<string, number> = {}
    for (const d of c.docs) for (const t of d.set) {
      if (!t.includes(' ') && t.length >= 5) tagFreq[t] = (tagFreq[t] || 0) + 1
    }
    const tags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0])

    return {
      nombre,
      fuerza: c.docs.length,
      sentimiento,
      tono,
      ejemplos,
      tags,
    }
  })
}

/**
 * Score de estabilidad política (0-10) basado en métricas dinámicas.
 */
export function scoreEstabilidad(params: {
  noticiasNegativas: number
  noticiasTotal: number
  preocupaciones: number
  narrativas: Narrativa[]
}): { score: number; banda: 'baja' | 'media' | 'alta'; razones: string[] } {
  const { noticiasNegativas, noticiasTotal, preocupaciones, narrativas } = params
  if (noticiasTotal === 0) return { score: 5, banda: 'media', razones: ['Cobertura insuficiente para análisis'] }

  const pctNeg = noticiasNegativas / noticiasTotal
  let score = 10 - (pctNeg * 6) - (preocupaciones * 0.4)
  const narrNeg = narrativas.filter(n => n.tono === 'negativo').length
  score -= narrNeg * 0.5
  score = Math.max(0, Math.min(10, +score.toFixed(1)))
  const banda: 'baja' | 'media' | 'alta' = score >= 7 ? 'alta' : score >= 4 ? 'media' : 'baja'

  const razones: string[] = []
  if (pctNeg > 0.5) razones.push(`${Math.round(pctNeg * 100)}% de cobertura mediática negativa`)
  if (preocupaciones >= 5) razones.push(`${preocupaciones} preocupaciones simultáneas detectadas`)
  if (narrNeg >= 3) razones.push(`${narrNeg} narrativas negativas activas`)
  if (razones.length === 0 && score >= 7) razones.push('Cobertura estable sin conflictos prominentes')

  return { score, banda, razones }
}
