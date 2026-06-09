/**
 * Cliente FRED · series históricas de commodities agrícolas · Politeia Agro v4
 *
 * FRED expone descarga CSV pública SIN auth:
 *   https://fred.stlouisfed.org/graph/fredgraph.csv?id=PWHEAMTUSDM
 *
 * Usamos las series IMF Global Price (mensuales, desde 1990) para dar el
 * SEGUNDO NIVEL de detalle: histórico largo + estacionalidad de cada
 * commodity agrícola, complementando el OHLC diario de Yahoo (futuros).
 *
 * Sin datos inventados: si FRED falla, el caller degrada (sin histórico largo).
 */

const FRED_CSV = 'https://fred.stlouisfed.org/graph/fredgraph.csv'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

/** IMF Global Price Index series id por producto agro (USD nominal, mensual). */
export const FRED_AGRO_IDS: Record<string, { id: string; label: string; unidad: string }> = {
  trigo_cbot: { id: 'PWHEAMTUSDM', label: 'Trigo (IMF Global)', unidad: 'USD/t' },
  trigo_euronext: { id: 'PWHEAMTUSDM', label: 'Trigo (IMF Global)', unidad: 'USD/t' },
  maiz_cbot: { id: 'PMAIZMTUSDM', label: 'Maíz (IMF Global)', unidad: 'USD/t' },
  cebada: { id: 'PBARLUSDM', label: 'Cebada (IMF Global)', unidad: 'USD/t' },
  soja_cbot: { id: 'PSOYBUSDM', label: 'Soja (IMF Global)', unidad: 'USD/t' },
  aceite_soja: { id: 'PSOILUSDM', label: 'Aceite de soja (IMF Global)', unidad: 'USD/t' },
  colza: { id: 'PROILUSDM', label: 'Aceite de colza/canola (IMF Global)', unidad: 'USD/t' },
  azucar: { id: 'PSUGAISAUSDM', label: 'Azúcar (IMF Global, ISA)', unidad: 'USD¢/lb' },
  cafe: { id: 'PCOFFOTMUSDM', label: 'Café arábica (IMF Global)', unidad: 'USD¢/lb' },
  cacao: { id: 'PCOCOUSDM', label: 'Cacao (IMF Global)', unidad: 'USD/t' },
  algodon: { id: 'PCOTTINDUSDM', label: 'Algodón (IMF Global)', unidad: 'USD¢/lb' },
  porcino: { id: 'PPORKUSDM', label: 'Carne de cerdo (IMF Global)', unidad: 'USD¢/lb' },
  ganado_vacuno: { id: 'PBEEFUSDM', label: 'Carne de vacuno (IMF Global)', unidad: 'USD¢/lb' },
  gas_natural: { id: 'PNGASEUUSDM', label: 'Gas natural Europa (IMF Global)', unidad: 'USD/MMBtu' },
  brent: { id: 'PBRENTUSDM', label: 'Petróleo Brent (IMF Global)', unidad: 'USD/barril' },
}

export interface FredPoint {
  date: string
  value: number | null
}

export interface FredSerie {
  id: string
  label: string
  unidad: string
  points: FredPoint[]
}

/**
 * Descarga una serie FRED por id (CSV). `obsStart` opcional (YYYY-MM-DD) lo
 * provee el caller para limitar el rango.
 */
export async function fetchFredSerie(
  id: string,
  obsStart?: string,
  timeoutMs = 9000
): Promise<FredPoint[] | null> {
  const params = new URLSearchParams({ id })
  if (obsStart) params.set('cosd', obsStart)
  const url = `${FRED_CSV}?${params.toString()}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/csv,text/plain,*/*' },
      signal: ctrl.signal,
      next: { revalidate: 43200 }, // 12h
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 20) return null
    return parseFredCsv(text)
  } catch {
    clearTimeout(timer)
    return null
  }
}

/** Por slug de producto agro → serie FRED etiquetada. */
export async function fetchFredAgro(slug: string, obsStart?: string): Promise<FredSerie | null> {
  const meta = FRED_AGRO_IDS[slug]
  if (!meta) return null
  const points = await fetchFredSerie(meta.id, obsStart)
  if (!points) return null
  return { id: meta.id, label: meta.label, unidad: meta.unidad, points }
}

/**
 * Parser del CSV FRED. Formato:
 *   observation_date,PWHEAMTUSDM
 *   1990-01-01,168.5
 * Valores ausentes vienen como ".".
 */
export function parseFredCsv(csv: string): FredPoint[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const out: FredPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',')
    if (cells.length < 2) continue
    const date = cells[0].trim()
    const raw = cells[1].trim()
    const value = raw === '.' || raw === '' ? null : Number(raw)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    out.push({ date, value: value != null && Number.isFinite(value) ? value : null })
  }
  return out
}
