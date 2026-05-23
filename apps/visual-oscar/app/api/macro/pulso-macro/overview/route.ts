/**
 * GET /api/macro/pulso-macro/overview
 * Alias del endpoint /api/macro/pulso/overview (legacy).
 *
 * Sprint N5 fix: SubtabContent fetcha `/api/macro/${subtabSlug}/overview` y
 * subtabSlug='pulso-macro' no tenía endpoint propio (solo /pulso). Causaba
 * "Unexpected token '<', '<!DOCTYPE'..." al recibir el 404 HTML page.
 */
import { NextRequest } from "next/server";
import { buildSubtabOverview } from "@/lib/macro/subtab-overview-handler";

export const runtime = "nodejs";
export const maxDuration = 60;
export const revalidate = 1800;

export async function GET(req: NextRequest) {
  return buildSubtabOverview("pulso-macro", req);
}
