/**
 * /api/diplomacia/senales · Sprint GEO-DIP C1
 *
 * Feed de movimientos diplomáticos detectados algorítmicamente:
 *   - Acercamientos bilaterales (GDELT cooperación CAMEO 04x/06x)
 *   - Deterioros bilaterales (caída tono >−3 puntos 14d)
 *   - Cambios de gobierno (GOV_LEADERSHIP_CHANGE)
 *   - Narrativas crisis diplomática (terms expel/recall/sanctions threat)
 *
 * Cache: s-maxage=900 (15 min).
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { iso2ToIso3, isoToName } from '@/lib/geopolitica/country-coords'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type SignalType = 'acercamiento' | 'deterioro' | 'cambio_gobierno' | 'crisis_diplomatica' | 'sancion_nueva' | 'votacion_onu'

interface DiplomaticSignal {
  type: SignalType
  type_label: string
  type_emoji: string
  type_color: string
  country_iso3: string | null
  country_name: string | null
  title: string
  source_domain: string
  url: string
  datetime: string
  tone: number
  confidence: 1 | 2 | 3
}

const TYPE_META: Record<SignalType, { label: string; emoji: string; color: string }> = {
  acercamiento: { label: 'Acercamiento bilateral', emoji: '🤝', color: '#16a34a' },
  deterioro: { label: 'Deterioro bilateral', emoji: '⚔', color: '#dc2626' },
  cambio_gobierno: { label: 'Cambio gobierno relevante', emoji: '🏛', color: '#7c3aed' },
  crisis_diplomatica: { label: 'Crisis diplomática', emoji: '⚡', color: '#ea580c' },
  sancion_nueva: { label: 'Nueva sanción', emoji: '🔒', color: '#7f1d1d' },
  votacion_onu: { label: 'Votación ONU inminente', emoji: '🗳', color: '#0891b2' },
}

async function fetchByThemeOrQuery(opts: { theme?: string; query: string; type: SignalType }): Promise<DiplomaticSignal[]> {
  const url = buildGdeltDocUrl({
    query: opts.query,
    theme: opts.theme,
    timespan: '7d',
    mode: 'artlist',
    maxrecords: 25,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  if (!json?.articles) return []
  return json.articles.map((a: any): DiplomaticSignal => {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    const iso3 = iso2 ? iso2ToIso3(iso2) : null
    const meta = TYPE_META[opts.type]
    return {
      type: opts.type,
      type_label: meta.label,
      type_emoji: meta.emoji,
      type_color: meta.color,
      country_iso3: iso3,
      country_name: iso3 ? isoToName(iso3) : null,
      title: a.title || '',
      source_domain: a.domain || '',
      url: a.url || '',
      datetime: normalizeGdeltDate(a.seendate) || '',
      tone: typeof a.tone === 'number' ? a.tone : 0,
      confidence: 1,
    }
  })
}

// G19 item 14 · FALLBACK RSS de fuentes diplomáticas oficiales cuando
// GDELT devuelve 0 artículos (rate-limit o sin cobertura).
async function fetchDiplomaticRssFallback(): Promise<DiplomaticSignal[]> {
  const FEEDS: Array<{ url: string; type: SignalType; source: string }> = [
    { url: 'https://www.eeas.europa.eu/_en/rss.xml', type: 'crisis_diplomatica', source: 'EEAS (UE)' },
    { url: 'https://press.un.org/en/news/feed', type: 'votacion_onu', source: 'UN Press' },
    { url: 'https://www.state.gov/rss-feed/secretary-remarks/feed/', type: 'acercamiento', source: 'US State Department' },
  ]
  const all: DiplomaticSignal[] = []
  for (const feed of FEEDS) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 6000)
      const r = await fetch(feed.url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Politeia/1.0 (geopolitica analyst)' },
        next: { revalidate: 1800 },
      })
      clearTimeout(t)
      if (!r.ok) continue
      const xml = await r.text()
      const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
      const meta = TYPE_META[feed.type]
      for (const itXml of items.slice(0, 6)) {
        const title = (itXml.match(/<title>([\s\S]*?)<\/title>/) ?? [, ''])[1]
          .replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        const link = (itXml.match(/<link>([\s\S]*?)<\/link>/) ?? [, ''])[1].trim()
        const pubDate = (itXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [, ''])[1].trim()
        const isoDate = pubDate ? new Date(pubDate).toISOString().slice(0, 19) : ''
        if (!title || !link) continue
        all.push({
          type: feed.type,
          type_label: meta.label,
          type_emoji: meta.emoji,
          type_color: meta.color,
          country_iso3: null,
          country_name: null,
          title: title.slice(0, 240),
          source_domain: feed.source,
          url: link,
          datetime: isoDate,
          tone: 0,
          confidence: 3, // máxima (oficiales)
        })
      }
    } catch {
      /* feed individual falló · continuar */
    }
  }
  return all
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // 4 themes paralelos
  const [govChange, crisisDiplo, sanction, exercise] = await Promise.all([
    fetchByThemeOrQuery({ theme: 'GOV_LEADERSHIP_CHANGE', query: '*', type: 'cambio_gobierno' }).catch(() => []),
    fetchByThemeOrQuery({ query: '("expel ambassador" OR "diplomatic crisis" OR "recall ambassador")', type: 'crisis_diplomatica' }).catch(() => []),
    fetchByThemeOrQuery({ query: '("new sanctions" OR "sanctions package" OR "sanctioned designation")', type: 'sancion_nueva' }).catch(() => []),
    fetchByThemeOrQuery({ query: '("joint statement" OR "bilateral agreement" OR "strategic partnership")', type: 'acercamiento' }).catch(() => []),
  ])

  const all = [...govChange, ...crisisDiplo, ...sanction, ...exercise]
  let rssUsed = false
  if (all.length === 0) {
    const rssSignals = await fetchDiplomaticRssFallback().catch(() => [])
    all.push(...rssSignals)
    rssUsed = rssSignals.length > 0
  }

  const seen = new Set<string>()
  const deduped: DiplomaticSignal[] = []
  for (const s of all) {
    if (!s.url || seen.has(s.url)) continue
    seen.add(s.url)
    deduped.push(s)
  }
  deduped.sort((a, b) => b.datetime.localeCompare(a.datetime))

  return NextResponse.json({
    ok: true,
    signals: deduped.slice(0, 50),
    counts_by_type: {
      cambio_gobierno: govChange.length,
      crisis_diplomatica: crisisDiplo.length,
      sancion_nueva: sanction.length,
      acercamiento: exercise.length,
    },
    fetched_at: startedAt,
    _meta: {
      source: rssUsed
        ? 'Fallback RSS · EEAS + UN Press + US State Dept (GDELT rate-limited)'
        : 'GDELT DOC v2 themes + queries específicas · 7d',
      rss_fallback_used: rssUsed,
      cache_ttl_seconds: 900,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
