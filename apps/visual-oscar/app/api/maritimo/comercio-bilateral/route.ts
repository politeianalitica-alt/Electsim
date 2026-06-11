/**
 * /api/maritimo/comercio-bilateral · Capa de COMERCIO BILATERAL entre países.
 *
 * Alimenta arcos del mapa marítimo + tablas de top socios y balanza
 * (ComercioBilateralRich, MaritimoVisionGlobal).
 *
 * GET ?reporter=ESP&partner=&year=
 *   - reporter (alpha-3 | ISO numeric | nombre). Default ESP.
 *   - partner  (opcional). Si se da → flujos de esa pareja; si no → top socios.
 *   - year     (opcional). Si no se da, se intenta el último año con datos.
 *
 * Cadena de fuentes (degradación honesta · HTTP 200 SIEMPRE):
 *   1. UN Comtrade vía lib/maritimo/comercio-bilateral — SOLO si existe
 *      COMTRADE_API_KEY. VERIFICADO con curl (jun 2026): el acceso keyless
 *      devuelve HTTP 401 "missing subscription key" (ya no existe modo
 *      anónimo) y los periodos sin datos anuales (p. ej. 2025) devuelven
 *      4xx → era la causa del "HTTP 400" en producción.
 *   2. OEC directo (api-v2.oec.world · BACI/CEPII, sin token), con dos
 *      correcciones VERIFICADAS con curl contra el servicio real:
 *      - orden: tesseract exige `sort=Trade Value.desc` (con punto); la
 *        variante con espacio se ignora y el ranking llega arbitrario.
 *      - cascada de años: el cubo trade_i_baci_a_22 cubre 2022-2024; pedir
 *        "año actual − 1" (2025) devuelve `data:[]`. Se intenta yr, yr−1, yr−2.
 *   3. Seed TRADE_SEED (lib/ports-seed) · estimaciones de referencia ≈2024
 *      marcadas con data_quality.source_type='seed'. La pestaña NUNCA queda
 *      vacía para los reporters cubiertos por el seed (ESP, DEU, FRA, PRT).
 *
 * Envelope (compatible con los consumidores actuales · solo AÑADE data_quality):
 *   {
 *     ok,
 *     data: { reporter, partner, year, top_export[], top_import[], balanza, pares[], source },
 *     error,
 *     fetched_at,
 *     source_url,
 *     data_quality: { source_type: 'live'|'seed'|'none', source, note }
 *   }
 *
 * Cache: s-maxage=21600 (6 h). Cero emojis. Comentarios en español.
 */
import { NextResponse } from 'next/server'
import {
  buildBilateralResult,
  fmtUSD,
  type BilateralFlow,
  type FlowDirection,
  type TopPartner,
  type TradeBalance,
} from '@/lib/maritimo/comercio-bilateral'
import { TRADE_SEED } from '@/lib/ports-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE = 'public, s-maxage=21600, stale-while-revalidate=43200'

const OEC_API = 'https://api-v2.oec.world/tesseract/data.jsonrecords'
const OEC_CUBE = 'trade_i_baci_a_22'
const COMTRADE_DOC = 'https://comtradeplus.un.org'
const OEC_DOC = 'https://oec.world'

/** Año de referencia de las magnitudes del seed (estimaciones ≈2024). */
const SEED_YEAR = 2024

// ─────────────────────────────────────────────────────────────────
// Catálogo de países · alpha-3 ↔ ISO numeric ↔ OEC id ↔ nombre ES
// (el id OEC de Suecia es `euswe`, verificado con curl; la lib interna
// arrastra la errata `eswe` que devuelve vacío).
// ─────────────────────────────────────────────────────────────────

interface PaisRef {
  iso3: string
  num: string     // código numérico que usa Comtrade (reporterCode)
  oec: string     // id de país en OEC (prefijo de continente + iso3 lower)
  nombre: string  // nombre en español para la UI
}

