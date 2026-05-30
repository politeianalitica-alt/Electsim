/**
 * /api/macro/derived/[...path] · Indicadores derivados server-side.
 *
 * Para indicadores que requieren composición/cálculo sobre fuentes
 * primarias antes de ser servidos como punto único. Evita poner lógica
 * de cómputo en el cliente (que sólo sabe leer { last: { value } }).
 *
 * Sprint Backend C7 (2026-05-30): primera versión con 3 derivaciones
 * de tipo `eurostat_delta` (España − país_referencia para indicadores
 * de gap/cohesión).
 *
 * Rutas:
 *   GET /api/macro/derived/<id>?country=ES
 *     → Computa la derivación registrada y devuelve { last: { value } }
 *     compatible con los parsers actuales del catálogo (eurostat-simple).
 *
 * Cache HTTP 24h (datos anuales · revalidación frecuente innecesaria).
 */
import { NextResponse } from 'next/server'
import { quality, parseJsonStat } from '@/lib/macro-utils'

export const revalidate = 86400

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

interface DerivationEurostatDelta {
  type: 'eurostat_delta'
  code: string
  // dimensiones del filtro Eurostat además de geo. Se aplica a las DOS queries.
  baseFilters: Record<string, string>
  // país objetivo (default España)
  target: string
  // referencia para el cálculo del gap
  reference: string
  // label de unidad reportada
  unit: string
  // descripción para el methodology trace
  description: string
}

/**
 * Sprint C11 · numerator / denominator × multiplier sobre Eurostat.
 *
 * Útil para ratios estructurales como índice de envejecimiento (>65 / <15)
 * o intensidad energética (consumo / PIB).
 */
interface DerivationEurostatRatio {
  type: 'eurostat_ratio'
  numerator: { code: string; filters: Record<string, string> }
  denominator: { code: string; filters: Record<string, string> }
  multiplier?: number  // default 1
  unit: string
  description: string
}

/**
 * Sprint C11 · year-on-year % change sobre una serie Eurostat única.
 *
 * Útil para variaciones interanuales que el catálogo expone como derivados
 * (variación poblacional, tasa creación neta, etc.).
 */
interface DerivationEurostatYoY {
  type: 'eurostat_yoy'
  code: string
  filters: Record<string, string>
  unit: string
  description: string
}

type Derivation = DerivationEurostatDelta | DerivationEurostatRatio | DerivationEurostatYoY

/**
 * Catálogo de derivaciones registradas.
 *
 * El id de URL (`/api/macro/derived/<id>`) mapea aquí.
 * Para añadir una derivación nueva: insertar entrada + restart.
 */
const DERIVATIONS: Record<string, Derivation> = {
  // sb-arope-vs-ue · gap AROPE ES − UE27 (cohesión)
  arope_gap: {
    type: 'eurostat_delta',
    code: 'ilc_peps01',
    baseFilters: { sex: 'T', age: 'TOTAL', unit: 'PC' },
    target: 'ES',
    reference: 'EU27_2020',
    unit: 'pp',
    description:
      'Diferencia España − UE27 en tasa AROPE (At Risk Of Poverty or Social Exclusion). Eurostat ilc_peps01.',
  },
  // sb-abandono-vs-ue · gap abandono escolar ES − UE27
  abandono_gap: {
    type: 'eurostat_delta',
    code: 'edat_lfse_14',
    baseFilters: { sex: 'T', unit: 'PC' },
    target: 'ES',
    reference: 'EU27_2020',
    unit: 'pp',
    description:
      'Diferencia España − UE27 en tasa de abandono escolar temprano 18-24. Eurostat edat_lfse_14.',
  },
  // co-pib-cultural-ue · gap PIB industrias culturales %PIB
  pib_cultural_ue_gap: {
    type: 'eurostat_delta',
    code: 'cult_emp_n2',
    baseFilters: { sex: 'T' },
    target: 'ES',
    reference: 'EU27_2020',
    unit: 'pp',
    description:
      'Diferencia España − UE27 en empleo cultural %total ocupados. Eurostat cult_emp_n2.',
  },
  // Sprint C11 · dt-indice-envejecimiento (>65 / <15 × 100)
  envejecimiento_idx: {
    type: 'eurostat_ratio',
    numerator: {
      code: 'demo_pjan',
      filters: { geo: 'ES', sex: 'T', age: 'Y_GE65' },
    },
    denominator: {
      code: 'demo_pjan',
      filters: { geo: 'ES', sex: 'T', age: 'Y_LT15' },
    },
    multiplier: 100,
    unit: '%',
    description:
      'Índice de envejecimiento España = población ≥65 / población <15 × 100. Eurostat demo_pjan agrupos Y_GE65 e Y_LT15. España ~135% (más mayores que menores).',
  },
  // Sprint C11 · dt-variacion-poblacional (YoY % Padrón vía Eurostat agregado)
  poblacion_yoy: {
    type: 'eurostat_yoy',
    code: 'demo_pjan',
    filters: { geo: 'ES', sex: 'T', age: 'TOTAL' },
    unit: '%',
    description:
      'Variación interanual población total España. Eurostat demo_pjan total (proxy Padrón cifra oficial). YoY del último año disponible vs anterior.',
  },
}

