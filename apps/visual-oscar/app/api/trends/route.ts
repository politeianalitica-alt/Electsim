import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function fetchUrl(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Politeia/1.0' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

interface TrendItem {
  id: string; termino: string; fuente: string; rank: number
  score_norm: number; categoria: string | null; es_evento_geo: boolean
  paises_mencionados: string[]; url: string; resumen: string | null
  timestamp: string
}

async function fetchWikipediaTrending(): Promise<TrendItem[]> {
  const yesterday = new Date(Date.now() - 86400000)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/es.wikipedia/all-access/${year}/${month}/${day}`

  try {
    const raw = await fetchUrl(url, 8000)
    const json = JSON.parse(raw) as { items?: Array<{ articles?: Array<{ article: string; views: number }> }> }
    const articles = json?.items?.[0]?.articles ?? []

    const SKIP_PREFIXES = ['Wikipedia:', 'Especial:', 'Ayuda:', 'Portal:', 'Archivo:', 'Portada', 'Anexo:']
    const maxViews = articles[0]?.views ?? 1

    const items: TrendItem[] = []
    for (const art of articles.slice(0, 30)) {
      const name: string = art.article.replace(/_/g, ' ')
      if (SKIP_PREFIXES.some(p => name.startsWith(p))) continue

      const PAISES_GEO = /rusia|ucrania|marruecos|argelia|venezuela|irán|china|israel|palestina|siria|irak/i
      const es_evento_geo = PAISES_GEO.test(name)
      const paises: string[] = []
      if (/marruecos/i.test(name)) paises.push('Marruecos')
      if (/ucrania/i.test(name)) paises.push('Ucrania')
      if (/israel|palestina/i.test(name)) paises.push('Israel')
      if (/rusia/i.test(name)) paises.push('Rusia')

      items.push({
        id: `wiki_${Buffer.from(name).toString('base64').slice(0, 8)}`,
        termino: name,
        fuente: 'Wikipedia ES',
        rank: items.length + 1,
        score_norm: art.views / maxViews,
        categoria: es_evento_geo ? 'geopolitica' : 'general',
        es_evento_geo,
        paises_mencionados: paises,
        url: `https://es.wikipedia.org/wiki/${art.article}`,
        resumen: null,
        timestamp: new Date().toISOString(),
      })
      if (items.length >= 20) break
    }
    return items
  } catch {
    return []
  }
}

async function fetchRSSPortada(nombre: string, url: string): Promise<TrendItem[]> {
  try {
    const xml = await fetchUrl(url, 6000)
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    const items: TrendItem[] = []
    let m: RegExpExecArray | null
    let rank = 1
    while ((m = itemRe.exec(xml)) !== null && rank <= 5) {
      const block = m[1]
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
      if (!title || title.length < 10) continue
      const link = (block.match(/<link>(https?[^<]+)<\/link>/))?.[1]?.trim() ?? ''
      const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]
      const descRaw = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? ''
      const resumen = descRaw.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) || null

      let age = 0
      if (pubDate) { try { age = (Date.now() - new Date(pubDate).getTime()) / 3600000 } catch { age = 0 } }
      if (age > 4) continue

      const PAISES_GEO = /marruecos|argelia|ucrania|israel|rusia|venezuela|irán|china/i
      const es_evento_geo = PAISES_GEO.test(title)
      const score_norm = Math.max(0, (1 - age / 4)) * (rank <= 3 ? 1.3 : 1.0)

      items.push({
        id: `rss_${Buffer.from(title).toString('base64').slice(0, 8)}`,
        termino: title.slice(0, 150),
        fuente: nombre,
        rank,
        score_norm: Math.min(1, score_norm),
        categoria: es_evento_geo ? 'geopolitica' : 'nacional',
        es_evento_geo,
        paises_mencionados: [],
        url: link,
        resumen,
        timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
      rank++
    }
    return items
  } catch { return [] }
}

// Google News RSS — more reliable from Vercel IPs than direct media scraping
const RSS_FEEDS: Record<string, string> = {
  'Google Noticias ES':    'https://news.google.com/rss?hl=es&gl=ES&ceid=ES:es',
  'Google Política ES':    'https://news.google.com/rss/search?q=pol%C3%ADtica+espa%C3%B1a&hl=es&gl=ES&ceid=ES:es',
  'Google Economía ES':    'https://news.google.com/rss/search?q=econom%C3%ADa+espa%C3%B1a&hl=es&gl=ES&ceid=ES:es',
  'Google Internacional':  'https://news.google.com/rss/search?q=geopolítica&hl=es&gl=ES&ceid=ES:es',
}

export async function GET() {
  const [wikiResult, ...rssResults] = await Promise.allSettled([
    fetchWikipediaTrending(),
    ...Object.entries(RSS_FEEDS).map(([nombre, url]) => fetchRSSPortada(nombre, url)),
  ])

  const wiki: TrendItem[] = wikiResult.status === 'fulfilled' ? wikiResult.value : []
  const rss: TrendItem[] = rssResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // Deduplicate and merge
  const seen = new Set<string>()
  const all = [...wiki, ...rss].filter(it => {
    const key = it.termino.toLowerCase().slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort: geo first, then by score
  all.sort((a, b) => {
    if (a.es_evento_geo !== b.es_evento_geo) return a.es_evento_geo ? -1 : 1
    return b.score_norm - a.score_norm
  })

  if (all.length > 0) return NextResponse.json({ items: all.slice(0, 40), source: 'real', timestamp: new Date().toISOString() })

  // Fallback mock
  return NextResponse.json({
    source: 'mock',
    timestamp: new Date().toISOString(),
    items: [
      { id: 'm1', termino: 'Crisis energética Argelia', fuente: 'Google Noticias ES', rank: 1, score_norm: 0.95, categoria: 'geopolitica', es_evento_geo: true, paises_mencionados: ['Argelia'], url: '', resumen: 'El suministro de gas argelino a España enfrenta nuevas tensiones diplomáticas.', timestamp: new Date().toISOString() },
      { id: 'm2', termino: 'Canarias inmigración récord', fuente: 'Google Noticias ES', rank: 2, score_norm: 0.88, categoria: 'geopolitica', es_evento_geo: true, paises_mencionados: ['Marruecos'], url: '', resumen: 'Las llegadas a Canarias superan el récord histórico en lo que va de año.', timestamp: new Date().toISOString() },
      { id: 'm3', termino: 'IBEX35 apertura', fuente: 'Wikipedia ES', rank: 3, score_norm: 0.72, categoria: 'economia', es_evento_geo: false, paises_mencionados: [], url: '', resumen: null, timestamp: new Date().toISOString() },
      { id: 'm4', termino: 'Ucrania ofensiva rusa', fuente: 'Google Internacional', rank: 4, score_norm: 0.68, categoria: 'geopolitica', es_evento_geo: true, paises_mencionados: ['Ucrania'], url: '', resumen: 'Nuevos ataques rusos sobre infraestructura energética ucraniana.', timestamp: new Date().toISOString() },
      { id: 'm5', termino: 'Elecciones autonómicas', fuente: 'Google Política ES', rank: 5, score_norm: 0.61, categoria: 'politica', es_evento_geo: false, paises_mencionados: [], url: '', resumen: 'Sondeos previos a las próximas elecciones autonómicas.', timestamp: new Date().toISOString() },
    ]
  })
}
