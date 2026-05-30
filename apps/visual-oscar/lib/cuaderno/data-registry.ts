/**
 * Registry de embebibles macro/CIS/spanish-stats para el Cuaderno.
 *
 * Sintaxis Markdown extendida:
 *   `{macro:ie-deuda-publica-pib}` → card con valor en vivo
 *   `{cis:problemas-vivienda}`     → card CIS último barómetro
 *   `{stats:smi}`                  → spanish-stats snapshot
 *   `{gov:cpi}`                    → governance-indices snapshot
 *
 * El registry contiene metadatos para que el picker muestre opciones
 * legibles. El componente `DataEmbed` hace el fetch en runtime.
 */

export type DataSource = 'macro' | 'cis' | 'stats' | 'gov' | 'wb' | 'undp'

export interface DataEmbedSpec {
  source: DataSource
  key: string
  /** Etiqueta para el picker */
  label: string
  /** Sub-etiqueta · fuente y frecuencia */
  hint: string
  /** Endpoint de fetch (relativo) */
  endpoint: string
  /** Unidad para el render */
  unit: string
  /** Color acento del card */
  accent: string
  /** Decimales */
  decimals?: number
  /** Si menor es mejor (alerta verde/rojo) */
  goodLow?: boolean
  /** Profundidad enlace · al hacer click en el card va aquí */
  deepLink?: string
}

const M = (key: string, label: string, hint: string, opts: Partial<DataEmbedSpec> = {}): DataEmbedSpec => ({
  source: 'macro',
  key,
  label,
  hint,
  endpoint: opts.endpoint ?? `/api/macro/${key}`,
  unit: opts.unit ?? '',
  accent: opts.accent ?? '#0F766E',
  decimals: opts.decimals ?? 2,
  goodLow: opts.goodLow,
  deepLink: opts.deepLink ?? '/macro',
})

const STATS = (key: string, label: string, unit: string, accent = '#7C3AED'): DataEmbedSpec => ({
  source: 'stats',
  key,
  label,
  hint: 'Spanish-stats · snapshot',
  endpoint: `/api/spanish-stats/${key}?country=ESP`,
  unit,
  accent,
  decimals: 2,
  deepLink: '/macro',
})

const CIS = (key: string, label: string, hint: string, unit = '%'): DataEmbedSpec => ({
  source: 'cis',
  key,
  label,
  hint,
  endpoint: `/api/cis-snapshot/${key}`,
  unit,
  accent: '#dc2626',
  decimals: 1,
  deepLink: '/macro?tab=hogares-empleo-vivienda',
})

const GOV = (key: string, label: string, hint: string, unit: string, accent = '#0891B2'): DataEmbedSpec => ({
  source: 'gov',
  key,
  label,
  hint,
  endpoint: `/api/governance-indices/${key}?country=ESP`,
  unit,
  accent,
  decimals: 2,
  deepLink: '/macro?tab=instituciones-estado',
})

const WB = (indicator: string, label: string, hint: string, unit = ''): DataEmbedSpec => ({
  source: 'wb',
  key: indicator,
  label,
  hint,
  endpoint: `/api/worldbank/indicator/${indicator}?country=ES&per_page=10`,
  unit,
  accent: '#0F766E',
  decimals: 2,
  deepLink: '/macro',
})

const UNDP = (key: string, label: string): DataEmbedSpec => ({
  source: 'undp',
  key,
  label,
  hint: 'UNDP HDR',
  endpoint: `/api/undp/${key}?country=ESP`,
  unit: '',
  accent: '#16a34a',
  decimals: 3,
  deepLink: '/macro?tab=sociedad-bienestar',
})

/**
 * Catálogo curado de ~50 embebibles que cubren los indicadores top de los 15 tabs.
 */
