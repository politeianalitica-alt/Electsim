/**
 * Catálogo de los indicadores del subtab "Pulso macro" v3.
 *
 * Cada entry define:
 *  - id estable (kebab-case) → URL friendly y clave de caché
 *  - familia (PIB, demanda, oferta, empleo, precios, exterior, sentimiento, sectorial)
 *  - métrica + unidad + frecuencia + fuente
 *  - umbrales para semáforo (amber/red, dirección "good if")
 *  - URL endpoint local del que se obtiene la serie
 *
 * El landing `/macro/pulso` lee este catálogo y renderiza:
 *  - cards agrupadas por familia (24 cards en grid)
 *  - calcula termómetro 0-100 vía heurística por familia
 *  - cada card clicable → `/macro/pulso/indicator/{id}` (detail 9 subtabs)
 */

export type PulsoFamily =
  | 'pib'
  | 'demanda'
  | 'oferta'
  | 'empleo'
  | 'precios'
  | 'exterior'
  | 'sentimiento'
  | 'forecast'

export interface PulsoIndicatorMeta {
  id: string
  family: PulsoFamily
  label: string
  shortLabel?: string
  unit: string
  decimals: number
  source: string
  sourceCode: string
  frequency: 'monthly' | 'quarterly' | 'annual' | 'daily'
  description: string
  /** Endpoint local que devuelve la serie temporal. */
  endpoint: string
  /** Adapter para extraer (lastValue, series, lastPeriod) del JSON. */
  parser:
    | 'ine-cnt-desglose'
    | 'ine-cnt-extra'
    | 'ine-ipc'
    | 'ine-epa'
    | 'ine-frontur'
    | 'ine-dirce'
    | 'imf-country'
    | 'eurostat-simple'
    | 'datos-gob-csv'
    | 'finnhub-quote'   // Sprint N12 · snapshot Finnhub quote (price + previous_close)
    | 'cis-catalogo'    // Sprint N12 · catálogo barómetros CIS publicados (vía CKAN datos.gob.es)
  /** Sub-clave dentro del JSON (p.ej. 'pib_total', 'general'). */
  parserKey?: string
  /** Si parserKey es para imf-country, el indicador IMF. */
  imfIndicator?: string
  /**
   * Config CSV (parser='datos-gob-csv'). El endpoint debe apuntar al proxy
   * `/api/datos-gob/csv?url=...` y este bloque le dice al fetcher de qué columnas
   * extraer periodo + valor.
   */
  csv?: {
    /** Columna o índice (0-based) con la fecha/periodo. */
    dateField: string | number
    /** Columna o índice con el valor numérico. */
    valueField: string | number
    /** Filtro opcional: ej. {column:'CCAA', equals:'Andalucía'} */
    filter?: { column: string; equals: string }
    /** Si la serie es decreciente (más reciente primero) y queremos invertir */
    reverse?: boolean
  }
  threshold?: {
    amber?: number
    red?: number
    goodAbove?: boolean
  }
  accent: string
}

