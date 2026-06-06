/**
 * /api/energia/lng-storage · Sprint Energía S8b ("exprimir GIE")
 *
 * Almacenamiento de GNL (GIE ALSI) de la UE agregada o de un país, con su serie
 * histórica diaria reciente: % de llenado (inventory.gwh / dtmi.gwh), energía
 * de GNL en tanque (GWh), capacidad máxima declarada (DTMI, GWh) y emisión a la
 * red (send-out, GWh/d). Ver `lib/energia/alsi.ts`.
 *
 * Query:
 *   - ?country=eu  → agregado Unión Europea (default)
 *   - ?country=es  → España (cualquier ISO-2 vale: fr, de, it, pt…)
 *   - ?days=N      → ventana de la serie (default 120, clamp 14-370)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: LngStorage, fetched_at, source_url }
 * o, ante key ausente / fallo:
 *   { ok:false, error, fetched_at, source_url }
 *
 * Cache: s-maxage=21600 (6h · el dato es diario · gas-day).
 *
 * Auth: requiere GIE_API_KEY (gratis · la MISMA que AGSI · registro en
 * https://alsi.gie.eu/account) en Vercel env vars. Sin ella degrada con error.
 */
import { NextResponse } from 'next/server'
import { fetchLngStorage } from '@/lib/energia/alsi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || 'eu').toLowerCase()

  const daysRaw = parseInt(searchParams.get('days') || '120', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(14, Math.min(370, daysRaw)) : 120

  try {
    const res = await fetchLngStorage({ country, days })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'gie_alsi',
          source_label: 'GIE ALSI · Aggregated LNG Storage Inventory',
          env_hint: 'GIE_API_KEY',
          register_url: 'https://alsi.gie.eu/account',
          cache_ttl_seconds: 21600,
          note: 'Almacenamiento de GNL EU/país · % lleno, energía en tanque (GWh), send-out (GWh/d). Key GIE gratuita pero obligatoria (la misma que AGSI).',
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
        source_url: 'https://alsi.gie.eu',
      },
      { status: 200 },
    )
  }
}
