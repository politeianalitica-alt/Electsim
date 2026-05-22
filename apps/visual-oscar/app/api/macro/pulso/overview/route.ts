/**
 * GET /api/macro/pulso/overview
 *
 * Consolida los 18 indicadores del catálogo `PULSO_INDICATORS` en una
 * única respuesta para el landing `/macro/pulso`. Paraleliza fetches a
 * INE / IMF / Eurostat y devuelve:
 *
 *   - byId          → { id → { last, series, status } }
 *   - byFamily      → { family → indicator[] }
 *   - termometro    → { score 0-100, bySignal[] }
 *   - generated_at  → ISO
 *
 * Caché edge revalidate 30min (los datos macro raramente cambian intra-día).
 * Errores en fuentes individuales no rompen el endpoint; el indicador
 * afectado queda con status="missing".
 */
import { NextRequest, NextResponse } from "next/server";
import {
  PULSO_INDICATORS,
  PULSO_FAMILY_META,
  type PulsoFamily,
} from "@/lib/macro/pulso-indicators";
import {
  fetchPulsoIndicator,
  computePulsoTermometro,
  type PulsoFetchResult,
} from "@/lib/macro/pulso-fetcher";

export const runtime = "nodejs";
export const maxDuration = 60;
export const revalidate = 1800; // 30min

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const baseUrl = originFromReq(req);

  // Fetch en paralelo de los 18 indicadores.
  const results = await Promise.all(
    PULSO_INDICATORS.map((ind) =>
      fetchPulsoIndicator(ind, { baseUrl }).catch((err) => ({
        ok: false,
        id: ind.id,
        series: [],
        last: null,
        source: ind.source,
        sourceCode: ind.sourceCode,
        status: "missing" as const,
        error: (err as Error).message,
      }))
    )
  );

  const byId: Record<string, PulsoFetchResult> = {};
  for (const r of results) byId[r.id] = r;

  // Group by family
  const byFamily: Record<string, { meta: typeof PULSO_FAMILY_META[PulsoFamily]; indicators: { id: string; meta: typeof PULSO_INDICATORS[0]; data: PulsoFetchResult }[] }> = {};
  for (const ind of PULSO_INDICATORS) {
    if (!byFamily[ind.family]) {
      byFamily[ind.family] = {
        meta: PULSO_FAMILY_META[ind.family],
        indicators: [],
      };
    }
    byFamily[ind.family].indicators.push({
      id: ind.id,
      meta: ind,
      data: byId[ind.id],
    });
  }

  const termometro = computePulsoTermometro(PULSO_INDICATORS, byId);

  // Estadísticas de cobertura
  const live = results.filter((r) => r.status === "live").length;
  const missing = results.filter((r) => r.status === "missing").length;

  return NextResponse.json(
    {
      ok: true,
      tabSlug: "pulso-macro",
      generated_at: new Date().toISOString(),
      coverage: {
        total: results.length,
        live,
        stale: results.length - live - missing,
        missing,
      },
      termometro,
      byId,
      byFamily,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    }
  );
}
