/**
 * Tipos compartidos del sector Energía v2 · Sprint Energía S1.
 *
 * Estos tipos son el contrato común para los catálogos curados
 * (`lib/energia/catalog.ts`) y las vistas por tipo de energía
 * (`app/sector-energia/_components/*`). Se mantienen deliberadamente
 * planos (sin dependencias) para poder usarse tanto en componentes
 * cliente Next.js como en tests Node (--experimental-strip-types).
 *
 * NOTA · existe otro `EMPRESAS_ENERGIA` legacy en `lib/sources/ree.ts`
 * con shape distinto (capitalizacion_b, web, ibex). El catálogo nuevo
 * (`lib/energia/catalog.ts → EMPRESAS_ENERGIA`) usa el tipo `EnergyCompany`
 * de aquí. Viven en módulos separados, no hay colisión de imports: la
 * vista Eléctrico (S1) sigue consumiendo el legacy de `ree.ts`.
 */

/** Tipo de energía · controla la barra superior de navegación de EnergiaShell. */
export type EnergiaTipo =
  | 'global'
  | 'electrico'
  | 'renovables'
  | 'nuclear'
  | 'petroleo'
  | 'gas'
  | 'hidrogeno'

/** Reactor nuclear del parque español. */
export interface Reactor {
  /** Nombre del grupo/reactor (ej. "Almaraz I"). */
  nombre: string
  /** Central a la que pertenece (ej. "Almaraz"). */
  central: string
  /** Potencia eléctrica neta en MW. */
  potencia_mw: number
  /** Año de conexión a la red. */
  ano_conexion: number
  /** Empresas propietarias / titulares de la participación. */
  propietarios: string[]
  /** Tecnología del reactor (PWR / BWR). */
  tecnologia: string
  /** Año previsto de cese definitivo según el calendario pactado. */
  cierre_previsto: number
  /** Estado operativo actual. */
  estado: 'operativo' | 'parada' | 'cerrado'
}

/** Capacidad renovable instalada por tecnología. */
export interface RenewableCapacity {
  tecnologia: string
  /** Capacidad instalada en MW. */
  capacidad_mw: number
  /** Fuente del dato (organismo + fecha). */
  fuente: string
  /** Año de referencia del dato. */
  ano: number
}

/** Objetivo cuantitativo del PNIEC 2030. */
export interface PniecTarget {
  /** Métrica objetivo (ej. "% generación eléctrica renovable"). */
  metrica: string
  /** Valor objetivo a 2030. */
  objetivo_2030: number | string
  /** Valor actual (último dato disponible). */
  valor_actual: number | string
  /** Unidad de medida. */
  unidad: string
}

/** Proyecto de hidrógeno renovable (PERTE H2 / corredores EU). */
export interface H2Project {
  nombre: string
  /** Promotor principal. */
  promotor: string
  /** Ubicación (provincia / CCAA). */
  ubicacion: string
  /** Capacidad de electrólisis / proyecto en MW. */
  capacidad_mw: number
  /** Estado del proyecto (ej. "en operación", "en construcción", "FID", "planificado"). */
  estado: string
  /** Año horizonte objetivo. */
  horizonte: number
}

// ─────────────────────────────────────────────────────────────────────────
// Ember (electricidad global) · Sprint Energía S2
//
// Tipos del cliente `lib/ember/client.ts` que consume la API REST de Ember
// Energy (api.ember-energy.org/v1). Se mantienen planos para poder usarse
// tanto en route handlers como en componentes cliente y tests Node.
//
// API real (confirmada vía WebFetch del OpenAPI · 2026-06-02):
//   - Base: https://api.ember-energy.org/v1
//   - Auth: query param `api_key=<EMBER_API_KEY>` (NO header). Sin key → 403.
//   - Envelope: { stats: {...}, data: [ {...registro} ] }
//   - Granularidad: /yearly y /monthly por endpoint. `date` = "YYYY" o "YYYY-MM".
//   - Registro generación: entity, entity_code, is_aggregate_entity, date,
//       series, is_aggregate_series, generation_twh, share_of_generation_pct
//   - Registro intensidad: entity, entity_code, is_aggregate_entity, date,
//       emissions_intensity_gco2_per_kwh
//   - Registro capacidad: entity, entity_code, is_aggregate_entity, date,
//       series, is_aggregate_series, capacity_gw, capacity_w_per_capita
//   - Registro demanda: entity, entity_code, is_aggregate_entity, date,
//       demand_twh, (demand_mwh_per_capita en yearly)
// ─────────────────────────────────────────────────────────────────────────

