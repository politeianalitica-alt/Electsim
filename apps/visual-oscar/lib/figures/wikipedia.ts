/**
 * Cliente ligero de la Wikipedia REST API para enriquecer dossiers.
 *
 * Endpoints usados:
 *   - GET /api/rest_v1/page/summary/{title} → resumen + thumbnail
 *   - GET /w/api.php?action=query&prop=extracts → texto extenso
 */

const UA = 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)'

interface WikipediaSummary {
  extract?: string
  description?: string
  thumbnail?: { source: string; width: number; height: number }
  content_urls?: { desktop?: { page?: string } }
}

const cache: Map<string, { ts: number; data: WikipediaSummary | null }> = new Map()
const TTL = 24 * 60 * 60 * 1000  // 24h

export async function fetchWikipediaSummary(title: string, lang: 'es' | 'en' = 'es'): Promise<WikipediaSummary | null> {
  const cacheKey = `${lang}|${title}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL) return cached.data

  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      // Si español falla, probar en inglés
      if (lang === 'es') return fetchWikipediaSummary(title, 'en')
      cache.set(cacheKey, { ts: Date.now(), data: null })
      return null
    }
    const json = await res.json() as WikipediaSummary
    cache.set(cacheKey, { ts: Date.now(), data: json })
    return json
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** Search Wikipedia for the best match for a name */
export async function searchWikipediaBestMatch(name: string, lang: 'es' | 'en' = 'es'): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=1&origin=*`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const json = await res.json() as { query?: { search?: Array<{ title: string }> } }
    const first = json.query?.search?.[0]
    return first?.title || null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}
