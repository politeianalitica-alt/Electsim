/**
 * Catálogo de destinos turísticos de España · Turismo v3 · Sprint T2-cross
 *
 * DE-HARDCODE del antiguo `data/tourism/destinations_seed.json` (14 destinos).
 * Catálogo AMPLIADO (≥30) que cubre todos los TIPOS de turismo: ciudades,
 * costa/sol&playa, islas, interior/rural, culturales/patrimonio y esquí.
 *
 * Las COORDENADAS son constantes geográficas (lat/lon de la ciudad/zona) → es
 * legítimo curarlas; no hay "fuente viva" de la posición de Sevilla. Cada
 * destino lleva `fuente` + `fecha_ref` para trazabilidad. Los datos de demanda
 * (pernoctaciones) NO viven aquí: los añade el endpoint `destinos` en vivo por
 * CCAA (degradando a "catálogo" si no hay fuente disponible).
 *
 * `ccaa_iso` usa el código NUTS2 de España (ver `SPAIN_NUTS2` en macro-utils):
 * ES61 Andalucía, ES51 Cataluña, ES30 Madrid, ES53 Baleares, ES70 Canarias…
 *
 * NO editar `data/tourism/destinations_seed.json` ni `sectorial-data.ts` (otros
 * agentes trabajan ahí); este catálogo es la fuente de verdad de destinos v3.
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

/** Tipos de turismo que aplica un destino (uno o varios). */
export type DestinoTipo =
  | 'ciudad'
  | 'costa'
  | 'isla'
  | 'rural'
  | 'interior'
  | 'cultural'
  | 'esqui'
  | 'naturaleza'
  | 'gastronomico'
  | 'religioso'

export interface Destino {
  /** Identificador estable (kebab-case, sin acentos). */
  slug: string
  /** Nombre legible. */
  nombre: string
  /** Comunidad autónoma. */
  ccaa: string
  /** Código NUTS2 de la CCAA (ES61, ES51…). */
  ccaa_iso: string
  /** Tipos de turismo del destino. */
  tipo: DestinoTipo[]
  /** Latitud (constante geográfica). */
  lat: number
  /** Longitud (constante geográfica). */
  lon: number
  /** Fuente de la curación. */
  fuente: string
  /** Fecha de referencia de la curación. */
  fecha_ref: string
}

const FUENTE = 'Curación Politeia · coordenadas geográficas + tipología INE/Turespaña'
const FECHA = '2026-06'

// ─────────────────────────────────────────────────────────────────────────
// Catálogo ampliado (≥30 destinos)
// ─────────────────────────────────────────────────────────────────────────

