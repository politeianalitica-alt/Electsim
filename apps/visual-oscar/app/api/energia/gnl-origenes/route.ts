/**
 * /api/energia/gnl-origenes · Energía v3 · E2-data
 *
 * Estado del GNL español: nivel de llenado + send-out en VIVO (GIE ALSI · país
 * ES), terminales prorrateadas por capacidad nominal (catálogo Enagás) y
 * orígenes por país (catálogo CORES/Enagás · curado + datado, sin API JSON).
 * Ver `lib/energia/gnl-origenes.ts`.
 *
 * Query:
 *   - ?days=N  → ventana de la serie ALSI (default 30)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso degradado):
 *   { ok, data: GnlOrigenesData, fetched_at, source_url, _meta }
 *   Si falta GIE_API_KEY → ok:false con el dato vivo en null pero la estructura
 *   + orígenes del catálogo presentes.
 *
 * Cache: s-maxage=21600 (6h · el dato ALSI es diario · gas-day).
 * Auth: requiere GIE_API_KEY (gratis · https://alsi.gie.eu/account) para el dato vivo.
 */
import { NextResponse } from 'next/server'
import { fetchGnlOrigenes } from '@/lib/energia/gnl-origenes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '30', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(7, Math.min(120, daysRaw)) : 30

  try {
    const res = await fetchGnlOrigenes({ days })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'gie_alsi+catalog',
          source_label: 'GIE ALSI (nivel/send-out vivo) + Enagás/CORES (terminales + orígenes curados)',
          env_hint: 'GIE_API_KEY',
          register_url: 'https://alsi.gie.eu/account',
          cache_ttl_seconds: 21600,
          note: 'Estado GNL ES: llenado y send-out en vivo (ALSI); terminales prorrateadas y orígenes por país curados (CORES, sin API JSON). nota_origenes explica la procedencia.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://alsi.gie.eu',
      },
      { status: 200 },
    )
  }
}
