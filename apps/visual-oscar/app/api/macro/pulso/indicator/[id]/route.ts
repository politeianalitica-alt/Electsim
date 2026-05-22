/**
 * GET /api/macro/pulso/indicator/{id}
 *
 * Devuelve la serie completa + metadata + peers UE de un indicador
 * Pulso macro. Usado por `/macro/pulso/indicator/[id]/page.tsx`.
 *
 * Si el indicador tiene `imfIndicator`, intenta cargar comparativa
 * peers UE (DEU/FRA/ITA/PRT/NLD) en paralelo.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPulsoIndicator } from "@/lib/macro/pulso-indicators";
import { fetchPulsoIndicator } from "@/lib/macro/pulso-fetcher";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 1800;

const PEERS = ["DEU", "FRA", "ITA", "PRT", "NLD"] as const;

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const ind = getPulsoIndicator(params.id);
  if (!ind) {
    return NextResponse.json(
      { ok: false, error: "indicator_not_found", id: params.id },
      { status: 404 }
    );
  }

  const baseUrl = originFromReq(req);

  // Tasks paralelas: serie principal + peers si aplica
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
