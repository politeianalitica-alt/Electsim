/**
 * path-match — resolución de rutas por prefijo, ÚNICA para toda la app.
 *
 * Cierre de Fase 1: navigation.ts (módulo/item activo del header),
 * last-space.ts (espacio visitado) y cualquier matching futuro usan esta
 * misma semántica. Antes había tres mecanismos divergentes y una subruta
 * podía resolverse distinto en cada sitio.
 *
 * Semántica: coincidencia EXACTA primero; si no la hay, el prefijo MÁS
 * LARGO cuyo límite sea un separador de segmento ('/x' casa '/x/y' pero
 * no '/xy').
 */

/** ¿`path` está dentro de `prefix` (exacto o como subruta)? */
export function pathMatches(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

/**
 * Devuelve la clave de `keys` que mejor resuelve `path`:
 * exacta si existe; si no, el prefijo válido más largo; null si ninguno.
 */
export function bestPrefixKey(keys: Iterable<string>, path: string): string | null {
  let best: string | null = null
  for (const key of keys) {
    if (path === key) return key
    if (path.startsWith(key + '/') && (!best || key.length > best.length)) best = key
  }
  return best
}
