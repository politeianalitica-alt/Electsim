/**
 * GET /api/macro/peer-comparison/{slug}
 *
 * Sprint N8 · para cada indicador Eurostat del catálogo, fetch del mismo
 * dataset cambiando `geo=ES` por DEU/FRA/ITA/PRT/EA20 (peers eurozona).
 *
 * Devuelve por indicador:
 *  {
 *    id, label, unit, ranking: [{ geo, value, period }],
 *    spainPosition, euAvg, spainVsAvgPct
 *  }
 *
 * Solo procesa indicadores con parser='eurostat-simple' (los que tienen
 * el dataset code accesible en su endpoint). El resto (IMF/INE/BIS) se
 * marca como `peerable: false`.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSubtab } from "@/lib/macro/subtab-registry";

export const runtime = "nodejs";
export const maxDuration = 90;
export const revalidate = 3600;

interface RouteCtx { params: { slug: string } }

const PEERS = ["DE", "FR", "IT", "PT", "EA20"] as const;
const PEER_LABELS: Record<string, string> = {
  ES: "España", DE: "Alemania", FR: "Francia", IT: "Italia", PT: "Portugal", EA20: "Eurozona",
};

interface PeerPoint { geo: string; value: number | null; period: string | null }

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Extrae datasetCode + filters de un endpoint del estilo
 * /api/eurostat/dataset?code=XXX&filters=geo=ES;na_item=...
 * y reemplaza geo por el código del peer pedido.
 */
function rewriteForPeer(endpoint: string, peerGeo: string): { code: string; filters: Record<string, string> } | null {
  try {
    const u = new URL(endpoint, "http://x.local");
    const code = u.searchParams.get("code");
    if (!code) return null;
    const filtersStr = u.searchParams.get("filters") || "";
    const filters: Record<string, string> = {};
    filtersStr.split(";").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k && v) filters[k] = v;
    });
    filters.geo = peerGeo;
    return { code, filters };
  } catch {
    return null;
  }
}

async function fetchPeer(origin: string, code: string, filters: Record<string, string>): Promise<PeerPoint | null> {
  const filterStr = Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(";");
  try {
    const r = await fetch(`${origin}/api/eurostat/dataset?code=${code}&filters=${encodeURIComponent(filterStr)}`, {
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.ok || !Array.isArray(j.points) || j.points.length === 0) return null;
    // Tomar el último punto (más reciente)
    const last = j.points.slice().sort((a: any, b: any) => String(a.time).localeCompare(String(b.time))).pop();
    return { geo: filters.geo, value: last?.value ?? null, period: String(last?.time ?? "") };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const config = getSubtab(params.slug);
  if (!config) {
    return NextResponse.json({ ok: false, error: "subtab_not_found", slug: params.slug }, { status: 404 });
  }
  const origin = originFromReq(req);

  const eurostatIndicators = config.indicators.filter(
    (ind) => ind.parser === "eurostat-simple" && ind.endpoint.includes("/api/eurostat/dataset")
  );

  const results = await Promise.all(
    eurostatIndicators.map(async (ind) => {
      const spainExtract = rewriteForPeer(ind.endpoint, "ES");
      if (!spainExtract) {
        return {
          id: ind.id,
          label: ind.shortLabel || ind.label,
          unit: ind.unit,
          family: ind.family,
          peerable: false,
          reason: "no_dataset_code",
        };
      }
      // Fetch España + 5 peers en paralelo
      const peerFetches = await Promise.all(
        ["ES", ...PEERS].map((geo) => {
          const rewritten = rewriteForPeer(ind.endpoint, geo);
          return rewritten ? fetchPeer(origin, rewritten.code, rewritten.filters) : Promise.resolve(null);
        })
      );
      const ranking = peerFetches
        .filter((p): p is PeerPoint => p != null && p.value != null)
        .sort((a, b) => (b.value as number) - (a.value as number));
      const spain = ranking.find((p) => p.geo === "ES");
      const peersOnly = ranking.filter((p) => p.geo !== "ES" && p.geo !== "EA20");
      const peerAvg = peersOnly.length
        ? peersOnly.reduce((acc, p) => acc + (p.value as number), 0) / peersOnly.length
        : null;
      const spainPosition = ranking.findIndex((p) => p.geo === "ES") + 1;
      const goodAbove = ind.threshold?.goodAbove ?? null;
      const spainVsAvgPct = spain && peerAvg != null && peerAvg !== 0
        ? ((spain.value as number) - peerAvg) / Math.abs(peerAvg) * 100
        : null;
      return {
        id: ind.id,
        label: ind.shortLabel || ind.label,
        unit: ind.unit,
        family: ind.family,
        peerable: true,
        datasetCode: spainExtract.code,
        ranking: ranking.map((r) => ({ geo: r.geo, geoLabel: PEER_LABELS[r.geo] || r.geo, value: r.value, period: r.period })),
        spainPosition,
        nCountries: ranking.length,
        peerAvg: peerAvg != null ? +peerAvg.toFixed(2) : null,
        spainVsAvgPct: spainVsAvgPct != null ? +spainVsAvgPct.toFixed(1) : null,
        goodAbove,
        threshold: ind.threshold ?? null,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    slug: params.slug,
    label: config.label,
    generated_at: new Date().toISOString(),
    n_total: config.indicators.length,
    n_eurostat: eurostatIndicators.length,
    n_peerable: results.filter((r) => r.peerable).length,
    peers: ["ES", ...PEERS],
    peer_labels: PEER_LABELS,
    indicators: results,
  });
}
