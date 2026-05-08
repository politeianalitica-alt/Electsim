import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  url: string
  snippet: string
}

function parseRssItem(item: string): Partial<NewsItem> {
  const title   = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
  const link    = item.match(/<link>(.*?)<\/link>/)?.[1]
                ?? item.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? ''
  const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
  const source  = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
                ?? item.match(/<name>(.*?)<\/name>/)?.[1] ?? ''
  const snippet = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
                ?? item.match(/<description>(.*?)<\/description>/)?.[1] ?? '')
                .replace(/<[^>]+>/g, '').slice(0, 180)
  return { title, url: link, date: pubDate, source, snippet }
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const actorName = decodeURIComponent(params.name)
  const query = encodeURIComponent(`"${actorName}"`)
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=es&gl=ES&ceid=ES:es`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)' },
      cache: 'no-store',
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`RSS ${res.status}`)
    const xml = await res.text()

    // Parse <item> blocks
    const items: NewsItem[] = []
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let m: RegExpExecArray | null
    let i = 0
    while ((m = itemRe.exec(xml)) !== null && i < 8) {
      const parsed = parseRssItem(m[1])
      if (parsed.title) {
        items.push({
          id: String(i),
          title: parsed.title,
          source: parsed.source || 'Google News',
          date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
          url: parsed.url ?? '',
          snippet: parsed.snippet ?? '',
        })
        i++
      }
    }
    return NextResponse.json({ items, source: 'google_news', actor: actorName })
  } catch {
    return NextResponse.json({ items: [], source: 'error', actor: actorName })
  }
}
