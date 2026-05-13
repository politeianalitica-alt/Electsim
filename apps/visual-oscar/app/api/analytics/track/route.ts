import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/analytics/analytics-client";
import { currentUser } from "@/lib/auth/auth-server";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/analytics/track — recibe eventos del cliente, los enriquece con
 * el usuario actual (Clerk o DEV) y los reenvía a PostHog. Si PostHog no está
 * configurado, devuelve 204 silenciosamente.
 */
export async function POST(req: NextRequest) {
  let body: { event?: string; properties?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.event || typeof body.event !== "string") {
    return NextResponse.json({ error: "missing_event" }, { status: 400 });
  }
  const user = await currentUser();
  await track({
    event: body.event,
    distinctId: user?.id ?? "anon",
    properties: {
      ...(body.properties ?? {}),
      tenant_id: user?.tenantId,
      role:      user?.role,
    },
  });
  return new NextResponse(null, { status: 204 });
}
