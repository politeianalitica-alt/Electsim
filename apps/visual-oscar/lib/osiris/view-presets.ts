/**
 * Vistas/capas guardadas del mapa OSINT (presets del usuario, en localStorage).
 *
 * OsirisDashboard sincroniza la vista actual (lat/lon/zoom + layers) a la query
 * string de la URL. Aquí guardamos esa query con un nombre para poder
 * restaurarla luego. Todo por navegador; en SSR devolvemos lista vacía.
 */

export interface MapViewPreset {
  id: string
  name: string
  /** Query string SIN el '?' inicial (lat, lon, zoom, layers). */
  search: string
}

const KEY = 'politeia.osiris.viewPresets'
const MAX = 12

export function getPresets(): MapViewPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as MapViewPreset[]) : []
  } catch {
    return []
  }
}

function write(list: MapViewPreset[]): MapViewPreset[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list))
    } catch {
      /* storage lleno o bloqueado */
    }
  }
  return list
}

export function savePreset(name: string, search: string): MapViewPreset[] {
  const clean = name.trim().slice(0, 48)
  if (!clean) return getPresets()
  const id = `${Date.now().toString(36)}`
  // Si ya existe una vista con el mismo nombre, la sustituimos.
  const rest = getPresets().filter((p) => p.name.toLowerCase() !== clean.toLowerCase())
  return write([{ id, name: clean, search }, ...rest].slice(0, MAX))
}

export function deletePreset(id: string): MapViewPreset[] {
  return write(getPresets().filter((p) => p.id !== id))
}
