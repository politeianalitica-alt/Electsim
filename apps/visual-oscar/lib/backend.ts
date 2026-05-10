// Server-side helper para hablar con el backend FastAPI.
// Si la env `BACKEND_URL` no está configurada o la llamada falla / timeout,
// devuelve `null` y el route handler que llama cae a su mock embebido.
//
// Configuración en Vercel:
//   BACKEND_URL = https://tu-fastapi.com  (sin slash final)
//   BACKEND_TIMEOUT_MS = 8000             (opcional, default 8s)

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || process.env.POLITEIA_API_URL || ''
const TIMEOUT_MS = Number(process.env.BACKEND_TIMEOUT_MS || 8000)

export const backendConfigured = (): boolean => Boolean(BACKEND)

export async function fromBackend<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T | null> {
  if (!BACKEND) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
      // No cachear: queremos datos en tiempo real.
      cache: 'no-store',
    })
    if (!res.ok) return null
    if (res.status === 204) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Helper para componer la respuesta del proxy con metadata estándar.
export function withMeta<T>(data: T, source: 'backend' | 'mock'): T & { _meta: { source: string; ts: string } } {
  return {
    ...(data as object),
    _meta: { source, ts: new Date().toISOString() },
  } as T & { _meta: { source: string; ts: string } }
}