export const PULSO_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB ──────────────────────────────────────────────────────
  {
    id: 'pib-yoy',
    family: 'pib',
    label: 'PIB volumen YoY (CNT)',
    shortLabel: 'PIB YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR6654',
    frequency: 'quarterly',
    description:
      'Variación interanual del PIB en volumen encadenado, ajustado de estacionalidad y calendario. Métrica de referencia para medir el ciclo económico real.',
    endpoint: '/api/ine/cnt-desglose?n=24',
    parser: 'ine-cnt-desglose',
    parserKey: 'pib_total',
    threshold: { amber: 0.5, red: -1, goodAbove: true },
    accent: '#0F766E',
  },
  {
    id: 'pib-imf-growth',
    family: 'pib',
    label: 'PIB real % IMF (20y + forecast)',
    shortLabel: 'PIB IMF 20y',
    unit: '%',
    decimals: 2,
    source: 'IMF DataMapper · WEO',
    sourceCode: 'NGDP_RPCH',
    frequency: 'annual',
    description:
      'Serie larga del IMF WEO con histórica 20y + proyección 5y. Útil para situar el momento actual en contexto secular.',
    endpoint: '/api/imf/country?iso=ESP&indicator=NGDP_RPCH',
    parser: 'imf-country',
    imfIndicator: 'NGDP_RPCH',
    threshold: { amber: 1, red: 0, goodAbove: true },
    accent: '#7c3aed',
  },
  {
    id: 'pib-per-capita',
    family: 'pib',
    label: 'PIB per cápita USD',
    shortLabel: 'PIB pc',
    unit: ' USD',
    decimals: 0,
    source: 'IMF DataMapper · WEO',
    sourceCode: 'NGDPDPC',
    frequency: 'annual',
    description:
      'PIB per cápita en dólares corrientes. Aproximación de renta media; sensible al tipo de cambio.',
    endpoint: '/api/imf/country?iso=ESP&indicator=NGDPDPC',
    parser: 'imf-country',
    imfIndicator: 'NGDPDPC',
    accent: '#7c3aed',
  },

  // ─── Familia Demanda ──────────────────────────────────────────────────
  {
    id: 'consumo-hogares-yoy',
    family: 'demanda',
    label: 'Consumo hogares YoY',
    shortLabel: 'Hogares YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7158',
    frequency: 'quarterly',
    description:
      'Variación interanual del gasto en consumo final de los hogares. Componente más estable de la demanda interna (~55% PIB).',
    endpoint: '/api/ine/cnt-desglose?n=24',
    parser: 'ine-cnt-desglose',
    parserKey: 'consumo_hogares',
    accent: '#16a34a',
  },
  {
    id: 'consumo-aapp-yoy',
    family: 'demanda',
    label: 'Consumo AAPP YoY',
    shortLabel: 'AAPP YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7188',
    frequency: 'quarterly',
    description:
      'Gasto en consumo final de las AAPP. Refleja el peso del gasto público corriente en demanda agregada.',
    endpoint: '/api/ine/cnt-desglose?n=24',
    parser: 'ine-cnt-desglose',
    parserKey: 'consumo_aapp',
    accent: '#0891b2',
  },
  {
    id: 'inversion-fbcf-yoy',
    family: 'demanda',
    label: 'Inversión FBCF YoY',
    shortLabel: 'FBCF YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7213',
    frequency: 'quarterly',
    description:
      'Formación bruta de capital fijo. Componente más volátil del PIB; señal anticipada del ciclo de inversión empresarial.',
    endpoint: '/api/ine/cnt-desglose?n=24',
    parser: 'ine-cnt-desglose',
    parserKey: 'inversion',
    accent: '#f97316',
  },
  {
    id: 'exterior-pp',
    family: 'demanda',
    label: 'Sector exterior aportación',
    shortLabel: 'Exterior pp',
    unit: 'pp',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7264',
    frequency: 'quarterly',
    description:
      'Contribución del sector exterior al PIB en puntos porcentuales (positiva si exportaciones netas suman).',
    endpoint: '/api/ine/cnt-desglose?n=24',
    parser: 'ine-cnt-desglose',
    parserKey: 'exterior',
    accent: '#7c3aed',
  },

  // ─── Familia Oferta / Sectorial ───────────────────────────────────────
  {
    id: 'exports-yoy',
    family: 'exterior',
    label: 'Exportaciones bienes/serv YoY',
    shortLabel: 'Exports YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7267',
    frequency: 'quarterly',
    description:
      'Variación interanual de exportaciones reales totales. Sensible a demanda externa y competitividad-precio.',
    endpoint: '/api/ine/cnt-extra?n=24',
    parser: 'ine-cnt-extra',
    parserKey: 'exports',
    accent: '#0891b2',
  },
  {
    id: 'imports-yoy',
    family: 'exterior',
    label: 'Importaciones bienes/serv YoY',
    shortLabel: 'Imports YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · CNT',
    sourceCode: 'CNTR7287',
    frequency: 'quarterly',
    description:
      'Variación interanual de importaciones reales. Indicador procíclico (correlacionada con demanda interna).',
    endpoint: '/api/ine/cnt-extra?n=24',
    parser: 'ine-cnt-extra',
    parserKey: 'imports',
    accent: '#f97316',
  },
  {
    id: 'cuenta-corriente',
    family: 'exterior',
    label: 'Cuenta corriente %PIB (IMF)',
    shortLabel: 'CC %PIB',
    unit: '%',
    decimals: 2,
    source: 'IMF DataMapper · WEO',
    sourceCode: 'BCA_NGDPD',
    frequency: 'annual',
    description:
      'Saldo de la cuenta corriente sobre PIB. Positivo = exportador neto de ahorro. Crítico para sostenibilidad externa.',
    endpoint: '/api/imf/country?iso=ESP&indicator=BCA_NGDPD',
    parser: 'imf-country',
    imfIndicator: 'BCA_NGDPD',
    threshold: { amber: -2, red: -4, goodAbove: true },
    accent: '#7c3aed',
  },

  // ─── Familia Empleo ────────────────────────────────────────────────────
  {
    id: 'paro-epa-general',
    family: 'empleo',
    label: 'Tasa paro EPA general',
    shortLabel: 'Paro EPA',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · EPA',
    sourceCode: 'EPA86913',
    frequency: 'quarterly',
    description:
      'Tasa de desempleo según EPA (Encuesta de Población Activa) sobre población activa 16+. Estándar Eurostat.',
    endpoint: '/api/ine/epa?n=24',
    parser: 'ine-epa',
    parserKey: 'general',
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: '#f59e0b',
  },
  {
    id: 'paro-epa-jovenes',
    family: 'empleo',
    label: 'Paro juvenil <25 EPA',
    shortLabel: 'Paro <25',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · EPA',
    sourceCode: 'EPA86912',
    frequency: 'quarterly',
    description:
      'Tasa de paro en activos menores de 25 años. Métrica social clave; típicamente 2× tasa general.',
    endpoint: '/api/ine/epa?n=24',
    parser: 'ine-epa',
    parserKey: 'menores_25',
    threshold: { amber: 25, red: 35, goodAbove: false },
    accent: '#dc2626',
  },
  {
    id: 'paro-imf-lur',
    family: 'empleo',
    label: 'Tasa paro IMF (20y + forecast)',
    shortLabel: 'Paro IMF',
    unit: '%',
    decimals: 2,
    source: 'IMF DataMapper · WEO',
    sourceCode: 'LUR',
    frequency: 'annual',
    description:
      'Tasa de paro WEO con proyección 5 años. Útil para situar el momento en serie larga (pico 2013: 26.1%).',
    endpoint: '/api/imf/country?iso=ESP&indicator=LUR',
    parser: 'imf-country',
    imfIndicator: 'LUR',
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: '#f59e0b',
  },

  // ─── Familia Precios ──────────────────────────────────────────────────
  {
    id: 'ipc-anual',
    family: 'precios',
    label: 'IPC variación anual',
    shortLabel: 'IPC YoY',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · IPC',
    sourceCode: 'IPC290750',
    frequency: 'monthly',
    description:
      'Inflación general anual del IPC nacional. Comparable BCE; target 2% a medio plazo.',
    endpoint: '/api/ine/ipc?n=36',
    parser: 'ine-ipc',
    parserKey: 'anual',
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: '#dc2626',
  },
  {
    id: 'ipc-mensual',
    family: 'precios',
    label: 'IPC variación mensual',
    shortLabel: 'IPC m/m',
    unit: '%',
    decimals: 2,
    source: 'INE WSTempus · IPC',
    sourceCode: 'IPC290752',
    frequency: 'monthly',
    description:
      'Variación intermensual del IPC. Mejor lector de inflexiones que la tasa anual (que arrastra base year).',
    endpoint: '/api/ine/ipc?n=36',
    parser: 'ine-ipc',
    parserKey: 'mensual',
    accent: '#8b5cf6',
  },
  {
    id: 'ipc-imf',
    family: 'precios',
    label: 'Inflación IMF (20y + forecast)',
    shortLabel: 'Infl IMF',
    unit: '%',
    decimals: 2,
    source: 'IMF DataMapper · WEO',
    sourceCode: 'PCPIPCH',
    frequency: 'annual',
    description:
      'Inflación WEO anual con proyección. Útil para entender el shock 2022-23 y la convergencia hacia target.',
    endpoint: '/api/imf/country?iso=ESP&indicator=PCPIPCH',
    parser: 'imf-country',
    imfIndicator: 'PCPIPCH',
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: '#dc2626',
  },

  // ─── Sprint N13.1 cleanup · removidos pib-imf-forecast-1y, paro-imf-forecast-1y,
  // ipc-imf-forecast-1y · eran duplicados exactos de los indicadores principales
  // (mismo sourceCode + endpoint). El parser imf-country ya incluye forecast en
  // la misma serie con flag `forecast: true` en los puntos futuros.

  // ─── Sprint N13.2 · Expansión nicho pulso-macro ─────────────────────────
  {
    id: 'pulso-esi-sentiment',
    family: 'sentimiento',
    label: 'ESI Economic Sentiment Indicator',
    shortLabel: 'ESI',
    unit: '',
    decimals: 1,
    source: 'Eurostat · ei_bsei_m',
    sourceCode: 'ei_bsei_m:ES',
    frequency: 'monthly',
    description:
      'Indicador compuesto de sentimiento económico (CE/DG ECFIN). Promedio ponderado de confianza industria+servicios+consumidor+constr+retail. 100=media largo plazo.',
    endpoint: '/api/eurostat/dataset?code=ei_bsei_m&filters=geo=ES;indic=BS-ESI-I;s_adj=SA',
    parser: 'eurostat-simple',
    threshold: { amber: 95, red: 90, goodAbove: true },
    accent: '#8b5cf6',
  },
  {
    id: 'pulso-ventas-retail',
    family: 'demanda',
    label: 'Volumen ventas comercio minorista',
    shortLabel: 'Retail YoY',
    unit: '%',
    decimals: 1,
    source: 'Eurostat · sts_trtu_m',
    sourceCode: 'sts_trtu_m:ES',
    frequency: 'monthly',
    description:
      'Variación interanual volumen ventas comercio minorista. Termómetro del consumo en tiempo real (mensual T+30 días). Lead indicator del C de la cuenta nacional.',
    endpoint: '/api/eurostat/dataset?code=sts_trtu_m&filters=geo=ES;nace_r2=G47;indic_bt=TOVV',
    parser: 'eurostat-simple',
    accent: '#16a34a',
  },
  {
    id: 'pulso-ipi-manufactura',
    family: 'oferta',
    label: 'IPI manufactura YoY',
    shortLabel: 'IPI YoY',
    unit: '%',
    decimals: 1,
    source: 'Eurostat · sts_inpr_m',
    sourceCode: 'sts_inpr_m:ES',
    frequency: 'monthly',
    description:
      'Índice Producción Industrial manufacturera. Sector clave para empleo industrial y exports. Mensual T+45 días, más fresh que CNT trimestral.',
    endpoint: '/api/eurostat/dataset?code=sts_inpr_m&filters=geo=ES;nace_r2=B-D;unit=I15_A',
    parser: 'eurostat-simple',
    threshold: { amber: 0, red: -3, goodAbove: true },
    accent: '#0F766E',
  },
  {
    id: 'pulso-construccion',
    family: 'oferta',
    label: 'Producción construcción',
    shortLabel: 'Construcción',
    unit: '%',
    decimals: 1,
    source: 'Eurostat · sts_copr_m',
    sourceCode: 'sts_copr_m:ES',
    frequency: 'monthly',
    description:
      'Producción sector construcción YoY. Sector cíclico crítico para empleo masculino + cadena valor (materiales, transporte). Recovery post-2008 aún por debajo.',
    endpoint: '/api/eurostat/dataset?code=sts_copr_m&filters=geo=ES;nace_r2=F;unit=I15_A',
    parser: 'eurostat-simple',
    accent: '#f59e0b',
  },
]

