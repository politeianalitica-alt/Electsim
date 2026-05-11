import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface WikiSummary {
  title?: string
  extract?: string
  description?: string
  thumbnail?: { source: string; width: number; height: number }
  content_urls?: { desktop?: { page: string } }
  type?: string
}

interface ActorBio {
  ok: boolean
  source: 'wikipedia' | 'wikidata' | 'none'
  title?: string
  summary?: string
  description?: string
  thumbnail_url?: string
  url?: string
  // Wikidata-derived structured info
  birth_date?: string
  birth_place?: string
  occupation?: string[]
  party?: string
  positions?: string[]
  // Errors / fallbacks
  error?: string
}

// Try Wikipedia REST summary endpoint (es first, en fallback)
async function fetchWikipediaSummary(name: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(name.replace(/ /g, '_'))
  for (const lang of ['es', 'en']) {
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PoliteiaAnalitica/1.0 (https://politeia-visual-oscar.vercel.app)' },
        next: { revalidate: 86400 }, // 24h cache
      })
      if (res.ok) {
        const data = await res.json() as WikiSummary
        if (data.extract && data.extract.length > 30) return data
      }
    } catch { /* try next lang */ }
  }
  return null
}

// Optional Wikidata enrichment via SPARQL: birth date, party, positions
async function fetchWikidata(wikipediaTitle: string): Promise<Partial<ActorBio> | null> {
  try {
    // First find the Wikidata Q-id from the Wikipedia article
    const sitelinkUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(wikipediaTitle)}&format=json&origin=*`
    const sl = await fetch(sitelinkUrl, { next: { revalidate: 86400 } })
    if (!sl.ok) return null
    const slj = await sl.json() as { query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> } }
    const pages = slj.query?.pages ?? {}
    const qid = Object.values(pages)[0]?.pageprops?.wikibase_item
    if (!qid) return null

    // Fetch Wikidata entity
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
    const e = await fetch(entityUrl, { next: { revalidate: 86400 } })
    if (!e.ok) return null
    const ej = await e.json() as { entities?: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>> }> }
    const ent = ej.entities?.[qid]
    const claims = ent?.claims ?? {}

    const firstValueAsTime = (prop: string): string | undefined => {
      const c = claims[prop]?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined
      return c?.time?.replace(/^\+/, '').slice(0, 10) ?? undefined
    }

    return {
      birth_date: firstValueAsTime('P569'),
      // Note: party (P102) and position held (P39) return Q-ids; resolving them adds another fetch.
      // We keep this simple and let the UI display "Wikipedia link" for deeper data.
    }
  } catch { return null }
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const rawSlug = decodeURIComponent(params.slug)
  // Slug is sometimes a name (Pedro Sánchez) and sometimes a UUID. Use as-is.
  const name = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const summary = await fetchWikipediaSummary(name)
  if (!summary || !summary.extract) {
    return NextResponse.json<ActorBio>({
      ok: false,
      source: 'none',
      error: `Sin entrada en Wikipedia para "${name}"`,
    })
  }

  let extra: Partial<ActorBio> | null = null
  if (summary.title) {
    extra = await fetchWikidata(summary.title)
  }

  const result: ActorBio = {
    ok: true,
    source: 'wikipedia',
    title: summary.title,
    summary: summary.extract,
    description: summary.description,
    thumbnail_url: summary.thumbnail?.source,
    url: summary.content_urls?.desktop?.page,
    ...(extra ?? {}),
  }
  return NextResponse.json(result)
}
