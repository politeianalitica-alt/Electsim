/**
 * /api/government/snapshot — Foto fija del Gobierno actual + dinámicos.
 *
 * Devuelve:
 *   - Presidente, vicepresidencias, ministros (catálogo enumerado)
 *   - Apoyos parlamentarios (catálogo)
 *   - Noticias recientes sobre el Gobierno (RSS aggregator)
 *   - Sentimiento agregado de la cobertura mediática
 *   - Iniciativas en tramitación promovidas por el Gobierno
 */

import { NextResponse } from 'next/server'
import { PRESIDENTE, VICEPRESIDENCIAS, MINISTROS, APOYOS } from '@/lib/government/composition'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { getAllInitiatives } from '@/lib/legislative/aggregator'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    const [articles, { initiatives }] = await Promise.all([
      getAggregatedNews({ maxSources: 40, hoursBack: 168 }).catch(() => []),
      getAllInitiatives().catch(() => ({ initiatives: [] })),
    ])

    // Noticias sobre el Gobierno
    const GOV_TOKENS = ['gobierno', 'sánchez', 'sanchez', 'moncloa', 'consejo de ministros', 'ejecutivo', 'gobierno de españa']
    const newsArticles = articles.filter(a => {
      const txt = (a.title + ' ' + a.description).toLowerCase()
      return GOV_TOKENS.some(t => txt.includes(t))
    }).slice(0, 40)

    // Sentimiento
    let pos = 0, neg = 0, neu = 0, sum = 0
    for (const a of newsArticles) {
      if (a.sentiment === 'positive') pos++
      else if (a.sentiment === 'negative') neg++
      else neu++
      sum += a.sentiment_score
    }
    const score = newsArticles.length > 0 ? +(sum / newsArticles.length).toFixed(2) : 0
    const tendencia = (() => {
      const half = Math.floor(newsArticles.length / 2)
      const rec = newsArticles.slice(0, half)
      const ant = newsArticles.slice(half)
      const ar = rec.length ? rec.reduce((s, x) => s + x.sentiment_score, 0) / rec.length : 0
      const aa = ant.length ? ant.reduce((s, x) => s + x.sentiment_score, 0) / ant.length : 0
      return ar - aa > 0.1 ? 'up' : ar - aa < -0.1 ? 'down' : 'stable'
    })()

    // Iniciativas del Gobierno
    const govInitiatives = initiatives.filter(it =>
      /gobierno|consejo de ministros|moncloa/i.test(it.promotor) || it.kind === 'PL' || it.kind === 'RDL'
    ).slice(0, 30)

    // Apoyos: añadir métrica de probabilidad de apoyo basada en noticias del partido
    const apoyosConContexto = APOYOS.map(a => {
      const tokens = [a.siglas.toLowerCase(), a.partido.toLowerCase()]
      const newsCount = articles.filter(art => {
        const txt = (art.title + ' ' + art.description).toLowerCase()
        return tokens.some(t => txt.includes(t))
      }).length
      return { ...a, newsCount }
    })

    return NextResponse.json(withMeta({
      presidente: PRESIDENTE,
      vicepresidencias: VICEPRESIDENCIAS,
      ministros: MINISTROS,
      apoyos: apoyosConContexto,
      noticias: newsArticles.map(a => ({
        titulo: a.title, medio: a.medio.nombre, fecha: a.pub_date_iso, url: a.link,
        sentiment: a.sentiment, sentiment_score: a.sentiment_score,
      })),
      iniciativas: govInitiatives.map(it => ({
        titulo: it.titulo, expediente: it.expediente, materia: it.materia,
        kind: it.kind, stage: it.stage, fechaRegistro: it.fechaRegistro,
        url: it.urlOficial,
      })),
      sentimientoAgregado: { positivo: pos, negativo: neg, neutral: neu, score, tendencia },
      stats: {
        totalEscanosGobierno: APOYOS.filter(a => a.rol === 'gobierno').reduce((s, a) => s + a.escanos, 0),
        totalEscanosInvestidura: APOYOS.filter(a => a.rol === 'investidura').reduce((s, a) => s + a.escanos, 0),
        totalEscanosOposicion: APOYOS.filter(a => a.rol === 'oposicion').reduce((s, a) => s + a.escanos, 0),
        mayoriaAbsoluta: 176,
      },
      updatedAt: new Date().toISOString(),
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
