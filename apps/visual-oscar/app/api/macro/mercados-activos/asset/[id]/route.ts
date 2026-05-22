/**
 * GET /api/macro/mercados-activos/asset/{id}
 *
 * Devuelve metadata + snapshot del activo financiero del catálogo
 * (lib/macro/asset-catalog.ts). El snapshot se obtiene de:
 *   - finnhub (índices bursátiles y equities) vía /api/finnhub/dashboard
 *   - commodities snapshot-all (petróleo, oro, cobre, BDI)
 *
 * No incluye serie histórica completa (requeriría candles Finnhub que
 * aún no están integrados). Para análisis Groq se envía snapshot +
 * metadata + relación macro al endpoint /api/macro/ai/analyze-detail.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAsset } from "@/lib/macro/asset-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 900; // 15min · mercados se mueven

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  return `${proto}://${host}`;
}

interface Snapshot {
  price: number | null;
  change: number | null;
  changePct: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: number | null;
  source: string;
}

function pickQuote(q: any): Snapshot {
  if (!q) return { price: null, change: null, changePct: null, open: null, high: null, low: null, volume: null, timestamp: null, source: "unknown" };
  return {
    price: q.price ?? q.c ?? q.last ?? null,
    change: q.change ?? q.d ?? null,
    changePct: q.change_pct ?? q.change_percent ?? q.dp ?? null,
    open: q.open ?? q.o ?? null,
    high: q.high ?? q.h ?? null,
    low: q.low ?? q.l ?? null,
    volume: q.volume ?? q.v ?? null,
    timestamp: q.t ?? null,
    source: q.source ?? "finnhub",
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const asset = getAsset(params.id);
  if (!asset) {
    return NextResponse.json({ ok: false, error: "asset_not_found", id: params.id }, { status: 404 });
  }
  const baseUrl = originFromReq(req);

  let snapshot: Snapshot = pickQuote(null);
  let raw: unknown = null;

  try {
    if (asset.primarySource === "finnhub" && asset.finnhubSymbol) {
      // Vamos al dashboard Finnhub agregado y buscamos el símbolo
      const r = await fetch(`${baseUrl}/api/finnhub/dashboard`, {
        cache: "force-cache",
        next: { revalidate: 900 },
      });
      const j = await r.json();
      const pool = [
        ...(j?.indices || []),
        ...(j?.spain_adrs || []),
        ...(j?.us_big_tech || []),
        ...(j?.eu_big_caps || []),
      ];
      const found = pool.find(
        (q: any) =>
          q.symbol === asset.finnhubSymbol ||
          q.symbol === asset.ticker ||
          q.symbol?.includes?.(asset.finnhubSymbol)
      );
      snapshot = pickQuote(found);
      raw = found;
    } else if (asset.primarySource === "commodities" && asset.commodityKey) {
      const r = await fetch(`${baseUrl}/api/commodities/snapshot-all`, {
        cache: "force-cache",
        next: { revalidate: 900 },
      });
      const j = await r.json();
      const found =
        j?.[asset.commodityKey] ||
        j?.commodities?.[asset.commodityKey] ||
        (j?.list || []).find((c: any) => c.id === asset.commodityKey || c.symbol === asset.ticker);
      snapshot = pickQuote(found);
      raw = found;
    }
  } catch (err) {
    snapshot = { ...snapshot, source: `error: ${(err as Error).message.slice(0, 80)}` };
  }

  return NextResponse.json(
    {
      ok: true,
      id: asset.id,
      asset,
      snapshot,
      raw,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    }
  );
}
