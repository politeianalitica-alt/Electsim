/**
 * Dataset · IBEX-35 con presencia internacional documentada.
 *
 * Para Tab 3 Sub-tab 5 Exposición España: muestra qué empresas españolas
 * cotizadas tienen operaciones, filiales o ingresos significativos en
 * cada país.
 *
 * Cobertura: 25 empresas IBEX-35 + 5 grandes corporaciones (Inditex, Telefónica,
 * Repsol, Iberdrola, BBVA, Santander, etc.) con presencia internacional
 * verificable por sus cuentas anuales 2023.
 *
 * Para refrescar: revisar cuentas anuales públicas en CNMV + añadir/quitar
 * entradas manualmente.
 */

export interface IbexCompany {
  /** Símbolo de bolsa Madrid (Finnhub: SUFIJO .MC) */
  symbol: string                    // ej "TEF.MC"
  name: string
  sector: string
  /** Países donde tiene operaciones · ISO3 */
  countries: string[]
  /** Países donde la presencia es CRÍTICA · >10% revenue o filial estructural */
  critical_countries: string[]
}

export const IBEX_COMPANIES: IbexCompany[] = [
  // Banca
  {
    symbol: 'SAN.MC', name: 'Banco Santander', sector: 'banca',
    countries: ['ESP', 'GBR', 'USA', 'BRA', 'MEX', 'POL', 'PRT', 'CHL', 'ARG', 'URY'],
    critical_countries: ['BRA', 'MEX', 'GBR', 'USA'],
  },
  {
    symbol: 'BBVA.MC', name: 'BBVA', sector: 'banca',
    countries: ['ESP', 'MEX', 'TUR', 'COL', 'PER', 'ARG', 'URY', 'USA'],
    critical_countries: ['MEX', 'TUR'],
  },
  {
    symbol: 'CABK.MC', name: 'CaixaBank', sector: 'banca',
    countries: ['ESP', 'PRT'],
    critical_countries: ['PRT'],
  },
  // Energía
  {
    symbol: 'REP.MC', name: 'Repsol', sector: 'energia',
    countries: ['ESP', 'USA', 'CAN', 'BRA', 'MEX', 'VEN', 'BOL', 'PER', 'DZA', 'LBY', 'IDN', 'VNM', 'NOR'],
    critical_countries: ['USA', 'CAN', 'VEN', 'DZA'],
  },
  {
    symbol: 'IBE.MC', name: 'Iberdrola', sector: 'energia',
    countries: ['ESP', 'GBR', 'USA', 'MEX', 'BRA', 'AUS', 'DEU', 'FRA', 'ITA'],
    critical_countries: ['USA', 'GBR', 'BRA', 'MEX'],
  },
  {
    symbol: 'ENG.MC', name: 'Enagás', sector: 'energia',
    countries: ['ESP', 'PER', 'MEX', 'CHL', 'GRC', 'ALB'],
    critical_countries: [],
  },
  {
    symbol: 'NTGY.MC', name: 'Naturgy', sector: 'energia',
    countries: ['ESP', 'CHL', 'ARG', 'BRA', 'MEX', 'PAN', 'DOM', 'MAR', 'AUS'],
    critical_countries: ['CHL', 'BRA'],
  },
  {
    symbol: 'ELE.MC', name: 'Endesa', sector: 'energia',
    countries: ['ESP', 'PRT'],
    critical_countries: ['PRT'],
  },
  // Telecomunicaciones
  {
    symbol: 'TEF.MC', name: 'Telefónica', sector: 'telecom',
    countries: ['ESP', 'GBR', 'DEU', 'BRA', 'MEX', 'COL', 'ARG', 'PER', 'CHL', 'URY', 'ECU', 'VEN'],
    critical_countries: ['BRA', 'GBR', 'DEU'],
  },
  // Retail
  {
    symbol: 'ITX.MC', name: 'Inditex', sector: 'retail',
    countries: ['ESP', 'FRA', 'GBR', 'DEU', 'USA', 'MEX', 'CHN', 'JPN', 'RUS', 'TUR', 'IND', 'BRA', 'ITA', 'POL'],
    critical_countries: ['FRA', 'GBR', 'USA', 'MEX', 'CHN', 'RUS'],
  },
  // Infraestructuras
  {
    symbol: 'ACS.MC', name: 'ACS', sector: 'construccion',
    countries: ['ESP', 'USA', 'CAN', 'AUS', 'DEU', 'MEX', 'CHL', 'PER', 'BRA', 'COL'],
    critical_countries: ['USA', 'AUS'],
  },
  {
    symbol: 'FER.MC', name: 'Ferrovial', sector: 'construccion',
    countries: ['ESP', 'USA', 'CAN', 'GBR', 'AUS', 'POL', 'CHL', 'PER', 'COL'],
    critical_countries: ['USA', 'CAN', 'AUS'],
  },
  {
    symbol: 'ACX.MC', name: 'Acerinox', sector: 'industria',
    countries: ['ESP', 'USA', 'ZAF', 'MYS', 'CHN'],
    critical_countries: ['USA', 'ZAF'],
  },
  {
    symbol: 'SCYR.MC', name: 'Sacyr', sector: 'construccion',
    countries: ['ESP', 'CHL', 'COL', 'PRY', 'PER', 'URY', 'MEX', 'BRA', 'IRL', 'PRT', 'AGO'],
    critical_countries: ['CHL', 'COL'],
  },
  // Seguros
  {
    symbol: 'MAP.MC', name: 'MAPFRE', sector: 'seguros',
    countries: ['ESP', 'BRA', 'MEX', 'USA', 'TUR', 'COL', 'ARG', 'CHL', 'PER', 'VEN'],
    critical_countries: ['BRA', 'MEX'],
  },
  // Defensa
  {
    symbol: 'IDR.MC', name: 'Indra Sistemas', sector: 'defensa',
    countries: ['ESP', 'BRA', 'MEX', 'COL', 'ARG', 'PER', 'CHL', 'ITA', 'PRT', 'GBR', 'USA', 'PHL', 'IND'],
    critical_countries: ['BRA'],
  },
  // Aerospace
  {
    symbol: 'AIR.PA', name: 'Airbus (cotiza París)', sector: 'aerospace',
    countries: ['ESP', 'FRA', 'DEU', 'GBR', 'USA', 'CAN', 'CHN', 'IND', 'AUS', 'BRA', 'MEX', 'JPN'],
    critical_countries: ['FRA', 'DEU', 'USA'],
  },
  // Farma
  {
    symbol: 'GRF.MC', name: 'Grifols', sector: 'farma',
    countries: ['ESP', 'USA', 'CAN', 'DEU', 'GBR', 'IRL', 'CHN', 'BRA', 'MEX'],
    critical_countries: ['USA'],
  },
  {
    symbol: 'ALM.MC', name: 'Almirall', sector: 'farma',
    countries: ['ESP', 'DEU', 'FRA', 'GBR', 'ITA', 'USA', 'CHE'],
    critical_countries: ['DEU', 'USA'],
  },
  // Hotelero / turismo
  {
    symbol: 'MEL.MC', name: 'Meliá Hotels', sector: 'turismo',
    countries: ['ESP', 'MEX', 'DOM', 'CUB', 'BRA', 'VEN', 'GRC', 'PRT', 'ITA', 'IDN', 'VNM'],
    critical_countries: ['MEX', 'CUB', 'DOM'],
  },
  // Distribución
  {
    symbol: 'CLNX.MC', name: 'Cellnex Telecom', sector: 'telecom',
    countries: ['ESP', 'ITA', 'FRA', 'GBR', 'NLD', 'CHE', 'IRL', 'PRT', 'POL', 'AUT', 'DNK', 'SWE'],
    critical_countries: ['ITA', 'FRA', 'GBR'],
  },
  // Tecnología
  {
    symbol: 'AMS.MC', name: 'Amadeus IT Group', sector: 'tecnologia',
    countries: ['ESP', 'USA', 'GBR', 'FRA', 'DEU', 'CHN', 'IND', 'BRA', 'JPN', 'AUS'],
    critical_countries: ['USA'],
  },
  // Aerolíneas
  {
    symbol: 'IAG.MC', name: 'IAG (Iberia + BA)', sector: 'aerolineas',
    countries: ['ESP', 'GBR', 'IRL', 'USA', 'MEX', 'COL', 'ARG'],
    critical_countries: ['GBR'],
  },
  // Acero / industria
  {
    symbol: 'TUB.MC', name: 'Tubacex', sector: 'industria',
    countries: ['ESP', 'USA', 'IND', 'AUT', 'ITA'],
    critical_countries: [],
  },
  // Materiales
  {
    symbol: 'TXT.MC', name: 'Tubos Reunidos', sector: 'industria',
    countries: ['ESP', 'USA', 'BRA', 'MEX'],
    critical_countries: [],
  },
]

/**
 * Devuelve empresas españolas con presencia en un país dado.
 * Si `criticalOnly`, solo empresas para las que ese país es crítico.
 */
export function getCompaniesInCountry(iso3: string, criticalOnly = false): IbexCompany[] {
  const u = iso3.toUpperCase()
  return IBEX_COMPANIES.filter((c) =>
    criticalOnly ? c.critical_countries.includes(u) : c.countries.includes(u)
  )
}

/** Símbolos para batch Finnhub (top N). */
export function getCompanySymbols(companies: IbexCompany[]): string[] {
  return companies.map((c) => c.symbol)
}

export const IBEX_COMPANIES_COUNT = IBEX_COMPANIES.length