/** Resolución temporal soportada por los datasets Ember. */
export type EmberResolution = 'yearly' | 'monthly'

/** Una fila de generación por fuente para una entidad/fecha. */
export interface EmberGenerationRow {
  /** Fuente / combustible (ej. "Wind", "Solar", "Coal", "Nuclear"). */
  series: string
  /** Generación absoluta en TWh (puede ser null en la fuente). */
  generation_twh: number | null
  /** Cuota sobre la generación total del periodo, en % (puede ser null). */
  share_of_generation_pct: number | null
}

/** Generación eléctrica de un país/entidad para un periodo (fuentes + total). */
export interface EmberGeneration {
  /** Nombre de la entidad tal como lo devuelve Ember (ej. "Spain"). */
  entity: string
  /** Código ISO-3 (ej. "ESP") si Ember lo provee. */
  entity_code: string | null
  /** Periodo del dato más reciente usado ("YYYY" o "YYYY-MM"). */
  date: string
  /** Resolución temporal de la consulta. */
  resolution: EmberResolution
  /** Desglose por fuente, ordenado de mayor a menor generación. */
  by_source: EmberGenerationRow[]
  /** Suma de generación de todas las fuentes (TWh). */
  total_twh: number
  /** % renovable agregado (eólica+solar+hidro+bio+otras renovables). */
  renewable_pct: number
  /** % limpio agregado (renovables + nuclear · definición Ember "clean"). */
  clean_pct: number
  /** % fósil agregado (carbón+gas+petróleo+otros fósiles). */
  fossil_pct: number
}

/** Intensidad de carbono de la generación eléctrica de una entidad. */
export interface EmberCarbonIntensity {
  entity: string
  entity_code: string | null
  /** Periodo del dato ("YYYY" o "YYYY-MM"). */
  date: string
  resolution: EmberResolution
  /** Intensidad en gramos de CO2 por kWh (null si no disponible). */
  gco2_per_kwh: number | null
}

/** Perfil energético completo de un país (mix + emisiones + demanda). */
export interface EmberCountryProfile {
  entity: string
  entity_code: string | null
  /** Último año con datos de mix. */
  latest_year: string | null
  /** Mix de generación del último año (fuentes + agregados). */
  generation: EmberGeneration | null
  /** Intensidad de carbono más reciente. */
  carbon_intensity: EmberCarbonIntensity | null
  /** Demanda eléctrica del último año disponible (TWh). */
  demand_twh: number | null
  /** Demanda per cápita (MWh/persona) del último año, si disponible. */
  demand_mwh_per_capita: number | null
  /** Serie histórica de % renovable por año (orden ascendente). */
  renewable_trend: Array<{ year: string; renewable_pct: number; total_twh: number }>
}

/**
 * Envoltura de degradación común a todas las respuestas del cliente Ember.
 * Patrón Politeia (ver `lib/esios/client.ts`): nunca lanza; ante fallo o key
 * ausente devuelve `{ ok: false, error, fetched_at }`.
 */
