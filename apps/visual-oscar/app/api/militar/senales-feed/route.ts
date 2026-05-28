/**
 * /api/militar/senales-feed · Sprint GEO-MIL C4
 *
 * Feed de señales de reconfiguración estratégica detectadas algorítmicamente.
 * Tipos de señal según spec:
 *   🔀 acercamiento_no_convencional · 2 países alianzas opuestas con cooperación CAMEO 03x/06x
 *   ⚡ friccion_intra_alianza · 2 aliados con caída Goldstein >3 en 14d
 *   💰 spike_armamento · país +50% imports HS 93 (placeholder · necesita Comtrade)
 *   📰 narrativa_ejercicio · spike "military exercise" + "joint drill" GDELT
 *   🗳️ cambio_gobierno_aliado · GOV_LEADERSHIP_CHANGE en miembro alianza clave
 *
 * Implementación MVP: usa GDELT themes para 2 tipos primarios.
 * Cache: s-maxage=900 (15 min).
 */
import { NextResponse } from 'next/server'
import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from '@/lib/gdelt/build-query'
import { iso2ToIso3, isoToName } from '@/lib/geopolitica/country-coords'

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
  narrativa_ejercicio: { label: 'Ejercicio militar conjunto', emoji: '🪖', color: '#0891b2' },
  cambio_gobierno_aliado: { label: 'Cambio de gobierno', emoji: '🗳', color: '#7c3aed' },
  spike_armamento: { label: 'Spike armamento', emoji: '💰', color: '#f59e0b' },
  tension_diplomatica: { label: 'Tensión diplomática', emoji: '⚡', color: '#dc2626' },
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

export async function GET() {
  const startedAt = new Date().toISOString()

  // 2 queries paralelas GDELT (themes militares relevantes)
  const [exercise, govChange] = await Promise.all([
    fetchSignalsForTheme('MIL_EXERCISE', 'narrativa_ejercicio').catch(() => []),
    fetchSignalsForTheme('GOV_LEADERSHIP_CHANGE', 'cambio_gobierno_aliado').catch(() => []),
  ])

  const all = [...exercise, ...govChange]
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
    },
    pending_signals: ['spike_armamento (Comtrade HS 93 mensual)', 'tension_diplomatica (GDELT events bilateral · pendiente)'],
    fetched_at: startedAt,
    _meta: {
      sources: ['GDELT DOC v2 themes: MIL_EXERCISE + GOV_LEADERSHIP_CHANGE · 7d'],
      cache_ttl_seconds: 900,
      note: 'MVP con 2 tipos · spike_armamento + tension_diplomatica vendrán cuando se integren Comtrade mensual + GDELT events bilateral',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
