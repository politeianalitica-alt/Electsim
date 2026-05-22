/**
 * GET /api/macro/empresas-beneficios/sector/{id}
 *
 * Devuelve metadata del sector + snapshots de las empresas
 * representativas (topCompanies del catálogo).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSector } from "@/lib/macro/sector-catalog";
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

interface CompanySnapshot {
  id: string;
  shortName: string;
  ticker: string;
  price: number | null;
  changePct: number | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const sector = getSector(params.id);
  if (!sector) {
    return NextResponse.json({ ok: false, error: "sector_not_found", id: params.id }, { status: 404 });
  }

  const baseUrl = originFromReq(req);
  let companies: CompanySnapshot[] = [];

  try {
    const r = await fetch(`${baseUrl}/api/finnhub/dashboard`, { cache: "force-cache", next: { revalidate: 900 } });
    const j = await r.json();
    const pool = [
      ...(j?.spain_adrs || []),
      ...(j?.eu_big_caps || []),
      ...(j?.spanish_stocks || []),
    ];

    companies = sector.topCompanies
      .map((cid) => {
        const c = getCompany(cid);
        if (!c) return null;
        const q = pool.find((p: any) => p.symbol === c.finnhubSymbol || p.symbol === c.ticker);
        return {
          id: c.id,
          shortName: c.shortName,
          ticker: c.ticker,
          price: q?.price ?? q?.c ?? null,
          changePct: q?.change_pct ?? q?.change_percent ?? q?.dp ?? null,
        };
      })
      .filter(Boolean) as CompanySnapshot[];
  } catch (err) {
    void err;
  }

  return NextResponse.json(
    {
      ok: true,
      id: sector.id,
      sector,
      companies,
      generated_at: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    }
  );
}
