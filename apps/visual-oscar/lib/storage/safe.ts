/**
 * safeSetItem — escritura a localStorage que NUNCA falla en silencio.
 *
 * Fase 2 · antes, todos los stores hacían `localStorage.setItem` dentro de
 * un catch vacío: con la cuota llena (~5 MB compartidos entre Cuaderno,
 * Cama, Preinformes, docs, slides…) el analista seguía escribiendo creyendo
 * que guardaba y lo perdía todo al recargar.
 *
 * Ahora el fallo emite el CustomEvent STORAGE_ERROR_EVENT; el AppHeader lo
 * escucha y muestra un banner persistente con el aviso de exportar copia.
 */

export const STORAGE_ERROR_EVENT = 'politeia:storage:error'

export interface StorageErrorDetail {
  key: string
  /** true si parece QuotaExceededError; false = otro fallo (modo privado…). */
  quota: boolean
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** Escribe en localStorage. Devuelve false (y notifica) si no se pudo guardar. */
export function safeSetItem(key: string, value: string): boolean {
  if (!isBrowser()) return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    console.warn(`[storage] NO se pudo guardar "${key}"${quota ? ' (cuota llena)' : ''}`, err)
    try {
      window.dispatchEvent(
        new CustomEvent<StorageErrorDetail>(STORAGE_ERROR_EVENT, { detail: { key, quota } }),
      )
    } catch { /* dispatch nunca debe romper al caller */ }
    return false
  }
}

/** Uso actual de localStorage en bytes (aprox · UTF-16 ≈ 2 bytes/char). */
export function storageUsage(): { keys: number; bytes: number } {
  if (!isBrowser()) return { keys: 0, bytes: 0 }
  let keys = 0
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    keys++
    bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2
  }
  return { keys, bytes }
}
