/**
 * archive.is · enlace a la versión ARCHIVADA de una noticia.
 *
 * Cada enlace de noticia en Medios ofrece dos opciones de lectura: el medio
 * original y la versión archivada (archive.is/newest/<url>), que esquiva muros
 * de pago, paredes de cookies y enlaces caídos. `/newest/` redirige al snapshot
 * más reciente o propone crearlo si no existe.
 */
export function archiveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  if (!u || u === '#' || !/^https?:\/\//i.test(u)) return null
  return 'https://archive.is/newest/' + u
}
