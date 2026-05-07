import { getAccessToken, clearTokens, isDemoMode } from './auth'

// API base · usa variable de entorno; si está vacía, modo demo (sin backend).
const BASE = process.env.NEXT_PUBLIC_API_URL || ''

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Login: en modo demo devuelve tokens fake al instante (acepta cualquier credencial).
  // En producción llama al backend FastAPI real.
  async login(username: string, password: string) {
    if (isDemoMode()) {
      // Modo demo: tokens fake, sin red.
      return {
        access_token: 'demo.' + btoa(username || 'guest') + '.token',
        refresh_token: 'demo.refresh.' + Date.now(),
      }
    }
    return req<{ access_token: string; refresh_token: string }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify({ email: username, password }) }
    )
  },
}
