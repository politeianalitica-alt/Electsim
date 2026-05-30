/**
 * Sprint Cuaderno N8 · cloud sync helpers (client-side).
 *
 * Estrategia:
 *   - client_id estable por dispositivo en localStorage (UUID v4)
 *   - push (POST): sube el snapshot completo de notas al backend
 *   - pull (GET):  baja el último snapshot
 *   - sync (atom): pull → merge LWW por updatedAt → push merged
 *
 * Vincular dispositivos:
 *   El usuario puede copiar su client_id desde el panel de sync y pegarlo
 *   en otro dispositivo para "compartir" identidad y sincronizar las mismas
 *   notas. NO es seguridad criptográfica, es un identificador de conveniencia.
 *
 * Auth real (JWT, OAuth, etc.) queda fuera de scope · cuando el backend
 * Python esté integrado podemos derivar el client_id del JWT y eliminar
 * el localStorage.
 */

import { loadAll, saveAll, type CuadernoNote } from './store'

const CLIENT_ID_KEY = 'cuaderno_client_id'
const LAST_SYNC_KEY = 'cuaderno_last_sync'
const AUTO_SYNC_KEY = 'cuaderno_auto_sync'
const ENDPOINT = '/api/cuaderno/sync'

/** Genera un UUID v4 robusto sin deps · usa crypto.randomUUID si disponible. */
function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback simple (no criptográficamente fuerte, pero suficiente)
  let s = ''
  for (let i = 0; i < 32; i++) {
    const r = Math.floor(Math.random() * 16).toString(16)
    s += i === 8 || i === 12 || i === 16 || i === 20 ? '-' + r : r
  }
  return s
}

/** Devuelve el client_id estable del dispositivo · lo crea la primera vez. */
export function getClientId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = randomUuid()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

/** Permite al usuario "vincular dispositivo" pegando el client_id de otro. */
export function setClientId(id: string): boolean {
  if (typeof window === 'undefined') return false
  if (!/^[a-z0-9-]{16,64}$/i.test(id)) return false
  localStorage.setItem(CLIENT_ID_KEY, id)
  return true
}

/** Timestamp ISO del último push/pull exitoso · null si nunca se sincronizó. */
export function getLastSyncAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_SYNC_KEY)
}

function setLastSyncAt(when: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_SYNC_KEY, when)
}

export interface SyncResult {
  ok: boolean
  error?: string
  pushed?: number
  pulled?: number
  merged?: number
  uploaded_at?: string
}

/** Sube el estado local actual al cloud. NO mergea · sobreescribe el remoto. */
export async function push(): Promise<SyncResult> {
  const clientId = getClientId()
  const notes = loadAll()
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cuaderno-client-id': clientId,
      },
      body: JSON.stringify({ notes }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return { ok: false, error: data.error ?? `HTTP ${resp.status}` }
    }
    setLastSyncAt(data.uploaded_at ?? new Date().toISOString())
    return { ok: true, pushed: notes.length, uploaded_at: data.uploaded_at }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/** Descarga el último snapshot del cloud · NO mergea · sobreescribe local. */
export async function pull(): Promise<SyncResult & { snapshot?: { notes: CuadernoNote[] } | null }> {
  const clientId = getClientId()
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { 'x-cuaderno-client-id': clientId },
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return { ok: false, error: data.error ?? `HTTP ${resp.status}` }
    }
    const snap = data.snapshot as { notes?: CuadernoNote[] } | null
    if (snap && Array.isArray(snap.notes)) {
      saveAll(snap.notes)
      setLastSyncAt(data.uploaded_at ?? new Date().toISOString())
      window.dispatchEvent(new Event('cuaderno:change'))
      return {
        ok: true,
        pulled: snap.notes.length,
        uploaded_at: data.uploaded_at,
        snapshot: { notes: snap.notes },
      }
    }
    return { ok: true, pulled: 0, snapshot: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Sincronización inteligente: pull → merge LWW por updatedAt → push merged.
 *
 * Merge strategy:
 *   - Si una nota existe en local y remoto, gana la de updatedAt más reciente
 *   - Si existe sólo en uno, se conserva (no se borra)
 *   - Notas borradas no se reconcilian (TODO: tombstones futuros)
 */
export async function sync(): Promise<SyncResult> {
  const clientId = getClientId()
  // Pull remoto
  let remoteNotes: CuadernoNote[] = []
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { 'x-cuaderno-client-id': clientId },
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return { ok: false, error: data.error ?? `HTTP ${resp.status}` }
    const snap = data.snapshot as { notes?: CuadernoNote[] } | null
    remoteNotes = snap?.notes ?? []
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // Merge LWW por updatedAt
  const localNotes = loadAll()
  const merged = mergeLastWriteWins(localNotes, remoteNotes)

  // Save local
  saveAll(merged)
  window.dispatchEvent(new Event('cuaderno:change'))

  // Push merged
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cuaderno-client-id': clientId,
      },
      body: JSON.stringify({ notes: merged }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return { ok: false, error: data.error ?? `HTTP ${resp.status}` }
    setLastSyncAt(data.uploaded_at ?? new Date().toISOString())
    return {
      ok: true,
      pulled: remoteNotes.length,
      pushed: merged.length,
      merged: merged.length,
      uploaded_at: data.uploaded_at,
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ── Auto-sync (N8 polish) ─────────────────────────────────────────────────

/** ¿Auto-sync activado? · controla por toggle desde SyncPanel. */
export function isAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AUTO_SYNC_KEY) === '1'
}

export function setAutoSyncEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTO_SYNC_KEY, enabled ? '1' : '0')
}

/**
 * Activa auto-sync · escucha cuaderno:change y dispara sync() tras `delay`ms
 * de inactividad. Devuelve función teardown para detener listeners.
 *
 * Si auto-sync está OFF en localStorage, no engancha nada y devuelve noop.
 *
 * Usar desde CuadernoClient en useEffect mount.
 */
export function startAutoSync(opts: {
  delay?: number
  onStatus?: (status: 'idle' | 'syncing' | 'ok' | 'error', error?: string) => void
} = {}): () => void {
  if (typeof window === 'undefined') return () => undefined
  if (!isAutoSyncEnabled()) return () => undefined

  const delay = opts.delay ?? 30_000
  const onStatus = opts.onStatus ?? (() => undefined)
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false

  function trigger() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      if (inFlight) return
      inFlight = true
      onStatus('syncing')
      const r = await sync()
      inFlight = false
      onStatus(r.ok ? 'ok' : 'error', r.error)
    }, delay)
  }

  window.addEventListener('cuaderno:change', trigger)
  return () => {
    window.removeEventListener('cuaderno:change', trigger)
    if (timer) clearTimeout(timer)
  }
}

/** Merge: last-write-wins por updatedAt · preserva notas únicas en cada lado. */
function mergeLastWriteWins(local: CuadernoNote[], remote: CuadernoNote[]): CuadernoNote[] {
  const map = new Map<string, CuadernoNote>()
  for (const n of local) map.set(n.id, n)
  for (const r of remote) {
    const l = map.get(r.id)
    if (!l) {
      map.set(r.id, r)
      continue
    }
    // Comparamos updatedAt como ISO string (lexicográfico funciona)
    const lAt = String(l.updatedAt ?? '')
    const rAt = String(r.updatedAt ?? '')
    if (rAt > lAt) map.set(r.id, r)
  }
  return Array.from(map.values())
}
