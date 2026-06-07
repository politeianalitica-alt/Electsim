/**
 * /api/energia/energy-logistics · Sprint Energía v3 · E2-cross
 *
 * Panel "Logística energética": cruza Puertos con Energía.
 *   - chokepoints[] · corredores marítimos relevantes a energía (Ormuz, Suez,
 *     Bab-el-Mandeb, Bósforo) con risk_score/level + disrupciones típicas.
 *   - freight · Baltic Dry Index (último + variación + tendencia) + subíndices
 *     tanker.
 *   - tankers · conteo de petroleros y metaneros del catálogo de Puertos.
 *
 * Importa `lib/ports-handlers.ts` DIRECTAMENTE server-side (no depende de
 * BACKEND_URL). El risk_score de chokepoints es seed+heurístico y el BDI es
 * determinista (sin ACLED/yfinance reales); el campo `source` lo declara.
 *
 * Query:
 *   - ?days=N · ventana para chokepoints (default 30, clamp 7-90)
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data:{ chokepoints[], freight, tankers }, fetched_at, source, _meta }
 */
import { NextResponse } from 'next/server'
import { fetchEnergyLogistics } from '@/lib/energia/energy-logistics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '30', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(7, Math.min(90, daysRaw)) : 30

  try {
    const res = await fetchEnergyLogistics({ days })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'ports_handlers',
          source_label: 'Puertos (standalone) · chokepoints + Baltic Dry + vessels',
          cache_ttl_seconds: 3600,
          note:
            'Cruce Puertos↔Energía. risk_score chokepoints = seed curado + boost determinista ' +
            '(ACLED real requiere backend). BDI = hash determinista sin yfinance. Conteo de buques ' +
            'del catálogo (no AIS en vivo).',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source: 'ports_handlers',
      },
      { status: 200 },
    )
  }
}
