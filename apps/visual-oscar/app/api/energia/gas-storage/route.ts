/**
 * /api/energia/gas-storage · Sprint Energía S8
 *
 * Almacenamiento de gas (GIE AGSI+) de la UE agregada o de un país, con su
 * serie histórica diaria reciente: % lleno, gas en almacenamiento (TWh),
 * inyección/extracción (GWh/d) y capacidad técnica (working gas volume).
 * Ver `lib/energia/agsi.ts`.
 *
 * Query:
 *   - ?country=eu  → agregado Unión Europea (default)
 *   - ?country=es  → España (cualquier ISO-2 vale: fr, de, it, pt…)
 *   - ?days=N      → ventana de la serie (default 120, clamp 14-370)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: GasStorage, fetched_at, source_url }
 * o, ante key ausente / fallo:
 *   { ok:false, error, fetched_at, source_url }
 *
 * Cache: s-maxage=21600 (6h · el dato es diario · gas-day).
 *
 * Auth: requiere GIE_API_KEY (gratis · registro en https://agsi.gie.eu/account)
 * en Vercel env vars. Sin ella el endpoint degrada con un error explícito.
 */
import { NextResponse } from 'next/server'
import { fetchGasStorage } from '@/lib/energia/agsi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || 'eu').toLowerCase()

  const daysRaw = parseInt(searchParams.get('days') || '120', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(14, Math.min(370, daysRaw)) : 120

  try {
    const res = await fetchGasStorage({ country, days })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'gie_agsi',
          source_label: 'GIE AGSI+ · Aggregated Gas Storage Inventory',
          env_hint: 'GIE_API_KEY',
          register_url: 'https://agsi.gie.eu/account',
          cache_ttl_seconds: 21600,
          note: 'Almacenamiento de gas EU/país · % lleno, TWh, inyección/extracción (GWh/d). Key GIE gratuita pero obligatoria.',
        },
      },
      {
        // Cacheamos también las degradaciones (s-maxage corto vía SWR) para no
        // martillear la API; el cuerpo lleva ok:false y el cliente muestra empty.
        headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://agsi.gie.eu',
      },
      { status: 200 },
    )
  }
}
