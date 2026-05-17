/**
 * media-prefs.ts — Preferencias del usuario sobre la importancia de cada medio.
 *
 * Permite al analista subir o bajar el peso de cada medio (0.25x..3x). Esto
 * afecta a:
 *   - El tamaño de la burbuja en el cuadrante
 *   - El orden de los medios en listas
 *   - La ponderación de menciones en análisis (opcional)
 *
 * Persistido en localStorage del navegador.
 */

const KEY = 'politeia.media-prefs.v1'

export type WeightLevel = -2 | -1 | 0 | 1 | 2

export interface MediaPrefs {
  weights: Record<string, WeightLevel>   // medioId → nivel de peso
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function loadPrefs(): MediaPrefs {
  if (!isBrowser()) return { weights: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { weights: {} }
    const p = JSON.parse(raw) as MediaPrefs
    return { weights: p.weights ?? {} }
  } catch {
    return { weights: {} }
  }
}

export function savePrefs(p: MediaPrefs): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
    window.dispatchEvent(new CustomEvent('media-prefs:change'))
  } catch {/* full */}
}

export function setWeight(medioId: string, level: WeightLevel): void {
  const p = loadPrefs()
  if (level === 0) delete p.weights[medioId]
  else p.weights[medioId] = level
  savePrefs(p)
}

export function getWeight(medioId: string): WeightLevel {
  const p = loadPrefs()
  return p.weights[medioId] ?? 0
}

/** Multiplicador: -2 → 0.25x, -1 → 0.5x, 0 → 1x, 1 → 1.5x, 2 → 2x */
export function weightMultiplier(level: WeightLevel): number {
  switch (level) {
    case -2: return 0.25
    case -1: return 0.55
    case  0: return 1.0
    case  1: return 1.5
    case  2: return 2.5
    default: return 1.0
  }
}

export function levelLabel(level: WeightLevel): string {
  switch (level) {
    case -2: return 'ignorar'
    case -1: return 'menos peso'
    case  0: return 'neutral'
    case  1: return 'destacar'
    case  2: return 'priorizar'
    default: return 'neutral'
  }
}

export function levelColor(level: WeightLevel): string {
  switch (level) {
    case -2: return '#9ca3af'
    case -1: return '#a3a3a3'
    case  0: return '#6e6e73'
    case  1: return '#1F4E8C'
    case  2: return '#7C3AED'
    default: return '#6e6e73'
  }
}

export function clearAllPrefs(): void {
  savePrefs({ weights: {} })
}
