/**
 * Catálogo de zonas de oferta (bidding zones) ENTSO-E · Sprint Energía S3.
 *
 * Los códigos EIC (Energy Identification Code, 16 chars que empiezan por "10Y")
 * identifican áreas de mercado/dominio en la red eléctrica europea. Son el
 * parámetro `in_Domain`/`out_Domain`/`biddingZone_Domain` de la API ENTSO-E
 * Transparency Platform. Verificados contra el mapping oficial de la librería
 * entsoe-py (EnergieID/entsoe-py · 2026-06-02) — son CRÍTICOS: un EIC erróneo
 * devuelve un documento de error XML, no datos.
 *
 * Plano y sin dependencias para poder usarse en route handlers, componentes
 * cliente y tests Node (--experimental-strip-types).
 */

/** Clave corta de zona usada en la UI y los query params (`?zone=ES`). */
export type EntsoeZoneCode =
  | 'ES' // España
  | 'FR' // Francia
  | 'DE_LU' // Alemania-Luxemburgo (zona conjunta desde 2018)
  | 'PT' // Portugal
  | 'IT_NORD' // Italia Norte (zona de oferta italiana relevante para flujos FR/CH)
  | 'BE' // Bélgica
  | 'NL' // Países Bajos

/** Metadatos de una zona de oferta. */
export interface EntsoeZone {
  /** Clave corta estable (query param + UI). */
  code: EntsoeZoneCode
  /** Código EIC (16 chars "10Y…") · parámetro de dominio de la API. */
  eic: string
  /** Nombre legible en español para la UI. */
  label: string
  /** Código ISO-2 del país (para banderas / agrupación). */
  iso2: string
  /** Color de acento para gráficos comparativos. */
  color: string
}

/**
 * Zonas relevantes para el contexto europeo de España.
 *
 * EIC codes verificados (entsoe-py `mappings.py`):
 *   ES      10YES-REE------0
 *   FR      10YFR-RTE------C
 *   DE-LU   10Y1001A1001A82H
 *   PT      10YPT-REN------W
 *   IT-NORD 10Y1001A1001A73I
 *   BE      10YBE----------2
 *   NL      10YNL----------L
 */
export const ENTSOE_ZONES: Record<EntsoeZoneCode, EntsoeZone> = {
  ES: { code: 'ES', eic: '10YES-REE------0', label: 'España', iso2: 'ES', color: '#C60B1E' },
  FR: { code: 'FR', eic: '10YFR-RTE------C', label: 'Francia', iso2: 'FR', color: '#0055A4' },
  DE_LU: { code: 'DE_LU', eic: '10Y1001A1001A82H', label: 'Alemania', iso2: 'DE', color: '#111111' },
  PT: { code: 'PT', eic: '10YPT-REN------W', label: 'Portugal', iso2: 'PT', color: '#006600' },
  IT_NORD: { code: 'IT_NORD', eic: '10Y1001A1001A73I', label: 'Italia (Norte)', iso2: 'IT', color: '#008C45' },
  BE: { code: 'BE', eic: '10YBE----------2', label: 'Bélgica', iso2: 'BE', color: '#FDDA24' },
  NL: { code: 'NL', eic: '10YNL----------L', label: 'Países Bajos', iso2: 'NL', color: '#AE1C28' },
}

/** Lista ordenada de zonas (para iterar en la UI / comparativas por defecto). */
export const ENTSOE_ZONE_LIST: EntsoeZone[] = [
  ENTSOE_ZONES.ES,
  ENTSOE_ZONES.FR,
  ENTSOE_ZONES.DE_LU,
  ENTSOE_ZONES.PT,
  ENTSOE_ZONES.IT_NORD,
  ENTSOE_ZONES.BE,
  ENTSOE_ZONES.NL,
]

/** Zonas comparadas por defecto en el panel "Contexto europeo" de precios. */
export const DEFAULT_PRICE_ZONES: EntsoeZoneCode[] = ['ES', 'FR', 'DE_LU', 'PT', 'IT_NORD']

/** Pares de flujo cross-border de interés para España (interconexiones físicas). */
export const DEFAULT_FLOW_PAIRS: Array<{ from: EntsoeZoneCode; to: EntsoeZoneCode }> = [
  { from: 'ES', to: 'FR' },
  { from: 'ES', to: 'PT' },
]

/**
 * Resuelve un código de zona (case-insensitive, acepta guion o nada para DE_LU)
 * a su metadato. Devuelve `null` si no se reconoce (degradación limpia).
 */
export function resolveZone(input: string | null | undefined): EntsoeZone | null {
  if (!input) return null
  const key = input.trim().toUpperCase().replace(/[-\s]/g, '_') as EntsoeZoneCode
  // Alias comunes: "DE" → "DE_LU", "IT" → "IT_NORD".
  if (key === ('DE' as EntsoeZoneCode)) return ENTSOE_ZONES.DE_LU
  if (key === ('IT' as EntsoeZoneCode)) return ENTSOE_ZONES.IT_NORD
  return ENTSOE_ZONES[key] ?? null
}

/** Devuelve el EIC de una zona o `null` si no se reconoce. */
export function zoneEic(input: string | null | undefined): string | null {
  return resolveZone(input)?.eic ?? null
}
