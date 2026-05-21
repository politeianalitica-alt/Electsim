/** Linear interpolation between two hex colors. t ∈ [0, 1]. */
function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}

/**
 * dark-navy (#1e293b) → sky-blue (#38bdf8). For article counts / positive metrics.
 * Usage: const colorFn = positiveColorScale([0, maxArticles]); fill = colorFn(value)
 */
export function positiveColorScale(domain: [number, number]): (value: number) => string {
  const [min, max] = domain
  return (value: number) => {
    const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
    return lerpHex('#1e293b', '#38bdf8', t)
  }
}

/**
 * green (#22c55e) → amber (#f59e0b) → red (#ef4444). For risk / negativity (0 = safe, 1 = critical).
 * Usage: const colorFn = riskColorScale([0, 100]); fill = colorFn(riskValue)
 */
export function riskColorScale(domain: [number, number]): (value: number) => string {
  const [min, max] = domain
  return (value: number) => {
    const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
    return t < 0.5
      ? lerpHex('#22c55e', '#f59e0b', t * 2)
      : lerpHex('#f59e0b', '#ef4444', (t - 0.5) * 2)
  }
}

/** Fixed palette for the 9 narrative categories used across all Spain maps. */
export function categoricalColor(category: string): string {
  const PALETTE: Record<string, string> = {
    politica: '#4a90e2',
    economia: '#27ae60',
    justicia: '#e74c3c',
    vivienda: '#e67e22',
    sanidad: '#9b59b6',
    inmigracion: '#c0392b',
    energia: '#f39c12',
    educacion: '#2ecc71',
    generalista: '#6c7480',
  }
  return PALETTE[category] ?? '#6c7480'
}