export interface EmberResponse<T> {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: T
  /** ISO timestamp del momento de la petición. */
  fetched_at: string
  /** URL pública de Ember para citar la fuente en la UI. */
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// ENTSO-E (red eléctrica europea) · Sprint Energía S3
//
// Tipos del cliente `lib/entsoe/client.ts` que consume la API REST XML de
// ENTSO-E Transparency Platform (web-api.tp.entsoe.eu/api). Se mantienen planos
// para poder usarse en route handlers, componentes cliente y tests Node.
//
// API real (confirmada vía entsoe-py mappings/parsers · 2026-06-02):
//   - Base: https://web-api.tp.entsoe.eu/api
//   - Auth: query param `securityToken=<TOKEN>`. El token es el "Web API
//       Security Token" que se genera en My Account Settings de la web (NO es
//       la contraseña). Si solo hay user/pass, el cliente degrada con error.
//   - Formato respuesta: XML (Publication_MarketDocument para precios/flujos,
//       GL_MarketDocument para generación/carga). El cliente parsea a JSON.
//   - documentType: A44 (day-ahead prices), A11 (cross-border physical flow),
//       A75 (actual generation per type), A65 (total load).
//   - Estructura XML: TimeSeries → Period → timeInterval (start/end) +
//       resolution (PT60M) + Point (position + price.amount | quantity).
//       MktPSRType/psrType marca la tecnología en generación (A75).
//   - periodStart/periodEnd: formato yyyyMMddHHmm en UTC.
// ─────────────────────────────────────────────────────────────────────────

/** Un punto horario de una serie ENTSO-E (precio o cantidad). */
export interface EntsoePoint {
  /** Posición 1-based dentro del Period (la API NO repite posiciones sin cambio). */
  position: number
  /** Valor: €/MWh para precios (A44), MW/MWh para flujos/generación/carga. */
  value: number
  /** ISO timestamp del punto, derivado de timeInterval.start + (pos-1)*resolution. */
  timestamp: string
}

/** Precios day-ahead (A44) de una zona para un rango temporal. */
export interface EntsoePrices {
  /** Clave corta de zona (ej. "ES"). */
  zone: string
  /** Código EIC del dominio consultado. */
  eic: string
  /** Resolución de la serie (minutos · típicamente 60). */
  resolution_min: number
  /** Puntos horarios ordenados ascendente por timestamp. */
  points: EntsoePoint[]
  /** Precio medio €/MWh sobre los puntos (null si vacío). */
  avg_eur_mwh: number | null
  /** Precio máximo €/MWh (null si vacío). */
  max_eur_mwh: number | null
  /** Precio mínimo €/MWh (null si vacío). */
  min_eur_mwh: number | null
}

/** Flujos físicos cross-border (A11) en un sentido (from → to). */
export interface EntsoeFlow {
  /** Zona origen (clave corta). */
  from: string
  /** Zona destino (clave corta). */
  to: string
  /** Puntos horarios de potencia (MW) en sentido from→to. */
  points: EntsoePoint[]
  /** Energía total transferida en el periodo (MWh, suma de puntos horarios). */
  total_mwh: number
}

/** Flujos cross-border bidireccionales entre dos zonas + saldo neto. */
export interface EntsoeCrossBorder {
  from: string
  to: string
  /** Flujo from→to (export desde `from`). */
  forward: EntsoeFlow
  /** Flujo to→from (import hacia `from`). */
  reverse: EntsoeFlow
  /** Saldo neto MWh (forward - reverse). Positivo = `from` exporta neto. */
  net_mwh: number
  /** Dirección dominante legible (ej. "ES → FR"). */
  net_direction: string
}

/** Generación por tecnología (A75) agregada en el periodo. */
export interface EntsoeGenerationItem {
  /** Código PSR type (ej. "B16"). */
  psr_type: string
  /** Etiqueta humana de la tecnología (ej. "Solar"). */
  label: string
  /** Energía generada en el periodo (MWh, suma de puntos horarios). */
  mwh: number
}

/** Generación por tipo (A75) de una zona en un rango temporal. */
export interface EntsoeGeneration {
  zone: string
  eic: string
  /** Desglose por tecnología, ordenado de mayor a menor MWh. */
  by_type: EntsoeGenerationItem[]
  /** Suma total MWh de todas las tecnologías. */
  total_mwh: number
}

/**
 * Envoltura de degradación común a todas las respuestas del cliente ENTSO-E.
 * Patrón Politeia (ver `lib/esios/client.ts` y `lib/ember/client.ts`): nunca
 * lanza; ante token ausente o fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export interface EntsoeResponse<T> {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: T
  /** ISO timestamp del momento de la petición. */
  fetched_at: string
  /** URL pública de ENTSO-E para citar la fuente en la UI. */
  source_url?: string
}

/** Empresa del sector energético (española o major global). */
export interface EnergyCompany {
  /** Slug estable para rutas /sector-energia/empresas/[slug] (S9). */
  slug: string
  nombre: string
  /** Ticker bursátil (ej. "IBE.MC"). */
  ticker: string
  /** Mercado/bolsa donde cotiza (ej. "BME", "NYSE", "Euronext Paris"). */
  exchange: string
  /** País de la sede. */
  pais: string
  /** Segmentos de actividad (ej. "Integrada", "Renovables", "Upstream"). */
  segmentos: string[]
  /** Tipos de energía en los que opera. */
  energias: EnergiaTipo[]
  /** True si es empresa española. */
  es_espanola: boolean
  /** Jurisdicción OpenCorporates para enriquecimiento (S9). */
  opencorporates_jurisdiction?: string
  /** Número de compañía OpenCorporates (S9). */
  opencorporates_company_number?: string
}
