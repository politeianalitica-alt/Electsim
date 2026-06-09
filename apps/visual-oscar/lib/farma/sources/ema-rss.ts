/**
 * Cliente EMA RSS · European Medicines Agency · Politeia Farma v3
 *
 * EMA publica varios feeds RSS públicos sin autenticación:
 *   - News        · https://www.ema.europa.eu/en/rss/news_human_en.xml
 *   - Shortages   · https://www.ema.europa.eu/en/rss/medicine-shortages_en.xml
 *   - Referrals   · https://www.ema.europa.eu/en/rss/referrals_en.xml
 *
 * Parser tolerante sin deps externas (regex + DOMParser-style fallback).
 */

const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

export type EmaFeedKind = 'news' | 'shortages' | 'referrals'

const FEED_URLS: Record<EmaFeedKind, string> = {
  news: 'https://www.ema.europa.eu/en/rss/news_human_en.xml',
  shortages: 'https://www.ema.europa.eu/en/rss/medicine-shortages_en.xml',
  referrals: 'https://www.ema.europa.eu/en/rss/referrals_en.xml',
}

const FEED_LABEL: Record<EmaFeedKind, string> = {
  news: 'News (human medicines)',
  shortages: 'Medicine shortages',
  referrals: 'Referrals & safety reviews',
}

export interface EmaItem {
  titulo: string
  link: string
  fecha: string | null
  resumen: string
  kind: EmaFeedKind
}

export async function fetchEmaFeed(
  kind: EmaFeedKind,
  timeoutMs = 8000
): Promise<{ ok: true; items: EmaItem[]; fuente: string; fuente_label: string } | { ok: false; error: string }> {
  const url = FEED_URLS[kind]
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: ctrl.signal,
      next: { revalidate: 1800 }, // 30 min
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ema ${kind}` }
    const xml = await res.text()
    if (!xml || xml.length < 50) return { ok: false, error: `respuesta vacía ema ${kind}` }
    const items = parseRss(xml, kind)
    return { ok: true, items, fuente: url, fuente_label: `EMA RSS · ${FEED_LABEL[kind]}` }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

/**
 * Parser tolerante de RSS 2.0. Extrae <item>...</item> de un canal RSS.
 * No depende de DOMParser (Node 18+) ni de fast-xml-parser. Usa regex
 * con flag dotAll para abarcar bloques multilinea.
 */
function parseRss(xml: string, kind: EmaFeedKind): EmaItem[] {
  const items: EmaItem[] = []
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    items.push({
      titulo: cleanText(pickTag(block, 'title')),
      link: cleanText(pickTag(block, 'link')),
      fecha: cleanText(pickTag(block, 'pubDate')) || null,
      resumen: stripHtml(cleanText(pickTag(block, 'description'))).slice(0, 320),
      kind,
    })
  }
  return items
}

function pickTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = re.exec(xml)
  return m?.[1] ?? ''
}

function cleanText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}
