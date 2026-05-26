// Parser RSS minimalista — sin dependencias externas.
// Maneja RSS 2.0 (<item>) y Atom (<entry>). Extrae título, link, fecha y resumen.
// Tolerante a malformaciones (medios españoles de 1990 todavía sirven feeds raros).

export interface RSSItem {
  title: string
  link: string
  pubDate: Date | null
  description: string
  guid?: string
  /**
   * Sprint G15 FASE A · categorías/tags declaradas por el medio en el feed.
   * Extraídas de <category>, <dc:subject>, <media:keywords>, Atom <category term="">.
   * Útil para `topicImportance()` en news-intel.ts sin tener que adivinar topic.
   */
  categories?: string[]
}

export interface RSSResult {
  ok: boolean
  items: RSSItem[]
  error?: string
}

/** Decodifica entidades HTML básicas que aparecen en feeds (&amp; &lt; &quot; ñ á é í ó ú …) */
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '') // strip residual HTML
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTag(block: string, tag: string): string {
  // Captura primer match del tag (con o sin atributos), no greedy
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  return m ? decode(m[1]) : ''
}

function extractAttr(block: string, tag: string, attr: string): string {
  // Para <link href="..."/> de Atom
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, 'i')
  const m = block.match(re)
  return m ? decode(m[1]) : ''
}

function parseDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Sprint G15 FASE A · extrae TODAS las categorías/tags declaradas por el medio.
 * Soporta:
 *  - RSS 2.0: <category>X</category> (puede haber múltiples)
 *  - Dublin Core: <dc:subject>X</dc:subject>
 *  - Atom: <category term="X" label="X"/>
 *  - Yahoo Media: <media:keywords>a,b,c</media:keywords>
 * Devuelve array deduplicado limpio (sin HTML residual, trimmed, max 8).
 */
function extractCategories(block: string): string[] {
  const out = new Set<string>()
  // <category>text</category> · puede aparecer N veces
  const catRx = /<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi
  let m: RegExpExecArray | null
  while ((m = catRx.exec(block)) !== null) {
    const t = decode(m[1]).trim()
    if (t) out.add(t)
  }
  // Atom <category term="X"/> · self-closing, attr-based
  const atomCatRx = /<category\b[^>]*\bterm=["']([^"']+)["']/gi
  while ((m = atomCatRx.exec(block)) !== null) {
    const t = decode(m[1]).trim()
    if (t) out.add(t)
  }
  // <dc:subject>text</dc:subject>
  const dcRx = /<dc:subject(?:\s[^>]*)?>([\s\S]*?)<\/dc:subject>/gi
  while ((m = dcRx.exec(block)) !== null) {
    const t = decode(m[1]).trim()
    if (t) out.add(t)
  }
  // <media:keywords>a,b,c</media:keywords>
  const mediaRx = /<media:keywords(?:\s[^>]*)?>([\s\S]*?)<\/media:keywords>/gi
  while ((m = mediaRx.exec(block)) !== null) {
    for (const k of decode(m[1]).split(',')) {
      const t = k.trim()
      if (t) out.add(t)
    }
  }
  // Cap razonable + sin tags vacíos ni demasiado largos
  return Array.from(out)
    .map((t) => t.slice(0, 60))
    .filter((t) => t.length >= 2)
    .slice(0, 8)
}

export function parseRSS(xml: string): RSSResult {
  if (!xml || xml.length < 50) return { ok: false, items: [], error: 'feed vacío' }

  // Detección RSS vs Atom
  const itemTag = /<item[\s>]/i.test(xml) ? 'item' : (/<entry[\s>]/i.test(xml) ? 'entry' : null)
  if (!itemTag) return { ok: false, items: [], error: 'sin items/entries' }

  const blocks = xml.split(new RegExp(`<${itemTag}[\\s>]`, 'i')).slice(1)
  const items: RSSItem[] = []

  for (const raw of blocks) {
    // Cortamos en el cierre del item para que cada bloque sea independiente
    const closeIdx = raw.search(new RegExp(`<\\/${itemTag}>`, 'i'))
    const block = closeIdx > 0 ? raw.slice(0, closeIdx) : raw

    const title = extractTag(block, 'title')
    let link = extractTag(block, 'link')
    if (!link) link = extractAttr(block, 'link', 'href')
    const pubRaw = extractTag(block, 'pubDate')
      || extractTag(block, 'published')
      || extractTag(block, 'updated')
      || extractTag(block, 'dc:date')
    const description = extractTag(block, 'description')
      || extractTag(block, 'summary')
      || extractTag(block, 'content')
      || extractTag(block, 'content:encoded')
    const guid = extractTag(block, 'guid') || extractTag(block, 'id')
    // Sprint G15 FASE A · categorías/tags del feed
    const categories = extractCategories(block)

    if (!title || !link) continue
    items.push({
      title: title.slice(0, 300),
      link: link.startsWith('http') ? link : '',
      pubDate: parseDate(pubRaw),
      description: description.slice(0, 500),
      guid: guid || undefined,
      categories: categories.length > 0 ? categories : undefined,
    })
  }

  return { ok: true, items }
}

/** Fetch + parse con timeout y errores controlados. */
export async function fetchRSS(url: string, timeoutMs = 8000): Promise<RSSResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // User-Agent real para evitar bloqueos por bots
 'User-Agent': 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)',
 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      // Cache 10 min — reduce hits a los servidores de medios
      next: { revalidate: 600 },
    } as RequestInit & { next?: { revalidate: number } })
    if (!res.ok) return { ok: false, items: [], error: `HTTP ${res.status}` }
    const xml = await res.text()
    return parseRSS(xml)
  } catch (e: unknown) {
    return { ok: false, items: [], error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}
