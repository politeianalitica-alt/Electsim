/**
 * /api/oec/[...path] · Observatory of Economic Complexity (OEC).
 *
 * Fuente: api-v2.oec.world · datos BACI/CEPII de comercio internacional
 * con granularidad HS4/HS6, exporter/importer/year, todos los países.
 * Cobertura ~109k filas/año para Spain como exporter en HS4.
 *
 * Auth: la API pública NO requiere token para queries básicas
 *   (datos históricos, metadatos, países, clasificaciones).
 *   El token solo aplica a planes Pro/Premium (subnacional, last-month).
 *   Si `OEC_API_TOKEN` existe en env, se añade automáticamente.
 *
 * Endpoint raíz: https://api-v2.oec.world/tesseract/data.jsonrecords
 * Cube principal: trade_i_baci_a_22 (HS6 REV. 2022, años 2022-2024)
 *
 * Rutas:
 *   GET /api/oec/spain-overview?year=2023
 *     → KPIs España: total exports + imports + balance + top 10 partners
 *       y top 10 productos HS4 (exports + imports).
 *
 *   GET /api/oec/top-partners?direction=exports|imports&year=2023&top=20
 *     → Ranking países por valor de comercio con España.
 *
 *   GET /api/oec/top-products?direction=exports|imports&year=2023&top=20
 *     → Ranking HS4 productos exportados/importados por España.
 *
 *   GET /api/oec/bilateral?partner=Germany&year=2023
 *     → Comercio bilateral España ↔ partner por HS4.
 *
 *   GET /api/oec/health
 *     → Diagnóstico · API responde, token configurado.
 *
 * Cache HTTP 24h (datos anuales, baja frecuencia de actualización).
 */
import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24h

const OEC_API = 'https://api-v2.oec.world/tesseract/data.jsonrecords'
const SPAIN_ID = 'euesp'
const DEFAULT_CUBE = 'trade_i_baci_a_22'

