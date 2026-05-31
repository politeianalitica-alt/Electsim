/**
 * /api/militar/senales-feed · Sprint GEO-MIL C4
 *
 * Feed de señales de reconfiguración estratégica detectadas algorítmicamente.
 * Tipos de señal según spec:
 *   ⇄ acercamiento_no_convencional · 2 países alianzas opuestas con cooperación CAMEO 03x/06x
 *   ⚡ friccion_intra_alianza · 2 aliados con caída Goldstein >3 en 14d
 *   $ spike_armamento · país +50% imports HS 93 (placeholder · necesita Comtrade)
 *   ▤ narrativa_ejercicio · spike "military exercise" + "joint drill" GDELT
 *   ▢ cambio_gobierno_aliado · GOV_LEADERSHIP_CHANGE en miembro alianza clave
 *
 * Implementación MVP: usa GDELT themes para 2 tipos primarios.
 * Cache: s-maxage=900 (15 min).
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { iso2ToIso3, isoToName } from '@/lib/geopolitica/country-coords'
import { getMilitarySeedSignals } from '@/lib/geopolitica/signals-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type SignalType = 'narrativa_ejercicio' | 'cambio_gobierno_aliado' | 'spike_armamento' | 'tension_diplomatica'

interface MilitarySignal {
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
  narrativa_ejercicio: { label: 'Ejercicio militar conjunto', emoji: '', color: '#0891b2' },
  cambio_gobierno_aliado: { label: 'Cambio de gobierno', emoji: '', color: '#7c3aed' },
  spike_armamento: { label: 'Spike armamento', emoji: '', color: '#f59e0b' },
  tension_diplomatica: { label: 'Tensión diplomática', emoji: '', color: '#dc2626' },
}

async function fetchSignalsForTheme(theme: string, type: SignalType): Promise<MilitarySignal[]> {
  const url = buildGdeltDocUrl({
    query: '*',
    theme,
    timespan: '7d',
    mode: 'artlist',
    maxrecords: 30,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<any>(url, { timeoutMs: 9000, maxRetries: 1 })
  if (!json?.articles) return []
  return json.articles.map((a: any): MilitarySignal => {
    const iso2 = (a.sourcecountry || '').toUpperCase()
    const iso3 = iso2 ? iso2ToIso3(iso2) : null
    const meta = TYPE_META[type]
    return {
      type,
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

// G18 item 12 · FALLBACK RSS de fuentes de defensa públicas cuando GDELT
// devuelve 0 artículos (rate-limit o sin cobertura).
async function fetchDefenseRssFallback(): Promise<MilitarySignal[]> {
  // Fuentes RSS estables y abiertas (sin auth):
  //   - Defense News (defensenews.com/rss)
  //   - Janes (janes.com)
  //   - ISW Briefings
  //   - NATO press releases
  // Nota: no podemos fetchear todas en paralelo en serverless sin coste/tiempo.
  // Usamos las 2 más estables y públicas.
  const RSS_FEEDS: Array<{ url: string; type: SignalType; source: string }> = [
    { url: 'https://www.nato.int/cps/en/natohq/news.rss', type: 'narrativa_ejercicio', source: 'NATO HQ' },
    { url: 'https://understandingwar.org/rss.xml', type: 'tension_diplomatica', source: 'Institute for the Study of War' },
  ]
  const all: MilitarySignal[] = []
  for (const feed of RSS_FEEDS) {
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
      // Parser RSS naïve por regex (item/title/link/pubDate)
      const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
      const meta = TYPE_META[feed.type]
      for (const itXml of items.slice(0, 8)) {
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
          confidence: 2, // RSS más confiable que GDELT generic
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

  // G18 item 12 · 4 queries GDELT paralelas (en lugar de 2)
  const [exercise, govChange, milDeploy, secTransfer] = await Promise.all([
    fetchSignalsForTheme('MIL_EXERCISE', 'narrativa_ejercicio').catch(() => []),
    fetchSignalsForTheme('GOV_LEADERSHIP_CHANGE', 'cambio_gobierno_aliado').catch(() => []),
    fetchSignalsForTheme('MIL_SELF_IDENTIFIED_ARMS_DEAL', 'spike_armamento').catch(() => []),
    fetchSignalsForTheme('SECURITY_SERVICES', 'tension_diplomatica').catch(() => []),
  ])

  const all = [...exercise, ...govChange, ...milDeploy, ...secTransfer]

  // G22 fix · CASCADA fallback robusta:
  //   - GDELT < 5 señales → añadir RSS
  //   - GDELT + RSS < 5 → añadir seed curado
  // Garantiza que el feed siempre tenga contenido para el usuario.
  let rssUsed = false
  let seedUsed = false
  if (all.length < 5) {
    const rssSignals = await fetchDefenseRssFallback().catch(() => [])
    all.push(...rssSignals)
    rssUsed = rssSignals.length > 0
  }
  if (all.length < 5) {
    const seedSignals = getMilitarySeedSignals().map((s) => {
      const meta = TYPE_META[s.type]
      return {
        type: s.type,
        type_label: meta.label,
        type_emoji: meta.emoji,
        type_color: meta.color,
        country_iso3: s.country_iso3,
        country_name: s.country_name,
        title: s.title,
        source_domain: s.source_domain,
        url: s.url,
        datetime: s.datetime,
        tone: s.tone,
        confidence: s.confidence,
      } as MilitarySignal
    })
    all.push(...seedSignals)
    seedUsed = true
  }

  const seen = new Set<string>()
  const deduped: MilitarySignal[] = []
  for (const s of all) {
    if (!s.url || seen.has(s.url)) continue
    seen.add(s.url)
    deduped.push(s)
  }
  deduped.sort((a, b) => b.datetime.localeCompare(a.datetime))

  return NextResponse.json({
    ok: true,
    signals: deduped.slice(0, 40),
    counts_by_type: {
      narrativa_ejercicio: deduped.filter((s) => s.type === 'narrativa_ejercicio').length,
      cambio_gobierno_aliado: deduped.filter((s) => s.type === 'cambio_gobierno_aliado').length,
      spike_armamento: deduped.filter((s) => s.type === 'spike_armamento').length,
      tension_diplomatica: deduped.filter((s) => s.type === 'tension_diplomatica').length,
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        'GDELT DOC v2 themes: MIL_EXERCISE + GOV_LEADERSHIP_CHANGE + MIL_SELF_IDENTIFIED_ARMS_DEAL + SECURITY_SERVICES · 7d',
        rssUsed ? 'RSS · NATO HQ · ISW Briefings' : null,
        seedUsed ? 'Seed curado · tracking propio NATO/Defense News/RUSI/IISS' : null,
      ].filter(Boolean) as string[],
      rss_fallback_used: rssUsed,
      seed_fallback_used: seedUsed,
      cache_ttl_seconds: 900,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
