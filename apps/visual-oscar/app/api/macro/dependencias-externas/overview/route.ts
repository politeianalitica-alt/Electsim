/**
 * GET /api/macro/dependencias-externas/overview
 * Thin wrapper · subtab dependencias-externas registrado en Sprint N1.
 */
import { NextRequest } from "next/server";
import { buildSubtabOverview } from "@/lib/macro/subtab-overview-handler";

export const runtime = "nodejs";
export const maxDuration = 60;
export const revalidate = 1800;

export async function GET(req: NextRequest) {
  return buildSubtabOverview("dependencias-externas", req);
}
