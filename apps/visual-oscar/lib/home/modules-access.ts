/**
 * Favoritos y recientes de módulos (persistidos en localStorage).
 * Se usa en el inicio para el bloque "Acceso rápido" y en AppHeader para
 * registrar las visitas. Todo está guardado por navegador (cliente); en SSR
 * las funciones devuelven valores vacíos sin tocar storage.
 */

const FAV_KEY = 'politeia.modules.favorites'
const RECENT_KEY = 'politeia.modules.recents'
const RECENT_MAX = 6

export interface ModuleRef {
  href: string
  label: string
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage lleno o bloqueado — ignoramos */
  }
}

// ── Favoritos ───────────────────────────────────────────────────────────────

export function getFavoriteHrefs(): string[] {
  return read<string[]>(FAV_KEY, [])
}

export function isFavorite(href: string): boolean {
  return getFavoriteHrefs().includes(href)
}

/** Alterna un favorito y devuelve la lista resultante. */
export function toggleFavorite(href: string): string[] {
  const cur = getFavoriteHrefs()
  const next = cur.includes(href) ? cur.filter((h) => h !== href) : [...cur, href]
  write(FAV_KEY, next)
  return next
}

// ── Recientes ─────────────────────────────────────────────────────────────────

export function getRecentModules(limit = RECENT_MAX): ModuleRef[] {
  return read<ModuleRef[]>(RECENT_KEY, []).slice(0, limit)
}

/** Registra una visita: mueve el módulo al frente, sin duplicados. */
export function recordModuleVisit(href: string, label: string): void {
  if (!href || !label) return
  const cur = read<ModuleRef[]>(RECENT_KEY, []).filter((m) => m.href !== href)
  const next = [{ href, label }, ...cur].slice(0, RECENT_MAX)
  write(RECENT_KEY, next)
}
