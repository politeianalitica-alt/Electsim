/**
 * GET /api/macro/regions
 * Devuelve el catálogo completo de CCAA + 2 ciudades autónomas.
 */
import { NextResponse } from "next/server";
import { listCCAA } from "@/lib/macro/ccaa-catalog";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h - catálogo estático

export async function GET(): Promise<NextResponse> {
  const regions = listCCAA();
  return NextResponse.json(
    {
      ok: true,
      total: regions.length,
      regions,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
