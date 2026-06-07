/**
 * /api/tercer-sector/iati/org-profile/[ref] · Perfil completo de una ONGD ES.
 * Sprint IATI-MAX. Ver `lib/tercer-sector/iati-enriched.ts`.
 *
 * Path param:
 *   ref → iati-identifier de la org (ej. ES-CIF-G58236803).
 *
 * Devuelve: total actividades, desembolsado EUR, top países, top sectores y
 * evolución anual EUR de los últimos N años (default 5).
 *
 * Auth: requiere IATI_API_KEY (Datastore). Sin ella → ok:false (no_key).
 * Cache: s-maxage=21600 (6h) + dedupe in-flight + rate-limiter centralizado
 * que respeta los Terms of Use IATI (no abuse).
 */
import { NextResponse } from 'next/server'
import { fetchIatiOrgProfile } from '@/lib/tercer-sector/iati-enriched'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  req: Request,
  ctx: { params: { ref: string } | Promise<{ ref: string }> },
) {
  // En Next 15 los params pueden ser una Promise; awaiteamos defensivamente.
  const p = await (ctx.params as Promise<{ ref: string }>)
  const ref = decodeURIComponent(p?.ref ?? '').trim()
  const { searchParams } = new URL(req.url)
  const yearsRaw = parseInt(searchParams.get('yearsBack') ?? '5', 10)
  const yearsBack = Number.isFinite(yearsRaw) ? Math.max(1, Math.min(20, yearsRaw)) : 5

  try {
    const res = await fetchIatiOrgProfile(ref, { yearsBack })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · org profile',
          env_hint: 'IATI_API_KEY',
          cache_ttl_seconds: 21600,
          note:
            'Perfil de una ONGD española reportante en IATI. Total actividades, desembolsos EUR, top países/sectores y serie anual. Requiere IATI_API_KEY Full Access.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://iatistandard.org/',
      },
      { status: 200 },
    )
  }
}
