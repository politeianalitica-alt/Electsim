/**
 * archive.today · enlace a la versión ARCHIVADA de una noticia.
 *
 * Cada enlace de noticia en Medios ofrece dos opciones de lectura: el medio
 * original y la versión archivada, que esquiva muros de pago, paredes de
 * cookies y enlaces caídos. `/newest/` redirige al snapshot más reciente o
 * propone crearlo si no existe.
 *
 * Usamos el mirror `archive.ph` en lugar de `archive.is`: el TLD `.is` está
 * bloqueado por varios resolvedores DNS (p.ej. Cloudflare 1.1.1.1), por lo que
 * los enlaces no cargaban para parte de los usuarios. `archive.ph` resuelve
 * igual de bien en todas las redes y apunta al mismo servicio.
 */
export function archiveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  if (!u || u === '#' || !/^https?:\/\//i.test(u)) return null
  return 'https://archive.ph/newest/' + u
}
