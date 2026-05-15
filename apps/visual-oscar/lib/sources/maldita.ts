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
 *
 * Optimizaciones:
 *   · memoCache (10 min TTL) · feeds RSS actualizan ~30 min en origen
 *   · single-flight        · requests concurrentes comparten el mismo fetch
 *   · Promise.allSettled   · una rama caída no tira el agregador
 *   · dedup por título normalizado · evita repetir bulo si Maldita y Newtral lo cubren
 *   · safeISO              · pubDate inválido no rompe el parser
 *   · regex CDATA dual     · captura limpia con o sin envoltorio CDATA
 */

import { safeText, memoCache, safeISO } from './_fetch'

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
  const r = await safeText(url, { timeoutMs: TIMEOUT_MS, revalidate: 1800 })
  if (!r.ok || !r.data) {
    if (r.error) console.warn('[maldita] fetchFeed', url, r.error)
    return null
  }
  return r.data
}

/** Parser RSS simple basado en regex (suficiente para feeds Maldita/Newtral). */
function parseRSS(xml: string, source: FactCheckerSource): BuloDetectado[] {
  const items: BuloDetectado[] = []
  // Extraer todos los <item>...</item>
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m
  let idx = 0
  while ((m = itemRegex.exec(xml)) !== null) {
    const it = m[1]
    const titulo = unesc(extract(it, 'title'))
    const descripcion = stripHtml(unesc(extract(it, 'description')))
    const link = extract(it, 'link').trim()
    const pubDate = extract(it, 'pubDate')
    const fecha = safeISO(pubDate)
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

/**
 * Extrae el contenido del primer `<tag>...</tag>` (sin namespace) del XML.
 * Maneja CDATA y texto plano. Si hay múltiples tags (p.ej. itunes:title),
 * el `\b` evita matchear elementos con prefijo (`<itunes:title>`).
 */
function extract(xml: string, tag: string): string {
  // Patrón 1 · CDATA wrapper completo
  const reCdata = new RegExp(`<${tag}\\b(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
  const cdata = xml.match(reCdata)
  if (cdata) return cdata[1].trim()
  // Patrón 2 · texto plano
  const rePlain = new RegExp(`<${tag}\\b(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const plain = xml.match(rePlain)
  return plain ? plain[1].trim() : ''
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

/** Heurística: deduce categoría temática del bulo (texto ya en lowercase). */
function inferCategoria(titulo: string, descripcion: string): string {
  const t = (titulo + ' ' + descripcion).toLowerCase()
  if (/migrant|inmigra|refugi|magreb|frontera/.test(t)) return 'Migración'
  if (/vacuna|salud|sanidad|medicament|covid|farma/.test(t)) return 'Sanidad'
  if (/elecc|voto|partido|sondeo|gobierno|presidente|ministr/.test(t)) return 'Política'
  if (/econom|banco|euros|impuesto|tasa|fisc|nóm/.test(t)) return 'Económica'
  if (/justicia|tribunal|jueces|sentencia|fiscal/.test(t)) return 'Justicia'
  if (/clim|medioambient|emisiones|verde|reciclaje/.test(t)) return 'Climática'
  if (/ucran|rusia|israel|gaza|china|eeuu|otan|union europea/.test(t)) return 'Internacional'
  return 'Política'
}

/** Heurística: deduce veredicto del titular. */
function inferVeredicto(titulo: string, descripcion: string): BuloDetectado['veredicto'] {
  const t = (titulo + ' ' + descripcion).toLowerCase()
  if (/falso|no es cierto|no es verdad|no fue|montaje|deepfake|fake|inventado/.test(t)) return 'FALSO'
  if (/engaño|manipulad|sacad? de contexto|distorsión/.test(t)) return 'ENGAÑOSO'
  if (/parcial|matiza|incompleto/.test(t)) return 'PARCIAL'
  // 'cuidado'/'alerta' suelen ser preventivos sobre un bulo en circulación,
  // pero NO implica que el medio ya lo haya confirmado · default a EN ANÁLISIS
  return 'EN ANÁLISIS'
}

/** Normaliza un título para deduplicación entre fuentes. */
function normalizeTitle(t: string): string {
  return t.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // diacriticos
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(no|si|es|cierto|verdad|falso|cuidado|con|que|el|la|los|las|un|una|de|del|por|para|en|y|o)\b/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 60)
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

/**
 * Combina los dos feeds y devuelve los más recientes (dedup por título).
 * Cacheado 10 min con single-flight.
 */
const BULOS_TTL_MS = 10 * 60 * 1000
const memoizedBulos = memoCache<BuloDetectado[]>(BULOS_TTL_MS)

export async function fetchAllBulosLive(limit = 30): Promise<BuloDetectado[]> {
  const cached = await memoizedBulos(async () => {
    const perFeed = Math.max(15, Math.ceil(limit * 0.8))
    const settled = await Promise.allSettled([
      fetchMalditaBulos(perFeed),
      fetchNewtralBulos(perFeed),
    ])
    const combined: BuloDetectado[] = []
    for (const s of settled) {
      if (s.status === 'fulfilled') combined.push(...s.value)
    }
    combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    // Dedup por título normalizado
    const seen = new Set<string>()
    const dedup: BuloDetectado[] = []
    for (const b of combined) {
      const key = normalizeTitle(b.titulo)
      if (!key || seen.has(key)) continue
      seen.add(key)
      dedup.push(b)
    }
    return dedup
  })
  return cached.slice(0, limit)
}
