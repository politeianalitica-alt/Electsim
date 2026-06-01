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
 *
 * Sprint N16 · methodology + release + confidence + related ids en cada entry.
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
    | 'finnhub-quote'        // Sprint N12 · snapshot Finnhub quote (price + previous_close)
    | 'cis-catalogo'         // Sprint N12 · catálogo barómetros CIS publicados (vía CKAN datos.gob.es)
    | 'bde-series'           // Sprint N15 · BdE webstat CSV series (EURIBOR, hipotecas, NPL, etc.)
    | 'tesoro-snapshot'      // Sprint N15 · Tesoro Público boletín mensual snapshot (vida media, % tenedores)
    | 'aemet-precipitacion'  // Sprint N16 · AEMET OpenData climatologías mensuales por provincia/CCAA
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
  // ─── Sprint N16 · Profundización analista ──────────────────────────────
  /**
   * Nota metodológica corta (1-3 frases) que explica CÓMO se calcula el
   * indicador, sus limitaciones y caveats típicos. Se muestra en el
   * IndicatorDrillContent (drawer) y en el tab "Fuentes" del detalle.
   * Foco analista: aporta el "asterisco" que diferencia un número usable
   * de un número engañoso (revisiones, base year, ajuste estacional, etc.).
   */
  methodologyNote?: string
  /**
   * Cadencia legible para humanos: cuándo se publica el indicador respecto
   * a su periodo de referencia. Ej: "Mensual · T+30 días", "Trimestral · T+90",
   * "Anual · abril año siguiente". Útil para construir un calendario real
   * de releases y para que el analista sepa cuán fresca es la cifra.
   */
  releaseSchedule?: string
  /**
   * Nivel de confianza en la cifra reportada:
   *  - high   = serie oficial, sin revisiones materiales (Eurostat, INE EPA)
   *  - medium = puede revisarse (CNT, IPV) o derivada (proxy)
   *  - low    = snapshot puntual, estimado o sintético (Finnhub free tier)
   */
  confidenceLevel?: 'high' | 'medium' | 'low'
  /**
   * IDs de otros indicadores Pulso relacionados (mismo catálogo o crossover).
   * Alimenta la subtab "Relaciones" del IndicatorDetailLayout y permite
   * construir vistas comparativas/scatter automáticas. Convención: usar los
   * `id` exactos (ej. ['hev-tipo-hipoteca', 'rs-yield-10y-es']).
   */
  relatedIndicatorIds?: string[]
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
    methodologyNote:
      'Contabilidad Nacional Trimestral (CNTR), serie en volumen encadenado base 2015. Ajustada de estacionalidad y efectos calendario (CVEC). Tres revisiones cada trimestre: avance (T+30 días), provisional (T+60), definitivo (T+90). El avance es el más comentado pero el más revisado.',
    releaseSchedule: 'Trimestral · avance T+30 días, definitivo T+90 días',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['pib-imf-growth', 'consumo-hogares-yoy', 'inversion-fbcf-yoy', 'paro-epa-general'],
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
    methodologyNote:
      'PIB real anual % WEO. Coincide con CNTR anual pero con metodología armonizada IMF. Proyección 5y basada en su modelo macro España revisado cada abril/octubre — históricamente conservador (sub-proyecta recuperaciones, sobre-proyecta recesiones).',
    releaseSchedule: 'Anual · WEO abril+octubre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['pib-yoy', 'paro-imf-lur', 'ipc-imf'],
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
    methodologyNote:
      'USD nominales corrientes (no PPP). Muy sensible al tipo cambio EUR/USD — apreciación €1 = +10% PIB pc sin cambio real. Para comparativa welfare entre países usar versión PPP (PPPPC) que ajusta diferencias coste vida.',
    releaseSchedule: 'Anual · WEO abril+octubre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['pib-imf-growth'],
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
    methodologyNote:
      'CNTR componente C de la cuenta nacional. Incluye gasto residente nacional (no extranjero turista, que va aparte en exports turismo). Lectura adelantada vía pulso-ventas-retail (mensual). Sensibilidad alta a tasa ahorro y renta disponible.',
    releaseSchedule: 'Trimestral · igual PIB',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['pib-yoy', 'pulso-ventas-retail', 'paro-epa-general'],
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
    methodologyNote:
      'Consumo final efectivo AAPP (S13). Mayor parte = salarios + bienes/servicios producidos para sí mismo. NO incluye transferencias monetarias a hogares (pensiones, paro) que van en mf-prestaciones-d62.',
    releaseSchedule: 'Trimestral · igual PIB',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['pib-yoy', 'mf-gasto-aapp'],
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
    methodologyNote:
      'FBCF = construcción residencial + no residencial + maquinaria/equipo + propiedad intelectual. España estructuralmente FBCF construcción >50% (alta vs UE ~40%). Componente más volátil del PIB — multiplicador del crédito.',
    releaseSchedule: 'Trimestral · igual PIB',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['pib-yoy', 'pulso-construccion'],
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
    methodologyNote:
      'Contribución (X-M)/PIB ponderada. Es residual de la cuenta nacional: si demanda interna acelera + importaciones suben → exterior aporta NEGATIVO (recordar 2015-19 vs 2010-13). Mide cómo se "reparte" el crecimiento entre demanda interna y externa.',
    releaseSchedule: 'Trimestral · igual PIB',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['exports-yoy', 'imports-yoy', 'cuenta-corriente'],
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
    methodologyNote:
      'Bienes + servicios (incluido turismo). España exports/PIB ~35% (vs DE ~50%, FR ~30%). Driver clave de competitividad-precio (REER en mercados-activos) + demanda externa (PIB UE).',
    releaseSchedule: 'Trimestral · CNT T+30/60/90',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['imports-yoy', 'cuenta-corriente', 'ma-reer-bis'],
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
    methodologyNote:
      'Procíclica con consumo + FBCF. Componente energía ~25% — sensible a precio gas/petróleo. Si imports crecen >exports = empeora cuenta corriente.',
    releaseSchedule: 'Trimestral · CNT T+30/60/90',
    confidenceLevel: 'medium',
    relatedIndicatorIds: ['exports-yoy', 'cuenta-corriente', 'consumo-hogares-yoy'],
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
    methodologyNote:
      'BCA = Balance Cuenta Corriente (bienes + servicios + rentas + transferencias). España logró superávit estructural desde 2013 (saneamiento balanza pagos post-burbuja). Crítico para narrativa "exportador de ahorro" vs déficit pre-2008.',
    releaseSchedule: 'Anual · WEO abril+octubre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['exports-yoy', 'imports-yoy', 'exterior-pp'],
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
    methodologyNote:
      'Encuesta a ~65k hogares panel rotatorio. Definición OIT. SEPE mensual NO comparable (sólo demandantes inscritos). Margen error ~0.3 pp para tasa general; mayor para subgrupos.',
    releaseSchedule: 'Trimestral · INE 4 viernes posterior a fin trimestre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['paro-epa-jovenes', 'paro-imf-lur', 'hev-paro-epa-general'],
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
    methodologyNote:
      'Activos 16-24 años. Base activa pequeña (mayoría en estudios) → ratio volátil. Para visión estructural NEET ver rs-neet.',
    releaseSchedule: 'Trimestral · igual EPA general',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['paro-epa-general', 'rs-neet'],
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
    methodologyNote:
      'Promedio anual tasa EPA. NAIRU España estimada ~13% — debajo activa presión salarial inflacionista; encima genera histéresis (paro LD). Proyección IMF suele sub-revisar ajustes en recuperación.',
    releaseSchedule: 'Anual · WEO abril+octubre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['paro-epa-general'],
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
    methodologyNote:
      'IPC nacional (no armonizado HICP). 939 artículos ponderados por gasto medio de la Encuesta Presupuestos Familiares. Base 2021. Para política monetaria BCE usar HICP (Eurostat prc_hicp_manr).',
    releaseSchedule: 'Mensual · publicación 13-14 día siguiente',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['ipc-mensual', 'ipc-imf', 'hev-ipc-anual'],
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
    methodologyNote:
      'm/m sin desestacionalizar. Picos estacionales julio (rebajas) y enero. Mejor lectura tendencia con IPC subyacente (excluye energía + alimentos sin elaborar).',
    releaseSchedule: 'Mensual · igual IPC anual',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['ipc-anual'],
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
    methodologyNote:
      'Inflación promedio anual WEO. Proyección refleja consenso IMF — no expectativas mercado (que están en swap inflation 5y5y BCE).',
    releaseSchedule: 'Anual · WEO abril+octubre',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['ipc-anual'],
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
    methodologyNote:
      'Compuesto ponderado: industria 40% + servicios 30% + consumidor 20% + construcción 5% + retail 5%. Base 100=media largo plazo. >100 = sentimiento por encima de la media histórica. Lead indicator del PIB (~2 trimestres).',
    releaseSchedule: 'Mensual · publicación T+30 días',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['pulso-ventas-retail', 'consumo-hogares-yoy'],
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
    endpoint: '/api/eurostat/dataset?code=sts_trtu_m&filters=geo=ES;nace_r2=G47;indic_bt=NETTUR;unit=I21;s_adj=SCA',
    parser: 'eurostat-simple',
    accent: '#16a34a',
    methodologyNote:
      'NACE G47 = comercio minorista (excl. vehículos). NETTUR = net turnover (cifra de negocios neta), base 2021=100, desestacionalizado + calendario corregido. Sensibilidad alta a inflación: aunque cifra nominal suba, lectura real (volumen) puede caer si IPC sube más.',
    releaseSchedule: 'Mensual · T+30 días',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['consumo-hogares-yoy', 'pulso-esi-sentiment'],
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
    endpoint: '/api/eurostat/dataset?code=sts_inpr_m&filters=geo=ES;nace_r2=B-D;indic_bt=PRD;unit=I21;s_adj=SCA',
    parser: 'eurostat-simple',
    threshold: { amber: 0, red: -3, goodAbove: true },
    accent: '#0F766E',
    methodologyNote:
      'Cobertura B-D NACE (minería + manufactura + energía). PRD = production index, base 2021=100, desestacionalizado + calendario corregido. Lectura adelantada respecto a CNTR producción industrial trimestral.',
    releaseSchedule: 'Mensual · T+45 días',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['pib-yoy', 'pulso-construccion'],
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
    endpoint: '/api/eurostat/dataset?code=sts_copr_m&filters=geo=ES;nace_r2=F;indic_bt=PRD;unit=I21;s_adj=SCA',
    parser: 'eurostat-simple',
    accent: '#f59e0b',
    methodologyNote:
      'NACE F = construcción. PRD = production index, base 2021=100, desestacionalizado + calendario corregido. España recovery post-2008 aún por debajo del pico — sector estructuralmente más pequeño tras crash inmobiliario. Sensibilidad fuerte a tipos hipotecarios + crédito promotor.',
    releaseSchedule: 'Mensual · T+45 días',
    confidenceLevel: 'high',
    relatedIndicatorIds: ['inversion-fbcf-yoy', 'pulso-ipi-manufactura', 'hev-tipo-hipoteca'],
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
