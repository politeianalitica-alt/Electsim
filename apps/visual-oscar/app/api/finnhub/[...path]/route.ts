/**
 * /api/finnhub/[...path] · Proxy server-side a Finnhub API.
 *
 * Una sola serverless function · 7 sub-endpoints útiles para dashboard.
 * FINNHUB_API_KEY nunca llega al cliente.
 *
 * Rutas soportadas:
 *
 *   GET /api/finnhub/quote/{symbol}
 *     → Cotización actual de un ticker
 *
 *   GET /api/finnhub/profile/{symbol}
 *     → Perfil empresarial (sector, IPO, employees, market cap)
 *
 *   GET /api/finnhub/news/{category}
 *     → Headlines globales · 'general' | 'forex' | 'crypto' | 'merger'
 *
 *   GET /api/finnhub/company-news/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD
 *     → Noticias de empresa
 *
 *   GET /api/finnhub/earnings
 *     → Calendario earnings próximos 14 días
 *
 *   GET /api/finnhub/dashboard
 *     → Snapshot multi-categoría: ADRs ES + US tech + EU caps + crypto
 *
 *   GET /api/finnhub/sector/{sector}
 *     → Snapshot sectorial · 'defensa' | 'energia' | 'tech' | 'banca_es'
 *
 * Cache HTTP varía por endpoint (quote 5min, news 30min, profile 24h).
 */
import { NextResponse } from 'next/server'

export const revalidate = 0

const FH = 'https://finnhub.io/api/v1'

// Sprint M F2: expanded IBEX-35 coverage. Antes sólo 4 ADRs (SAN/BBVA/TEF/FER)
// → ahora 14 tickers cubriendo bancos, energía, telecom, retail, infraestructuras,
// utilities y empresas tractoras. US ADRs cuando existen + OTC + Madrid (.MC).
const SPANISH_ADRS = {
  // Bancos (NYSE ADRs)
  SAN: 'Banco Santander',
  BBVA: 'BBVA',
  // Telecom
  TEF: 'Telefónica',
  // Infraestructuras
  FER: 'Ferrovial',
  // OTC ADRs (Pink Sheets)
  REPYY: 'Repsol',
  IBDRY: 'Iberdrola',
  ELEZF: 'Endesa',
  GGGRY: 'Gas Natural / Naturgy',
  IBKRY: 'Inditex',
  CLNXY: 'Cellnex Telecom',
  // Madrid Exchange (Finnhub free tier soporta .MC)
  'CABK.MC': 'CaixaBank',
  'AENA.MC': 'Aena',
  'AMS.MC': 'Amadeus IT',
  'ACS.MC': 'ACS Construcción',
}
const US_BIG_TECH = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
const EU_BIG_CAPS = { LVMUY: 'LVMH', SAP: 'SAP', ASML: 'ASML', SIEGY: 'Siemens' }
const CRYPTO_TOP = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT']
const DEFENSE = ['LMT', 'RTX', 'GD', 'NOC', 'BA', 'PLTR']
const ENERGY = ['XOM', 'CVX', 'SHEL', 'BP', 'EOG']

