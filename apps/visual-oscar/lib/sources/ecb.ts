/**
 * Cliente para ECB Statistical Data Warehouse · data-api.ecb.europa.eu
 *
 * Endpoint público sin auth. Devuelve datos en formato JSON-stat (SDMX-JSON).
 *
 * Series clave para España y zona euro:
 *   - FM.D.U2.EUR.4F.KR.DFR.LEV       · Deposit Facility Rate (diario)
 *   - FM.D.U2.EUR.4F.KR.MRR_FR.LEV    · Main Refinancing Operations Rate (diario)
 *   - FM.M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA · EURIBOR 12M mensual
 *   - IRS.M.ES.L.L40.CI.0000.EUR.N.Z  · Bond yield 10Y España (mensual)
 */

const BASE = 'https://data-api.ecb.europa.eu/service/data'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface SDMXResponse {
  dataSets?: Array<{
    series?: Record<string, {
      observations?: Record<string, number[]>
    }>
  }>
  structure?: {
    dimensions?: {
      observation?: Array<{
        values?: Array<{ start?: string; end?: string; id?: string; name?: string }>
      }>
    }
  }
}

export interface ECBPoint {
  t: string         // ISO date
  v: number | null
}

async function fetchECB(
  flow: string,
  key: string,
  lastNObservations = 24,
  timeoutMs = 8000,
): Promise<{ ok: boolean; points: ECBPoint[]; error?: string }> {
  const url = `${BASE}/${flow}/${key}?format=jsondata&lastNObservations=${lastNObservations}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, points: [], error: `HTTP ${res.status}` }
    const json = (await res.json()) as SDMXResponse

    const series = json.dataSets?.[0]?.series || {}
    const firstKey = Object.keys(series)[0]
    if (!firstKey) return { ok: true, points: [] }
    const obs = series[firstKey].observations || {}
    const times = json.structure?.dimensions?.observation?.[0]?.values || []

    const points: ECBPoint[] = []
    for (const k of Object.keys(obs).sort((a, b) => Number(a) - Number(b))) {
      const idx = Number(k)
      const t = times[idx]?.start?.slice(0, 10) || times[idx]?.id || ''
      const v = obs[k]?.[0]
      points.push({ t, v: v != null ? Number(v) : null })
    }
    return { ok: true, points }
  } catch (e: unknown) {
    return { ok: false, points: [], error: e instanceof Error ? e.message : 'unknown' }
  }
}

// ─── Endpoints típicos ────────────────────────────────────

/** Deposit Facility Rate · BCE diario (último valor + serie 90 días). */
export async function depositFacilityRate(lastN = 90) {
  return fetchECB('FM', 'D.U2.EUR.4F.KR.DFR.LEV', lastN)
}

/** Main Refinancing Operations Rate · BCE diario. */
export async function mroRate(lastN = 90) {
  return fetchECB('FM', 'D.U2.EUR.4F.KR.MRR_FR.LEV', lastN)
}

/** EURIBOR 12M · mensual. */
export async function euribor12M(lastN = 36) {
  return fetchECB('FM', 'M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA', lastN)
}

/** EURIBOR 6M · mensual. */
export async function euribor6M(lastN = 36) {
  return fetchECB('FM', 'M.U2.EUR.RT.MM.EURIBOR6MD_.HSTA', lastN)
}

/** Bono 10Y España · mensual. */
export async function bondYield10YESP(lastN = 36) {
  return fetchECB('IRS', 'M.ES.L.L40.CI.0000.EUR.N.Z', lastN)
}