function quality(t: 'live' | 'cache' | 'missing' | 'rate_limited', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

async function oecFetch(params: Record<string, string>): Promise<any> {
  const token = process.env.OEC_API_TOKEN
  const qs = new URLSearchParams({
    ...params,
    ...(token ? { token } : {}),
  })
  try {
    const r = await fetch(`${OEC_API}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function fmtUSD(v: number): string {
  if (!v || isNaN(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/oec/health
  if (action === 'health') {
    const probe = await oecFetch({
      cube: DEFAULT_CUBE,
      drilldowns: 'Year',
      measures: 'Trade Value',
      'include': `Exporter Country:${SPAIN_ID};Year:2023`,
      limit: '1,0',
    })
    return NextResponse.json({
      ok: !probe.error,
      has_optional_token: !!process.env.OEC_API_TOKEN,
      auth_mode: process.env.OEC_API_TOKEN ? 'token (Pro)' : 'public (free)',
      probe_status: probe.error ?? 'live',
      probe_total: probe?.page?.total ?? null,
    })
  }

  // /api/oec/spain-overview?year=2023
  if (action === 'spain-overview') {
    const year = url.searchParams.get('year') || '2023'

    const [exportsByPartner, importsByPartner, exportsByHs4, importsByHs4] = await Promise.all([
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'Importer Country',
        measures: 'Trade Value',
        'include': `Exporter Country:${SPAIN_ID};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'Exporter Country',
        measures: 'Trade Value',
        'include': `Importer Country:${SPAIN_ID};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'HS4',
        measures: 'Trade Value',
        'include': `Exporter Country:${SPAIN_ID};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'HS4',
        measures: 'Trade Value',
        'include': `Importer Country:${SPAIN_ID};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
    ])

    const errs = [exportsByPartner, importsByPartner, exportsByHs4, importsByHs4]
      .filter((x) => x.error)
      .map((x) => x.error)
    if (errs.length === 4) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OEC', errs[0]),
      })
    }

    const expRows: any[] = exportsByPartner?.data || []
    const impRows: any[] = importsByPartner?.data || []
    const expHs4: any[] = exportsByHs4?.data || []
    const impHs4: any[] = importsByHs4?.data || []

    const totalExports = expRows.reduce((a, r) => a + (Number(r['Trade Value']) || 0), 0)
    const totalImports = impRows.reduce((a, r) => a + (Number(r['Trade Value']) || 0), 0)

    return NextResponse.json({
      ok: true,
      year: Number(year),
      data_quality: quality('live', 'OEC', `BACI HS4 · ${year}`),
      totals: {
        exports_usd: totalExports,
        exports_usd_fmt: fmtUSD(totalExports),
        imports_usd: totalImports,
        imports_usd_fmt: fmtUSD(totalImports),
        balance_usd: totalExports - totalImports,
        balance_usd_fmt: fmtUSD(totalExports - totalImports),
      },
      top_export_partners: expRows.slice(0, 10).map((r) => ({
        partner: r['Importer Country'],
        partner_id: r['Importer Country ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
      top_import_partners: impRows.slice(0, 10).map((r) => ({
        partner: r['Exporter Country'],
        partner_id: r['Exporter Country ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
      top_export_products: expHs4.slice(0, 10).map((r) => ({
        hs4: r['HS4'],
        hs4_id: r['HS4 ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
      top_import_products: impHs4.slice(0, 10).map((r) => ({
        hs4: r['HS4'],
        hs4_id: r['HS4 ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
    })
  }

  // /api/oec/top-partners
  if (action === 'top-partners') {
    const year = url.searchParams.get('year') || '2023'
    const direction = url.searchParams.get('direction') || 'exports'
    const top = parseInt(url.searchParams.get('top') || '20', 10)
    const drill = direction === 'imports' ? 'Exporter Country' : 'Importer Country'
    const filter = direction === 'imports'
      ? `Importer Country:${SPAIN_ID};Year:${year}`
      : `Exporter Country:${SPAIN_ID};Year:${year}`
    const data = await oecFetch({
      cube: DEFAULT_CUBE,
      drilldowns: drill,
      measures: 'Trade Value',
      include: filter,
      sort: 'Trade Value desc',
      limit: `${top},0`,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OEC', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      year: Number(year),
      direction,
      data_quality: quality('live', 'OEC'),
      items: (data.data || []).map((r: any) => ({
        partner: r[drill],
        partner_id: r[`${drill} ID`],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
    })
  }

  // /api/oec/top-products
  if (action === 'top-products') {
    const year = url.searchParams.get('year') || '2023'
    const direction = url.searchParams.get('direction') || 'exports'
    const top = parseInt(url.searchParams.get('top') || '20', 10)
    const filter = direction === 'imports'
      ? `Importer Country:${SPAIN_ID};Year:${year}`
      : `Exporter Country:${SPAIN_ID};Year:${year}`
    const data = await oecFetch({
      cube: DEFAULT_CUBE,
      drilldowns: 'HS4',
      measures: 'Trade Value',
      include: filter,
      sort: 'Trade Value desc',
      limit: `${top},0`,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OEC', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      year: Number(year),
      direction,
      data_quality: quality('live', 'OEC'),
      items: (data.data || []).map((r: any) => ({
        hs4: r['HS4'],
        hs4_id: r['HS4 ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
    })
  }

  // /api/oec/bilateral?partner=Germany&year=2023
  if (action === 'bilateral') {
    const year = url.searchParams.get('year') || '2023'
    const partnerId = url.searchParams.get('partner_id')
    const partnerName = url.searchParams.get('partner')
    if (!partnerId && !partnerName) {
      return NextResponse.json({
        ok: false,
        error: 'partner_id or partner is required',
      })
    }
    // Lookup partner_id si solo nos dieron el nombre
    let pid = partnerId
    if (!pid && partnerName) {
      const lookup = await oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'Importer Country',
        measures: 'Trade Value',
        include: `Year:${year}`,
        limit: '500,0',
      })
      const row = (lookup?.data || []).find(
        (r: any) => r['Importer Country']?.toLowerCase() === partnerName.toLowerCase(),
      )
      pid = row?.['Importer Country ID']
      if (!pid) {
        return NextResponse.json({
          ok: false,
          error: `partner not found: ${partnerName}`,
        })
      }
    }
    const [exports, imports] = await Promise.all([
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'HS4',
        measures: 'Trade Value',
        include: `Exporter Country:${SPAIN_ID};Importer Country:${pid};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
      oecFetch({
        cube: DEFAULT_CUBE,
        drilldowns: 'HS4',
        measures: 'Trade Value',
        include: `Exporter Country:${pid};Importer Country:${SPAIN_ID};Year:${year}`,
        sort: 'Trade Value desc',
        limit: '15,0',
      }),
    ])
    const expTotal = (exports?.data || []).reduce(
      (a: number, r: any) => a + (Number(r['Trade Value']) || 0), 0,
    )
    const impTotal = (imports?.data || []).reduce(
      (a: number, r: any) => a + (Number(r['Trade Value']) || 0), 0,
    )
    return NextResponse.json({
      ok: true,
      year: Number(year),
      partner_id: pid,
      data_quality: quality('live', 'OEC'),
      totals: {
        spain_to_partner_usd: expTotal,
        partner_to_spain_usd: impTotal,
        balance_usd: expTotal - impTotal,
      },
      top_spain_exports: (exports?.data || []).slice(0, 15).map((r: any) => ({
        hs4: r['HS4'],
        hs4_id: r['HS4 ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
      top_spain_imports: (imports?.data || []).slice(0, 15).map((r: any) => ({
        hs4: r['HS4'],
        hs4_id: r['HS4 ID'],
        value_usd: Number(r['Trade Value']) || 0,
        value_fmt: fmtUSD(Number(r['Trade Value']) || 0),
      })),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/oec/health',
        'GET /api/oec/spain-overview?year=2023',
        'GET /api/oec/top-partners?direction=exports|imports&year=2023&top=20',
        'GET /api/oec/top-products?direction=exports|imports&year=2023&top=20',
        'GET /api/oec/bilateral?partner=Germany&year=2023 (o partner_id=eudeu)',
      ],
    },
    { status: 404 },
  )
}
