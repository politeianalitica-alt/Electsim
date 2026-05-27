/**
 * Catálogo curado de indicadores ESIOS más útiles para Politeia.
 *
 * Total: 30 indicadores agrupados en 6 categorías. Cada uno trae
 * metadata (label humano, unidad, frecuencia, caso de uso) para que
 * cualquier componente UI pueda renderizar sin tener que conocer la
 * semántica del API ESIOS.
 *
 * IDs verificados contra https://api.esios.ree.es/indicators (mayo 2026).
 * Si alguno cambia, la respuesta del endpoint indicará `http_404` y el
 * componente mostrará empty state.
 */

export type EsiosCategory =
  | 'precios'
  | 'demanda'
  | 'generacion'
  | 'mix'
  | 'emisiones'
  | 'intercambios'
  | 'almacenamiento'
  | 'mercado'

export interface EsiosCatalogItem {
  id: number
  slug: string
  label: string
  short: string                // etiqueta corta para tarjetas
  unit: string                 // '€/MWh', 'MW', '%', 'g/kWh', etc.
  frequency: 'horaria' | '10min' | 'diaria' | 'mensual' | 'anual'
  category: EsiosCategory
  use_case: string             // qué cuenta este indicador
  geo_default: number          // típicamente 8741 (Península)
  /** Si true, alto/bueno = negativo (ej. emisiones, precio). False si alto/bueno = positivo (renovable %). */
  higher_is_worse?: boolean
}

