/**
 * /api/comtrade/[...path] · UN Comtrade · estadísticas oficiales de
 * comercio internacional de Naciones Unidas (UN Statistics Division).
 *
 * Fuente: comtradeapi.un.org · base reportada por 200+ países, datos
 * oficiales declarados a la ONU (no estimados como BACI). Granularidad:
 * - HS commodity classification (HS2/HS4/HS6)
 * - reporter / partner countries (ISO numeric)
 * - anual + mensual
 * - exports / imports / re-exports / re-imports
 *
 * Auth: header `Ocp-Apim-Subscription-Key` o query `subscription-key`.
 * Free tier ~250 calls/día (registrado), 100/día (anónimo).
 *
 * Rutas:
 *   GET /api/comtrade/spain-overview?year=2023
 *     → Snapshot España: exports + imports totales + top 10 partners
 *       + top 10 productos HS2.
 *
 *   GET /api/comtrade/bilateral?partner=276&year=2023&hs=87
 *     → Comercio bilateral España ↔ partner por HS code.
 *       partner se da en ISO numeric (DE=276, FR=251, CN=156, US=842).
 *
 *   GET /api/comtrade/top-partners?direction=X|M&year=2023&top=20
 *     → Ranking partners (X=exports, M=imports) para España.
 *
 *   GET /api/comtrade/timeseries?reporter=724&partner=156&hs=27&years=2020,2021,2022,2023
 *     → Serie temporal multi-año.
 *
 *   GET /api/comtrade/health
 *     → Diagnóstico · clave configurada, API responde.
 *
 * Cache HTTP 24h (datos oficiales, baja frecuencia).
 */
import { NextResponse } from 'next/server'

export const revalidate = 86400

const COMTRADE_API = 'https://comtradeapi.un.org/data/v1/get'

// ISO numeric codes for fast reference
const SPAIN_ISO = '724'
const ALL_COUNTRIES = '0'   // partner=0 → "World" (total agregado)

