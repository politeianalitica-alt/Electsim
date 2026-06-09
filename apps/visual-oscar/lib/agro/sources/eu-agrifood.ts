/**
 * Cliente EU Agri-food Data Portal · precios físicos semanales · Politeia Agro v4
 *
 * La Comisión Europea publica precios físicos representativos por sector,
 * país y semana en su API pública (sin key):
 *   https://www.ec.europa.eu/agrifood/api/{sector}/prices?memberStateCodes=ES&...
 *
 * (La petición puede redirigir a api.tech.ec.europa.eu; seguimos redirects.)
 *
 * Esto da el precio FÍSICO real de mercado europeo (€/100kg, €/t, €/hl según
 * sector) que complementa los futuros CME de Yahoo. Núcleo de "Lonjas y
 * Precios" en su faceta de precio físico.
 *
 * Robustez: parser de importes en formato europeo ("€205,00" / "205,00").
 * Si la API falla (429/503/redirect roto), devolvemos null y degradamos.
 */

const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

/** Sectores soportados por la API de precios agri-food. */
export type AgrifoodSector =
  | 'cereal'
  | 'oilseeds'
  | 'beef'
  | 'pigmeat'
  | 'poultry'
  | 'eggs'
  | 'dairy'
  | 'sugar'
  | 'oliveoil'
  | 'wine'
  | 'fruitAndVegetable'
  | 'rice'

export interface AgrifoodPricePoint {
  /** Semana/periodo declarado por la API (ej "2025-W04" o fecha). */
  periodo: string
  /** Precio numérico parseado. */
  precio: number | null
  /** Unidad declarada (ej "€/t", "€/100 kg"). */
  unidad: string | null
  /** Producto/categoría dentro del sector. */
  producto: string | null
  /** Estado miembro (ES). */
  pais: string | null
}

/** Parser tolerante de importes europeos: "€205,00", "1.205,50", "205.00". */
export function parseEuroNumber(s: unknown): number | null {
  if (s == null) return null
  if (typeof s === 'number') return Number.isFinite(s) ? s : null
  const str = String(s).replace(/[€\s]/g, '').trim()
  if (!str) return null
  // Si tiene coma como decimal (formato EU): quitar puntos de millar, coma→punto
  let normalized = str
  if (str.includes(',')) {
    normalized = str.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

interface FetchOpts {
  memberState?: string
  beginDate?: string // dd/MM/yyyy según la API
  endDate?: string
  productCodes?: string
  timeoutMs?: number
}

/**
 * Precios de un sector. Devuelve array normalizado de puntos o null si falla.
 * La forma exacta del JSON de la API varía por sector; normalizamos por
 * heurística sobre claves comunes (price, unit, weekNumber/beginDate, product,
 * memberStateCode).
 */
export async function fetchAgrifoodPrices(
  sector: AgrifoodSector,
  opts: FetchOpts = {}
): Promise<{ ok: true; points: AgrifoodPricePoint[] } | { ok: false; error: string }> {
  const { memberState = 'ES', beginDate, endDate, productCodes, timeoutMs = 9000 } = opts
  const params = new URLSearchParams()
  params.set('memberStateCodes', memberState)
  if (beginDate) params.set('beginDate', beginDate)
  if (endDate) params.set('endDate', endDate)
  if (productCodes) params.set('productCodes', productCodes)

  // Endpoint primario + fallback al dominio tech (algunos sectores redirigen).
  const urls = [
    `https://www.ec.europa.eu/agrifood/api/${sector}/prices?${params.toString()}`,
    `https://api.tech.ec.europa.eu/agrifood/api/${sector}/prices?${params.toString()}`,
  ]

  for (const url of urls) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        redirect: 'follow',
        signal: ctrl.signal,
        next: { revalidate: 21600 }, // 6h
      })
      clearTimeout(timer)
      if (!res.ok) continue
      const txt = await res.text()
      if (!txt || txt.trim().startsWith('<')) continue // HTML redirect page → probar siguiente
      const data = JSON.parse(txt)
      const arr: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      if (arr.length === 0) continue
      const points = arr.map(normalizeRow).filter((p): p is AgrifoodPricePoint => p !== null)
      if (points.length > 0) return { ok: true, points }
    } catch {
      clearTimeout(timer)
      continue
    }
  }
  return { ok: false, error: 'EU agri-food prices no disponible (redirect/empty)' }
}

function normalizeRow(row: unknown): AgrifoodPricePoint | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const periodo =
    (r.weekNumber as string) ||
    (r.beginDate as string) ||
    (r.period as string) ||
    (r.referencePeriod as string) ||
    ''
  const precio = parseEuroNumber(r.price ?? r.value ?? r.priceValue)
  return {
    periodo: String(periodo),
    precio,
    unidad: (r.unit as string) ?? (r.priceUnit as string) ?? null,
    producto: (r.product as string) ?? (r.productName as string) ?? (r.productCode as string) ?? null,
    pais: (r.memberStateCode as string) ?? (r.memberState as string) ?? null,
  }
}
