/**
 * Parsers/agregadores PUROS de la capa enriquecida IATI · Sprint IATI-MAX.
 *
 * Este archivo deliberadamente NO importa nada que no sea stdlib/tipos: las
 * funciones aquí son 100% puras, sin red y sin estado, para poder testearlas
 * con `node --experimental-strip-types` (que no resuelve `.ts` por defecto en
 * imports relativos cross-file).
 *
 * `iati-enriched.ts` (el caller real, con red) re-exporta de aquí.
 *
 * Honestidad FX: solo agregamos importes ya denominados EUR (no convertimos).
 */
import type { FacetCount } from './iati-types'

// ─────────────────────────────────────────────────────────────────────────
// Helpers puros (locales)
// ─────────────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (Array.isArray(v)) return parseNum(v[0])
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}
function firstStr(v: unknown): string | null {
  if (v == null) return null
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = x == null ? '' : String(x).trim()
      if (s) return s
    }
    return null
  }
  const s = String(v).trim()
  return s || null
}
function strArray(v: unknown): string[] {
  const out: string[] = []
  const push = (x: unknown) => {
    const s = x == null ? '' : String(x).trim()
    if (s && !out.includes(s)) out.push(s)
  }
  if (Array.isArray(v)) v.forEach(push)
  else push(v)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos enriquecidos (publicos)
// ─────────────────────────────────────────────────────────────────────────

export interface IatiActivityRich {
  id: string
  title: string
  description: string | null
  reporting_org_ref: string | null
  reporting_org_name: string | null
  participating_org_refs: string[]
  recipient_countries: string[]
  sectors: string[]
  status: string | null
  start_date: string | null
  end_date: string | null
  default_aid_type: string | null
  default_flow_type: string | null
  total_disbursement_eur: number | null
  total_commitment_eur: number | null
}

export interface YearlyCountryPoint {
  year: number
  country_code: string
  country_name: string
  value_eur: number
  count: number
}

export interface YearlyHeatmapData {
  points: YearlyCountryPoint[]
  years: number[]
  top_countries: FacetCount[]
  total_value_eur: number
  total_count: number
  filters: {
    reporting_org: string | null
    date_from: string | null
    date_to: string | null
    top_n_countries: number
  }
}

export interface TopFlow {
  donor_ref: string
  donor_name: string
  recipient_country_code: string
  recipient_country_name: string
  value_eur: number
  count: number
}

export interface TopFlowsData {
  flows: TopFlow[]
  total_value_eur: number
  total_count: number
  filters: {
    year_from: number
    year_to: number
    top_n: number
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Doc crudo del core activity enriquecido (subset)
// ─────────────────────────────────────────────────────────────────────────
interface RawEnrichedDoc {
  iati_identifier?: unknown
  title_narrative?: unknown
  description_narrative?: unknown
  reporting_org_ref?: unknown
  reporting_org_narrative?: unknown
  participating_org_ref?: unknown
  recipient_country_code?: unknown
  sector_code?: unknown
  activity_status_code?: unknown
  activity_date_iso_date?: unknown
  activity_date_type?: unknown
  default_aid_type_code?: unknown
  default_flow_type_code?: unknown
  total_disbursement_value_usd?: unknown
  total_disbursement_value_currency?: unknown
  total_commitment_value_usd?: unknown
  total_commitment_value_currency?: unknown
}

/**
 * Parser puro de docs enriquecidos del core activity. Mapea fechas en arrays
 * paralelos (`activity_date_type[i]` ↔ `activity_date_iso_date[i]`) a
 * start/end_date. Solo agrega importes en EUR; el resto queda null.
 */
export function parseEnrichedDocs(docs: unknown): IatiActivityRich[] {
  if (!Array.isArray(docs)) return []
  const out: IatiActivityRich[] = []
  for (const raw of docs as RawEnrichedDoc[]) {
    const id = firstStr(raw?.iati_identifier)
    if (!id) continue

    let start_date: string | null = null
    let end_date: string | null = null
    const types = strArray(raw?.activity_date_type)
    const dates = strArray(raw?.activity_date_iso_date)
    if (types.length === dates.length && types.length > 0) {
      for (let i = 0; i < types.length; i++) {
        if ((types[i] === '1' || types[i] === '2') && !start_date) start_date = dates[i]
        if ((types[i] === '3' || types[i] === '4') && !end_date) end_date = dates[i]
      }
    } else if (dates.length > 0) {
      start_date = dates[0]
    }

    const disbCur = firstStr(raw?.total_disbursement_value_currency)
    const disbVal = parseNum(raw?.total_disbursement_value_usd)
    const total_disbursement_eur =
      disbCur && disbCur.toUpperCase() === 'EUR' ? disbVal : null
    const commCur = firstStr(raw?.total_commitment_value_currency)
    const commVal = parseNum(raw?.total_commitment_value_usd)
    const total_commitment_eur =
      commCur && commCur.toUpperCase() === 'EUR' ? commVal : null

    out.push({
      id,
      title: firstStr(raw?.title_narrative) ?? id,
      description: firstStr(raw?.description_narrative),
      reporting_org_ref: firstStr(raw?.reporting_org_ref),
      reporting_org_name: firstStr(raw?.reporting_org_narrative),
      participating_org_refs: strArray(raw?.participating_org_ref),
      recipient_countries: strArray(raw?.recipient_country_code).map((c) => c.toUpperCase()),
      sectors: strArray(raw?.sector_code),
      status: firstStr(raw?.activity_status_code),
      start_date,
      end_date,
      default_aid_type: firstStr(raw?.default_aid_type_code),
      default_flow_type: firstStr(raw?.default_flow_type_code),
      total_disbursement_eur,
      total_commitment_eur,
    })
  }
  return out
}

/**
 * Construye el heatmap años × países a partir de transacciones EUR. Pura.
 * Descarta entradas sin fecha, sin valor EUR o sin país.
 */
export function buildYearlyHeatmap(
  txs: Array<{
    date: string | null
    value_eur: number | null
    recipient_country: string | null
  }>,
  codelistCountries: Record<string, { name: string }> | null,
  topN = 15,
): YearlyHeatmapData {
  const byKey = new Map<string, { year: number; cc: string; value: number; count: number }>()
  const byCountryTotal = new Map<string, number>()
  const yearSet = new Set<number>()
  let totalValue = 0
  let totalCount = 0
  for (const t of txs) {
    if (!t.date || t.value_eur == null || !t.recipient_country) continue
    const yr = parseInt(t.date.slice(0, 4), 10)
    if (!Number.isFinite(yr)) continue
    const cc = t.recipient_country.toUpperCase()
    if (!cc) continue
    const k = `${yr}|${cc}`
    const cur = byKey.get(k) ?? { year: yr, cc, value: 0, count: 0 }
    cur.value += t.value_eur
    cur.count += 1
    byKey.set(k, cur)
    byCountryTotal.set(cc, (byCountryTotal.get(cc) ?? 0) + t.value_eur)
    yearSet.add(yr)
    totalValue += t.value_eur
    totalCount += 1
  }
  const points: YearlyCountryPoint[] = [...byKey.values()].map((p) => ({
    year: p.year,
    country_code: p.cc,
    country_name: codelistCountries?.[p.cc]?.name ?? p.cc,
    value_eur: Math.round(p.value),
    count: p.count,
  }))
  const years = [...yearSet].sort((a, b) => a - b)
  const top_countries: FacetCount[] = [...byCountryTotal.entries()]
    .map(([cc, v]) => ({
      code: cc,
      name: codelistCountries?.[cc]?.name ?? cc,
      count: Math.round(v),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, Math.min(50, topN)))
  return {
    points,
    years,
    top_countries,
    total_value_eur: Math.round(totalValue),
    total_count: totalCount,
    filters: {
      reporting_org: null,
      date_from: null,
      date_to: null,
      top_n_countries: topN,
    },
  }
}

/**
 * Construye top flujos donante→receptor desde transacciones EUR. `curatedNames`
 * resuelve nombres legibles cuando hay match. Pura.
 */
export function buildTopFlows(
  txs: Array<{
    reporting_org_ref: string | null
    recipient_country: string | null
    value_eur: number | null
  }>,
  codelistCountries: Record<string, { name: string }> | null,
  topN: number,
  curatedNames: Record<string, string> = {},
): TopFlowsData {
  const byKey = new Map<string, TopFlow>()
  let total = 0
  let count = 0
  for (const t of txs) {
    if (!t.reporting_org_ref || !t.recipient_country || t.value_eur == null) continue
    const donor = t.reporting_org_ref
    const cc = t.recipient_country.toUpperCase()
    const k = `${donor}|${cc}`
    const cur = byKey.get(k) ?? {
      donor_ref: donor,
      donor_name: curatedNames[donor] ?? donor,
      recipient_country_code: cc,
      recipient_country_name: codelistCountries?.[cc]?.name ?? cc,
      value_eur: 0,
      count: 0,
    }
    cur.value_eur += t.value_eur
    cur.count += 1
    byKey.set(k, cur)
    total += t.value_eur
    count += 1
  }
  const flows = [...byKey.values()]
    .map((f) => ({ ...f, value_eur: Math.round(f.value_eur) }))
    .sort((a, b) => b.value_eur - a.value_eur)
    .slice(0, Math.max(1, Math.min(100, topN)))
  return {
    flows,
    total_value_eur: Math.round(total),
    total_count: count,
    filters: { year_from: 0, year_to: 0, top_n: topN },
  }
}

/**
 * Construye la clausula Solr `q` con un set de refs IATI (las ONGD ES curadas).
 * Sin estado: el caller pasa el array.
 */
export function spanishOrgsQueryFrom(refs: readonly string[]): string {
  const clause = refs.map((r) => `"${r}"`).join(' OR ')
  return `reporting_org_ref:(${clause})`
}