const PAISES: PaisRef[] = [
  { iso3: 'ESP', num: '724', oec: 'euesp', nombre: 'España' },
  { iso3: 'DEU', num: '276', oec: 'eudeu', nombre: 'Alemania' },
  { iso3: 'FRA', num: '251', oec: 'eufra', nombre: 'Francia' },
  { iso3: 'ITA', num: '381', oec: 'euita', nombre: 'Italia' },
  { iso3: 'PRT', num: '620', oec: 'euprt', nombre: 'Portugal' },
  { iso3: 'NLD', num: '528', oec: 'eunld', nombre: 'Países Bajos' },
  { iso3: 'BEL', num: '56', oec: 'eubel', nombre: 'Bélgica' },
  { iso3: 'GBR', num: '826', oec: 'eugbr', nombre: 'Reino Unido' },
  { iso3: 'IRL', num: '372', oec: 'euirl', nombre: 'Irlanda' },
  { iso3: 'POL', num: '616', oec: 'eupol', nombre: 'Polonia' },
  { iso3: 'GRC', num: '300', oec: 'eugrc', nombre: 'Grecia' },
  { iso3: 'AUT', num: '40', oec: 'euaut', nombre: 'Austria' },
  { iso3: 'DNK', num: '208', oec: 'eudnk', nombre: 'Dinamarca' },
  { iso3: 'FIN', num: '246', oec: 'eufin', nombre: 'Finlandia' },
  { iso3: 'SWE', num: '752', oec: 'euswe', nombre: 'Suecia' },
  { iso3: 'CZE', num: '203', oec: 'eucze', nombre: 'Chequia' },
  { iso3: 'ROU', num: '642', oec: 'eurou', nombre: 'Rumanía' },
  { iso3: 'HUN', num: '348', oec: 'euhun', nombre: 'Hungría' },
  { iso3: 'CHE', num: '756', oec: 'euche', nombre: 'Suiza' },
  { iso3: 'NOR', num: '578', oec: 'eunor', nombre: 'Noruega' },
  { iso3: 'USA', num: '842', oec: 'nausa', nombre: 'Estados Unidos' },
  { iso3: 'CAN', num: '124', oec: 'nacan', nombre: 'Canadá' },
  { iso3: 'MEX', num: '484', oec: 'namex', nombre: 'México' },
  { iso3: 'BRA', num: '76', oec: 'sabra', nombre: 'Brasil' },
  { iso3: 'ARG', num: '32', oec: 'saarg', nombre: 'Argentina' },
  { iso3: 'CHL', num: '152', oec: 'sachl', nombre: 'Chile' },
  { iso3: 'CHN', num: '156', oec: 'aschn', nombre: 'China' },
  { iso3: 'JPN', num: '392', oec: 'asjpn', nombre: 'Japón' },
  { iso3: 'KOR', num: '410', oec: 'askor', nombre: 'Corea del Sur' },
  { iso3: 'IND', num: '699', oec: 'asind', nombre: 'India' },
  { iso3: 'TUR', num: '792', oec: 'astur', nombre: 'Turquía' },
  { iso3: 'SAU', num: '682', oec: 'assau', nombre: 'Arabia Saudí' },
  { iso3: 'ARE', num: '784', oec: 'asare', nombre: 'Emiratos Árabes Unidos' },
  { iso3: 'SGP', num: '702', oec: 'assgp', nombre: 'Singapur' },
  { iso3: 'MAR', num: '504', oec: 'afmar', nombre: 'Marruecos' },
  { iso3: 'DZA', num: '12', oec: 'afdza', nombre: 'Argelia' },
  { iso3: 'EGY', num: '818', oec: 'afegy', nombre: 'Egipto' },
  { iso3: 'NGA', num: '566', oec: 'afnga', nombre: 'Nigeria' },
  { iso3: 'ZAF', num: '710', oec: 'afzaf', nombre: 'Sudáfrica' },
  { iso3: 'RUS', num: '643', oec: 'eurus', nombre: 'Rusia' },
  { iso3: 'AUS', num: '36', oec: 'ocaus', nombre: 'Australia' },
]

const POR_ISO3 = new Map(PAISES.map((p) => [p.iso3, p]))
const POR_NUM = new Map(PAISES.map((p) => [p.num, p]))
const POR_NOMBRE = new Map(PAISES.map((p) => [p.nombre.toLowerCase(), p]))

