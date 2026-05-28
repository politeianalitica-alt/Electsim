/**
 * Dataset · 6 commodities críticos para la industria de defensa moderna.
 *
 * Para Tab 4 Militar · Bloque 3 "Commodities críticos para defensa".
 * Sin estos minerales/materiales no hay industria militar avanzada.
 *
 * Mapeo a símbolos de cotización para fetching live:
 *   - Alpha Vantage símbolos de commodities (algunos disponibles)
 *   - Nasdaq Data Link (paid · skip por ahora · usamos placeholder)
 *
 * Datos de oferta dominante actualizados USGS Mineral Commodity Summaries 2024.
 */

export interface DefenseCommodity {
  id: string
  name_es: string
  hs_code: string
  use_military: string
  /** ISO3 de los 2-3 países dominantes en oferta global */
  dominant_suppliers: string[]
  /** Símbolo Alpha Vantage para cotización spot · null si no disponible */
  alpha_vantage_symbol: string | null
  /** Si EU tiene reservas estratégicas declaradas */
  eu_strategic_reserve: boolean
  /** Severidad para Europa si oferta se interrumpe · 1-3 */
  severity_eu: 1 | 2 | 3
  /** Notas sobre dependencia */
  notes: string
}

export const DEFENSE_COMMODITIES: DefenseCommodity[] = [
  {
    id: 'titanium',
    name_es: 'Titanio',
    hs_code: '8108',
    use_military: 'Fuselajes aeronaves militares, blindajes, motores turbina',
    dominant_suppliers: ['CHN', 'RUS', 'JPN'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: false,
    severity_eu: 3,
    notes: 'Rusia es proveedor histórico de titanio aeronáutico VSMPO-AVISMA. Sanciones podrían disparar precios x3',
  },
  {
    id: 'cobalt',
    name_es: 'Cobalto',
    hs_code: '2605',
    use_military: 'Baterías litio-ion militares, aleaciones turbinas, electrónica',
    dominant_suppliers: ['COD', 'CHN', 'AUS'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: '70% oferta global de RDC · concentración refinería en China (75%). Critical Raw Materials Act UE 2024',
  },
  {
    id: 'tungsten',
    name_es: 'Wolframio (tungsteno)',
    hs_code: '2611',
    use_military: 'Munición perforante (penetradores), filamentos, electrónica radar',
    dominant_suppliers: ['CHN', 'VNM', 'RUS'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China controla 84% de la producción mundial. Sin sustituto para penetradores de tanque',
  },
  {
    id: 'rare_earths',
    name_es: 'Tierras raras (REE)',
    hs_code: '2846',
    use_military: 'Misiles guiados (neodimio), radares (lantano), motores F-35 (samario)',
    dominant_suppliers: ['CHN', 'MMR', 'AUS'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China procesa 90% de las REE globales · embargo 2010 a Japón mostró palanca estratégica',
  },
  {
    id: 'palladium',
    name_es: 'Paladio',
    hs_code: '7110',
    use_military: 'Electrónica militar, sensores radar, células combustible aeroespaciales',
    dominant_suppliers: ['RUS', 'ZAF', 'USA'],
    alpha_vantage_symbol: 'XPD',
    eu_strategic_reserve: false,
    severity_eu: 2,
    notes: 'Rusia 40% oferta global · sanciones 2022 aún no afectan flujo (G7 sin embargo formal)',
  },
  {
    id: 'germanium',
    name_es: 'Germanio',
    hs_code: '2848',
    use_military: 'Visores nocturnos infrarrojos, fibra óptica militar, células solares satélites',
    dominant_suppliers: ['CHN', 'RUS', 'USA'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China impuso controles export ago 2023 · precio +60% en 6 meses',
  },
]

export function getDefenseCommodities(): DefenseCommodity[] {
  return DEFENSE_COMMODITIES
}
