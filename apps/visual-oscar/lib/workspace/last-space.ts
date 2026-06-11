/**
 * Último espacio de trabajo visitado — persistencia ligera en localStorage.
 *
 * El botón azul "Workspace" del AppHeader lo usa para ofrecer "continuar
 * donde lo dejaste": guarda la ruta exacta (p. ej. /workspaces/x/cama o
 * /estudio/preinformes) y el nombre humano del espacio.
 */

export interface LastSpace {
  href:  string
  label: string
  ts:    number
}

const KEY = 'politeia.workspace.last-space.v1'

/** Prefijos que cuentan como "espacio de trabajo" (orden: más específico primero). */
const SPACES: Array<{ prefix: string; label: string }> = [
  { prefix: '/estudio/cama',        label: 'Cama' },
  { prefix: '/estudio/preinformes', label: 'Preinformes' },
  { prefix: '/estudio',             label: 'Estudio' },
  { prefix: '/war-room',            label: 'War Room' },
  { prefix: '/extras',              label: 'Toolbox' },
  { prefix: '/cuaderno',            label: 'Cuaderno' },
  { prefix: '/workspaces',          label: 'Command Center' },
]

export function spaceOfPath(path: string): { prefix: string; label: string } | null {
  return SPACES.find(s => path === s.prefix || path.startsWith(s.prefix + '/')) ?? null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** Registra la visita si `path` pertenece a un espacio de trabajo. */
export function recordLastSpace(path: string): void {
  if (!isBrowser()) return
  const space = spaceOfPath(path)
  if (!space) return
  try {
    const entry: LastSpace = { href: path, label: space.label, ts: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(entry))
  } catch {
    // localStorage lleno o modo privado: silencioso
  }
}

export function getLastSpace(): LastSpace | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastSpace
    return parsed && typeof parsed.href === 'string' && typeof parsed.label === 'string'
      ? parsed
      : null
  } catch {
    return null
  }
}