/** Resuelve un país desde alpha-3 / numeric / nombre en español. */
function resolvePais(code: string | null | undefined): PaisRef | null {
  if (!code) return null
  const k = code.trim()
  if (!k) return null
  return POR_ISO3.get(k.toUpperCase()) ?? POR_NUM.get(k) ?? POR_NOMBRE.get(k.toLowerCase()) ?? null
}

// ─────────────────────────────────────────────────────────────────
// Tipos de salida · superconjunto de los de la lib (añade source 'seed')
// ─────────────────────────────────────────────────────────────────

type FuenteDato = 'comtrade' | 'oec' | 'seed'
type FlujoSalida = Omit<BilateralFlow, 'source'> & { source: FuenteDato }

interface DataQuality {
  source_type: 'live' | 'seed' | 'none'
  source: FuenteDato | 'none'
  note: string | null
}

interface Bloques {
  top_export: TopPartner[]
  top_import: TopPartner[]
  balanza: TradeBalance
  pares: FlujoSalida[]
}

function balanzaDesde(expTotal: number, impTotal: number): TradeBalance {
  return {
    exports_usd: expTotal,
    imports_usd: impTotal,
    balance_usd: expTotal - impTotal,
    exports_fmt: fmtUSD(expTotal),
    imports_fmt: fmtUSD(impTotal),
    balance_fmt: fmtUSD(expTotal - impTotal),
  }
}

const BALANZA_VACIA: TradeBalance = {
  exports_usd: 0,
  imports_usd: 0,
  balance_usd: 0,
  exports_fmt: '—',
  imports_fmt: '—',
  balance_fmt: '—',
}

// ─────────────────────────────────────────────────────────────────
// OEC directo · consulta corregida (sort con punto + año con datos)
// Campos VERIFICADOS con curl: columns = ["<drill> ID", "<drill>", "Trade Value"].
// ─────────────────────────────────────────────────────────────────