export const ESIOS_CATALOG: Record<string, EsiosCatalogItem> = {
  // ───────────────────────────────────────────────────────────────
  // PRECIOS · clave para hogares, industria, política energética
  // ───────────────────────────────────────────────────────────────
  pvpc: {
    id: 1001,
    slug: 'pvpc',
    label: 'PVPC · Precio Voluntario Pequeño Consumidor',
    short: 'PVPC',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Tarifa eléctrica regulada que paga ~10 millones de hogares ES · referencia consumidor',
    geo_default: 8741,
    higher_is_worse: true,
  },
  mercado_spot: {
    id: 600,
    slug: 'mercado_spot',
    label: 'Mercado spot diario · OMIE',
    short: 'Spot OMIE',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Precio mayorista MIBEL · referencia para industria y comercializadoras',
    geo_default: 8741,
    higher_is_worse: true,
  },
  precio_co2_eua: {
    id: 1339,
    slug: 'precio_co2_eua',
    label: 'Precio EUA · derecho emisión CO2',
    short: 'EUA CO2',
    unit: '€/t',
    frequency: 'diaria',
    category: 'precios',
    use_case: 'EU ETS · coste de emitir 1 tonelada CO2 · driver del precio mayorista',
    geo_default: 8741,
    higher_is_worse: false,    // alto = más caro emitir = bueno para transición
  },
  intradiario_mi1: {
    id: 612,
    slug: 'intradiario_mi1',
    label: 'Mercado intradiario · sesión MI1',
    short: 'MI1',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Ajustes mercado post-spot · revelan tensiones de cierre',
    geo_default: 8741,
    higher_is_worse: true,
  },

  // ───────────────────────────────────────────────────────────────
  // DEMANDA · qué consume el sistema
  // ───────────────────────────────────────────────────────────────
  demanda_real: {
    id: 1293,
    slug: 'demanda_real',
    label: 'Demanda real peninsular',
    short: 'Demanda real',
    unit: 'MW',
    frequency: '10min',
    category: 'demanda',
    use_case: 'Consumo instantáneo · si sube súbitamente puede indicar ola de frío/calor',
    geo_default: 8741,
  },
  demanda_prevista: {
    id: 460,
    slug: 'demanda_prevista',
    label: 'Demanda prevista peninsular',
    short: 'Demanda prevista',
    unit: 'MW',
    frequency: 'horaria',
    category: 'demanda',
    use_case: 'Forecast oficial REE D+1 · benchmark vs realización',
    geo_default: 8741,
  },
  demanda_programada: {
    id: 372,
    slug: 'demanda_programada',
    label: 'Demanda programada',
    short: 'Demanda prog.',
    unit: 'MW',
    frequency: 'horaria',
    category: 'demanda',
    use_case: 'Cuánto ha contratado el mercado para producir',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // GENERACIÓN POR TECNOLOGÍA · mix detallado
  // ───────────────────────────────────────────────────────────────
  gen_nuclear: {
    id: 549,
    slug: 'gen_nuclear',
    label: 'Generación nuclear',
    short: 'Nuclear',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Base de carga · estable · debate cierre 2027-2035',
    geo_default: 8741,
  },
  gen_eolica: {
    id: 551,
    slug: 'gen_eolica',
    label: 'Generación eólica',
    short: 'Eólica',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Renovable intermitente · driver principal del % verde diario',
    geo_default: 8741,
  },
  gen_solar_fv: {
    id: 1161,
    slug: 'gen_solar_fv',
    label: 'Generación solar fotovoltaica',
    short: 'Solar FV',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Renovable con perfil diurno · curva pato · canibaliza precios mediodía',
    geo_default: 8741,
  },
  gen_solar_termica: {
    id: 1162,
    slug: 'gen_solar_termica',
    label: 'Generación solar térmica',
    short: 'Solar térmica',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'CSP · pico tarde · capacidad almacenamiento térmico',
    geo_default: 8741,
  },
  gen_hidraulica: {
    id: 1158,
    slug: 'gen_hidraulica',
    label: 'Generación hidráulica',
    short: 'Hidráulica',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Renovable gestionable · depende de reservas embalses',
    geo_default: 8741,
  },
  gen_ciclo_combinado: {
    id: 547,
    slug: 'gen_ciclo_combinado',
    label: 'Generación ciclo combinado (gas)',
    short: 'Ciclo combinado',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Marginal · sube cuando renovables no llegan · driver del precio spot',
    geo_default: 8741,
  },
  gen_carbon: {
    id: 545,
    slug: 'gen_carbon',
    label: 'Generación carbón',
    short: 'Carbón',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Residual · prácticamente cerrado en ES desde 2020',
    geo_default: 8741,
  },
  gen_cogeneracion: {
    id: 553,
    slug: 'gen_cogeneracion',
    label: 'Generación cogeneración',
    short: 'Cogeneración',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Industria que produce calor + electricidad · régimen especial',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // MIX AGREGADO · % renovable, libre CO2
  // ───────────────────────────────────────────────────────────────
  porcentaje_renovable: {
    id: 10350,
    slug: 'porcentaje_renovable',
    label: '% generación renovable peninsular',
    short: '% renovable',
    unit: '%',
    frequency: 'horaria',
    category: 'mix',
    use_case: 'Indicador clave transición · objetivo PNIEC 2030: 81% eléctrico',
    geo_default: 8741,
  },
  porcentaje_libre_co2: {
    id: 10351,
    slug: 'porcentaje_libre_co2',
    label: '% generación libre CO2',
    short: '% libre CO2',
    unit: '%',
    frequency: 'horaria',
    category: 'mix',
    use_case: 'Incluye renovable + nuclear · objetivo descarbonización 2050',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // EMISIONES · CO2 g/kWh
  // ───────────────────────────────────────────────────────────────
  emisiones_co2: {
    id: 1739,
    slug: 'emisiones_co2',
    label: 'Factor emisión CO2 sistema eléctrico',
    short: 'Emisiones CO2',
    unit: 'gCO2/kWh',
    frequency: 'horaria',
    category: 'emisiones',
    use_case: 'Cuánto CO2 se emite por cada kWh consumido en ese momento',
    geo_default: 8741,
    higher_is_worse: true,
  },

  // ───────────────────────────────────────────────────────────────
  // INTERCAMBIOS INTERNACIONALES · saldo importador/exportador
  // ───────────────────────────────────────────────────────────────
  intercambio_francia: {
    id: 10209,
    slug: 'intercambio_francia',
    label: 'Saldo intercambio Francia',
    short: 'Saldo Francia',
    unit: 'MW',
    frequency: 'horaria',
    category: 'intercambios',
    use_case: 'Negativo = exportación a FR · positivo = importación · clave interconexión UE',
    geo_default: 8741,
  },
  intercambio_portugal: {
    id: 10210,
    slug: 'intercambio_portugal',
    label: 'Saldo intercambio Portugal',
    short: 'Saldo Portugal',
    unit: 'MW',
    frequency: 'horaria',
    category: 'intercambios',
    use_case: 'MIBEL ibérico · normalmente saldo equilibrado · refleja diferencias renovable',
    geo_default: 8741,
  },
  intercambio_marruecos: {
    id: 10211,
    slug: 'intercambio_marruecos',
    label: 'Saldo intercambio Marruecos',
    short: 'Saldo Marruecos',
    unit: 'MW',
    frequency: 'horaria',
    category: 'intercambios',
    use_case: 'Conexión 2x400kV Tarifa-Fardioua · típicamente exportador ES',
    geo_default: 8741,
  },
  intercambio_andorra: {
    id: 10212,
    slug: 'intercambio_andorra',
    label: 'Saldo intercambio Andorra',
    short: 'Saldo Andorra',
    unit: 'MW',
    frequency: 'horaria',
    category: 'intercambios',
    use_case: 'Exportación neta a Andorra (no autosuficiente)',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // ALMACENAMIENTO · bombeo + baterías
  // ───────────────────────────────────────────────────────────────
  bombeo_turbinacion: {
    id: 1745,
    slug: 'bombeo_turbinacion',
    label: 'Bombeo turbinación (descarga)',
    short: 'Bombeo descarga',
    unit: 'MW',
    frequency: '10min',
    category: 'almacenamiento',
    use_case: 'Cuando descargan agua para generar electricidad · pico tarde-noche',
    geo_default: 8741,
  },
  bombeo_consumo: {
    id: 1746,
    slug: 'bombeo_consumo',
    label: 'Bombeo consumo (carga)',
    short: 'Bombeo carga',
    unit: 'MW',
    frequency: '10min',
    category: 'almacenamiento',
    use_case: 'Cuando suben agua para almacenar · típicamente madrugada con renovable excedentaria',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // MERCADOS DE AJUSTE · servicios complementarios
  // ───────────────────────────────────────────────────────────────
  banda_secundaria_subir: {
    id: 634,
    slug: 'banda_secundaria_subir',
    label: 'Precio banda secundaria · subir',
    short: 'Sec. subir',
    unit: '€/MW',
    frequency: 'horaria',
    category: 'mercado',
    use_case: 'Coste reservar capacidad para subir producción · tensión sistema',
    geo_default: 8741,
  },
  banda_secundaria_bajar: {
    id: 635,
    slug: 'banda_secundaria_bajar',
    label: 'Precio banda secundaria · bajar',
    short: 'Sec. bajar',
    unit: '€/MW',
    frequency: 'horaria',
    category: 'mercado',
    use_case: 'Coste reservar capacidad para bajar · exceso de generación',
    geo_default: 8741,
  },
  terciaria_subir: {
    id: 1782,
    slug: 'terciaria_subir',
    label: 'Precio terciaria · subir',
    short: 'Terc. subir',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'mercado',
    use_case: 'Energía adicional ante imprevistos · activación 15 min',
    geo_default: 8741,
  },
  desvios: {
    id: 686,
    slug: 'desvios',
    label: 'Precio gestión desvíos',
    short: 'Desvíos',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'mercado',
    use_case: 'Coste de balancear el sistema · sube si renovable no se predice bien',
    geo_default: 8741,
  },
} as const

export type EsiosSlug = keyof typeof ESIOS_CATALOG

// Subsets curados para los componentes UI

/** Snapshot ejecutivo · 6 indicadores que cuentan el estado del sistema HOY */
export const ESIOS_SNAPSHOT_SLUGS: EsiosSlug[] = [
  'pvpc',
  'mercado_spot',
  'demanda_real',
  'porcentaje_renovable',
  'emisiones_co2',
  'precio_co2_eua',
]

/** Mix de generación · 7 tecnologías para gráfico apilado */
export const ESIOS_MIX_SLUGS: EsiosSlug[] = [
  'gen_nuclear',
  'gen_eolica',
  'gen_solar_fv',
  'gen_solar_termica',
  'gen_hidraulica',
  'gen_ciclo_combinado',
  'gen_cogeneracion',
]

/** Intercambios internacionales · 4 fronteras */
export const ESIOS_INTERCONEXIONES_SLUGS: EsiosSlug[] = [
  'intercambio_francia',
  'intercambio_portugal',
  'intercambio_marruecos',
  'intercambio_andorra',
]

/** Mercados de ajuste · servicios complementarios */
export const ESIOS_MERCADO_AJUSTE_SLUGS: EsiosSlug[] = [
  'banda_secundaria_subir',
  'banda_secundaria_bajar',
  'terciaria_subir',
  'desvios',
]
