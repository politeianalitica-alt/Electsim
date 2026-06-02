/**
 * Lectura de Postgres → tipos canónicos.
 *
 * Sprint 0.4 (adapter mode):
 *  - readArticlesInWindow() llama al endpoint legacy /api/medios/intel
 *    y mapea cada item a ArticleUnit usando articleRowToCanonical.
 *  - Esto desacopla los nuevos endpoints canónicos del backend Postgres
 *    durante el sprint 0+1. Sprint 1.1+ reemplaza por SELECT directo.
 *
 * Sprint 1.1+ (DB mode):
 *  - Sustituir el fetch por una query SQL contra `article` con los
 *    campos canónicos (canonical_url, raw_tags, entities JSONB,
 *    quality_score, etc.) ya disponibles tras la migración 0058.
 */
import type { ArticleUnit, IngestionSource, Source, WindowSpec } from './types'
import { articleRowToCanonical, type ArticleRow } from './adapters'
import { findSourceByDomain, loadSourceCatalog } from './catalogs'

// ──────── Window helpers ─────────────────────────────────────────────

function windowToMs(window: WindowSpec): number {
  const H = 60 * 60 * 1000
  if (window === '24h') return 24 * H
  if (window === '48h') return 48 * H
  if (window === '72h') return 72 * H
  return 7 * 24 * H
}

export function windowToSinceISO(window: WindowSpec): string {
  return new Date(Date.now() - windowToMs(window)).toISOString()
}

// ──────── Fallback source para dominios no catalogados ───────────────

export const FALLBACK_SOURCE: Source = {
  id: 'unknown',
  name: 'Unknown',
  domain: '',
  type: 'NATIONAL',
  country: 'ES',
  regions: ['ES'],
  language: 'es',
  ideology: 'UNKNOWN',
  ideologyScore: 0,
  tier: 3,
  audienceEstimate: 0,
  rssFeeds: [],
  qualityScore: 0.1,
  active: false,
}

// ──────── Lectura artículos en ventana temporal ──────────────────────

interface LegacyItem {
  url?: string
  link?: string
  title?: string
  description?: string
  summary?: string
  published_at?: string
  published?: string
  publishedAt?: string
  categories?: string[]
  category?: string
  tags?: string[]
  source?: { id?: string; domain?: string; nombre?: string; name?: string }
  source_domain?: string
  medio?: { id?: string; nombre?: string; dominio?: string; domain?: string }
}

interface LegacyIntelResponse {
  items?: LegacyItem[]
  feed?: LegacyItem[]
  // tieredFeed puede devolver { t1: [], t2: [], ... }
  t1?: LegacyItem[]
  t2?: LegacyItem[]
  t3?: LegacyItem[]
  t4?: LegacyItem[]
  meta?: { total?: number; hours?: number }
}

function windowToHours(window: WindowSpec): number {
  if (window === '24h') return 24
  if (window === '48h') return 48
  if (window === '72h') return 72
  return 168
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Lee artículos de la última ventana temporal.
 *
 * Sprint 0.4: usa el endpoint legacy /api/medios/intel como fuente.
 * Devuelve [] si hay error (los endpoints derivados manejan vacío
 * de forma estable, sin throw).
 */
export async function readArticlesInWindow(
  window: WindowSpec,
  baseUrl: string,
): Promise<ArticleUnit[]> {
  const hours = windowToHours(window)
  try {
    const resp = await fetch(
      `${baseUrl}/api/medios/intel?hours=${hours}&include=feed`,
      {
        // Cache 5 min · evita martillear el endpoint legacy
        next: { revalidate: 300 },
      } as RequestInit,
    )
    if (!resp.ok) return []
    const data = (await resp.json()) as LegacyIntelResponse

    // El feed legacy puede venir como items, feed o tiers (t1..t4)
    const flat: LegacyItem[] = []
    if (Array.isArray(data.items)) flat.push(...data.items)
    if (Array.isArray(data.feed)) flat.push(...data.feed)
    for (const tier of ['t1', 't2', 't3', 't4'] as const) {
      const list = data[tier]
      if (Array.isArray(list)) flat.push(...list)
    }
    if (flat.length === 0) return []

    const sources = await loadSourceCatalog()
    const articles: ArticleUnit[] = []
    const seen = new Set<string>()
    for (const it of flat) {
      const url = it.url ?? it.link ?? ''
      if (!url || seen.has(url)) continue
      seen.add(url)
      const title = (it.title ?? '').trim()
      if (!title) continue
      const domain =
        it.source_domain ??
        it.source?.domain ??
        it.medio?.dominio ??
        it.medio?.domain ??
        extractDomain(url) ??
        ''
      const source = findSourceByDomain(sources, domain) ?? FALLBACK_SOURCE
      const tags = it.categories ?? it.tags ?? (it.category ? [it.category] : [])
      const description = it.description ?? it.summary ?? null
      const publishedAt =
        it.published_at ??
        it.publishedAt ??
        it.published ??
        new Date().toISOString()
      const row: ArticleRow = {
        url,
        title,
        summary: description,
        body_text: null,
        source_id: source.id,
        lang: 'es',
        published_at: publishedAt,
        category: null,
        raw_tags: tags,
      }
      articles.push(articleRowToCanonical(row, source))
    }
    return articles
  } catch {
    return []
  }
}

// Re-export por conveniencia para futuros lectores
export type { IngestionSource }
