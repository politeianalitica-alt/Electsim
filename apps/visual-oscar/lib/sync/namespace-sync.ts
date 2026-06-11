/**
 * namespace-sync — cliente del sync genérico /api/sync/[namespace] (Fase 2).
 *
 * Ciclo: pull → merge LWW (por item, con tombstones) → aplicar local → push.
 * Pensado para stores localStorage cuyos items cumplen Syncable
 * ({ id, updatedAt, deletedAt? }), hoy Cama y Preinformes.
 *
 * Anti-bucle: aplicar el merge dispara el evento de cambio del store (la UI
 * debe refrescar), pero el listener del auto-sync ignora los eventos
 * emitidos durante la propia aplicación (flag `applying` por namespace).
 *
 * Degradación: un 503 (Blob sin configurar) marca el namespace como 'off'
 * y no se reintenta en la sesión; un fallo de red emite 'error' y se
 * reintentará en el siguiente cambio.
 */

export const SYNC_STATUS_EVENT = 'politeia:sync:status'

export type SyncStatus = 'syncing' | 'ok' | 'error' | 'off'

export interface SyncStatusDetail {
  namespace: string
  status: SyncStatus
  at: number
  error?: string
}

export interface Syncable {
  id: string
  updatedAt: number
  deletedAt?: number
}

interface StoreAdapter<T extends Syncable> {
  /** Todos los items, incluidos tombstones. */
  loadRaw: () => T[]
  /** Persiste el array completo (puede emitir el evento de cambio del store). */
  saveRaw: (items: T[]) => void
  /** Nombre del CustomEvent que emite el store al cambiar. */
  changeEvent: string
}

/** Reloj lógico de un item: lo más reciente entre edición y borrado. */
function clock(x: Syncable): number {
  return Math.max(x.updatedAt ?? 0, x.deletedAt ?? 0)
}

/** Merge last-write-wins por id. Empate → gana lo local. */
export function mergeLWW<T extends Syncable>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const it of remote) {
    if (it && typeof it.id === 'string') byId.set(it.id, it)
  }
  for (const it of local) {
    const r = byId.get(it.id)
    if (!r || clock(it) >= clock(r)) byId.set(it.id, it)
  }
  return Array.from(byId.values()).sort((a, b) => clock(b) - clock(a))
}

function emit(namespace: string, status: SyncStatus, error?: string): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent<SyncStatusDetail>(SYNC_STATUS_EVENT, {
        detail: { namespace, status, at: Date.now(), error },
      }),
    )
  } catch { /* nunca romper al caller */ }
}

// Estado por namespace (módulo-singleton: varios montajes comparten ciclo)
const offNamespaces = new Set<string>()
const applying = new Set<string>()
const inFlight = new Set<string>()

/** Un ciclo completo pull → merge → aplicar → push. */
export async function syncNamespace<T extends Syncable>(
  namespace: string,
  adapter: StoreAdapter<T>,
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'ssr' }
  if (offNamespaces.has(namespace)) return { ok: false, error: 'off' }
  if (inFlight.has(namespace)) return { ok: true }   // ya hay un ciclo en curso
  inFlight.add(namespace)
  emit(namespace, 'syncing')
  try {
    // 1 · pull
    const res = await fetch(`/api/sync/${namespace}`, { cache: 'no-store' })
    if (res.status === 503) {
      offNamespaces.add(namespace)
      emit(namespace, 'off')
      return { ok: false, error: 'blob sin configurar' }
    }
    if (!res.ok) throw new Error(`GET sync ${res.status}`)
    const data = (await res.json()) as { ok: boolean; items: T[] | null }
    const remote = Array.isArray(data.items) ? data.items : []

    // 2 · merge + aplicar local (con guard para el listener del auto-sync)
    const merged = mergeLWW(adapter.loadRaw(), remote)
    applying.add(namespace)
    try {
      adapter.saveRaw(merged)
    } finally {
      // El dispatch del store es síncrono: al salir ya podemos soltar el guard
      applying.delete(namespace)
    }

    // 3 · push del estado mergeado
    const post = await fetch(`/api/sync/${namespace}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: merged }),
    })
    if (!post.ok) throw new Error(`POST sync ${post.status}`)

    emit(namespace, 'ok')
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emit(namespace, 'error', msg)
    return { ok: false, error: msg }
  } finally {
    inFlight.delete(namespace)
  }
}

const DEBOUNCE_MS = 4_000
const refcount = new Map<string, number>()
const cleanups = new Map<string, () => void>()

/**
 * Activa el auto-sync de un namespace: ciclo inicial al montar + ciclo
 * debounced tras cada cambio del store. Devuelve cleanup; con varios
 * montajes simultáneos (Cama vive en 5 espacios) solo corre un ciclo.
 */
export function startNamespaceAutoSync<T extends Syncable>(
  namespace: string,
  adapter: StoreAdapter<T>,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const count = (refcount.get(namespace) ?? 0) + 1
  refcount.set(namespace, count)
  if (count > 1) {
    return () => decrement(namespace)
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  const onChange = () => {
    if (applying.has(namespace) || offNamespaces.has(namespace)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void syncNamespace(namespace, adapter) }, DEBOUNCE_MS)
  }
  window.addEventListener(adapter.changeEvent, onChange)

  // Ciclo inicial diferido: no compite con el primer render del módulo
  const initial = setTimeout(() => { void syncNamespace(namespace, adapter) }, 1_500)

  cleanups.set(namespace, () => {
    window.removeEventListener(adapter.changeEvent, onChange)
    if (timer) clearTimeout(timer)
    clearTimeout(initial)
  })
  return () => decrement(namespace)
}

function decrement(namespace: string): void {
  const count = (refcount.get(namespace) ?? 1) - 1
  refcount.set(namespace, count)
  if (count <= 0) {
    cleanups.get(namespace)?.()
    cleanups.delete(namespace)
    refcount.delete(namespace)
  }
}
