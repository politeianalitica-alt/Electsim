/**
 * GET /api/agro/demanda/[slug]?year=2024
 *
 * Demanda internacional de un producto agrícola español: ¿qué países compran
 * más este producto a España? Usa **OEC** (Observatory of Economic Complexity,
 * datos BACI) que es PÚBLICO y sin API key — más robusto que UN Comtrade (que
 * exige key y datos anuales que tardan en publicarse).
 *
 * OEC indexa los productos con un HS4 ID propio = `<nº de sección HS><HS4>`
 * (verificado empíricamente: maíz HS 1005 → OEC HS4 ID "21005"; porcino 0203
 * → "10203"; algodón 5201 → "115201"). Lo calculamos desde el capítulo HS.
 *
 * Devuelve el ranking de países-destino por valor exportado (USD), año con
 * fallback 2024→2023→2022 (años disponibles en el cubo trade_i_baci_a_22).
 *
 * Degradación honesta: si OEC no responde o el producto no tiene HS, ok:false.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const OEC_API = 'https://api-v2.oec.world/tesseract/data.jsonrecords'
const OEC_CUBE = 'trade_i_baci_a_22'
const SPAIN_ID = 'euesp'

/** Nº de sección HS (1-21) a partir del capítulo HS (2 dígitos). */
function hsSection(chapter: string): number {
  const ch = parseInt(chapter, 10)
  if (ch >= 1 && ch <= 5) return 1
  if (ch >= 6 && ch <= 14) return 2
  if (ch === 15) return 3
  if (ch >= 16 && ch <= 24) return 4
  if (ch >= 25 && ch <= 27) return 5
  if (ch >= 28 && ch <= 38) return 6
  if (ch >= 39 && ch <= 40) return 7
  if (ch >= 41 && ch <= 43) return 8
  if (ch >= 44 && ch <= 46) return 9
  if (ch >= 47 && ch <= 49) return 10
  if (ch >= 50 && ch <= 63) return 11
  if (ch >= 64 && ch <= 67) return 12
  if (ch >= 68 && ch <= 70) return 13
  if (ch === 71) return 14
  if (ch >= 72 && ch <= 83) return 15
  if (ch >= 84 && ch <= 85) return 16
  if (ch >= 86 && ch <= 89) return 17
  if (ch >= 90 && ch <= 92) return 18
  if (ch === 93) return 19
  if (ch >= 94 && ch <= 96) return 20
  return 21
}

interface OecRow {
  'Importer Country'?: string
  'Importer Country ID'?: string
  'Trade Value'?: number
}

async function oecImportersForProduct(oecHs4: string, year: string): Promise<{ rows: OecRow[] } | { error: string }> {
  const qs = new URLSearchParams({
    cube: OEC_CUBE,
    drilldowns: 'Importer Country',
    measures: 'Trade Value',
    include: `Exporter Country:${SPAIN_ID};HS4:${oecHs4};Year:${year}`,
    sort: 'Trade Value desc',
    limit: '60,0',
  })
  const token = process.env.OEC_API_TOKEN
  if (token) qs.set('token', token)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(`${OEC_API}?${qs}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)' },
      signal: ctrl.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timer)
    if (r.status === 429) return { error: 'rate_limited (OEC)' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const j = await r.json()
    return { rows: (j?.data || []) as OecRow[] }
  } catch (e) {
    clearTimeout(timer)
    return { error: e instanceof Error ? e.message.slice(0, 140) : 'fetch error' }
  }
}

function fmtUSD(v: number): string {
  if (!v || isNaN(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const producto = PRODUCTOS_AGRO.find((p) => p.id === params.slug)
  if (!producto) {
    return NextResponse.json(
      { ok: false, data: null, error: `producto desconocido: ${params.slug}`, fuente: 'catálogo Politeia' },
      { status: 404 }
    )
  }
  if (!producto.hs4 || !producto.hs_chapter) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        producto: { id: producto.id, nombre: producto.nombre },
        fuente: 'OEC',
        fuentes_error: ['producto sin código HS · input energético, no agroalimentario comerciable'],
      },
      { headers: { 'Cache-Control': 's-maxage=600' } }
    )
  }

  const oecHs4 = `${hsSection(producto.hs_chapter)}${producto.hs4}`
  const requestedYear = req.nextUrl.searchParams.get('year')

  let rows: OecRow[] | null = null
  let usedYear = ''
  let lastErr = ''
  if (requestedYear) {
    const res = await oecImportersForProduct(oecHs4, requestedYear)
    if ('error' in res) lastErr = res.error
    else if (res.rows.length > 0) { rows = res.rows; usedYear = requestedYear }
  } else {
    // El año más reciente del cubo BACI (2024) suele estar incompleto (valores
    // ~0). Probamos varios años y elegimos el de MAYOR total exportado, que es
    // el año consolidado más representativo. Llamadas cacheadas 24h.
    const candidates = await Promise.all(
      ['2023', '2022', '2024'].map(async (y) => {
        const res = await oecImportersForProduct(oecHs4, y)
        if ('error' in res) { lastErr = res.error; return null }
        const total = res.rows.reduce((a, r) => a + (Number(r['Trade Value']) || 0), 0)
        return res.rows.length > 0 ? { year: y, rows: res.rows, total } : null
      })
    )
    const best = candidates.filter(Boolean).sort((a, b) => (b!.total - a!.total))[0]
    if (best) { rows = best.rows; usedYear = best.year }
  }

  if (!rows) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        producto: { id: producto.id, nombre: producto.nombre, hs4: producto.hs4, demanda_label: producto.demanda_label },
        fuente: 'OEC · BACI',
        fuente_url: 'https://oec.world',
        fuentes_error: [`OEC sin datos para HS ${producto.hs4} (OEC id ${oecHs4})${lastErr ? ' · ' + lastErr : ''}`],
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  }

  const partners = rows
    .filter((r) => r['Importer Country'] && (Number(r['Trade Value']) || 0) > 0)
    .map((r) => ({
      partner: r['Importer Country'] as string,
      partner_iso: null as number | null,
      partner_alpha: (r['Importer Country ID'] as string) ?? null,
      value_usd: Number(r['Trade Value']) || 0,
      value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      net_weight_kg: null as number | null,
    }))
    .sort((a, b) => b.value_usd - a.value_usd)

  const total = partners.reduce((acc, p) => acc + p.value_usd, 0)
  const ranked = partners.slice(0, 25).map((p) => ({
    ...p,
    share_pct: total > 0 ? Number(((p.value_usd / total) * 100).toFixed(1)) : null,
  }))

  return NextResponse.json(
    {
      ok: ranked.length > 0,
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          hs4: producto.hs4,
          hs_chapter: producto.hs_chapter,
          demanda_label: producto.demanda_label,
          rol_espana: producto.rol_espana,
          color: producto.color,
        },
        year: Number(usedYear),
        total_export_usd: total,
        total_export_fmt: fmtUSD(total),
        n_destinos: partners.length,
        destinos: ranked,
      },
      fuente: `OEC · BACI · exportaciones España (HS ${producto.hs4}) · ${usedYear}`,
      fuente_url: `https://oec.world/es/profile/bilateral-product/${producto.hs4}/reporter/esp`,
      generado_en: 'ISR · cache 24h',
    },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } }
  )
}
