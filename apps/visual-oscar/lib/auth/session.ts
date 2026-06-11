/**
 * JWT session — Edge-compatible (no Buffer, no Node.js crypto).
 * Usado por middleware (Edge) y route handlers (Node.js).
 */

export const COOKIE_NAME = 'politeia_session'
const SESSION_HOURS = 24 * 30   // 30 días (antes 8 h) · debe coincidir con maxAge de la cookie en /api/auth/login

export interface SessionPayload {
  email: string
  name:  string
  role:  string
  exp:   number
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const ENC = new TextEncoder()
const DEC = new TextDecoder()

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let str = ''
  for (const b of arr) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromB64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded + '==='.slice((padded.length % 4) || 4))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function objToB64url(obj: object): string {
  return b64url(ENC.encode(JSON.stringify(obj)))
}

function b64urlToObj<T>(s: string): T {
  return JSON.parse(DEC.decode(fromB64url(s))) as T
}

function getSecret(): string {
  return process.env.AUTH_SECRET ?? 'politeia-dev-secret-2026'
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
 'raw', ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify'],
  )
}

// ─── public API ──────────────────────────────────────────────────────────────

export async function signToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  }
  const header = objToB64url({ alg: 'HS256', typ: 'JWT' })
  const body   = objToB64url(full)
  const data   = `${header}.${body}`
  const key    = await importKey(getSecret())
  const sig    = await crypto.subtle.sign('HMAC', key, ENC.encode(data))
  return `${data}.${b64url(sig)}`
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  // Nunca lanza: una cookie malformada (base64 inválido → atob lanza, JSON
  // corrupto → parse lanza) debe tratarse como sesión inválida (null), no
  // tumbar el middleware con un 500.
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const key   = await importKey(getSecret())
    const valid = await crypto.subtle.verify(
 'HMAC', key,
      fromB64url(sig),
      ENC.encode(`${header}.${body}`),
    )
    if (!valid) return null
    const payload = b64urlToObj<SessionPayload>(body)
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
