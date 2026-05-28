/**
 * /api/geopolitica/trending-temas · Sprint GEO-RADAR C1
 *
 * Top 5-10 temas más activos en cobertura mundial últimas 24h,
 * derivados del GDELT GKG (campo themes agregado).
 *
 * Solo themes geopolíticos relevantes (filtrado del catálogo GKG):
 *   - WAR_CONFLICT, TERROR, PROTEST, GOV_LEADERSHIP_CHANGE, FAMINE,
 *     KILL, NUCLEAR_THREAT, ECON_INFLATION, MIGRATION, SANCTIONS
 *
 * Cache: s-maxage=3600 (1h · cambian lento).
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface TrendingTopic {
  theme: string
  label_es: string
  article_count: number
  share_pct: number
  emoji: string
}

const GEOPOLITICAL_THEMES: Array<{ theme: string; label_es: string; emoji: string }> = [
  { theme: 'WAR_CONFLICT', label_es: 'Conflicto armado', emoji: '⚔' },
  { theme: 'TERROR', label_es: 'Terrorismo', emoji: '☠' },
  { theme: 'PROTEST', label_es: 'Protestas', emoji: '✊' },
  { theme: 'KILL', label_es: 'Bajas / violencia letal', emoji: '⊗' },
  { theme: 'NUCLEAR_THREAT', label_es: 'Amenaza nuclear', emoji: '☢' },
  { theme: 'GOV_LEADERSHIP_CHANGE', label_es: 'Cambio de gobierno', emoji: '⊞' },
  { theme: 'COUP', label_es: 'Golpe de estado', emoji: '⊟' },
  { theme: 'FAMINE', label_es: 'Hambruna', emoji: '✦' },
  { theme: 'MIGRATION', label_es: 'Migraciones masivas', emoji: '⇡' },
  { theme: 'SANCTIONS', label_es: 'Sanciones', emoji: '⊘' },
  { theme: 'CYBER_ATTACK', label_es: 'Ciberataque', emoji: '◐' },
  { theme: 'ENV_CLIMATE', label_es: 'Crisis climática', emoji: '◉' },
]

/** Cuenta artículos del último día por theme · 1 query GDELT por theme. */
async function countArticlesByTheme(theme: string): Promise<number> {
  const url = buildGdeltDocUrl({
    query: '*',
    theme,
    timespan: '24h',
    mode: 'artlist',
    maxrecords: 250,    // max GDELT, sirve como proxy de magnitud
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  return json?.articles ? json.articles.length : 0
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 12 queries en paralelo (GDELT rate-limit puede ser un problema, pero hay retry interno)
  const counts = await Promise.all(
    GEOPOLITICAL_THEMES.map(async (t) => ({
      ...t,
      count: await countArticlesByTheme(t.theme).catch(() => 0),
    }))
  )

  const totalArticles = counts.reduce((s, c) => s + c.count, 0)
  const topics: TrendingTopic[] = counts
    .filter((c) => c.count > 0)
    .map((c) => ({
      theme: c.theme,
      label_es: c.label_es,
      emoji: c.emoji,
      article_count: c.count,
      share_pct: totalArticles > 0 ? Math.round((c.count / totalArticles) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.article_count - a.article_count)

  return NextResponse.json({
    ok: true,
    topics: topics.slice(0, 10),
    total_articles_24h: totalArticles,
    fetched_at: startedAt,
    _meta: {
      source: 'GDELT DOC v2 · themes catálogo GKG',
      cache_ttl_seconds: 3600,
      themes_queried: GEOPOLITICAL_THEMES.length,
      note: 'GDELT maxrecords=250 por theme · sirve como proxy de magnitud, no conteo exacto',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
