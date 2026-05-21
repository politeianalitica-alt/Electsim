/**
 * Matriz de fuentes utilizadas por cada tab de /macro.
 *
 * Esta metadata se renderiza en:
 *  - Footer del tab (fuente · última actualización · refresh cadence)
 *  - Drawer "Fuentes" en cada tab
 *  - Brain prompt context para "Lectura Politeia"
 */

export type MacroTabId =
  | 'pulso-macro'
  | 'regimen-monetario'
  | 'margen-fiscal'
  | 'dependencias-externas'
  | 'riesgo-sistemico'
  | 'mercados-activos'
  | 'flujos-capital'
  | 'productividad-competitividad'
  | 'empresas-beneficios'
  | 'hogares-empleo-vivienda'

export interface MacroTab {
  id: MacroTabId
  number: number
  label: string
  shortLabel: string
  description: string
  sources: {
    key: string
    name: string
    cadence: 'live' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
    endpoint?: string
  }[]
  themeAccent: string  // hex color for tab accent stripe
}

export const MACRO_TABS: MacroTab[] = [
  {
    id: 'pulso-macro',
    number: 1,
    label: 'Pulso macro',
    shortLabel: 'Pulso',
    description: 'Crecimiento, PIB, producción, consumo, inversión, paro, confianza, previsiones.',
    sources: [
      { key: 'imf', name: 'IMF DataMapper · WEO', cadence: 'quarterly', endpoint: '/api/imf/spain-overview' },
      { key: 'ine', name: 'INE CNT · Contabilidad Trimestral', cadence: 'quarterly', endpoint: '/api/ine/cnt-desglose' },
      { key: 'eurostat', name: 'Eurostat · Producción industrial', cadence: 'monthly', endpoint: '/api/eurostat/spain-industry' },
    ],
    themeAccent: '#0F766E', // teal
  },
  {
    id: 'regimen-monetario',
    number: 2,
    label: 'Régimen monetario',
    shortLabel: 'Monetario',
    description: 'Inflación, tipos de interés, curva de bonos, expectativas, política BCE.',
    sources: [
      { key: 'eurostat', name: 'Eurostat · HICP', cadence: 'monthly', endpoint: '/api/eurostat/dataset?code=prc_hicp_aind' },
      { key: 'ecb', name: 'ECB SDW · Yields y tipos', cadence: 'daily', endpoint: '/api/ecb/yield-curve' },
      { key: 'imf', name: 'IMF · PCPIPCH', cadence: 'annual', endpoint: '/api/imf/country?indicator=PCPIPCH' },
      { key: 'bis', name: 'BIS · Effective FX', cadence: 'daily', endpoint: '/api/bis/fx-effective' },
    ],
    themeAccent: '#7C3AED', // violet
  },
  {
    id: 'margen-fiscal',
    number: 3,
    label: 'Margen fiscal',
    shortLabel: 'Fiscal',
    description: 'Deuda pública, déficit, ingresos, gasto, intereses, ejecución, presión fiscal.',
    sources: [
      { key: 'imf', name: 'IMF · GGXWDG_NGDP', cadence: 'annual', endpoint: '/api/imf/country?indicator=GGXWDG_NGDP' },
      { key: 'eurostat', name: 'Eurostat · gov_10dd', cadence: 'quarterly', endpoint: '/api/eurostat/dataset?code=gov_10dd_ggdebt' },
      { key: 'datos-gob', name: 'AIReF · Previsiones fiscales', cadence: 'quarterly', endpoint: '/api/datos-gob/airef-forecast' },
      { key: 'datos-gob', name: 'IGAE · Ejecución mensual', cadence: 'monthly', endpoint: '/api/datos-gob/igae-ejecucion' },
      { key: 'ine', name: 'INE CNT · AAPP cap. 5', cadence: 'quarterly', endpoint: '/api/ine/cnt-aapp' },
    ],
    themeAccent: '#DC2626', // red
  },
  {
    id: 'dependencias-externas',
    number: 4,
    label: 'Dependencias externas',
    shortLabel: 'Dependencias',
    description: 'Comercio exterior, socios, concentración HHI, cuenta corriente, dependencia energética.',
    sources: [
      { key: 'oec', name: 'OEC · Comercio bilateral + ECI', cadence: 'annual', endpoint: '/api/oec/spain-overview' },
      { key: 'comtrade', name: 'UN Comtrade', cadence: 'annual', endpoint: '/api/comtrade/spain-overview' },
      { key: 'macro-finance', name: 'IMF DOTS · Bilateral', cadence: 'monthly', endpoint: '/api/macro-finance/dots' },
      { key: 'eurostat', name: 'Eurostat · Comext', cadence: 'monthly', endpoint: '/api/eurostat/dataset?code=ds-022469' },
    ],
    themeAccent: '#F97316', // orange
  },
  {
    id: 'riesgo-sistemico',
    number: 5,
    label: 'Riesgo sistémico',
    shortLabel: 'Riesgo',
    description: 'Spreads soberanos, volatilidad, depreciaciones, reservas, deuda externa, alerta temprana.',
    sources: [
      { key: 'macro-finance', name: 'ECB SDW · Spreads', cadence: 'daily', endpoint: '/api/macro-finance/markets' },
      { key: 'bis', name: 'BIS · Cross-border claims', cadence: 'quarterly', endpoint: '/api/bis/dataset?id=WS_LBS_D_PUB' },
      { key: 'finnhub', name: 'Finnhub · ^VIX', cadence: 'live', endpoint: '/api/finnhub/quote?symbol=^VIX' },
      { key: 'imf', name: 'IMF · Deuda externa', cadence: 'annual', endpoint: '/api/imf/country?indicator=GGXWDN_NGDPN' },
    ],
    themeAccent: '#B91C1C', // dark red
  },
  {
    id: 'mercados-activos',
    number: 6,
    label: 'Mercados & activos',
    shortLabel: 'Mercados',
    description: 'Bolsas, bonos, divisas, oro, petróleo, cripto, volatilidad.',
    sources: [
      { key: 'finnhub', name: 'Finnhub · IBEX35 + ADRs', cadence: 'live', endpoint: '/api/finnhub/dashboard' },
      { key: 'ecb', name: 'ECB SDW · Yields y FX', cadence: 'daily', endpoint: '/api/ecb/exchange-rates' },
      { key: 'commodities', name: 'Yahoo · Commodities', cadence: 'live', endpoint: '/api/commodities/snapshot-all' },
    ],
    themeAccent: '#2563EB', // blue
  },
  {
    id: 'flujos-capital',
    number: 7,
    label: 'Flujos de capital',
    shortLabel: 'Capital',
    description: 'IED, inversión cartera, reservas, deuda externa, cuenta financiera, posición inversión internacional.',
    sources: [
      { key: 'eurostat', name: 'Eurostat · BOP', cadence: 'quarterly', endpoint: '/api/eurostat/dataset?code=bop_c6_q' },
      { key: 'datos-gob', name: 'DataInvex · IED España', cadence: 'quarterly', endpoint: '/api/datos-gob/sci-inversiones' },
      { key: 'bis', name: 'BIS · Cross-border claims', cadence: 'quarterly', endpoint: '/api/bis/dataset?id=WS_LBS_D_PUB' },
      { key: 'imf', name: 'IMF · BOP cuenta financiera', cadence: 'annual', endpoint: '/api/imf/country?indicator=BFXF_BP6_USD' },
    ],
    themeAccent: '#059669', // emerald
  },
  {
    id: 'productividad-competitividad',
    number: 8,
    label: 'Productividad & competitividad',
    shortLabel: 'Productividad',
    description: 'Productividad laboral, ULC, I+D, patentes, valor añadido industrial, complejidad económica.',
    sources: [
      { key: 'oec', name: 'OEC · ECI ranking', cadence: 'annual', endpoint: '/api/oec/spain-overview' },
      { key: 'eurostat', name: 'Eurostat · ULC + LFS', cadence: 'quarterly', endpoint: '/api/eurostat/dataset?code=nama_10_lp_ulc' },
      { key: 'ine', name: 'INE · Productividad sectorial', cadence: 'quarterly', endpoint: '/api/ine/serie?cod=DSL18293' },
      { key: 'datos-gob', name: 'OEPM · Patentes', cadence: 'annual', endpoint: '/api/datos-gob/oepm-patentes' },
    ],
    themeAccent: '#0891B2', // cyan
  },
  {
    id: 'empresas-beneficios',
    number: 9,
    label: 'Empresas & beneficios',
    shortLabel: 'Empresas',
    description: 'Márgenes, beneficios, inversión corporativa, quiebras, creación, sectores ganadores, cotizadas.',
    sources: [
      { key: 'finnhub', name: 'Finnhub · Cotizadas + Earnings', cadence: 'live', endpoint: '/api/finnhub/sector-snapshot' },
      { key: 'eurostat', name: 'Eurostat · Demografía empresarial', cadence: 'annual', endpoint: '/api/eurostat/dataset?code=bd_size_r3' },
      { key: 'ine', name: 'INE DIRCE · Creación empresas', cadence: 'monthly', endpoint: '/api/ine/dirce-creacion' },
      { key: 'datos-gob', name: 'Registro Mercantil', cadence: 'monthly', endpoint: '/api/datos-gob/registro-mercantil' },
    ],
    themeAccent: '#8B5CF6', // purple
  },
  {
    id: 'hogares-empleo-vivienda',
    number: 10,
    label: 'Hogares, empleo & vivienda',
    shortLabel: 'Hogares',
    description: 'Salarios reales, renta disponible, empleo, paro, precariedad, ahorro, deuda, vivienda, alquileres, hipotecas.',
    sources: [
      { key: 'ine', name: 'INE EPA · Paro armonizado', cadence: 'quarterly', endpoint: '/api/ine/epa' },
      { key: 'ine', name: 'INE IPV · Precios vivienda', cadence: 'quarterly', endpoint: '/api/ine/ipv' },
      { key: 'eurostat', name: 'Eurostat · Renta disponible', cadence: 'annual', endpoint: '/api/eurostat/dataset?code=ilc_di01' },
      { key: 'eurostat', name: 'Eurostat · HPI', cadence: 'quarterly', endpoint: '/api/eurostat/dataset?code=prc_hpi_a' },
    ],
    themeAccent: '#16A34A', // green
  },
]

export function getTab(id: string | null | undefined): MacroTab {
  return MACRO_TABS.find((t) => t.id === id) || MACRO_TABS[0]
}

export const TAB_IDS = MACRO_TABS.map((t) => t.id) as MacroTabId[]
