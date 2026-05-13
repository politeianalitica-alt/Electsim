"use client";

import { useCallback } from "react";

/**
 * Hook React para emitir eventos de analytics desde el browser.
 * Llama al endpoint `/api/analytics/track` que envía a PostHog en server-side.
 *
 * Por qué server-side: PostHog rate-limita el endpoint público; este patrón
 * permite añadir batching y enriquecimiento sin tocar el código del componente.
 */
export function useTrack() {
  return useCallback((event: string, properties?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties }),
      keepalive: true,
    }).catch(() => { /* swallow */ });
  }, []);
}
