import { NextResponse } from "next/server";
import { checkBackendHealth } from "@/lib/backend/workspace-client";
import { isAiEnabled } from "@/lib/ai";
import { isDbConfigured } from "@/lib/db/client";
import { isAuthEnabled } from "@/lib/auth/auth-config";
import { isQueueConfigured } from "@/lib/queue/queue-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/workspace/status — desglose por subsistema. Útil para status pages
 * y para que el frontend muestre badges "live/demo".
 */
export async function GET() {
  const t0 = Date.now();
  const backendHealth = await checkBackendHealth();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - t0,
    subsystems: {
      backend:  backendHealth.backend,
      database: isDbConfigured() ? "configured" : "mock",
      auth:     isAuthEnabled()  ? "configured" : "dev_mode",
      ollama:   isAiEnabled()    ? "configured" : "mock",
      queue:    isQueueConfigured() ? "configured" : "memory",
    },
    backendLatencyMs: backendHealth.latencyMs,
    mode: backendHealth.backend === "ok" ? "live" : "demo",
  });
}
