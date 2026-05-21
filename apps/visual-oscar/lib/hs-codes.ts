/**
 * HS Code dictionary · 227 entradas (98 HS2 + 129 HS4) cubriendo los productos
 * más relevantes del comercio internacional.
 *
 * Generado desde `lib/hs-codes.json` para tree-shaking. La función
 * `searchHsCodes(q, limit)` ofrece typeahead con priorización
 * (código exacto → prefijo → substring nombre).
 */
import hsCodes from './hs-codes.json'

export interface HsCode {
  code: string
  level: 'HS2' | 'HS4' | 'HS6'
  name_es: string
}

export const HS_CODES: HsCode[] = hsCodes as HsCode[]

export const HS_BY_CODE: Record<string, HsCode> = Object.fromEntries(
  HS_CODES.map((h) => [h.code, h]),
)

export function searchHsCodes(query: string, limit = 15): HsCode[] {
  if (!query) return HS_CODES.slice(0, limit)
  const q = query.toLowerCase().trim()
  // Match por código numérico exacto o prefijo
  if (/^\d+$/.test(q)) {
    const exact = HS_CODES.filter((h) => h.code === q)
    const prefix = HS_CODES.filter((h) => h.code.startsWith(q) && h.code !== q)
    return [...exact, ...prefix].slice(0, limit)
  }
  // Match por nombre (prefijo primero, luego substring)
  const prefix = HS_CODES.filter((h) =>
    h.name_es.toLowerCase().startsWith(q),
  )
  const substring = HS_CODES.filter(
    (h) =>
      h.name_es.toLowerCase().includes(q) &&
      !h.name_es.toLowerCase().startsWith(q),
  )
  return [...prefix, ...substring].slice(0, limit)
}

export function lookupHsCode(code: string): HsCode | undefined {
  if (HS_BY_CODE[code]) return HS_BY_CODE[code]
  // Fallback: si el usuario tecla HS6, devuelve el HS4 padre
  if (code.length >= 4) return HS_BY_CODE[code.slice(0, 4)]
  if (code.length >= 2) return HS_BY_CODE[code.slice(0, 2)]
  return undefined
}
