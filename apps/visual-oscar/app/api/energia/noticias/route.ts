/**
 * GET /api/energia/noticias?subtopic=<opt>&sinceHours=<opt> · Sprint Energía
 *
 * Agregador KEYLESS de noticias de energía (España + UE) a partir del catálogo
 * curado de feeds RSS públicos. Envelope estándar Politeia:
 *   { ok, data, error, fetched_at, source_url }  (HTTP 200 siempre).
 *
 * Degradación: fetchEnergyNews NUNCA lanza; aísla cada feed con allSettled y
 * marca las fuentes caídas en data.fuentes_error. `ok` refleja si al menos un
 * feed devolvió items. Caché HTTP s-maxage 15 min (noticias).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  fetchEnergyNews,
  type EnergySubtopic,
  type FetchEnergyNewsOptions,
} from '@/lib/energia/news'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE = { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' }

const VALID_SUBTOPICS: ReadonlySet<EnergySubtopic> = new Set<EnergySubtopic>([
  'electrico',
  'renovables',
  'nuclear',
  'petroleo',
  'gas',
  'hidrogeno',
  'politica',
  'mercado',
  'general',
])

export async function GET(req: NextRequest) {
  const fetchedAt = new Date().toISOString()
  try {
    const opts: FetchEnergyNewsOptions = {}

    const rawSubtopic = req.nextUrl.searchParams.get('subtopic')
    if (rawSubtopic && VALID_SUBTOPICS.has(rawSubtopic as EnergySubtopic)) {
      opts.subtopic = rawSubtopic as EnergySubtopic
    }

    const rawSince = req.nextUrl.searchParams.get('sinceHours')
    if (rawSince !== null) {
      const n = Number(rawSince)
      if (Number.isFinite(n) && n > 0) {
        opts.sinceHours = clamp(n, 1, 720)
      }
    }

    const data = await fetchEnergyNews(opts)
    return NextResponse.json(
      { ok: data.ok, data, error: null, fetched_at: data.fetched_at, source_url: 'rss' },
      { headers: CACHE },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, data: null, error: message, fetched_at: fetchedAt, source_url: 'rss' },
      { headers: CACHE },
    )
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}
