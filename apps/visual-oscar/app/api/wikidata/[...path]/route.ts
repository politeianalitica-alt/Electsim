/**
 * /api/wikidata/[...path] · Wikidata SPARQL + Search API passthrough.
 *
 * Fuente: www.wikidata.org · public knowledge graph (sin auth).
 *
 * Usado en /prensa Tab 5 Actores para:
 *   - Resolver alias de personas/partidos/empresas (ej. "Sánchez" → Q3413272)
 *   - Cargos políticos actuales
 *   - Información biográfica básica
 *   - Imagen Commons
 *
 * Rutas:
 *   GET /api/wikidata/health
 *   GET /api/wikidata/search?q=Pedro+Sánchez&lang=es
 *     → top entidades coincidentes con label/alias
 *   GET /api/wikidata/entity?id=Q3413272
 *     → claims principales: P31 instance, P39 position held, P102 party
 *   GET /api/wikidata/aliases?id=Q3413272&lang=es
 *     → array de aliases (variantes del nombre)
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400 // 24h

const WD_SEARCH = 'https://www.wikidata.org/w/api.php'
const WD_ENTITY = 'https://www.wikidata.org/wiki/Special:EntityData'

async function wdFetch(url: string): Promise<any> {
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0; politeianalitica@gmail.com)',
      },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    const probe = await wdFetch(`${WD_SEARCH}?action=wbsearchentities&search=Spain&language=en&format=json&limit=1`)
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      backend: 'Wikidata Search + EntityData',
      probe_status: probe.error ?? 'live',
      probe_first: probe?.search?.[0]?.label ?? null,
    })
  }

  // /api/wikidata/search?q=...
  if (action === 'search') {
    const q = url.searchParams.get('q') || url.searchParams.get('query') || ''
    if (!q) return NextResponse.json({ ok: false, error: 'q required' }, { status: 400 })
    const lang = url.searchParams.get('lang') || 'es'
    const limit = url.searchParams.get('limit') || '10'
    const data = await wdFetch(
      `${WD_SEARCH}?action=wbsearchentities&search=${encodeURIComponent(q)}&language=${lang}&format=json&limit=${limit}&uselang=${lang}`,
    )
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Wikidata', data.error),
      })
    }
    const results = (data.search || []).map((r: any) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      aliases: r.aliases || [],
      url: r.concepturi,
    }))
    return NextResponse.json({
      ok: true,
      q, lang,
      data_quality: quality('live', 'Wikidata · wbsearchentities'),
      n_results: results.length,
      results,
    })
  }

  // /api/wikidata/entity?id=Q3413272
  if (action === 'entity') {
    const id = url.searchParams.get('id') || ''
    if (!id || !/^Q\d+$/.test(id)) {
      return NextResponse.json({ ok: false, error: 'id must be Wikidata QID like Q3413272' }, { status: 400 })
    }
    const lang = url.searchParams.get('lang') || 'es'
    const data = await wdFetch(`${WD_ENTITY}/${id}.json`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Wikidata', data.error),
      })
    }
    const ent = data.entities?.[id]
    if (!ent) {
      return NextResponse.json({ ok: false, error: 'entity not found' }, { status: 404 })
    }
    // Extracción simplificada: labels, descriptions, aliases + claims P31, P39, P102, P18
    const claims = ent.claims || {}
    const extractClaimIds = (prop: string): string[] =>
      (claims[prop] || [])
        .map((c: any) => c.mainsnak?.datavalue?.value?.id)
        .filter(Boolean)
    const extractClaimValues = (prop: string): string[] =>
      (claims[prop] || [])
        .map((c: any) => c.mainsnak?.datavalue?.value)
        .filter(Boolean)
    return NextResponse.json({
      ok: true,
      id,
      data_quality: quality('live', `Wikidata · ${id}`),
      label: ent.labels?.[lang]?.value || ent.labels?.en?.value,
      description: ent.descriptions?.[lang]?.value || ent.descriptions?.en?.value,
      aliases: (ent.aliases?.[lang] || []).map((a: any) => a.value),
      claims_summary: {
        instance_of: extractClaimIds('P31'),
        positions_held: extractClaimIds('P39'),
        party: extractClaimIds('P102'),
        country_of_citizenship: extractClaimIds('P27'),
        image: extractClaimValues('P18')[0] || null,
        birth_date: claims['P569']?.[0]?.mainsnak?.datavalue?.value?.time || null,
        official_website: claims['P856']?.[0]?.mainsnak?.datavalue?.value || null,
      },
    })
  }

  // /api/wikidata/aliases?id=Q3413272&lang=es
  if (action === 'aliases') {
    const id = url.searchParams.get('id') || ''
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })
    const lang = url.searchParams.get('lang') || 'es'
    const data = await wdFetch(`${WD_ENTITY}/${id}.json`)
    if (data.error) return NextResponse.json({ ok: false, data_quality: quality('missing', 'Wikidata', data.error) })
    const ent = data.entities?.[id]
    if (!ent) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
    const label = ent.labels?.[lang]?.value
    const aliases = (ent.aliases?.[lang] || []).map((a: any) => a.value)
    return NextResponse.json({
      ok: true,
      id, lang,
      data_quality: quality('live', `Wikidata aliases · ${id}`),
      label,
      aliases: label ? [label, ...aliases] : aliases,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/wikidata/health',
        'GET /api/wikidata/search?q=Pedro+Sánchez&lang=es&limit=10',
        'GET /api/wikidata/entity?id=Q3413272&lang=es',
        'GET /api/wikidata/aliases?id=Q3413272&lang=es',
      ],
    },
    { status: 404 },
  )
}
