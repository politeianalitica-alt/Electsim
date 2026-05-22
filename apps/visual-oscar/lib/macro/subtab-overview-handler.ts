/**
 * Handler compartido por los endpoints `/api/macro/{subtab}/overview` y
 * `/api/macro/{subtab}/indicator/[id]`.
 *
 * Toma un slug de subtab + baseUrl y devuelve la respuesta JSON ya
 * formateada. Permite que los routes thin sean ~5 líneas.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSubtab, FAMILY_META, findIndicatorGlobal } from "./subtab-registry";
import {
  fetchPulsoIndicator,
  computePulsoTermometro,
  type PulsoFetchResult,
} from "./pulso-fetcher";
import type { PulsoIndicatorMeta, PulsoFamily } from "./pulso-indicators";

export function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function buildSubtabOverview(
  subtabSlug: string,
  req: NextRequest
): Promise<NextResponse> {
  const config = getSubtab(subtabSlug);
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "subtab_not_registered", subtab: subtabSlug },
      { status: 404 }
    );
  }
  const baseUrl = originFromReq(req);

  const results = await Promise.all(
    config.indicators.map((ind) =>
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

  const byFamily: Record<
    string,
    {
      meta: typeof FAMILY_META[PulsoFamily];
      indicators: { id: string; meta: PulsoIndicatorMeta; data: PulsoFetchResult }[];
    }
  > = {};
  for (const ind of config.indicators) {
    if (!byFamily[ind.family]) {
      byFamily[ind.family] = {
        meta: FAMILY_META[ind.family],
        indicators: [],
      };
    }
    byFamily[ind.family].indicators.push({
      id: ind.id,
      meta: ind,
      data: byId[ind.id],
    });
  }

  const termometro = computePulsoTermometro(config.indicators, byId);

  const live = results.filter((r) => r.status === "live").length;
  const missing = results.filter((r) => r.status === "missing").length;

  return NextResponse.json(
    {
      ok: true,
      tabSlug: subtabSlug,
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

const PEERS = ["DEU", "FRA", "ITA", "PRT", "NLD"] as const;

export async function buildIndicatorDetail(
  id: string,
  req: NextRequest
): Promise<NextResponse> {
  const found = findIndicatorGlobal(id);
  if (!found) {
    return NextResponse.json(
      { ok: false, error: "indicator_not_found", id },
      { status: 404 }
    );
  }
  const ind = found.indicator;
  const baseUrl = originFromReq(req);

  const tasks: Promise<unknown>[] = [
    fetchPulsoIndicator(ind, { baseUrl }),
  ];

  let peersPromise: Promise<{ country: string; series: { period: string; value: number }[]; last: { period: string; value: number } | null }[]> | null = null;
  if (ind.imfIndicator) {
    peersPromise = Promise.all(
      PEERS.map(async (iso) => {
        try {
          const res = await fetch(
            `${baseUrl}/api/imf/country?iso=${iso}&indicator=${ind.imfIndicator}`,
            { cache: "force-cache", next: { revalidate: 3600 } }
          );
          const json = await res.json();
          const series = (json?.series || [])
            .filter((s: any) => s.value != null && Number.isFinite(s.value))
            .map((s: any) => ({ period: String(s.year), value: Number(s.value) }));
          const obs = series.filter((p: any) => p.period && Number(p.period) <= new Date().getFullYear());
          return {
            country: iso,
            series,
            last: obs[obs.length - 1] || null,
          };
        } catch {
          return { country: iso, series: [], last: null };
        }
      })
    );
    tasks.push(peersPromise);
  }

  const [main, peers] = (await Promise.all(tasks)) as [
    Awaited<ReturnType<typeof fetchPulsoIndicator>>,
    Array<{ country: string; series: { period: string; value: number }[]; last: { period: string; value: number } | null }> | undefined,
  ];

  return NextResponse.json(
    {
      ok: true,
      id: ind.id,
      subtabSlug: found.subtab.slug,
      meta: ind,
      data: main,
      peers: peers ?? null,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    }
  );
}
