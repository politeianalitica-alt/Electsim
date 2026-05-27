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
  intradiario_mi2: {
    id: 613,
    slug: 'intradiario_mi2',
    label: 'Mercado intradiario · sesión MI2',
    short: 'MI2',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Segunda sesión intradiario continuo · ajuste fino programación',
    geo_default: 8741,
    higher_is_worse: true,
  },
  intradiario_mi3: {
    id: 614,
    slug: 'intradiario_mi3',
    label: 'Mercado intradiario · sesión MI3',
    short: 'MI3',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Tercera sesión · ajuste de tarde · refleja errores forecast solar',
    geo_default: 8741,
    higher_is_worse: true,
  },
  intradiario_mi4: {
    id: 615,
    slug: 'intradiario_mi4',
    label: 'Mercado intradiario · sesión MI4',
    short: 'MI4',
    unit: '€/MWh',
    frequency: 'horaria',
    category: 'precios',
    use_case: 'Cuarta sesión · cierre programa día · útimas oportunidades de ajuste',
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
  demanda_canarias: {
    id: 1738,
    slug: 'demanda_canarias',
    label: 'Demanda real Canarias',
    short: 'Demanda Canarias',
    unit: 'MW',
    frequency: '10min',
    category: 'demanda',
    use_case: 'Sistema aislado · perfil distinto a Península · alta dependencia diesel/fuel',
    geo_default: 8742,
  },
  demanda_baleares: {
    id: 1739,
    slug: 'demanda_baleares',
    label: 'Demanda real Baleares',
    short: 'Demanda Baleares',
    unit: 'MW',
    frequency: '10min',
    category: 'demanda',
    use_case: 'Sistema con enlace submarino HVDC a Península · pico estival turismo',
    geo_default: 8743,
  },
  demanda_ceuta: {
    id: 1740,
    slug: 'demanda_ceuta',
    label: 'Demanda real Ceuta',
    short: 'Demanda Ceuta',
    unit: 'MW',
    frequency: '10min',
    category: 'demanda',
    use_case: 'Sistema pequeño aislado · diesel · proyectos cable interconexión',
    geo_default: 8744,
  },
  demanda_melilla: {
    id: 1741,
    slug: 'demanda_melilla',
    label: 'Demanda real Melilla',
    short: 'Demanda Melilla',
    unit: 'MW',
    frequency: '10min',
    category: 'demanda',
    use_case: 'Sistema pequeño aislado · diesel · proyecto interconexión Marruecos',
    geo_default: 8745,
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

  gen_residuos: {
    id: 1163,
    slug: 'gen_residuos',
    label: 'Generación residuos no renovables',
    short: 'Residuos',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Incineradora · valorización energética RSU · peso menor',
    geo_default: 8741,
  },
  gen_biomasa: {
    id: 1160,
    slug: 'gen_biomasa',
    label: 'Generación biomasa',
    short: 'Biomasa',
    unit: 'MW',
    frequency: '10min',
    category: 'generacion',
    use_case: 'Renovable térmica · capacidad limitada · objetivo PNIEC bajo',
    geo_default: 8741,
  },

  // ───────────────────────────────────────────────────────────────
  // MIX AGREGADO · % renovable, libre CO2
  // ───────────────────────────────────────────────────────────────
  gen_renovable_total: {
    id: 10171,
    slug: 'gen_renovable_total',
    label: 'Generación renovable total',
    short: 'Renov. total',
    unit: 'MW',
    frequency: 'horaria',
    category: 'mix',
    use_case: 'Suma de eólica + solar + hidro + biomasa + térmica solar · agregado oficial',
    geo_default: 8741,
  },
  gen_no_renovable_total: {
    id: 10172,
    slug: 'gen_no_renovable_total',
    label: 'Generación no renovable total',
    short: 'No renov. total',
    unit: 'MW',
    frequency: 'horaria',
    category: 'mix',
    use_case: 'Suma de nuclear + CC + carbón + cogeneración + residuos · contraparte',
    geo_default: 8741,
    higher_is_worse: true,
  },
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

/** Precios completo · PVPC + spot + 4 intradiarios · serie 48h */
export const ESIOS_PRECIOS_FULL_SLUGS: EsiosSlug[] = [
  'pvpc',
  'mercado_spot',
  'intradiario_mi1',
  'intradiario_mi2',
  'intradiario_mi3',
  'intradiario_mi4',
]

/** Mix completo · 10 tecnologías para stacked area · 24h con frecuencia 10-min */
export const ESIOS_MIX_FULL_SLUGS: EsiosSlug[] = [
  'gen_nuclear',
  'gen_eolica',
  'gen_solar_fv',
  'gen_solar_termica',
  'gen_hidraulica',
  'gen_ciclo_combinado',
  'gen_cogeneracion',
  'gen_carbon',
  'gen_residuos',
  'gen_biomasa',
]

/** Agregados mix · totales renovable / no renovable + % indicadores · resumen */
export const ESIOS_MIX_AGREGADO_SLUGS: EsiosSlug[] = [
  'gen_renovable_total',
  'gen_no_renovable_total',
  'porcentaje_renovable',
  'porcentaje_libre_co2',
  'emisiones_co2',
]

/** Demanda 5 sistemas eléctricos · peninsular + 4 no peninsulares */
export const ESIOS_DEMANDA_SISTEMAS_SLUGS: EsiosSlug[] = [
  'demanda_real',
  'demanda_canarias',
  'demanda_baleares',
  'demanda_ceuta',
  'demanda_melilla',
]

/** Demanda peninsular · real + prevista + programada · para chart MAPE */
export const ESIOS_DEMANDA_FORECAST_SLUGS: EsiosSlug[] = [
  'demanda_real',
  'demanda_prevista',
  'demanda_programada',
]

/** Geo IDs sistemas eléctricos · para llamadas con geo_default distinto */
export const ESIOS_GEO_SYSTEMS = {
  peninsula: 8741,
  canarias: 8742,
  baleares: 8743,
  ceuta: 8744,
  melilla: 8745,
} as const

/** Coordenadas centroides de los 5 sistemas (lat, lon) · para mapa SVG */
export const ESIOS_GEO_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  peninsula: { lat: 40.4, lon: -3.7, name: 'Península' },
  canarias: { lat: 28.3, lon: -16.5, name: 'Canarias' },
  baleares: { lat: 39.7, lon: 3.0, name: 'Baleares' },
  ceuta: { lat: 35.9, lon: -5.3, name: 'Ceuta' },
  melilla: { lat: 35.3, lon: -2.9, name: 'Melilla' },
}

/** Colores recomendados por tecnología · convención sectorial energía */
export const ESIOS_TECH_COLORS: Record<string, string> = {
  gen_nuclear: '#7c3aed',           // morado · base
  gen_eolica: '#3b82f6',            // azul · viento
  gen_solar_fv: '#f59e0b',          // ámbar · sol
  gen_solar_termica: '#f97316',     // naranja · CSP
  gen_hidraulica: '#06b6d4',        // cian · agua
  gen_ciclo_combinado: '#94a3b8',   // gris · gas
  gen_cogeneracion: '#a3a3a3',      // gris claro · industrial
  gen_carbon: '#171717',            // negro · fósil pesado
  gen_residuos: '#78716c',          // beige · residual
  gen_biomasa: '#84cc16',           // verde · biomasa
}