function quality(t: 'live' | 'cache' | 'missing' | 'rate_limited', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

async function fhFetch(path: string, params: Record<string, string>, revalidateS: number = 300) {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return { error: 'missing_key' }
  const qs = new URLSearchParams({ ...params, token: key })
  try {
    const r = await fetch(`${FH}${path}?${qs}`, { next: { revalidate: revalidateS } })
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

async function getQuote(symbol: string) {
  const j: any = await fhFetch('/quote', { symbol }, 300) // 5min
  if (!j || j.error || !j.c) return null
  return {
    symbol,
    price: j.c,
    change: j.d,
    change_percent: j.dp,
    high: j.h,
    low: j.l,
    open: j.o,
    previous_close: j.pc,
    timestamp: j.t,
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({
      ok: false,
      data_quality: quality('missing', 'Finnhub', 'FINNHUB_API_KEY no configurada'),
    })
  }

  // /api/finnhub/quote/{symbol}
  if (action === 'quote' && segs[1]) {
    const q = await getQuote(segs[1].toUpperCase())
    if (!q) {
      return NextResponse.json({
        ok: false,
        symbol: segs[1],
        data_quality: quality('missing', 'Finnhub', 'no quote (rate-limit o ticker no soportado en free tier)'),
      })
    }
    return NextResponse.json({ ok: true, ...q, data_quality: quality('live', 'Finnhub Quote') })
  }

  // /api/finnhub/profile/{symbol}
  if (action === 'profile' && segs[1]) {
    const sym = segs[1].toUpperCase()
    const j: any = await fhFetch('/stock/profile2', { symbol: sym }, 86400)
    if (!j || j.error || !j.name) {
      return NextResponse.json({ ok: false, symbol: sym, data_quality: quality('missing', 'Finnhub') })
    }
    return NextResponse.json({ ok: true, ...j, data_quality: quality('live', 'Finnhub Profile') })
  }

  // /api/finnhub/news/{category}
  if (action === 'news' && segs[1]) {
    const cat = segs[1]
    const j: any = await fhFetch('/news', { category: cat }, 1800)
    const items = Array.isArray(j) ? j : (j?.data || [])
    return NextResponse.json({
      ok: true,
      category: cat,
      n_items: items.length,
      items: items.slice(0, 30),
      data_quality: quality('live', 'Finnhub News'),
    })
  }

  // /api/finnhub/company-news/{symbol}
  if (action === 'company-news' && segs[1]) {
    const sym = segs[1].toUpperCase()
    const from = url.searchParams.get('from') ||
                 new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = url.searchParams.get('to') ||
               new Date().toISOString().slice(0, 10)
    const j: any = await fhFetch('/company-news', { symbol: sym, from, to }, 7200)
    const items = Array.isArray(j) ? j : (j?.data || [])
    return NextResponse.json({
      ok: true,
      symbol: sym,
      n_items: items.length,
      items: items.slice(0, 30),
      data_quality: quality('live', 'Finnhub Company News'),
    })
  }

  // /api/finnhub/earnings
  if (action === 'earnings') {
    const from = url.searchParams.get('from') || new Date().toISOString().slice(0, 10)
    const to = url.searchParams.get('to') ||
               new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const j: any = await fhFetch('/calendar/earnings', { from, to }, 7200)
    const items = j?.earningsCalendar || []
    return NextResponse.json({
      ok: true,
      from, to,
      n_items: items.length,
      items: items.slice(0, 50),
      data_quality: quality('live', 'Finnhub Earnings Calendar'),
    })
  }

  // /api/finnhub/dashboard
  if (action === 'dashboard') {
    const [spain, tech, eu, crypto] = await Promise.all([
      Promise.all(Object.keys(SPANISH_ADRS).map((s) => getQuote(s))).then((rs) => rs.filter(Boolean)),
      Promise.all(US_BIG_TECH.map((s) => getQuote(s))).then((rs) => rs.filter(Boolean)),
      Promise.all(Object.keys(EU_BIG_CAPS).map((s) => getQuote(s))).then((rs) => rs.filter(Boolean)),
      Promise.all(CRYPTO_TOP.map((s) => getQuote(s))).then((rs) => rs.filter(Boolean)),
    ])
    return NextResponse.json({
      ok: true,
      spain_adrs: spain.map((q: any) => ({ ...q, name: (SPANISH_ADRS as any)[q!.symbol] ?? q!.symbol })),
      us_big_tech: tech,
      eu_big_caps: eu.map((q: any) => ({ ...q, name: (EU_BIG_CAPS as any)[q!.symbol] ?? q!.symbol })),
      crypto: crypto.map((q: any) => ({ ...q, symbol: q!.symbol.replace('BINANCE:', '').replace('USDT', '/USDT') })),
      ts: new Date().toISOString(),
      data_quality: quality('live', 'Finnhub Dashboard'),
    })
  }

  // /api/finnhub/sector/{sector}
  if (action === 'sector' && segs[1]) {
    const sector = segs[1]
    const map: Record<string, string[]> = {
      defensa: DEFENSE,
      energia: ENERGY,
      tech: US_BIG_TECH,
      banca_es: Object.keys(SPANISH_ADRS),
    }
    const symbols = map[sector] || []
    const items = (await Promise.all(symbols.map((s) => getQuote(s)))).filter(Boolean)
    return NextResponse.json({
      ok: true,
      sector,
      n_items: items.length,
      items,
      data_quality: quality('live', 'Finnhub Sector'),
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/finnhub/quote/{symbol}',
      'GET /api/finnhub/profile/{symbol}',
      'GET /api/finnhub/news/{category}    · general|forex|crypto|merger',
      'GET /api/finnhub/company-news/{symbol}',
      'GET /api/finnhub/earnings',
      'GET /api/finnhub/dashboard          · ADRs ES + US tech + EU caps + crypto',
      'GET /api/finnhub/sector/{sector}    · defensa|energia|tech|banca_es',
    ],
    received: segs.join('/'),
  }, { status: 404 })
}
