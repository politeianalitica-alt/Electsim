import { NextRequest } from "next/server";
import { buildIndicatorDetail } from "@/lib/macro/subtab-overview-handler";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 1800;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return buildIndicatorDetail(params.id, req);
}
