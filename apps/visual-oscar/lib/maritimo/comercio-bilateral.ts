/**
 * lib/maritimo/comercio-bilateral.ts · Capa de COMERCIO BILATERAL entre países.
 *
 * Provee los flujos comerciales (exportaciones / importaciones / balanza)
 * por pareja de países para alimentar:
 *   - arcos origen→destino en el mapa marítimo (WorldShippingMap)
 *   - Sankey reporter → partner (BilateralTradeSankey)
 *   - tablas de top socios y balanza
 *
 * Fuentes (reutiliza las ya integradas en /api/comtrade y /api/oec):
 *   1. PRIMARIA · UN Comtrade · comtradeapi.un.org · gratuita, keyless
 *      (anónimo ~100 calls/día). Si existe COMTRADE_API_KEY se usa el
 *      subscription-key (~250/día). Datos oficiales declarados a la ONU.
 *   2. FALLBACK · OEC · api-v2.oec.world · datos BACI/CEPII públicos sin
 *      token. Se usa si Comtrade falla (rate-limit, 4xx, red).
 *
 * Reglas del repo:
 *   - NUNCA inventa datos: degrada honesto con { ok:false, error } / arrays vacíos.
 *   - NUNCA hardcodea claves (subscription-key vía process.env.COMTRADE_API_KEY).
 *
 * EXPORTA tipos { BilateralFlow, TopPartner } + funciones fetchBilateral(),
 * fetchTopPartners(), buildBilateralResult().
 */

// ─────────────────────────────────────────────────────────────────
// Tipos exportados · shapes canónicos para mapa / Sankey / tablas
// ─────────────────────────────────────────────────────────────────

export type FlowDirection = 'export' | 'import'

/**
 * Flujo comercial entre una pareja de países en una dirección.
 * Apto para construir un arco (reporter→partner) o un link de Sankey.
 */
export interface BilateralFlow {
  reporter_iso: string   // alpha-3, p.ej. 'ESP'
  partner_iso: string    // alpha-3, p.ej. 'DEU'
  partner_name: string   // nombre legible, p.ej. 'Germany'
  flow_kind: FlowDirection
  value_usd: number
  value_fmt: string      // p.ej. '33.4B'
  year: number
  source: 'comtrade' | 'oec'
}

/** Socio comercial agregado · una fila de tabla / un nodo del Sankey. */
export interface TopPartner {
  partner_iso: string    // alpha-3 cuando se conoce, si no el código de origen
  partner_name: string
  value_usd: number
  value_fmt: string
  share_pct: number      // % sobre el total de la dirección
  flow_kind: FlowDirection
}

/** Balanza comercial agregada del reporter con todos sus socios. */
export interface TradeBalance {
  exports_usd: number
  imports_usd: number
  balance_usd: number
  exports_fmt: string
  imports_fmt: string
  balance_fmt: string
}

/** Resultado completo de la capa · alimenta el envelope del endpoint. */
export interface BilateralResult {
  ok: boolean
  reporter: string
  partner: string | null
  year: number
  top_export: TopPartner[]
  top_import: TopPartner[]
  balanza: TradeBalance
  pares: BilateralFlow[]
  source: 'comtrade' | 'oec' | 'none'
  source_url: string
  error?: string
}

// ─────────────────────────────────────────────────────────────────
// Catálogo de países · alpha-3 ↔ ISO numeric ↔ OEC id ↔ nombre
// Cubre los socios comerciales relevantes para España + grandes economías.
// Se usa para traducir el parámetro `reporter`/`partner` entre fuentes y
// para resolver alpha-3 desde el ISO numeric que devuelve Comtrade.
// ─────────────────────────────────────────────────────────────────

interface CountryRef {
  iso3: string
  num: string      // ISO 3166-1 numeric (Comtrade reporterCode/partnerCode)
  oec: string      // OEC country id (continent prefix + iso3 lower)
  name: string
}

