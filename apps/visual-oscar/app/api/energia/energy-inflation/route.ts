/**
 * /api/energia/energy-inflation · Sprint Energía v3 · E2-cross
 *
 * Inflación energética (cruce Macro↔Energía):
 *   - ipc_energia · HICP componente energía (Eurostat prc_hicp_manr · NRG · RCH_A)
 *   - ipc_general · HICP general (CP00 · RCH_A)
 *   - ipi         · producción industrial (Eurostat sts_inpr_m · NACE B-D)
 *   - eur_usd     · tipo de cambio (Alpha Vantage FX_DAILY si hay key; si no ECB SDW)
 *   - nota        · passthrough EUR/USD → Brent (crudo denominado en USD)
 *
 * Reutiliza el parser `parseJsonStat` de macro-utils y `ecbFx` de
 * ports-handlers; fetcha Eurostat/ECB directamente server-side (público, sin
 * key) para no acoplarse a la URL interna absoluta de `fetchPulsoIndicator`.
 * Degrada POR-SERIE: si una falla, su bloque queda ok:false y el resto se sirve.
 *
 * Query:
 *   - ?days=N · ventana de la serie EUR/USD (default 90, clamp 30-365)
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data:{ ipc_energia, ipc_general, ipi, eur_usd, spread_energia_general_pp, nota },
 *     fetched_at, source, _meta }
 */
import { NextResponse } from 'next/server'
import { fetchEnergyInflation } from '@/lib/energia/energy-inflation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '90', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(30, Math.min(365, daysRaw)) : 90

  try {
    const res = await fetchEnergyInflation({ days })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'eurostat_ecb',
          source_label: 'Eurostat HICP/IPI + EUR/USD (Alpha/ECB)',
          env_hint: 'ALPHA_VANTAGE_KEY (opcional · EUR/USD diario; si falta usa ECB SDW)',
          cache_ttl_seconds: 21600,
          note:
            'IPC energía vs general (Eurostat HICP RCH_A), IPI (sts_inpr_m), EUR/USD. ' +
            'Degradación por-serie. EUR/USD modula el passthrough del Brent (USD) a la factura en euros.',
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
        source: 'eurostat_ecb',
      },
      { status: 200 },
    )
  }
}
