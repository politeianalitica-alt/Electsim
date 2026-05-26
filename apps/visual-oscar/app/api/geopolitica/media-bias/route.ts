/**
 * Sprint G14 FASE 2 · Media bias lookup endpoint
 *
 * Sirve metadata MBFC (bias, factual_reporting, press_freedom, country) para
 * uno o varios dominios. Server-only — el dataset (~590 KB JSON) NO viaja al
 * cliente.
 *
 * GET  /api/geopolitica/media-bias?domain=elpais.com
 * GET  /api/geopolitica/media-bias?domains=elpais.com,xinhuanet.com,rt.com
 *
 * Respuesta:
 *   { result: MediaBiasEntry | null, source: 'mbfc', methodology: '...' }
 *   o
 *   { results: Record<domain, MediaBiasEntry | null>, ... }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  canonicalizeDomain,
  lookupMediaBias,
  lookupMediaBiasBatch,
  MEDIA_BIAS_VERSION,
} from '@/lib/geopolitica/media-bias-registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const single = url.searchParams.get('domain')
  const batch = url.searchParams.get('domains')

  const meta = {
    source: 'mbfc',
    version: MEDIA_BIAS_VERSION,
    methodology:
      'MBFC (Media Bias/Fact Check) · heurística periodística agregada. Útil como pista, no como veredicto. No reemplaza verificación independiente.',
    not_meant_for: 'No usar como criterio único para descartar o validar una fuente.',
  }

  if (batch) {
    const domains = batch.split(',').map((d) => d.trim()).filter(Boolean)
    const results = lookupMediaBiasBatch(domains)
    const map: Record<string, ReturnType<typeof lookupMediaBias>> = {}
    domains.forEach((d, i) => { map[canonicalizeDomain(d) || d] = results[i] })
    return NextResponse.json({ results: map, ...meta }, { headers: { 'cache-control': 'public, max-age=3600' } })
  }

  if (single) {
    return NextResponse.json(
      { result: lookupMediaBias(single), ...meta },
      { headers: { 'cache-control': 'public, max-age=3600' } },
    )
  }

  return NextResponse.json(
    { error: 'Missing ?domain= or ?domains=', ...meta },
    { status: 400 },
  )
}
