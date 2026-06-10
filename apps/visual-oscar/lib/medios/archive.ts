/**
 * Versión ARCHIVADA de una noticia · Wayback Machine (web.archive.org).
 *
 * Cada enlace de noticia en Medios ofrece dos lecturas: el medio original y la
 * versión archivada, que esquiva enlaces caídos y, en muchos casos, muros de
 * pago/cookies.
 *
 * Usamos Wayback Machine en lugar de archive.today (archive.is/.ph): los mirrors
 * de archive.today resuelven mal en varios DNS, muestran retos de Cloudflare y
 * devuelven 429 con frecuencia → "no se podía ver". Wayback siempre carga.
 * `web.archive.org/web/<url>` (sin timestamp) redirige al snapshot más reciente.
 */
export function archiveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  if (!u || u === '#' || !/^https?:\/\//i.test(u)) return null
  return 'https://web.archive.org/web/' + u
}
