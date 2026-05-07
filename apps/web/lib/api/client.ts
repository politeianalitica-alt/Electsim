/**
 * API Client for Politeia FastAPI backend.
 * Uses fetch with credentials and unified error handling.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface ServiceMode {
  mode: "real" | "demo" | "fallback" | "error" | "unavailable";
  message?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {})
    },
    // Con next.config.mjs rewrites el frontend habla con same-origin /api/*,
    // así que NO necesitamos cross-origin credentials. Eliminado para evitar
    // CORS preflight failures en Vercel.
    cache: "no-store"
  });

  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError(`API ${res.status}: ${path}`, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(p: string)         => request<T>(p, { method: "GET" }),
  post:   <T>(p: string, b?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(b ?? {}) }),
  put:    <T>(p: string, b?: unknown) => request<T>(p, { method: "PUT", body: JSON.stringify(b ?? {}) }),
  patch:  <T>(p: string, b?: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(b ?? {}) }),
  delete: <T>(p: string)         => request<T>(p, { method: "DELETE" })
};

/**
 * Wraps a Promise so that on error returns a fallback value with mode="error".
 * Use for components that must always render something.
 */
export async function safeFetch<T>(promise: Promise<T>, fallback: T, label: string): Promise<{ data: T; mode: ServiceMode["mode"]; error?: string }> {
  try {
    const data = await promise;
    return { data, mode: "real" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (typeof console !== "undefined") console.warn(`[safeFetch:${label}]`, msg);
    return { data: fallback, mode: "fallback", error: msg };
  }
}