export const DESTINOS: Destino[] = [
  // ── Grandes ciudades / urbano + cultural ──────────────────────────────
  { slug: 'madrid', nombre: 'Madrid', ccaa: 'Comunidad de Madrid', ccaa_iso: 'ES30', tipo: ['ciudad', 'cultural', 'gastronomico'], lat: 40.4168, lon: -3.7038, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'barcelona', nombre: 'Barcelona', ccaa: 'Cataluña', ccaa_iso: 'ES51', tipo: ['ciudad', 'costa', 'cultural'], lat: 41.3851, lon: 2.1734, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'sevilla', nombre: 'Sevilla', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['ciudad', 'cultural', 'gastronomico'], lat: 37.3891, lon: -5.9845, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'valencia', nombre: 'València', ccaa: 'Comunitat Valenciana', ccaa_iso: 'ES52', tipo: ['ciudad', 'costa', 'gastronomico'], lat: 39.4699, lon: -0.3763, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'malaga', nombre: 'Málaga', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['ciudad', 'costa', 'cultural'], lat: 36.7213, lon: -4.4214, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'bilbao', nombre: 'Bilbao', ccaa: 'País Vasco', ccaa_iso: 'ES21', tipo: ['ciudad', 'cultural', 'gastronomico'], lat: 43.2630, lon: -2.9350, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'granada', nombre: 'Granada', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['ciudad', 'cultural'], lat: 37.1773, lon: -3.5986, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'cordoba', nombre: 'Córdoba', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['ciudad', 'cultural'], lat: 37.8882, lon: -4.7794, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'toledo', nombre: 'Toledo', ccaa: 'Castilla-La Mancha', ccaa_iso: 'ES42', tipo: ['ciudad', 'cultural'], lat: 39.8628, lon: -4.0273, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'salamanca', nombre: 'Salamanca', ccaa: 'Castilla y León', ccaa_iso: 'ES41', tipo: ['ciudad', 'cultural'], lat: 40.9701, lon: -5.6635, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'santiago-compostela', nombre: 'Santiago de Compostela', ccaa: 'Galicia', ccaa_iso: 'ES11', tipo: ['ciudad', 'cultural', 'religioso'], lat: 42.8782, lon: -8.5448, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'san-sebastian', nombre: 'San Sebastián / Donostia', ccaa: 'País Vasco', ccaa_iso: 'ES21', tipo: ['ciudad', 'costa', 'gastronomico'], lat: 43.3183, lon: -1.9812, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'zaragoza', nombre: 'Zaragoza', ccaa: 'Aragón', ccaa_iso: 'ES24', tipo: ['ciudad', 'cultural'], lat: 41.6488, lon: -0.8891, fuente: FUENTE, fecha_ref: FECHA },

  // ── Costa / sol & playa ───────────────────────────────────────────────
  { slug: 'costa-del-sol', nombre: 'Costa del Sol (Marbella)', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['costa'], lat: 36.5101, lon: -4.8826, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'costa-brava', nombre: 'Costa Brava (Lloret/Roses)', ccaa: 'Cataluña', ccaa_iso: 'ES51', tipo: ['costa', 'naturaleza'], lat: 41.7000, lon: 2.8500, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'costa-blanca', nombre: 'Costa Blanca (Benidorm)', ccaa: 'Comunitat Valenciana', ccaa_iso: 'ES52', tipo: ['costa'], lat: 38.5342, lon: -0.1314, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'costa-dorada', nombre: 'Costa Daurada (Salou)', ccaa: 'Cataluña', ccaa_iso: 'ES51', tipo: ['costa'], lat: 41.0763, lon: 1.1417, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'cadiz-costa-luz', nombre: 'Cádiz · Costa de la Luz', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['costa', 'cultural'], lat: 36.5298, lon: -6.2926, fuente: FUENTE, fecha_ref: FECHA },

  // ── Islas ─────────────────────────────────────────────────────────────
  { slug: 'palma-mallorca', nombre: 'Palma de Mallorca', ccaa: 'Illes Balears', ccaa_iso: 'ES53', tipo: ['isla', 'costa', 'ciudad'], lat: 39.5696, lon: 2.6502, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'ibiza', nombre: 'Eivissa / Ibiza', ccaa: 'Illes Balears', ccaa_iso: 'ES53', tipo: ['isla', 'costa'], lat: 38.9067, lon: 1.4206, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'menorca', nombre: 'Menorca', ccaa: 'Illes Balears', ccaa_iso: 'ES53', tipo: ['isla', 'costa', 'naturaleza'], lat: 39.9496, lon: 4.1100, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'tenerife', nombre: 'Tenerife', ccaa: 'Canarias', ccaa_iso: 'ES70', tipo: ['isla', 'costa', 'naturaleza'], lat: 28.2916, lon: -16.6291, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'gran-canaria', nombre: 'Gran Canaria', ccaa: 'Canarias', ccaa_iso: 'ES70', tipo: ['isla', 'costa'], lat: 27.9202, lon: -15.5474, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'lanzarote', nombre: 'Lanzarote', ccaa: 'Canarias', ccaa_iso: 'ES70', tipo: ['isla', 'costa', 'naturaleza'], lat: 29.0469, lon: -13.5899, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'fuerteventura', nombre: 'Fuerteventura', ccaa: 'Canarias', ccaa_iso: 'ES70', tipo: ['isla', 'costa'], lat: 28.3587, lon: -14.0537, fuente: FUENTE, fecha_ref: FECHA },

  // ── Interior / rural / naturaleza ─────────────────────────────────────
  { slug: 'picos-europa', nombre: 'Picos de Europa', ccaa: 'Principado de Asturias', ccaa_iso: 'ES12', tipo: ['rural', 'naturaleza', 'interior'], lat: 43.1986, lon: -4.8500, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'ronda', nombre: 'Ronda', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['interior', 'cultural', 'rural'], lat: 36.7460, lon: -5.1610, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'rias-baixas', nombre: 'Rías Baixas', ccaa: 'Galicia', ccaa_iso: 'ES11', tipo: ['costa', 'naturaleza', 'gastronomico', 'rural'], lat: 42.4000, lon: -8.7500, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'la-rioja-vino', nombre: 'La Rioja (enoturismo)', ccaa: 'La Rioja', ccaa_iso: 'ES23', tipo: ['rural', 'gastronomico', 'interior'], lat: 42.4627, lon: -2.4450, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'caceres', nombre: 'Cáceres', ccaa: 'Extremadura', ccaa_iso: 'ES43', tipo: ['interior', 'cultural', 'rural'], lat: 39.4753, lon: -6.3724, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'cuenca', nombre: 'Cuenca', ccaa: 'Castilla-La Mancha', ccaa_iso: 'ES42', tipo: ['interior', 'cultural', 'naturaleza'], lat: 40.0704, lon: -2.1374, fuente: FUENTE, fecha_ref: FECHA },

  // ── Esquí / montaña ───────────────────────────────────────────────────
  { slug: 'sierra-nevada', nombre: 'Sierra Nevada', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['esqui', 'naturaleza'], lat: 37.0955, lon: -3.3986, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'baqueira-beret', nombre: 'Baqueira Beret (Val d’Aran)', ccaa: 'Cataluña', ccaa_iso: 'ES51', tipo: ['esqui', 'naturaleza'], lat: 42.6986, lon: 0.9386, fuente: FUENTE, fecha_ref: FECHA },
  { slug: 'formigal-pirineo', nombre: 'Formigal · Pirineo aragonés', ccaa: 'Aragón', ccaa_iso: 'ES24', tipo: ['esqui', 'naturaleza'], lat: 42.7800, lon: -0.3900, fuente: FUENTE, fecha_ref: FECHA },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers de catálogo (puros)
// ─────────────────────────────────────────────────────────────────────────

/** Lista de códigos NUTS2 (CCAA) presentes en el catálogo (sin duplicados). */
export function ccaasEnCatalogo(): string[] {
  return Array.from(new Set(DESTINOS.map((d) => d.ccaa_iso)))
}

/** Filtra destinos por tipo de turismo. Si `tipo` vacío → todos. */
export function destinosPorTipo(tipo?: DestinoTipo): Destino[] {
  if (!tipo) return DESTINOS.slice()
  return DESTINOS.filter((d) => d.tipo.includes(tipo))
}