const COUNTRIES: CountryRef[] = [
  { iso3: 'ESP', num: '724', oec: 'euesp', name: 'Spain' },
  { iso3: 'DEU', num: '276', oec: 'eudeu', name: 'Germany' },
  { iso3: 'FRA', num: '251', oec: 'eufra', name: 'France' },
  { iso3: 'ITA', num: '381', oec: 'euita', name: 'Italy' },
  { iso3: 'PRT', num: '620', oec: 'euprt', name: 'Portugal' },
  { iso3: 'NLD', num: '528', oec: 'eunld', name: 'Netherlands' },
  { iso3: 'BEL', num: '56', oec: 'eubel', name: 'Belgium' },
  { iso3: 'GBR', num: '826', oec: 'eugbr', name: 'United Kingdom' },
  { iso3: 'IRL', num: '372', oec: 'euirl', name: 'Ireland' },
  { iso3: 'POL', num: '616', oec: 'eupol', name: 'Poland' },
  { iso3: 'GRC', num: '300', oec: 'eugrc', name: 'Greece' },
  { iso3: 'AUT', num: '40', oec: 'euaut', name: 'Austria' },
  { iso3: 'DNK', num: '208', oec: 'eudnk', name: 'Denmark' },
  { iso3: 'FIN', num: '246', oec: 'eufin', name: 'Finland' },
  { iso3: 'SWE', num: '752', oec: 'eswe', name: 'Sweden' },
  { iso3: 'CZE', num: '203', oec: 'eucze', name: 'Czechia' },
  { iso3: 'ROU', num: '642', oec: 'eurou', name: 'Romania' },
  { iso3: 'HUN', num: '348', oec: 'euhun', name: 'Hungary' },
  { iso3: 'CHE', num: '756', oec: 'euche', name: 'Switzerland' },
  { iso3: 'NOR', num: '578', oec: 'eunor', name: 'Norway' },
  { iso3: 'USA', num: '842', oec: 'nausa', name: 'United States' },
  { iso3: 'CAN', num: '124', oec: 'nacan', name: 'Canada' },
  { iso3: 'MEX', num: '484', oec: 'namex', name: 'Mexico' },
  { iso3: 'BRA', num: '76', oec: 'sabra', name: 'Brazil' },
  { iso3: 'ARG', num: '32', oec: 'saarg', name: 'Argentina' },
  { iso3: 'CHL', num: '152', oec: 'sachl', name: 'Chile' },
  { iso3: 'CHN', num: '156', oec: 'aschn', name: 'China' },
  { iso3: 'JPN', num: '392', oec: 'asjpn', name: 'Japan' },
  { iso3: 'KOR', num: '410', oec: 'askor', name: 'South Korea' },
  { iso3: 'IND', num: '699', oec: 'asind', name: 'India' },
  { iso3: 'TUR', num: '792', oec: 'astur', name: 'Turkey' },
  { iso3: 'SAU', num: '682', oec: 'assau', name: 'Saudi Arabia' },
  { iso3: 'ARE', num: '784', oec: 'asare', name: 'United Arab Emirates' },
  { iso3: 'SGP', num: '702', oec: 'assgp', name: 'Singapore' },
  { iso3: 'MAR', num: '504', oec: 'afmar', name: 'Morocco' },
  { iso3: 'DZA', num: '12', oec: 'afdza', name: 'Algeria' },
  { iso3: 'EGY', num: '818', oec: 'afegy', name: 'Egypt' },
  { iso3: 'NGA', num: '566', oec: 'afnga', name: 'Nigeria' },
  { iso3: 'ZAF', num: '710', oec: 'afzaf', name: 'South Africa' },
  { iso3: 'RUS', num: '643', oec: 'eurus', name: 'Russia' },
  { iso3: 'AUS', num: '36', oec: 'ocaus', name: 'Australia' },
]

const BY_ISO3 = new Map(COUNTRIES.map((c) => [c.iso3, c]))
const BY_NUM = new Map(COUNTRIES.map((c) => [c.num, c]))
const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]))

/** Resuelve un país desde alpha-3 / numeric / nombre. */
function resolveCountry(code: string | null | undefined): CountryRef | null {
  if (!code) return null
  const k = code.trim()
  if (!k) return null
  return (
    BY_ISO3.get(k.toUpperCase()) ??
    BY_NUM.get(k) ??
    BY_NAME.get(k.toLowerCase()) ??
    null
  )
}

