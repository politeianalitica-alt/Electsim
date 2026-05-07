import { NextRequest, NextResponse } from 'next/server'
import mediosData from '@/data/medios.json'
import { fetchRSS, type RSSItem } from '@/lib/rss'
import { scoreArticles, type MedioMeta, type ScoredArticle } from '@/lib/news-scoring'
import { withMeta } from '@/lib/backend'

// GET /api/noticias/feed
//   ?limit=50           (top N artículos por importance, default 80)
//   ?sources=20         (cuántos medios consultar, default 30 — los de mayor audiencia con RSS)
//   ?tipo=Prensa|...    (filtrar por tipo de medio)
//   ?ccaa=MAD|CAT|...   (filtrar por CCAA)
//   ?ideologia=izquierda|centro|derecha
//   ?since_hours=24     (descartar artículos más antiguos que N horas, default 48)
//
// Ejecuta fetch RSS en paralelo (hasta 12 a la vez), parsea, puntúa y devuelve
// ranking. Cada feed se cachea 10 min en el edge de Vercel.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface Medio {
  id: string; nombre: string; grupo: string; tipo: string; ambito: string
  ccaa: string | null; ideologia: number; audiencia_M: number
  credibilidad: number; rss: string | null; web: string; color?: string
}

const ALL_MEDIOS: Medio[] = (mediosData as { medios: Medio[] }).medios

// Concurrency limiter (Promise pool) · evita disparar 100 fetches a la vez
async function pool<T, R>(items: T[], concurrency: number, worker: (it: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run() {
    while (true) {
      const idx = next++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Math.min(200, Number(searchParams.get('limit') || 80))
  const sources = Math.min(80, Number(searchParams.get('sources') || 30))
  const tipo = searchParams.get('tipo')
  const ccaa = searchParams.get('ccaa')
  const ideo = searchParams.get('ideologia')
  const sinceHours = Math.min(168, Number(searchParams.get('since_hours') || 48))

  // Selección: solo medios con RSS, ordenados por audiencia
  let pool_medios = ALL_MEDIOS.filter(m => !!m.rss)
  if (tipo) pool_medios = pool_medios.filter(m => m.tipo === tipo)
  if (ccaa) pool_medios = pool_medios.filter(m => m.ccaa === ccaa)
  if (ideo === 'izquierda') pool_medios = pool_medios.filter(m => m.ideologia < -20)
  else if (ideo === 'derecha') pool_medios = pool_medios.filter(m => m.ideologia > 20)
  else if (ideo === 'centro') pool_medios = pool_medios.filter(m => m.ideologia >= -20 && m.ideologia <= 20)

  pool_medios.sort((a, b) => b.audiencia_M - a.audiencia_M)
  const targets = pool_medios.slice(0, sources)

  // Fetch RSS en paralelo (concurrency 12 — balance entre velocidad y no saturar)
  const t0 = Date.now()
  const fetches = await pool(targets, 12, async medio => {
    const r = await fetchRSS(medio.rss as string, 7000)
    return { medio, items: r.items, error: r.error }
  })

  // Estadísticas de fetch
  const fetch_stats = {
    sources_attempted: fetches.length,
    sources_ok: fetches.filter(f => f.items.length > 0).length,
    sources_failed: fetches.filter(f => f.items.length === 0).length,
    sources_failed_detail: fetches
      .filter(f => f.items.length === 0)
      .map(f => ({ id: f.medio.id, error: f.error }))
      .slice(0, 10),
    raw_items: fetches.reduce((s, f) => s + f.items.length, 0),
    fetch_ms: Date.now() - t0,
  }

  // Aplana a (item, medio) y filtra por antigüedad
  const cutoff = Date.now() - sinceHours * 3_600_000
  const flat: { item: RSSItem; medio: MedioMeta }[] = []
  for (const f of fetches) {
    for (const it of f.items) {
      if (it.pubDate && it.pubDate.getTime() < cutoff) continue
      flat.push({
        item: it,
        medio: {
          id: f.medio.id,
          nombre: f.medio.nombre,
          audiencia_M: f.medio.audiencia_M,
          credibilidad: f.medio.credibilidad,
          ideologia: f.medio.ideologia,
          tipo: f.medio.tipo,
          ambito: f.medio.ambito,
          ccaa: f.medio.ccaa,
        },
      })
    }
  }

  // Puntúa y ordena por importancia desc
  const scored: ScoredArticle[] = scoreArticles(flat)
  scored.sort((a, b) => b.importance - a.importance)
  const top = scored.slice(0, limit)

  // Métricas globales
  const summary = {
    total_articles: scored.length,
    returned: top.length,
    avg_importance: scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + a.importance, 0) / scored.length)
      : 0,
    top_importance: top[0]?.importance || 0,
    distribucion_ideologica: {
      izquierda: top.filter(a => a.ideologia < -20).length,
      centro: top.filter(a => a.ideologia >= -20 && a.ideologia <= 20).length,
      derecha: top.filter(a => a.ideologia > 20).length,
    },
    breaking_news: top.filter(a => a.tags.includes('ÚLTIMA HORA')).length,
    cluster_alerts: top.filter(a => a.tags.some(t => t.includes('medios'))).length,
  }

  return NextResponse.json(withMeta({
    articles: top,
    summary,
    fetch_stats,
    filters_applied: { limit, sources, tipo, ccaa, ideologia: ideo, since_hours: sinceHours },
  }, 'mock'))
}
