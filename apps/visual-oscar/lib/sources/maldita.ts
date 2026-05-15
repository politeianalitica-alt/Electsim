/**
 * Cliente Maldita.es / Newtral RSS para bulos REALES en circulación.
 *
 * Fuentes (gratuitas, sin auth, públicas):
 *   · https://maldita.es/feed   · feed maestro de Maldita.es
 *   · https://www.newtral.es/feed/ · feed de Newtral fact-checking
 *
 * Cada item del RSS contiene un titular y descripción que normalmente
 * empieza por "Cuidado con..." o "No es cierto..." identificando
 * un bulo o información engañosa que el medio ha verificado.
 */

const TIMEOUT_MS = 10000

export type FactCheckerSource = 'maldita' | 'newtral'

export interface BuloDetectado {
  id: string
  source: FactCheckerSource
  titulo: string
  descripcion: string
  link: string
  fecha: string                  // ISO datetime
  categoria?: string             // categoría inferida
  veredicto?: 'FALSO' | 'ENGAÑOSO' | 'PARCIAL' | 'EN ANÁLISIS'
}

const FEED_URLS: Record<FactCheckerSource, string> = {
  maldita: 'https://maldita.es/feed',
  newtral: 'https://www.newtral.es/feed/',
}

async function fetchFeed(url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 1800 },  // 30 min CDN
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

/** Parser RSS simple basado en regex (suficiente para feeds Maldita/Newtral). */
function parseRSS(xml: string, source: FactCheckerSource): BuloDetectado[] {
  const items: BuloDetectado[] = []
  // Extraer todos los <item>...</item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  let idx = 0
  while ((m = itemRegex.exec(xml)) !== null) {
    const it = m[1]
    const titulo = unesc(extract(it, 'title'))
    const descripcion = stripHtml(unesc(extract(it, 'description')))
    const link = extract(it, 'link').trim()
    const pubDate = extract(it, 'pubDate')
    const fecha = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
    if (!titulo || !link) continue
    const categoria = inferCategoria(titulo, descripcion)
    const veredicto = inferVeredicto(titulo, descripcion)
    items.push({
      id: `${source}-${idx++}`,
      source,
      titulo,
      descripcion: descripcion.slice(0, 400),
      link,
      fecha,
      categoria,
      veredicto,
    })
  }
  return items
}

function extract(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}
function unesc(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, ' ')
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/** Heurística: deduce categoría temática del bulo */
function inferCategoria(titulo: string, descripcion: string): string {
  const t = (titulo + ' ' + descripcion).toLowerCase()
  if (/migrant|inmigra|refugi|magreb|frontera/i.test(t)) return 'Migración'
  if (/vacuna|salud|sanidad|medicament|covid|farma/i.test(t)) return 'Sanidad'
  if (/elecc|voto|partido|sondeo|gobierno|presidente|ministr/i.test(t)) return 'Política'
  if (/econom|banco|euros|impuesto|tasa|fisc|nóm/i.test(t)) return 'Económica'
  if (/justicia|tribunal|jueces|sentencia|fiscal/i.test(t)) return 'Justicia'
  if (/clim|medioambient|emisiones|verde|reciclaje/i.test(t)) return 'Climática'
  if (/ucran|rusia|israel|gaza|china|eeuu|otan|union europea/i.test(t)) return 'Internacional'
  return 'Política'
}

/** Heurística: deduce veredicto del titular */
function inferVeredicto(titulo: string, descripcion: string): BuloDetectado['veredicto'] {
  const t = (titulo + ' ' + descripcion).toLowerCase()
  if (/falso|no es cierto|no es verdad|no fue|montaje|deepfake|fake|inventado/i.test(t)) return 'FALSO'
  if (/engaño|manipulad|sacad? de contexto|distorsión/i.test(t)) return 'ENGAÑOSO'
  if (/parcial|matiza|incompleto/i.test(t)) return 'PARCIAL'
  if (/cuidado|atención|alerta|cuestionado/i.test(t)) return 'FALSO'
  return 'EN ANÁLISIS'
}

// ─── API pública ────────────────────────────────────────────────────────

/** Descarga bulos de Maldita.es · devuelve hasta `limit` items */
export async function fetchMalditaBulos(limit = 20): Promise<BuloDetectado[]> {
  const xml = await fetchFeed(FEED_URLS.maldita)
  if (!xml) return []
  return parseRSS(xml, 'maldita').slice(0, limit)
}

/** Descarga bulos de Newtral · devuelve hasta `limit` items */
export async function fetchNewtralBulos(limit = 20): Promise<BuloDetectado[]> {
  const xml = await fetchFeed(FEED_URLS.newtral)
  if (!xml) return []
  return parseRSS(xml, 'newtral').slice(0, limit)
}

/** Combina los dos feeds y devuelve los más recientes */
export async function fetchAllBulosLive(limit = 30): Promise<BuloDetectado[]> {
  const [maldita, newtral] = await Promise.all([
    fetchMalditaBulos(20),
    fetchNewtralBulos(20),
  ])
  const combined = [...maldita, ...newtral]
  combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  return combined.slice(0, limit)
}