export const PULSO_FAMILY_META: Record<PulsoFamily, { label: string; description: string; color: string }> = {
  pib: { label: 'PIB', description: 'Producción agregada · ciclo económico real', color: '#0F766E' },
  demanda: { label: 'Demanda interna', description: 'Hogares · AAPP · Inversión', color: '#16a34a' },
  oferta: { label: 'Oferta · sectorial', description: 'Industria · servicios · agro · construcción', color: '#0891b2' },
  empleo: { label: 'Empleo', description: 'EPA · paro estructural · juvenil', color: '#f59e0b' },
  precios: { label: 'Precios', description: 'IPC · núcleo · expectativas', color: '#dc2626' },
  exterior: { label: 'Sector exterior', description: 'Exportaciones · importaciones · cuenta corriente', color: '#7c3aed' },
  sentimiento: { label: 'Sentimiento', description: 'PMI · confianza consumidor · empresarial', color: '#8b5cf6' },
  forecast: { label: 'Forecast (IMF / OCDE)', description: 'Proyecciones consensuadas a 1-2 años', color: '#6366f1' },
}

export function getPulsoIndicator(id: string): PulsoIndicatorMeta | undefined {
  return PULSO_INDICATORS.find((i) => i.id === id)
}

export function indicatorsByFamily(): Record<PulsoFamily, PulsoIndicatorMeta[]> {
  const acc: Partial<Record<PulsoFamily, PulsoIndicatorMeta[]>> = {}
  for (const ind of PULSO_INDICATORS) {
    if (!acc[ind.family]) acc[ind.family] = []
    acc[ind.family]!.push(ind)
  }
  return acc as Record<PulsoFamily, PulsoIndicatorMeta[]>
}