async function oecJson(params: Record<string, string>): Promise<any> {
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
    if (!r.ok) return { error: `OEC HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

interface SocioCrudo {
  iso3: string
  nombre: string
  value_usd: number
}

/** Top-15 socios de una dirección, ya ordenados por el servidor (desc). */
async function oecRanking(
  ref: PaisRef,
  flow: FlowDirection,
  year: number,
): Promise<{ socios: SocioCrudo[] } | { error: string }> {
  const drill = flow === 'export' ? 'Importer Country' : 'Exporter Country'
  const include =
    flow === 'export'
      ? `Exporter Country:${ref.oec};Year:${year}`
      : `Importer Country:${ref.oec};Year:${year}`
  const data = await oecJson({
    cube: OEC_CUBE,
    drilldowns: drill,
    measures: 'Trade Value',
    include,
    // OJO: tesseract exige `Medida.desc` (con punto). `Trade Value desc`
    // (con espacio) se ignora en silencio y el orden llega arbitrario.
    sort: 'Trade Value.desc',
    limit: '15,0',
  })
  if (data?.error) return { error: String(data.error) }
  const rows: any[] = Array.isArray(data?.data) ? data.data : []
  const socios = rows
    .map((r) => {
      const oecId = String(r[`${drill} ID`] || '')
      // id OEC = prefijo de continente (2) + iso3 lower, p. ej. 'eufra' → FRA.
      const iso3 = oecId.length >= 5 ? oecId.slice(2).toUpperCase() : oecId.toUpperCase()
      return {
        iso3,
        nombre: POR_ISO3.get(iso3)?.nombre || String(r[drill] || iso3),
        value_usd: Number(r['Trade Value']) || 0,
      }
    })
    .filter((s) => s.value_usd > 0)
  return { socios }
}

/** Total mundial de una dirección (drilldown Year) · para balanza y % cuota. */
async function oecTotal(ref: PaisRef, flow: FlowDirection, year: number): Promise<number> {
  const include =
    flow === 'export'
      ? `Exporter Country:${ref.oec};Year:${year}`
      : `Importer Country:${ref.oec};Year:${year}`
  const data = await oecJson({
    cube: OEC_CUBE,
    drilldowns: 'Year',
    measures: 'Trade Value',
    include,
    limit: '1,0',
  })
  if (data?.error) return 0
  const rows: any[] = Array.isArray(data?.data) ? data.data : []
  return Number(rows[0]?.['Trade Value']) || 0
}

/** Valor del flujo exportador→importador de una pareja concreta. */
async function oecPar(exportador: PaisRef, importador: PaisRef, year: number): Promise<number> {
  const data = await oecJson({
    cube: OEC_CUBE,
    drilldowns: 'Year',
    measures: 'Trade Value',
    include: `Exporter Country:${exportador.oec};Importer Country:${importador.oec};Year:${year}`,
    limit: '1,0',
  })
  if (data?.error) return 0
  const rows: any[] = Array.isArray(data?.data) ? data.data : []
  return Number(rows[0]?.['Trade Value']) || 0
}

function aTopPartners(socios: SocioCrudo[], total: number, flow: FlowDirection): TopPartner[] {
  const base = total > 0 ? total : socios.reduce((s, x) => s + x.value_usd, 0)
  return socios.map((s) => ({
    partner_iso: s.iso3,
    partner_name: s.nombre,
    value_usd: s.value_usd,
    value_fmt: fmtUSD(s.value_usd),
    share_pct: base > 0 ? Math.round((s.value_usd / base) * 1000) / 10 : 0,
    flow_kind: flow,
  }))
}

/** Bloques completos desde OEC para un año concreto (o error honesto). */
async function construirDesdeOec(
  ref: PaisRef,
  partnerRef: PaisRef | null,
  year: number,
): Promise<Bloques | { error: string }> {
  const [expRank, impRank, expTot, impTot, parExp, parImp] = await Promise.all([
    oecRanking(ref, 'export', year),
    oecRanking(ref, 'import', year),
    oecTotal(ref, 'export', year),
    oecTotal(ref, 'import', year),
    partnerRef ? oecPar(ref, partnerRef, year) : Promise.resolve(0),
    partnerRef ? oecPar(partnerRef, ref, year) : Promise.resolve(0),
  ])

  const expSocios = 'error' in expRank ? [] : expRank.socios
  const impSocios = 'error' in impRank ? [] : impRank.socios
  if (expSocios.length === 0 && impSocios.length === 0) {
    const err =
      ('error' in expRank ? expRank.error : '') ||
      ('error' in impRank ? impRank.error : '') ||
      `sin datos BACI para ${year}`
    return { error: err }
  }

  const top_export = aTopPartners(expSocios, expTot, 'export')
  const top_import = aTopPartners(impSocios, impTot, 'import')

  const arco = (p: TopPartner, kind: FlowDirection): FlujoSalida => ({
    reporter_iso: ref.iso3,
    partner_iso: p.partner_iso,
    partner_name: p.partner_name,
    flow_kind: kind,
    value_usd: p.value_usd,
    value_fmt: p.value_fmt,
    year,
    source: 'oec',
  })

  // Con partner → flujos de la pareja; sin partner → arcos top de cada dirección.
  const pares: FlujoSalida[] = partnerRef
    ? ([
        parExp > 0
          ? {
              reporter_iso: ref.iso3,
              partner_iso: partnerRef.iso3,
              partner_name: partnerRef.nombre,
              flow_kind: 'export' as FlowDirection,
              value_usd: parExp,
              value_fmt: fmtUSD(parExp),
              year,
              source: 'oec' as FuenteDato,
            }
          : null,
        parImp > 0
          ? {
              reporter_iso: ref.iso3,
              partner_iso: partnerRef.iso3,
              partner_name: partnerRef.nombre,
              flow_kind: 'import' as FlowDirection,
              value_usd: parImp,
              value_fmt: fmtUSD(parImp),
              year,
              source: 'oec' as FuenteDato,
            }
          : null,
      ].filter(Boolean) as FlujoSalida[])
    : [
        ...top_export.slice(0, 12).map((p) => arco(p, 'export')),
        ...top_import.slice(0, 12).map((p) => arco(p, 'import')),
      ]

  return {
    top_export,
    top_import,
    balanza: balanzaDesde(
      expTot || top_export.reduce((s, x) => s + x.value_usd, 0),
      impTot || top_import.reduce((s, x) => s + x.value_usd, 0),
    ),
    pares,
  }
}

// ─────────────────────────────────────────────────────────────────
// Fallback seed · TRADE_SEED (lib/ports-seed) · estimaciones ≈2024
// ─────────────────────────────────────────────────────────────────

interface FilaSeed {
  reporter_iso: string
  partner_iso: string
  flow_kind: string
  value_usd: number
}

/** Bloques desde el seed, o null si el reporter no está cubierto. */
function construirDesdeSeed(reporterIso: string, partnerIso: string | null): Bloques | null {
  const filas = (TRADE_SEED as FilaSeed[]).filter((f) => f.reporter_iso === reporterIso)
  if (filas.length === 0) return null

  const exp = filas
    .filter((f) => f.flow_kind === 'export')
    .sort((a, b) => b.value_usd - a.value_usd)
  const imp = filas
    .filter((f) => f.flow_kind === 'import')
    .sort((a, b) => b.value_usd - a.value_usd)
  const totExp = exp.reduce((s, f) => s + f.value_usd, 0)
  const totImp = imp.reduce((s, f) => s + f.value_usd, 0)

  const aTop = (lista: FilaSeed[], total: number, kind: FlowDirection): TopPartner[] =>
    lista.slice(0, 15).map((f) => ({
      partner_iso: f.partner_iso,
      partner_name: POR_ISO3.get(f.partner_iso)?.nombre || f.partner_iso,
      value_usd: f.value_usd,
      value_fmt: fmtUSD(f.value_usd),
      share_pct: total > 0 ? Math.round((f.value_usd / total) * 1000) / 10 : 0,
      flow_kind: kind,
    }))

  const top_export = aTop(exp, totExp, 'export')
  const top_import = aTop(imp, totImp, 'import')

  const aFlujo = (f: FilaSeed): FlujoSalida => ({
    reporter_iso: reporterIso,
    partner_iso: f.partner_iso,
    partner_name: POR_ISO3.get(f.partner_iso)?.nombre || f.partner_iso,
    flow_kind: f.flow_kind === 'import' ? 'import' : 'export',
    value_usd: f.value_usd,
    value_fmt: fmtUSD(f.value_usd),
    year: SEED_YEAR,
    source: 'seed',
  })

  const pares: FlujoSalida[] = partnerIso
    ? filas.filter((f) => f.partner_iso === partnerIso).map(aFlujo)
    : [...exp.slice(0, 12).map(aFlujo), ...imp.slice(0, 12).map(aFlujo)]

  return {
    top_export,
    top_import,
    // OJO: balanza calculada sobre los socios incluidos en la muestra seed
    // (no es el total mundial) · se explica en data_quality.note.
    balanza: balanzaDesde(totExp, totImp),
    pares,
  }
}

// ─────────────────────────────────────────────────────────────────
// Handler · Comtrade (con clave) → OEC directo (cascada de años) → seed
// ─────────────────────────────────────────────────────────────────

interface CuerpoData {
  reporter: string
  partner: string | null
  year: number
  top_export: TopPartner[]
  top_import: TopPartner[]
  balanza: TradeBalance
  pares: FlujoSalida[]
  source: FuenteDato | 'none'
}

function responder(
  ok: boolean,
  data: CuerpoData,
  error: string | null,
  source_url: string,
  data_quality: DataQuality,
) {
  return NextResponse.json(
    { ok, data, error, fetched_at: new Date().toISOString(), source_url, data_quality },
    { headers: { 'Cache-Control': CACHE } },
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reporterRaw = (url.searchParams.get('reporter') || 'ESP').trim()
  const partnerRaw = (url.searchParams.get('partner') || '').trim() || null
  const yearRaw = url.searchParams.get('year')
  const yearParam = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined

  const ref = resolvePais(reporterRaw)
  const partnerRef = partnerRaw ? resolvePais(partnerRaw) : null
  const reporterIso = ref?.iso3 ?? reporterRaw.toUpperCase()
  const partnerIso = partnerRaw ? (partnerRef?.iso3 ?? partnerRaw.toUpperCase()) : null

  // Cascada de años: si el usuario fija year se respeta solo ese; si no,
  // se intenta último cerrado y dos anteriores (BACI publica con retraso).
  const base = yearParam ?? new Date().getFullYear() - 1
  const candidatos = yearParam ? [yearParam] : [base, base - 1, base - 2]
  const motivos: string[] = []

  try {
    // 1) UN Comtrade vía la lib · solo con clave (keyless → HTTP 401 desde 2026).
    if (process.env.COMTRADE_API_KEY) {
      for (const yr of candidatos.slice(0, 2)) {
        const r = await buildBilateralResult(reporterRaw, partnerRaw, yr)
        if (r.ok && r.source === 'comtrade') {
          return responder(
            true,
            {
              reporter: r.reporter,
              partner: r.partner,
              year: r.year,
              top_export: r.top_export,
              top_import: r.top_import,
              balanza: r.balanza,
              pares: r.pares as FlujoSalida[],
              source: 'comtrade',
            },
            null,
            COMTRADE_DOC,
            { source_type: 'live', source: 'comtrade', note: null },
          )
        }
        if (r.error) {
          motivos.push(`comtrade ${yr}: ${r.error}`)
          // Un fallo de auth o rate-limit no cambia con el año → corta.
          if (/unauthorized|rate_limited/i.test(r.error)) break
        }
      }
    } else {
      motivos.push('comtrade: sin COMTRADE_API_KEY (el acceso keyless devuelve HTTP 401)')
    }

    // 2) OEC directo con orden correcto y cascada de años.
    if (ref) {
      for (const yr of candidatos) {
        const out = await construirDesdeOec(ref, partnerRef, yr)
        if (!('error' in out)) {
          return responder(
            true,
            {
              reporter: ref.iso3,
              partner: partnerIso,
              year: yr,
              top_export: out.top_export,
              top_import: out.top_import,
              balanza: out.balanza,
              pares: out.pares,
              source: 'oec',
            },
            null,
            OEC_DOC,
            {
              source_type: 'live',
              source: 'oec',
              // Con year explícito solo hay un candidato → la nota solo aplica
              // a la cascada automática (yr distinto del último año cerrado).
              note:
                yr !== base ? `Último año con datos publicados en OEC/BACI: ${yr}.` : null,
            },
          )
        }
        motivos.push(`oec ${yr}: ${out.error}`)
      }
    } else {
      motivos.push(`oec: reporter desconocido (${reporterRaw})`)
    }
  } catch (e: any) {
    motivos.push(String(e?.message ?? e).slice(0, 160))
  }

  // 3) Fallback seed · estimaciones de referencia marcadas como tales.
  const seed = construirDesdeSeed(reporterIso, partnerIso)
  if (seed) {
    return responder(
      true,
      {
        reporter: reporterIso,
        partner: partnerIso,
        year: SEED_YEAR,
        top_export: seed.top_export,
        top_import: seed.top_import,
        balanza: seed.balanza,
        pares: seed.pares,
        source: 'seed',
      },
      null,
      COMTRADE_DOC,
      {
        source_type: 'seed',
        source: 'seed',
        note:
          `Estimaciones de referencia (≈${SEED_YEAR}) sobre los principales socios; ` +
          `la balanza se calcula sobre la muestra incluida, no sobre el total mundial. ` +
          `Upstream no disponible: ${motivos.join(' · ').slice(0, 300) || 'sin detalle'}.`,
      },
    )
  }

  // 4) Vacío honesto · reporter sin upstream ni cobertura seed.
  return responder(
    false,
    {
      reporter: reporterIso,
      partner: partnerIso,
      year: yearParam ?? base,
      top_export: [],
      top_import: [],
      balanza: BALANZA_VACIA,
      pares: [],
      source: 'none',
    },
    motivos.join(' · ').slice(0, 300) || 'sin datos',
    COMTRADE_DOC,
    { source_type: 'none', source: 'none', note: 'Sin datos en vivo ni cobertura seed para este reporter.' },
  )
}
