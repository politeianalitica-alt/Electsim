"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RadarBatch } from "@/types/radar";

const STORAGE_KEY = (workspaceId: string) => `politeia:radar:${workspaceId}`;

interface Params {
  workspaceId:   string;
  workspaceName: string;
  context:       string;
  /** Si true, dispara la generación al montar si no hay batch en localStorage. */
  autoLoad?:     boolean;
}

export function useWorkspaceRadar({ workspaceId, workspaceName, context, autoLoad = true }: Params) {
  const [batch, setBatch]       = useState<RadarBatch | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Hidratar desde localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY(workspaceId)) : null;
      if (raw) setBatch(JSON.parse(raw) as RadarBatch);
    } catch { /* ignore */ }
  }, [workspaceId]);

  const persist = useCallback((b: RadarBatch | null) => {
    if (typeof window === "undefined") return;
    if (b) window.localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify(b));
    else   window.localStorage.removeItem(STORAGE_KEY(workspaceId));
  }, [workspaceId]);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workspaceName, context }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return null;
      }
      const data: RadarBatch = await res.json();
      setBatch(data);
      persist(data);
      setLoading(false);
      return data;
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, [workspaceId, workspaceName, context, persist]);

  // Auto-load: si no hay batch persistido, generar al montar
  useEffect(() => {
    if (autoLoad && !batch && !isLoading) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const clear = useCallback(() => {
    setBatch(null);
    persist(null);
  }, [persist]);

  return { batch, isLoading, error, generate, clear };
}
