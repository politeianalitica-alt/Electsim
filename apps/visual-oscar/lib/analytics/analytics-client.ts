/**
 * Cliente de analytics — PostHog si está configurado, no-op si no.
 *
 * Server-side: emite eventos via fetch POST a la API pública de PostHog.
 * Client-side (browser): el wrapper React es opcional — el hook
 * `useTrack` simplemente llama a este client.
 *
 * Variables de entorno:
 *   NEXT_PUBLIC_POSTHOG_KEY  = phc_xxx (project API key, public)
 *   NEXT_PUBLIC_POSTHOG_HOST = https://eu.i.posthog.com  (opcional)
 */

import { getLogger } from "@/lib/observability/logger";

const log = getLogger("analytics");

const KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(/\/+$/, "");

export function isAnalyticsEnabled(): boolean {
  return Boolean(KEY);
}

export interface AnalyticsEvent {
  /** Identificador del evento — usa formato "workspace.action" o "radar.regenerate". */
  event: string;
  /** Distinct id (user id o anon id). */
  distinctId: string;
  /** Propiedades — workspace_id, tenant_id, etc. */
  properties?: Record<string, unknown>;
}

/**
 * Envía un evento. Si PostHog no está configurado, no hace nada.
 * No bloquea — fire-and-forget con timeout corto.
 */
export async function track(event: AnalyticsEvent): Promise<void> {
  if (!isAnalyticsEnabled()) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event:   event.event,
        distinct_id: event.distinctId,
        properties: {
          ...event.properties,
          $lib: "politeia-frontend",
        },
        timestamp: new Date().toISOString(),
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
  } catch (err) {
    log.debug("analytics fire-and-forget failed", { err: (err as Error).message });
  }
}
