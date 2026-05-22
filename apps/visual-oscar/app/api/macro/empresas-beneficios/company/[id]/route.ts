/**
 * GET /api/macro/empresas-beneficios/company/{id}
 *
 * Devuelve metadata + snapshot Finnhub de una empresa cotizada
 * española del catálogo company-catalog.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCompany } from "@/lib/macro/company-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 900;

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
  marketCap: number | null;
  source: string;
}

function normalize(q: any): Snapshot {
  if (!q) return { price: null, change: null, changePct: null, open: null, high: null, low: null, volume: null, marketCap: null, source: "unknown" };
  return {
    price: q.price ?? q.c ?? null,
    change: q.change ?? q.d ?? null,
    changePct: q.change_pct ?? q.change_percent ?? q.dp ?? null,
    open: q.open ?? q.o ?? null,
    high: q.high ?? q.h ?? null,
    low: q.low ?? q.l ?? null,
    volume: q.volume ?? q.v ?? null,
    marketCap: q.market_cap ?? q.marketCapitalization ?? null,
    source: q.source ?? "finnhub",
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const company = getCompany(params.id);
  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found", id: params.id }, { status: 404 });
  }

  const baseUrl = originFromReq(req);
  let snapshot = normalize(null);

  try {
    const r = await fetch(`${baseUrl}/api/finnhub/dashboard`, { cache: "force-cache", next: { revalidate: 900 } });
    const j = await r.json();
    const pool = [
      ...(j?.spain_adrs || []),
      ...(j?.us_big_tech || []),
      ...(j?.eu_big_caps || []),
      ...(j?.spanish_stocks || []),
    ];
    const found = pool.find(
      (q: any) => q.symbol === company.finnhubSymbol || q.symbol === company.ticker
    );
    snapshot = normalize(found);
  } catch (err) {
    snapshot = { ...snapshot, source: `error: ${(err as Error).message.slice(0, 80)}` };
  }

  return NextResponse.json(
    {
      ok: true,
      id: company.id,
      company,
      snapshot,
      generated_at: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    }
  );
}
