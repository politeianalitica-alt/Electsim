/**
 * /api/energia/gas-inside-info · Sprint Energía S8b ("exprimir GIE")
 *
 * Eventos de mercado gasista (UMM · Urgent Market Messages) de la GIE Inside
 * Information Platform: indisponibilidades planificadas / no planificadas de
 * infraestructura gasista (plantas de tratamiento, almacenamiento subterráneo,
 * terminales de GNL, interconexiones). Son señales reguladas de suministro en
 * tiempo casi real. Ver `lib/energia/iip.ts`.
 *
 * Query:
 *   - ?country=ES  → filtra por país (ISO-2). Omitir → eventos globales (UE).
 *   - ?size=N      → nº de eventos (default 20, clamp 1-100)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: { events: GieInsideEvent[] }, fetched_at, source_url }
 * o, ante key ausente / fallo:
 *   { ok:false, error, fetched_at, source_url }
 *
 * Cache: s-maxage=3600 (1h · los eventos cambian más que los stocks diarios).
 *
 * Auth: requiere GIE_API_KEY (gratis · la MISMA que AGSI/ALSI · registro en
 * https://iip.gie.eu/account) en Vercel env vars. Sin ella degrada con error.
 */
import { NextResponse } from 'next/server'
import { fetchGieInsideInfo } from '@/lib/energia/iip'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const countryRaw = searchParams.get('country') || ''
  const country = countryRaw.trim() ? countryRaw.toLowerCase() : undefined

  const sizeRaw = parseInt(searchParams.get('size') || '20', 10)
  const size = Number.isFinite(sizeRaw) ? Math.max(1, Math.min(100, sizeRaw)) : 20

  try {
    const res = await fetchGieInsideInfo({ country, size })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'gie_iip',
          source_label: 'GIE IIP · Inside Information Platform (UMM)',
          env_hint: 'GIE_API_KEY',
          register_url: 'https://iip.gie.eu/account',
          cache_ttl_seconds: 3600,
          note: 'Eventos de mercado gasista (indisponibilidades de infraestructura) · UMM regulados. Key GIE gratuita pero obligatoria (la misma que AGSI/ALSI).',
        },
      },
      {
        // Cacheamos también las degradaciones (s-maxage corto vía SWR).
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://iip.gie.eu',
      },
      { status: 200 },
    )
  }
}
