/**
 * Cliente alto-nivel para hablar con el backend Python (`apps/api`) desde
 * las rutas server del frontend.
 *
 * Cada método sigue el patrón:
 *   1. Intentar la llamada real al backend con `callBackend`
 *   2. Si falla, devolver el fallback que provee el caller (típicamente
 *      el repositorio mock in-memory) marcado con `source: "mock"`
 *
 * Configuración Vercel:
 *   BACKEND_URL        = https://politeia-api.up.railway.app
 *   BACKEND_API_KEY    = sk-xxx (opcional)
 *   BACKEND_TIMEOUT_MS = 8000   (default)
 */

import { callBackend, backendConfigured } from "@/lib/backend";
import { getLogger } from "@/lib/observability/logger";
import type { WorkspaceOverview } from "@/types/workspace";

const log = getLogger("backend.workspace");

export interface BackendCallResult<T> {
  data: T;
  source: "backend" | "mock";
  latencyMs?: number;
  warnings?: string[];
}

export async function fetchWorkspaceOverview(
  workspaceId: string,
  fallback: () => WorkspaceOverview | Promise<WorkspaceOverview>,
): Promise<BackendCallResult<WorkspaceOverview>> {
  if (!backendConfigured()) {
    return { data: await fallback(), source: "mock" };
  }
  const res = await callBackend<WorkspaceOverview>(`/workspace/${workspaceId}/overview`);
  if (res.data) {
    return { data: res.data, source: "backend", latencyMs: res.latency_ms };
  }
  log.warn("workspace.overview backend failed", { workspaceId, error: res.error });
  return {
    data: await fallback(),
    source: "mock",
    warnings: res.error ? [res.error] : undefined,
  };
}

export interface IngestSummary {
  startedAt:   string;
  durationMs:  number;
  sources:     Array<{ name: string; ok: boolean; count?: number; error?: string }>;
}

export async function triggerIngest(): Promise<IngestSummary | null> {
  if (!backendConfigured()) return null;
  const res = await callBackend<IngestSummary>("/ingest/run", { method: "POST" });
  if (!res.data) {
    log.warn("ingest trigger failed", { error: res.error });
    return null;
  }
  return res.data;
}

export interface HealthStatus {
  backend:   "ok" | "degraded" | "down" | "unconfigured";
  database?: "ok" | "degraded" | "down" | "unconfigured";
  ollama?:   "ok" | "down" | "unconfigured";
  latencyMs: number;
  timestamp: string;
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  const now = Date.now();
  if (!backendConfigured()) {
    return {
      backend: "unconfigured",
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
  const res = await callBackend<{ ok: boolean; subsystems?: Record<string, string> }>("/health");
  const latency = Date.now() - now;
  if (!res.data) {
    return {
      backend: "down",
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    backend:  res.data.ok ? "ok" : "degraded",
    database: (res.data.subsystems?.database as HealthStatus["database"]) ?? undefined,
    ollama:   (res.data.subsystems?.ollama   as HealthStatus["ollama"])   ?? undefined,
    latencyMs: latency,
    timestamp: new Date().toISOString(),
  };
}
