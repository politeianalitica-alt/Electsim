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
  // ─── Sprint G18 item 11 · expansión a 14 commodities críticos ─────
  {
    id: 'gallium',
    name_es: 'Galio',
    hs_code: '8112',
    use_military: 'Radar AESA F-35, semiconductores GaN (defensa misiles), comunicaciones satélite',
    dominant_suppliers: ['CHN', 'RUS', 'KOR'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China controla 98% producción mundial · controles export ago 2023 junto a germanio · "punto de estrangulamiento" según EU Critical Raw Materials Act',
  },
  {
    id: 'lithium',
    name_es: 'Litio',
    hs_code: '2825',
    use_military: 'Baterías submarinos eléctricos, drones militares, energía portátil tropas, vehículos blindados eléctricos',
    dominant_suppliers: ['AUS', 'CHL', 'CHN', 'ARG'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'Litio refinado: China 70% capacidad mundial · Australia/Chile dominan extracción · clave para nueva clase submarinos Type-26',
  },
  {
    id: 'graphite',
    name_es: 'Grafito',
    hs_code: '2504',
    use_military: 'Ánodos baterías litio-ion, blindajes compuestos misiles, motores cohete',
    dominant_suppliers: ['CHN', 'MOZ', 'BRA'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China 65% extracción + 90% procesamiento grafito esférico (battery grade) · controles export dic 2023 sobre grafito artificial',
  },
  {
    id: 'antimony',
    name_es: 'Antimonio',
    hs_code: '8110',
    use_military: 'Munición trazadora, blindajes aleaciones de plomo-antimonio, sensores nocturnos militares, retardantes llama uniformes',
    dominant_suppliers: ['CHN', 'TJK', 'TUR'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: false,
    severity_eu: 3,
    notes: 'China 50% producción + Tayikistán 20% (en órbita rusa) · controles export ago 2024 · sin sustituto en munición',
  },
  {
    id: 'niobium',
    name_es: 'Niobio',
    hs_code: '8112',
    use_military: 'Superaleaciones turbinas reactor militar, blindajes aceros HSLA tanques modernos, superconductores radar',
    dominant_suppliers: ['BRA', 'CAN', 'AUS'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: false,
    severity_eu: 2,
    notes: 'Brasil 88% producción global (CBMM) · concentración geográfica máxima de cualquier commodity · cadena de suministro vulnerable a crisis política BRA',
  },
  {
    id: 'tantalum',
    name_es: 'Tantalio',
    hs_code: '8103',
    use_military: 'Condensadores electrónica militar (radio, GPS, sistemas de guía), aleaciones blindaje, micro-componentes drones',
    dominant_suppliers: ['COD', 'RWA', 'BRA'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: false,
    severity_eu: 2,
    notes: 'RDC 40% global · "mineral de conflicto" Dodd-Frank · trazabilidad obligatoria UE 2021 · clave para miniaturización defensa',
  },
  {
    id: 'beryllium',
    name_es: 'Berilio',
    hs_code: '8112',
    use_military: 'Componentes ópticos misiles (sensores IR), ventanas X-ray reactores nucleares submarinos, instrumentos satélites espía',
    dominant_suppliers: ['USA', 'CHN', 'KAZ'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: false,
    severity_eu: 2,
    notes: 'USA dominante (Materion Corp) · 70% producción Utah · alianza estable pero dependencia única · sin segundo proveedor estratégico fuera China',
  },
  {
    id: 'magnesium',
    name_es: 'Magnesio',
    hs_code: '8104',
    use_military: 'Aleaciones ligeras aeronaves (fuselajes F-15/16/35), helicópteros militares (rotores), munición incendiaria',
    dominant_suppliers: ['CHN', 'USA', 'ISR'],
    alpha_vantage_symbol: null,
    eu_strategic_reserve: true,
    severity_eu: 3,
    notes: 'China 87% producción global · crisis energética sep 2021 redujo exports 50% temporalmente · UE depende 95% de imports chinos · sin reserva estratégica',
  },
]

export function getDefenseCommodities(): DefenseCommodity[] {
  return DEFENSE_COMMODITIES
}