function quality(t: 'live' | 'cache' | 'missing' | 'rate_limited', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

interface ComtradeQuery {
  /** Type of trade: C=commodities, S=services */
  typeCode?: string
  /** Frequency: A=annual, M=monthly */
  freqCode?: 'A' | 'M'
  /** Classification: HS, SITC, BEC, EBOPS */
  clCode?: string
  /** Reporter ISO numeric (e.g. 724 for Spain) */
  reporterCode?: string
  /** Partner ISO numeric (0 = world) */
  partnerCode?: string
  /** Period(s): YYYY or YYYYMM, comma-separated */
  period?: string
  /** Commodity / cmdCode: HS code e.g. '87' or '27' or 'TOTAL' */
  cmdCode?: string
  /** Flow: X=exports, M=imports, RX=re-exports, RM=re-imports */
  flowCode?: string
  /** Mode of transport */
  motCode?: string
  /** Customs procedure code */
  customsCode?: string
  /** Partner 2 (secondary origin/destination) */
  partner2Code?: string
}

async function comtradeFetch(path: string, query: ComtradeQuery): Promise<any> {
  const apiKey = process.env.COMTRADE_API_KEY
  // Defaults sensatos para España, anual, HS
  const params: Record<string, string> = {
    typeCode: 'C',
    freqCode: 'A',
    clCode: 'HS',
    reporterCode: SPAIN_ISO,
    cmdCode: 'TOTAL',
    flowCode: 'X',
    partnerCode: ALL_COUNTRIES,
    motCode: '0',
    customsCode: 'C00',
    partner2Code: '0',
    ...Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
    ),
  }
  // Default period si no se da
  if (!params.period) {
    params.period = String(new Date().getFullYear() - 1)
  }
  const qs = new URLSearchParams(params)
  if (apiKey) qs.set('subscription-key', apiKey)
  try {
    const r = await fetch(`${COMTRADE_API}${path}?${qs}`, {
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}),
      },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 401 || r.status === 403) return { error: `unauthorized HTTP ${r.status}` }
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

  // /api/comtrade/health
  if (action === 'health') {
    const hasKey = !!process.env.COMTRADE_API_KEY
    const probe = await comtradeFetch('', {
      period: '2022',
      flowCode: 'X',
      partnerCode: ALL_COUNTRIES,
      cmdCode: 'TOTAL',
    })
    return NextResponse.json({
      ok: !probe.error,
      has_api_key: hasKey,
      auth_mode: hasKey ? 'subscription-key (250/día)' : 'anonymous (100/día)',
      probe_status: probe.error ?? 'live',
      probe_count: probe?.count ?? probe?.data?.length ?? null,
    })
  }

  // /api/comtrade/spain-overview?year=2023
  if (action === 'spain-overview') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)

    const [exportsWorld, importsWorld, exportsByPartner, importsByPartner, exportsByHs2, importsByHs2] = await Promise.all([
      comtradeFetch('', { period: year, flowCode: 'X', partnerCode: ALL_COUNTRIES, cmdCode: 'TOTAL' }),
      comtradeFetch('', { period: year, flowCode: 'M', partnerCode: ALL_COUNTRIES, cmdCode: 'TOTAL' }),
      // Top partners exports: cmdCode=TOTAL, partnerCode=ALL_EXCEPT_WORLD
      comtradeFetch('', { period: year, flowCode: 'X', partnerCode: 'all', cmdCode: 'TOTAL' }),
      comtradeFetch('', { period: year, flowCode: 'M', partnerCode: 'all', cmdCode: 'TOTAL' }),
      // Top HS2 chapters
      comtradeFetch('', { period: year, flowCode: 'X', partnerCode: ALL_COUNTRIES, cmdCode: 'AG2' }),
      comtradeFetch('', { period: year, flowCode: 'M', partnerCode: ALL_COUNTRIES, cmdCode: 'AG2' }),
    ])

    const errs = [exportsWorld, importsWorld, exportsByPartner, importsByPartner, exportsByHs2, importsByHs2]
      .map((x) => x.error).filter(Boolean)
    if (errs.length === 6) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'UN Comtrade', errs[0]),
      })
    }

    const expTotal = (exportsWorld?.data || []).reduce((a: number, r: any) => a + (Number(r.primaryValue) || 0), 0)
    const impTotal = (importsWorld?.data || []).reduce((a: number, r: any) => a + (Number(r.primaryValue) || 0), 0)

    // Top partners
    const topExpPartners = (exportsByPartner?.data || [])
      .filter((r: any) => r.partnerCode !== 0 && r.partnerDesc !== 'World')
      .sort((a: any, b: any) => (Number(b.primaryValue) || 0) - (Number(a.primaryValue) || 0))
      .slice(0, 10)
      .map((r: any) => ({
        partner: r.partnerDesc,
        partner_iso: r.partnerCode,
        partner_alpha: r.partnerISO,
        value_usd: Number(r.primaryValue) || 0,
        value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      }))
    const topImpPartners = (importsByPartner?.data || [])
      .filter((r: any) => r.partnerCode !== 0 && r.partnerDesc !== 'World')
      .sort((a: any, b: any) => (Number(b.primaryValue) || 0) - (Number(a.primaryValue) || 0))
      .slice(0, 10)
      .map((r: any) => ({
        partner: r.partnerDesc,
        partner_iso: r.partnerCode,
        partner_alpha: r.partnerISO,
        value_usd: Number(r.primaryValue) || 0,
        value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      }))

    // Top HS2 chapters
    const topExpHs2 = (exportsByHs2?.data || [])
      .sort((a: any, b: any) => (Number(b.primaryValue) || 0) - (Number(a.primaryValue) || 0))
      .slice(0, 10)
      .map((r: any) => ({
        hs2: r.cmdCode,
        hs2_desc: r.cmdDesc,
        value_usd: Number(r.primaryValue) || 0,
        value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      }))
    const topImpHs2 = (importsByHs2?.data || [])
      .sort((a: any, b: any) => (Number(b.primaryValue) || 0) - (Number(a.primaryValue) || 0))
      .slice(0, 10)
      .map((r: any) => ({
        hs2: r.cmdCode,
        hs2_desc: r.cmdDesc,
        value_usd: Number(r.primaryValue) || 0,
        value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      }))

    return NextResponse.json({
      ok: true,
      year: Number(year),
      data_quality: quality('live', 'UN Comtrade', `oficial · año ${year}`),
      totals: {
        exports_usd: expTotal,
        exports_usd_fmt: fmtUSD(expTotal),
        imports_usd: impTotal,
        imports_usd_fmt: fmtUSD(impTotal),
        balance_usd: expTotal - impTotal,
        balance_usd_fmt: fmtUSD(expTotal - impTotal),
      },
      top_export_partners: topExpPartners,
      top_import_partners: topImpPartners,
      top_export_chapters: topExpHs2,
      top_import_chapters: topImpHs2,
    })
  }

  // /api/comtrade/bilateral?partner=276&year=2023&hs=87
  if (action === 'bilateral') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)
    const partner = url.searchParams.get('partner') || '276'
    const hs = url.searchParams.get('hs') || 'TOTAL'
    const [exports, imports] = await Promise.all([
      comtradeFetch('', { period: year, partnerCode: partner, cmdCode: hs, flowCode: 'X' }),
      comtradeFetch('', { period: year, partnerCode: partner, cmdCode: hs, flowCode: 'M' }),
    ])
    if (exports.error && imports.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'UN Comtrade', exports.error),
      })
    }
    const expRows = (exports?.data || [])
    const impRows = (imports?.data || [])
    const expTotal = expRows.reduce((a: number, r: any) => a + (Number(r.primaryValue) || 0), 0)
    const impTotal = impRows.reduce((a: number, r: any) => a + (Number(r.primaryValue) || 0), 0)
    return NextResponse.json({
      ok: true,
      year: Number(year),
      partner_iso: partner,
      hs,
      data_quality: quality('live', 'UN Comtrade'),
      totals: {
        spain_to_partner_usd: expTotal,
        partner_to_spain_usd: impTotal,
        balance_usd: expTotal - impTotal,
        balance_usd_fmt: fmtUSD(expTotal - impTotal),
      },
      partner_desc: expRows[0]?.partnerDesc || impRows[0]?.partnerDesc,
      cmd_desc: expRows[0]?.cmdDesc || impRows[0]?.cmdDesc,
      n_exports: expRows.length,
      n_imports: impRows.length,
      sample_exports: expRows.slice(0, 5),
      sample_imports: impRows.slice(0, 5),
    })
  }

  // /api/comtrade/top-partners
  if (action === 'top-partners') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)
    const direction = url.searchParams.get('direction') === 'M' ? 'M' : 'X'
    const top = parseInt(url.searchParams.get('top') || '20', 10)
    const data = await comtradeFetch('', {
      period: year,
      flowCode: direction,
      partnerCode: 'all',
      cmdCode: 'TOTAL',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'UN Comtrade', data.error),
      })
    }
    const rows = (data?.data || [])
      .filter((r: any) => r.partnerCode !== 0 && r.partnerDesc !== 'World')
      .sort((a: any, b: any) => (Number(b.primaryValue) || 0) - (Number(a.primaryValue) || 0))
      .slice(0, top)
      .map((r: any) => ({
        partner: r.partnerDesc,
        partner_iso: r.partnerCode,
        partner_alpha: r.partnerISO,
        value_usd: Number(r.primaryValue) || 0,
        value_fmt: fmtUSD(Number(r.primaryValue) || 0),
      }))
    return NextResponse.json({
      ok: true,
      year: Number(year),
      direction,
      data_quality: quality('live', 'UN Comtrade'),
      items: rows,
    })
  }

  // /api/comtrade/timeseries?reporter=724&partner=156&hs=27&years=2020,2021,2022,2023
  if (action === 'timeseries') {
    const reporter = url.searchParams.get('reporter') || SPAIN_ISO
    const partner = url.searchParams.get('partner') || ALL_COUNTRIES
    const hs = url.searchParams.get('hs') || 'TOTAL'
    const years = url.searchParams.get('years') ||
      [2020, 2021, 2022, 2023].join(',')
    const [exports, imports] = await Promise.all([
      comtradeFetch('', {
        reporterCode: reporter, partnerCode: partner, cmdCode: hs,
        flowCode: 'X', period: years,
      }),
      comtradeFetch('', {
        reporterCode: reporter, partnerCode: partner, cmdCode: hs,
        flowCode: 'M', period: years,
      }),
    ])
    if (exports.error && imports.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'UN Comtrade', exports.error),
      })
    }
    // Agrupa por año
    const byYear: Record<number, { year: number; exports_usd: number; imports_usd: number }> = {}
    for (const r of (exports?.data || [])) {
      const y = Number(r.refYear || r.period)
      if (!byYear[y]) byYear[y] = { year: y, exports_usd: 0, imports_usd: 0 }
      byYear[y].exports_usd += Number(r.primaryValue) || 0
    }
    for (const r of (imports?.data || [])) {
      const y = Number(r.refYear || r.period)
      if (!byYear[y]) byYear[y] = { year: y, exports_usd: 0, imports_usd: 0 }
      byYear[y].imports_usd += Number(r.primaryValue) || 0
    }
    const series = Object.values(byYear)
      .map((p) => ({
        ...p,
        balance_usd: p.exports_usd - p.imports_usd,
        exports_fmt: fmtUSD(p.exports_usd),
        imports_fmt: fmtUSD(p.imports_usd),
      }))
      .sort((a, b) => a.year - b.year)
    return NextResponse.json({
      ok: true,
      reporter,
      partner,
      hs,
      data_quality: quality('live', 'UN Comtrade'),
      series,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/comtrade/health',
        'GET /api/comtrade/spain-overview?year=2023',
        'GET /api/comtrade/bilateral?partner=276&year=2023&hs=87',
        'GET /api/comtrade/top-partners?direction=X|M&year=2023&top=20',
        'GET /api/comtrade/timeseries?reporter=724&partner=156&hs=27&years=2020,2021,2022,2023',
      ],
    },
    { status: 404 },
  )
}
