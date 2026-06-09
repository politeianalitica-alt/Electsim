/**
 * GET /api/agro/demanda/[slug]?year=2023
 *
 * Demanda internacional de un producto agrícola español: ¿qué países compran
 * más este producto a España? Usa UN Comtrade (datos oficiales declarados)
 * con reporter=España (724), flow=exportaciones, partner=all, commodity=HS4
 * del producto. Devuelve el ranking de países-destino por valor (USD).
 *
 * El código HS y su etiqueta vienen del catálogo (hs4 + demanda_label) para
 * que la UI sea honesta sobre QUÉ forma del producto se mide (p.ej. el slug
 * «porcino» mide carne de porcino HS 0203, no el animal vivo).
 *
 * Degradación honesta: si Comtrade no responde o el producto no tiene HS,
 * ok:false con motivo · NO se inventan flujos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COMTRADE_API = 'https://comtradeapi.un.org/data/v1/get'
const SPAIN_ISO = '724'

interface ComtradeRow {
  partnerCode?: number
  partnerDesc?: string
  partnerISO?: string
  primaryValue?: number
  netWgt?: number
  cmdDesc?: string
}

async function comtradeExportByPartner(hs4: string, period: string): Promise<{ rows: ComtradeRow[] } | { error: string }> {
  const apiKey = process.env.COMTRADE_API_KEY
  const params: Record<string, string> = {
    reporterCode: SPAIN_ISO,
    cmdCode: hs4,
    flowCode: 'X',
    partnerCode: 'all',
    period,
    motCode: '0',
    customsCode: 'C00',
    partner2Code: '0',
  }
  const qs = new URLSearchParams(params)
  if (apiKey) qs.set('subscription-key', apiKey)
  const url = `${COMTRADE_API}/C/A/HS?${qs}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}),
      },
      signal: ctrl.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timer)
    if (r.status === 429) return { error: 'rate_limited (Comtrade 100/día anónimo)' }
    if (r.status === 401 || r.status === 403) return { error: `unauthorized HTTP ${r.status}` }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const j = await r.json()
    return { rows: (j?.data || []) as ComtradeRow[] }
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
  if (!producto.hs4) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        producto: { id: producto.id, nombre: producto.nombre },
        fuente: 'UN Comtrade',
        fuentes_error: ['producto sin código HS · no es un bien agroalimentario comerciable (input energético)'],
      },
      { headers: { 'Cache-Control': 's-maxage=600' } }
    )
  }

  const year = req.nextUrl.searchParams.get('year') || String(new Date().getFullYear() - 1)
  const res = await comtradeExportByPartner(producto.hs4, year)

  if ('error' in res) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        producto: { id: producto.id, nombre: producto.nombre, hs4: producto.hs4, demanda_label: producto.demanda_label },
        fuente: 'UN Comtrade',
        fuente_url: 'https://comtradeplus.un.org',
        fuentes_error: [`comtrade · ${res.error}`],
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
    )
  }

  const partners = res.rows
    .filter((r) => r.partnerCode !== 0 && r.partnerDesc && r.partnerDesc !== 'World')
    .map((r) => ({
      partner: r.partnerDesc as string,
      partner_iso: r.partnerCode ?? null,
      partner_alpha: r.partnerISO ?? null,
      value_usd: Number(r.primaryValue) || 0,
      value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      net_weight_kg: r.netWgt != null ? Number(r.netWgt) : null,
    }))
    .filter((r) => r.value_usd > 0)
    .sort((a, b) => b.value_usd - a.value_usd)

  const total = partners.reduce((acc, p) => acc + p.value_usd, 0)
  const ranked = partners.slice(0, 25).map((p) => ({
    ...p,
    share_pct: total > 0 ? Number(((p.value_usd / total) * 100).toFixed(1)) : null,
  }))

  if (ranked.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        producto: { id: producto.id, nombre: producto.nombre, hs4: producto.hs4, demanda_label: producto.demanda_label },
        fuente: 'UN Comtrade',
        fuente_url: 'https://comtradeplus.un.org',
        fuentes_error: [`sin filas de exportación para HS ${producto.hs4} en ${year}`],
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  }

  return NextResponse.json(
    {
      ok: true,
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
        year: Number(year),
        total_export_usd: total,
        total_export_fmt: fmtUSD(total),
        n_destinos: partners.length,
        destinos: ranked,
      },
      fuente: `UN Comtrade · exportaciones España (HS ${producto.hs4}) · ${year}`,
      fuente_url: 'https://comtradeplus.un.org',
      generado_en: 'ISR · cache 24h',
    },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } }
  )
}