export const DATA_REGISTRY: DataEmbedSpec[] = [
  // ─── Spanish-stats snapshots ───────────────────────────────────────────
  STATS('smi', 'SMI mensual', '€/mes'),
  STATS('salario-medio', 'Salario medio EEES', '€/año'),
  STATS('salario-mediano', 'Salario mediano', '€/año'),
  STATS('precio-m2-vivienda', 'Precio €/m² vivienda', '€/m²', '#dc2626'),
  STATS('pac-fondos', 'Fondos PAC', '€bn'),
  STATS('feder-feader', 'FEDER+FEADER ejecutado', '%'),
  STATS('banda-ancha-rural', 'Banda ancha rural', '%'),
  STATS('precio-tierra', 'Precio tierra agrícola', '€/ha'),
  STATS('empleo-eco-social', 'Empleo economía social', 'ocupados'),
  STATS('cooperativas', 'Cooperativas activas', 'entidades'),
  STATS('ejecucion-presup', 'Ejecución presupuestaria', '%'),
  STATS('contratacion-pub', 'Contratación pública', '%PIB'),
  STATS('pob-extranjera', '% pob. extranjera', '%'),
  STATS('crecimiento-natural', 'Crecimiento natural', '‰'),
  STATS('edad-maternidad', 'Edad maternidad', 'años'),
  STATS('municipios-despoblacion', 'Municipios despoblación', 'mun.'),
  STATS('kaitz-ratio', 'Kaitz Index (SMI/mediana)', '%'),
  STATS('esfuerzo-vivienda', 'Esfuerzo compra vivienda', 'años salario', '#dc2626'),

  // ─── CIS perception ────────────────────────────────────────────────────
  CIS('problemas-vivienda', 'Vivienda problema · CIS', 'Mensual CIS'),
  CIS('problemas-paro', 'Paro problema · CIS', 'Mensual CIS'),
  CIS('problemas-precios', 'Precios problema · CIS', 'Mensual CIS'),
  CIS('confianza-gobierno', 'Confianza Gobierno · CIS', 'Trimestral CIS'),
  CIS('confianza-congreso', 'Confianza Congreso · CIS', 'Trimestral CIS'),
  CIS('confianza-tribunales', 'Confianza Tribunales · CIS', 'Trimestral CIS'),
  CIS('valoracion-presidente', 'Valoración Presidente · CIS', 'Mensual CIS', '/10'),
  CIS('valoracion-oposicion', 'Valoración Oposición · CIS', 'Mensual CIS', '/10'),
  CIS('situacion-economica', 'Situación económica · CIS', 'Mensual CIS'),
  CIS('sit-economica-futura', 'Expectativa económica · CIS', 'Mensual CIS'),

  // ─── Governance indices ────────────────────────────────────────────────
  GOV('cpi', 'TI CPI España', 'Transparency International', '/100', '#dc2626'),
  GOV('wjp', 'WJP Rule of Law', 'World Justice Project', '/1', '#0891B2'),

  // ─── UNDP HDI ──────────────────────────────────────────────────────────
  UNDP('hdi', 'Índice Desarrollo Humano (HDI)'),

  // ─── World Bank (vía proxy) ────────────────────────────────────────────
  WB('SP.POP.65UP.TO.ZS', '% población ≥65', 'World Bank · SP.POP.65UP', '%'),
  WB('CC.PER.RNK', 'WGI Control Corrupción', 'World Bank · CC.PER.RNK', '/100'),
  WB('GE.PER.RNK', 'WGI Government Effectiveness', 'World Bank · GE.PER.RNK', '/100'),
  WB('RL.PER.RNK', 'WGI Rule of Law', 'World Bank · RL.PER.RNK', '/100'),
  WB('SP.URB.TOTL.IN.ZS', '% urbano', 'World Bank · SP.URB.TOTL', '%'),

  // ─── Macro Politeia (varios endpoints existentes) ──────────────────────
  M('imf-country-debt', 'Deuda %PIB IMF', 'IMF DataMapper', {
    endpoint: '/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP',
    unit: '%PIB',
    accent: '#dc2626',
    decimals: 1,
    goodLow: true,
    deepLink: '/macro?tab=margen-fiscal',
  }),
  M('imf-country-deficit', 'Saldo fiscal %PIB IMF', 'IMF DataMapper', {
    endpoint: '/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP',
    unit: '%PIB',
    accent: '#16a34a',
    decimals: 1,
    deepLink: '/macro?tab=margen-fiscal',
  }),
  M('ipc-anual', 'IPC anual España', 'INE · IPC290750', {
    endpoint: '/api/ine/ipc?n=36',
    unit: '%',
    accent: '#dc2626',
    decimals: 2,
    goodLow: true,
    deepLink: '/macro?tab=pulso-macro',
  }),
  M('paro-epa', 'Tasa paro EPA general', 'INE · EPA86913', {
    endpoint: '/api/ine/epa?n=24',
    unit: '%',
    accent: '#f59e0b',
    decimals: 2,
    goodLow: true,
    deepLink: '/macro?tab=hogares-empleo-vivienda',
  }),
  M('macro-derived-arope-gap', 'AROPE gap ES-UE', 'derived', {
    endpoint: '/api/macro/derived/arope_gap',
    unit: 'pp',
    accent: '#dc2626',
    decimals: 2,
    goodLow: true,
    deepLink: '/macro?tab=sociedad-bienestar',
  }),
  M('macro-derived-cap-estado', 'Capacidad Estado compuesto', 'derived multi-source', {
    endpoint: '/api/macro/derived/capacidad_estado',
    unit: '/100',
    accent: '#0F766E',
    decimals: 0,
    deepLink: '/macro?tab=instituciones-estado',
  }),
  M('macro-derived-riesgo-politico', 'Riesgo político agregado', 'derived multi-source', {
    endpoint: '/api/macro/derived/riesgo_politico_agregado',
    unit: '/100',
    accent: '#dc2626',
    decimals: 0,
    goodLow: true,
    deepLink: '/macro?tab=empresas-beneficios',
  }),
]

const BY_KEY = new Map<string, DataEmbedSpec>()
for (const d of DATA_REGISTRY) {
  BY_KEY.set(`${d.source}:${d.key}`, d)
}

export function resolveDataEmbed(source: DataSource, key: string): DataEmbedSpec | null {
  return BY_KEY.get(`${source}:${key}`) ?? null
}

export function searchDataEmbeds(query: string, limit = 20): DataEmbedSpec[] {
  const q = query.trim().toLowerCase()
  if (q.length < 1) return DATA_REGISTRY.slice(0, limit)
  return DATA_REGISTRY.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.hint.toLowerCase().includes(q) ||
      d.key.toLowerCase().includes(q),
  ).slice(0, limit)
}

export function dataEmbedsBySource(source: DataSource): DataEmbedSpec[] {
  return DATA_REGISTRY.filter((d) => d.source === source)
}