async function eurostatFetch(code: string, filters: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    qs.append(k, v)
  }
  try {
    const r = await fetch(`${EUROSTAT_BASE}/${code}?${qs}`, {
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

async function computeEurostatDelta(d: DerivationEurostatDelta): Promise<any> {
  // Una query por país (Eurostat acepta multi-geo pero compone N dimensiones
  // y complica el parseJsonStat; preferimos 2 calls al endpoint público).
  const targetData = await eurostatFetch(d.code, { ...d.baseFilters, geo: d.target })
  const refData = await eurostatFetch(d.code, { ...d.baseFilters, geo: d.reference })

  if (targetData.error || refData.error) {
    return {
      ok: false,
      data_quality: quality(
        'missing',
        'Eurostat',
        `target=${targetData.error || 'ok'} · reference=${refData.error || 'ok'}`,
      ),
    }
  }

  const tPoints = parseJsonStat(targetData).filter((p) => p.value != null)
  const rPoints = parseJsonStat(refData).filter((p) => p.value != null)

  // Buscar último punto comparable (mismo time)
  const tLatest = tPoints.length ? tPoints[tPoints.length - 1] : null
  const rLatest = rPoints.length ? rPoints[rPoints.length - 1] : null

  if (!tLatest || !rLatest || tLatest.value == null || rLatest.value == null) {
    return {
      ok: false,
      data_quality: quality('missing', 'Eurostat · derived', 'no_latest_value'),
    }
  }

  const delta = Number(tLatest.value) - Number(rLatest.value)

  // Construir serie histórica del delta uniendo por dimension time
  // (si no coincide, se omite el punto)
  const refMap = new Map<string, number>()
  for (const p of rPoints) {
    if (p.value != null && p.time) refMap.set(String(p.time), Number(p.value))
  }
  const series = tPoints
    .filter((p) => p.value != null && p.time && refMap.has(String(p.time)))
    .map((p) => ({
      time: String(p.time),
      value: Number(p.value) - (refMap.get(String(p.time)) || 0),
    }))

  return {
    ok: true,
    derived_id: undefined as string | undefined,  // filled at call site
    description: d.description,
    target: d.target,
    reference: d.reference,
    target_latest: { time: String(tLatest.time), value: Number(tLatest.value) },
    reference_latest: { time: String(rLatest.time), value: Number(rLatest.value) },
    unit: d.unit,
    data_quality: quality('live', `Eurostat · derived · ${d.code}`),
    // Forma compatible con parsers actuales (eurostat-simple) que esperan
    // { last: { value, time } }
    last: { value: delta, time: String(tLatest.time) },
    n_points: series.length,
    series: series.slice(-20),  // últimos 20 años de histórico del delta
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const segs = params.path || []
  const id = segs[0]

  // /api/macro/derived (sin id) o /api/macro/derived/health
  if (!id || id === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'Politeia macro derived indicators',
      registered: Object.keys(DERIVATIONS),
      example: '/api/macro/derived/arope_gap',
    })
  }

  const d = DERIVATIONS[id]
  if (!d) {
    return NextResponse.json(
      {
        ok: false,
        error: 'unknown derivation id',
        available: Object.keys(DERIVATIONS),
      },
      { status: 404 },
    )
  }

  if (d.type === 'eurostat_delta') {
    const result = await computeEurostatDelta(d)
    return NextResponse.json({ ...result, derived_id: id })
  }

  if (d.type === 'eurostat_ratio') {
    const result = await computeEurostatRatio(d)
    return NextResponse.json({ ...result, derived_id: id })
  }

  if (d.type === 'eurostat_yoy') {
    const result = await computeEurostatYoY(d)
    return NextResponse.json({ ...result, derived_id: id })
  }

  return NextResponse.json(
    { ok: false, error: 'unsupported derivation type' },
    { status: 500 },
  )
}

async function computeEurostatRatio(d: DerivationEurostatRatio): Promise<any> {
  const [numData, denData] = await Promise.all([
    eurostatFetch(d.numerator.code, d.numerator.filters),
    eurostatFetch(d.denominator.code, d.denominator.filters),
  ])

  if (numData.error || denData.error) {
    return {
      ok: false,
      data_quality: quality(
        'missing',
        'Eurostat · ratio',
        `num=${numData.error || 'ok'} · den=${denData.error || 'ok'}`,
      ),
    }
  }

  const numPoints = parseJsonStat(numData).filter((p) => p.value != null)
  const denPoints = parseJsonStat(denData).filter((p) => p.value != null)

  const denMap = new Map<string, number>()
  for (const p of denPoints) {
    if (p.value != null && p.time) denMap.set(String(p.time), Number(p.value))
  }

  const m = d.multiplier ?? 1
  const series = numPoints
    .filter((p) => p.value != null && p.time && denMap.has(String(p.time)))
    .map((p) => {
      const den = denMap.get(String(p.time)) || 1
      return {
        time: String(p.time),
        value: (Number(p.value) / den) * m,
      }
    })

  if (series.length === 0) {
    return {
      ok: false,
      data_quality: quality('missing', 'Eurostat · ratio', 'no_common_periods'),
    }
  }

  const last = series[series.length - 1]
  return {
    ok: true,
    description: d.description,
    unit: d.unit,
    data_quality: quality(
      'live',
      `Eurostat · derived ratio · ${d.numerator.code}/${d.denominator.code}`,
    ),
    last: { value: last.value, time: last.time },
    n_points: series.length,
    series: series.slice(-20),
  }
}

async function computeEurostatYoY(d: DerivationEurostatYoY): Promise<any> {
  const data = await eurostatFetch(d.code, d.filters)
  if (data.error) {
    return {
      ok: false,
      data_quality: quality('missing', 'Eurostat · yoy', data.error),
    }
  }

  const points = parseJsonStat(data)
    .filter((p) => p.value != null && p.time)
    .map((p) => ({ time: String(p.time), value: Number(p.value) }))
    .sort((a, b) => a.time.localeCompare(b.time))

  if (points.length < 2) {
    return {
      ok: false,
      data_quality: quality('missing', 'Eurostat · yoy', 'insufficient_points'),
    }
  }

  const series = points.slice(1).map((p, i) => {
    const prev = points[i].value
    const curr = p.value
    return {
      time: p.time,
      value: prev === 0 ? 0 : ((curr - prev) / prev) * 100,
    }
  })
  const last = series[series.length - 1]

  return {
    ok: true,
    description: d.description,
    unit: d.unit,
    data_quality: quality('live', `Eurostat · derived yoy · ${d.code}`),
    last: { value: last.value, time: last.time },
    n_points: series.length,
    series: series.slice(-20),
  }
}
