/**
 * /api/medios/ccaa?ccaa=Madrid — drill deep por CCAA.
 *
 * Sprint M1 · ahora separa CCAA del medio vs CCAA mencionada vs CCAA afectada
 * y devuelve _meta con confianza por CCAA.
 *
 * Devuelve el CCAADeepDetail completo (categorías, topics, top news,
 * top medios, figuras públicas activas, empresas mencionadas y
 * provincias con drill) + un bloque regional_signal con la nueva métrica.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { ccaaDeep } from '@/lib/news-intel'
import { readArticle, buildMeta, profileFromCatalog } from '@/lib/medios/media-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45
export const revalidate = 300

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const ccaa = req.nextUrl.searchParams.get('ccaa') || 'Madrid'
  const hours = Math.min(168, Math.max(6, Number(req.nextUrl.searchParams.get('hours') || 72)))
  const balanceMode = (req.nextUrl.searchParams.get('balance_mode') || 'regional') as 'audience' | 'pluralism' | 'regional' | 'ideological' | 'crisis'
  const warnings: string[] = []
  try {
    const articles = await getAggregatedNews({ maxSources: 80, hoursBack: hours, balanceMode })
    const detail = ccaaDeep(articles, ccaa)

    // Sprint M1 · regional_signal_score (separa origen medio vs mención vs afectado)
    let n_by_medium_ccaa = 0
    let n_by_mention = 0
    let n_by_affected = 0
    let neg_count = 0
    let inst_relevance_sum = 0
    let elect_relevance_sum = 0
    const top_narratives_set: string[] = []
    const regional_actors_set = new Set<string>()
    const accelerating_topics_set = new Set<string>()

    for (const a of articles) {
      const profile = profileFromCatalog(a.medio)
      const reading = readArticle(a, profile)
      if (profile.ccaa === ccaa) n_by_medium_ccaa++
      if (reading.territory_mentioned.includes(ccaa)) {
        n_by_mention++
        if (reading.sentiment.event_tone === 'negative') neg_count++
        inst_relevance_sum += reading.institutional_relevance
        elect_relevance_sum += reading.electoral_relevance
        for (const a of reading.actors) regional_actors_set.add(a)
        for (const t of [reading.main_topic, ...reading.secondary_topics]) accelerating_topics_set.add(t)
        if (reading.frame !== 'otro') top_narratives_set.push(reading.frame)
      }
      if (reading.territory_affected.includes(ccaa)) n_by_affected++
    }

    const volume = Math.min(40, n_by_mention)              // 0..40
    const negativity = n_by_mention > 0 ? Math.min(25, (neg_count / n_by_mention) * 25) : 0
    const inst_avg = n_by_mention > 0 ? inst_relevance_sum / n_by_mention : 0
    const elect_avg = n_by_mention > 0 ? elect_relevance_sum / n_by_mention : 0
    const institutional_relevance = Math.min(15, (inst_avg / 100) * 15)
    const electoral_relevance = Math.min(10, (elect_avg / 100) * 10)
    const source_diversity = Math.min(10, new Set(articles.filter((a) => {
      const r = readArticle(a, profileFromCatalog(a.medio))
      return r.territory_mentioned.includes(ccaa)
    }).map((a) => a.medio.id)).size / 2)
    const signal_score = Math.round(volume + negativity + institutional_relevance + electoral_relevance + source_diversity)

    const narrative_counts: Record<string, number> = {}
    for (const n of top_narratives_set) narrative_counts[n] = (narrative_counts[n] || 0) + 1
    const top_narratives = Object.entries(narrative_counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([n]) => n)

    const confidence = n_by_mention >= 10 ? 0.8 : n_by_mention >= 5 ? 0.6 : n_by_mention >= 2 ? 0.4 : 0.2
    if (n_by_mention < 3) warnings.push(`Sólo ${n_by_mention} artículos mencionan ${ccaa} · análisis tentativo`)
    if (n_by_medium_ccaa > n_by_mention * 3) warnings.push(`Sobre-representación de medios de ${ccaa}: ${n_by_medium_ccaa} medios locales vs ${n_by_mention} menciones reales`)

    const regional_signal = {
      ccaa,
      signal_score,
      components: {
        volume,
        negativity: Math.round(negativity),
        institutional_relevance: Math.round(institutional_relevance),
        electoral_relevance: Math.round(electoral_relevance),
        source_diversity: Math.round(source_diversity),
      },
      n_articles_by_medium_ccaa: n_by_medium_ccaa,
      n_articles_by_mention: n_by_mention,
      n_articles_by_affected: n_by_affected,
      top_narratives,
      regional_actors: Array.from(regional_actors_set).slice(0, 12),
      accelerating_topics: Array.from(accelerating_topics_set).slice(0, 8),
      confidence,
      why: n_by_mention >= 5
        ? `${n_by_mention} artículos mencionan ${ccaa} · ${neg_count} de tono negativo · frame dominante: ${top_narratives[0] || 'mixto'}`
        : `Cobertura baja en ${ccaa} · ${n_by_mention} menciones · señal débil`,
    }

    return NextResponse.json({
      ...detail,
      regional_signal,
      updatedAt: new Date().toISOString(),
      _meta: buildMeta({
        source: articles.length > 0 ? 'live' : 'fallback',
        startedAt,
        warnings,
        sources_used: 80,
        articles_read: articles.length,
        confidence,
      }),
    })
  } catch (e) {
    return NextResponse.json({
      ccaa, total: 0, polarity: 0, categories: [], topTopics: [], topNews: [],
      topMedios: [], topFigures: [], topCompanies: [], provinces: [],
      error: String(e),
      _meta: buildMeta({
        source: 'error',
        startedAt,
        warnings: [`fatal: ${String(e).slice(0, 200)}`],
      }),
    })
  }
}