/** alpha-3 desde un ISO numeric devuelto por Comtrade (o el numeric si no se conoce). */
function iso3FromNum(num: string | number): string {
  const ref = BY_NUM.get(String(num))
  return ref ? ref.iso3 : String(num)
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

export function fmtUSD(v: number): string {
  if (!v || isNaN(v)) return '—'
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}K`
  return `${sign}${a.toFixed(0)}`
}

function defaultYear(): number {
  // Comtrade/OEC publican con ~1 año de retraso → último año cerrado.
  return new Date().getFullYear() - 1
}

const COMTRADE_API = 'https://comtradeapi.un.org/data/v1/get'
const OEC_API = 'https://api-v2.oec.world/tesseract/data.jsonrecords'
const OEC_CUBE = 'trade_i_baci_a_22'
const COMTRADE_DOC = 'https://comtradeplus.un.org'
const OEC_DOC = 'https://oec.world'

// ─────────────────────────────────────────────────────────────────
// UN Comtrade · fuente primaria (keyless / subscription-key)
// ─────────────────────────────────────────────────────────────────

interface ComtradeQuery {
  reporterCode: string
  partnerCode: string      // numeric, '0' = world, 'all' = todos los socios
  flowCode: 'X' | 'M'      // X=exportaciones, M=importaciones
  period: string           // YYYY
  cmdCode?: string         // 'TOTAL'
}

async function comtradeFetch(q: ComtradeQuery): Promise<any> {
  const apiKey = process.env.COMTRADE_API_KEY
  const params: Record<string, string> = {
    reporterCode: q.reporterCode,
    partnerCode: q.partnerCode,
    flowCode: q.flowCode,
    period: q.period,
    cmdCode: q.cmdCode || 'TOTAL',
    motCode: '0',
    customsCode: 'C00',
    partner2Code: '0',
  }
  const qs = new URLSearchParams(params)
  if (apiKey) qs.set('subscription-key', apiKey)
  const url = `${COMTRADE_API}/C/A/HS?${qs}`
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}),
      },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 401 || r.status === 403) return { error: `unauthorized HTTP ${r.status}` }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

/** Top socios de una dirección vía Comtrade (partnerCode='all'). */
async function comtradeTopPartners(
  reporter: CountryRef,
  flow: 'X' | 'M',
  year: number,
): Promise<{ partners: TopPartner[]; total: number } | { error: string }> {
  const data = await comtradeFetch({
    reporterCode: reporter.num,
    partnerCode: 'all',
    flowCode: flow,
    period: String(year),
  })
  if (data?.error) return { error: data.error }
  const rows: any[] = Array.isArray(data?.data) ? data.data : []
  const dir: FlowDirection = flow === 'X' ? 'export' : 'import'
  const cleaned = rows
    .filter((r) => Number(r.partnerCode) !== 0 && r.partnerDesc !== 'World')
    .map((r) => ({
      partner_iso: iso3FromNum(r.partnerCode),
      partner_name: r.partnerDesc || iso3FromNum(r.partnerCode),
      value_usd: Number(r.primaryValue) || 0,
    }))
    .filter((r) => r.value_usd > 0)
    .sort((a, b) => b.value_usd - a.value_usd)
  const total = cleaned.reduce((s, x) => s + x.value_usd, 0)
  const partners: TopPartner[] = cleaned.slice(0, 15).map((r) => ({
    partner_iso: r.partner_iso,
    partner_name: r.partner_name,
    value_usd: r.value_usd,
    value_fmt: fmtUSD(r.value_usd),
    share_pct: total > 0 ? Math.round((r.value_usd / total) * 1000) / 10 : 0,
    flow_kind: dir,
  }))
  return { partners, total }
}

/** Flujos bilaterales reporter↔partner (ambas direcciones) vía Comtrade. */
async function comtradeBilateral(
  reporter: CountryRef,
  partner: CountryRef,
  year: number,
): Promise<{ pares: BilateralFlow[] } | { error: string }> {
  const [exp, imp] = await Promise.all([
    comtradeFetch({ reporterCode: reporter.num, partnerCode: partner.num, flowCode: 'X', period: String(year) }),
    comtradeFetch({ reporterCode: reporter.num, partnerCode: partner.num, flowCode: 'M', period: String(year) }),
  ])
  if (exp?.error && imp?.error) return { error: exp.error }
  const sum = (rows: any[]) =>
    (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (Number(r.primaryValue) || 0), 0)
  const expTotal = sum(exp?.data)
  const impTotal = sum(imp?.data)
  const pares: BilateralFlow[] = []
  if (expTotal > 0) {
    pares.push({
      reporter_iso: reporter.iso3,
      partner_iso: partner.iso3,
      partner_name: partner.name,
      flow_kind: 'export',
      value_usd: expTotal,
      value_fmt: fmtUSD(expTotal),
      year,
      source: 'comtrade',
    })
  }
  if (impTotal > 0) {
    pares.push({
      reporter_iso: reporter.iso3,
      partner_iso: partner.iso3,
      partner_name: partner.name,
      flow_kind: 'import',
      value_usd: impTotal,
      value_fmt: fmtUSD(impTotal),
      year,
      source: 'comtrade',
    })
  }
  return { pares }
}

// ─────────────────────────────────────────────────────────────────
// OEC · fallback público (sin token)
// ─────────────────────────────────────────────────────────────────

async function oecFetch(params: Record<string, string>): Promise<any> {
  const token = process.env.OEC_API_TOKEN
  const qs = new URLSearchParams({ ...params, ...(token ? { token } : {}) })
  try {
    const r = await fetch(`${OEC_API}?${qs}`, {
      headers: {
        Accept: 'application/json',
        // OEC bloquea el User-Agent default de fetch en datacenter (HTTP 403).
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)',
      },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

/** Top socios vía OEC · drilldown sobre la contraparte. */
async function oecTopPartners(
  reporter: CountryRef,
  flow: FlowDirection,
  year: number,
): Promise<{ partners: TopPartner[]; total: number } | { error: string }> {
  const drill = flow === 'import' ? 'Exporter Country' : 'Importer Country'
  const include =
    flow === 'import'
      ? `Importer Country:${reporter.oec};Year:${year}`
      : `Exporter Country:${reporter.oec};Year:${year}`
  const data = await oecFetch({
    cube: OEC_CUBE,
    drilldowns: drill,
    measures: 'Trade Value',
    include,
    sort: 'Trade Value desc',
    limit: '40,0',
  })
  if (data?.error) return { error: data.error }
  const rows: any[] = Array.isArray(data?.data) ? data.data : []
  const cleaned = rows
    .map((r) => {
      const oecId: string = r[`${drill} ID`] || ''
      const iso3 = oecId.length >= 3 ? oecId.slice(2).toUpperCase() : oecId.toUpperCase()
      return {
        partner_iso: BY_ISO3.has(iso3) ? iso3 : iso3,
        partner_name: r[drill] || iso3,
        value_usd: Number(r['Trade Value']) || 0,
      }
    })
    .filter((r) => r.value_usd > 0)
    .sort((a, b) => b.value_usd - a.value_usd)
  const total = cleaned.reduce((s, x) => s + x.value_usd, 0)
  const partners: TopPartner[] = cleaned.slice(0, 15).map((r) => ({
    partner_iso: r.partner_iso,
    partner_name: r.partner_name,
    value_usd: r.value_usd,
    value_fmt: fmtUSD(r.value_usd),
    share_pct: total > 0 ? Math.round((r.value_usd / total) * 1000) / 10 : 0,
    flow_kind: flow,
  }))
  return { partners, total }
}

/** Flujos bilaterales reporter↔partner vía OEC. */
async function oecBilateral(
  reporter: CountryRef,
  partner: CountryRef,
  year: number,
): Promise<{ pares: BilateralFlow[] } | { error: string }> {
  const [exp, imp] = await Promise.all([
    oecFetch({
      cube: OEC_CUBE,
      drilldowns: 'Year',
      measures: 'Trade Value',
      include: `Exporter Country:${reporter.oec};Importer Country:${partner.oec};Year:${year}`,
      limit: '1,0',
    }),
    oecFetch({
      cube: OEC_CUBE,
      drilldowns: 'Year',
      measures: 'Trade Value',
      include: `Exporter Country:${partner.oec};Importer Country:${reporter.oec};Year:${year}`,
      limit: '1,0',
    }),
  ])
  if (exp?.error && imp?.error) return { error: exp.error }
  const sum = (d: any) =>
    (Array.isArray(d?.data) ? d.data : []).reduce(
      (s: number, r: any) => s + (Number(r['Trade Value']) || 0),
      0,
    )
  const expTotal = sum(exp)
  const impTotal = sum(imp)
  const pares: BilateralFlow[] = []
  if (expTotal > 0) {
    pares.push({
      reporter_iso: reporter.iso3,
      partner_iso: partner.iso3,
      partner_name: partner.name,
      flow_kind: 'export',
      value_usd: expTotal,
      value_fmt: fmtUSD(expTotal),
      year,
      source: 'oec',
    })
  }
  if (impTotal > 0) {
    pares.push({
      reporter_iso: reporter.iso3,
      partner_iso: partner.iso3,
      partner_name: partner.name,
      flow_kind: 'import',
      value_usd: impTotal,
      value_fmt: fmtUSD(impTotal),
      year,
      source: 'oec',
    })
  }
  return { pares }
}

// ─────────────────────────────────────────────────────────────────
// API pública de la capa · degradación honesta Comtrade → OEC → vacío
// ─────────────────────────────────────────────────────────────────

function balanceFrom(topExport: TopPartner[], topImport: TopPartner[], expTotal: number, impTotal: number): TradeBalance {
  // expTotal/impTotal vienen del total real de cada dirección (no del top-15).
  const e = expTotal || topExport.reduce((s, x) => s + x.value_usd, 0)
  const i = impTotal || topImport.reduce((s, x) => s + x.value_usd, 0)
  return {
    exports_usd: e,
    imports_usd: i,
    balance_usd: e - i,
    exports_fmt: fmtUSD(e),
    imports_fmt: fmtUSD(i),
    balance_fmt: fmtUSD(e - i),
  }
}

/**
 * fetchTopPartners(reporter, flow, year?) · ranking de socios de una dirección.
 * Comtrade primero, OEC fallback. Devuelve { partners, total, source }.
 */
export async function fetchTopPartners(
  reporter: string,
  flow: FlowDirection,
  year?: number,
): Promise<{ partners: TopPartner[]; total: number; source: 'comtrade' | 'oec' | 'none'; error?: string }> {
  const ref = resolveCountry(reporter)
  const yr = year ?? defaultYear()
  if (!ref) {
    return { partners: [], total: 0, source: 'none', error: `reporter desconocido: ${reporter}` }
  }
  const ct = await comtradeTopPartners(ref, flow === 'import' ? 'M' : 'X', yr)
  if (!('error' in ct) && ct.partners.length > 0) {
    return { partners: ct.partners, total: ct.total, source: 'comtrade' }
  }
  const oe = await oecTopPartners(ref, flow, yr)
  if (!('error' in oe) && oe.partners.length > 0) {
    return { partners: oe.partners, total: oe.total, source: 'oec' }
  }
  const err = ('error' in ct ? ct.error : '') || ('error' in oe ? oe.error : '') || 'sin datos'
  return { partners: [], total: 0, source: 'none', error: err }
}

/**
 * fetchBilateral(reporter, partner?, year?) · flujos por pareja de países.
 *
 * - Si `partner` se especifica → flujos export+import de esa pareja.
 * - Si `partner` es null/'' → top socios export e import del reporter
 *   (cada uno se convierte en un par BilateralFlow reporter→partner para
 *   alimentar arcos del mapa).
 *
 * Degrada honesto: Comtrade → OEC → arrays vacíos con `error`.
 */
export async function fetchBilateral(
  reporter: string,
  partner?: string | null,
  year?: number,
): Promise<{ pares: BilateralFlow[]; source: 'comtrade' | 'oec' | 'none'; error?: string }> {
  const ref = resolveCountry(reporter)
  const yr = year ?? defaultYear()
  if (!ref) {
    return { pares: [], source: 'none', error: `reporter desconocido: ${reporter}` }
  }

  // Caso pareja concreta.
  const partnerRef = partner ? resolveCountry(partner) : null
  if (partner && !partnerRef) {
    return { pares: [], source: 'none', error: `partner desconocido: ${partner}` }
  }
  if (partnerRef) {
    const ct = await comtradeBilateral(ref, partnerRef, yr)
    if (!('error' in ct) && ct.pares.length > 0) {
      return { pares: ct.pares, source: 'comtrade' }
    }
    const oe = await oecBilateral(ref, partnerRef, yr)
    if (!('error' in oe) && oe.pares.length > 0) {
      return { pares: oe.pares, source: 'oec' }
    }
    const err = ('error' in ct ? ct.error : '') || ('error' in oe ? oe.error : '') || 'sin datos'
    return { pares: [], source: 'none', error: err }
  }

  // Caso sin partner → top socios (ambas direcciones) como pares de arcos.
  const [expRank, impRank] = await Promise.all([
    fetchTopPartners(ref.iso3, 'export', yr),
    fetchTopPartners(ref.iso3, 'import', yr),
  ])
  const source: 'comtrade' | 'oec' | 'none' =
    expRank.source !== 'none' ? expRank.source : impRank.source
  const pares: BilateralFlow[] = [
    ...expRank.partners.slice(0, 12).map((p) => ({
      reporter_iso: ref.iso3,
      partner_iso: p.partner_iso,
      partner_name: p.partner_name,
      flow_kind: 'export' as FlowDirection,
      value_usd: p.value_usd,
      value_fmt: p.value_fmt,
      year: yr,
      source: source === 'none' ? 'comtrade' : source,
    })),
    ...impRank.partners.slice(0, 12).map((p) => ({
      reporter_iso: ref.iso3,
      partner_iso: p.partner_iso,
      partner_name: p.partner_name,
      flow_kind: 'import' as FlowDirection,
      value_usd: p.value_usd,
      value_fmt: p.value_fmt,
      year: yr,
      source: source === 'none' ? 'comtrade' : source,
    })),
  ]
  if (pares.length === 0) {
    return { pares: [], source: 'none', error: expRank.error || impRank.error || 'sin datos' }
  }
  return { pares, source }
}

/**
 * buildBilateralResult(reporter, partner?, year?) · resultado completo de la
 * capa, listo para el envelope del endpoint: top_export, top_import, balanza,
 * pares. Orquesta top-partners + bilateral con la fuente coherente.
 */
export async function buildBilateralResult(
  reporter: string,
  partner?: string | null,
  year?: number,
): Promise<BilateralResult> {
  const ref = resolveCountry(reporter)
  const yr = year ?? defaultYear()
  if (!ref) {
    return {
      ok: false,
      reporter: reporter.toUpperCase(),
      partner: partner ? partner.toUpperCase() : null,
      year: yr,
      top_export: [],
      top_import: [],
      balanza: balanceFrom([], [], 0, 0),
      pares: [],
      source: 'none',
      source_url: COMTRADE_DOC,
      error: `reporter desconocido: ${reporter}`,
    }
  }

  const [expRank, impRank, bilateral] = await Promise.all([
    fetchTopPartners(ref.iso3, 'export', yr),
    fetchTopPartners(ref.iso3, 'import', yr),
    fetchBilateral(ref.iso3, partner ?? null, yr),
  ])

  const source: 'comtrade' | 'oec' | 'none' =
    expRank.source !== 'none'
      ? expRank.source
      : impRank.source !== 'none'
        ? impRank.source
        : bilateral.source

  const ok = source !== 'none' && (expRank.partners.length > 0 || impRank.partners.length > 0)
  const sourceUrl = source === 'oec' ? OEC_DOC : COMTRADE_DOC

  // Si el usuario pidió una pareja concreta, sus flujos van en `pares`;
  // si no, `pares` lleva los arcos top derivados de los rankings.
  const pares = partner ? bilateral.pares : bilateral.pares

  return {
    ok,
    reporter: ref.iso3,
    partner: partner ? (resolveCountry(partner)?.iso3 ?? partner.toUpperCase()) : null,
    year: yr,
    top_export: expRank.partners,
    top_import: impRank.partners,
    balanza: balanceFrom(expRank.partners, impRank.partners, expRank.total, impRank.total),
    pares,
    source,
    source_url: sourceUrl,
    ...(ok ? {} : { error: expRank.error || impRank.error || bilateral.error || 'sin datos' }),
  }
}
