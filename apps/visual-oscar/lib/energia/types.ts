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

/**
 * Subasta de capacidad renovable (resultado adjudicado) · Sprint Energía S5.
 *
 * España ha celebrado varias subastas del nuevo marco (RD 960/2020 ·
 * Régimen Económico de Energías Renovables, REER) entre 2021 y 2022, además
 * de las históricas de 2016-2017. El precio adjudicado es el €/MWh medio
 * ponderado resultante de la puja (a la baja).
 */
export interface SubastaRenovable {
  /** Fecha de la subasta (ISO YYYY-MM-DD o mes "YYYY-MM"). */
  fecha: string
  /** Tecnología(s) subastada(s) (ej. "Fotovoltaica", "Eólica", "Tecnología no específica"). */
  tecnologia: string
  /** Precio adjudicado medio en €/MWh (resultado de la puja a la baja). */
  precio_adjudicado_eur_mwh: number
  /** Capacidad adjudicada en MW. */
  capacidad_mw: number
  /** Observación + fuente del dato. */
  observacion: string
}

/**
 * Dependencia de importación de crudo de España · Sprint Energía S7.
 *
 * España importa la práctica totalidad del crudo que consume (no tiene
 * producción doméstica relevante). Los datos de orígenes provienen de la
 * estadística de aprovisionamiento de crudo de CORES (Corporación de Reservas
 * Estratégicas de Productos Petrolíferos) / MITECO.
 */
export interface PetroleoOrigen {
  /** País de origen del crudo importado. */
  pais: string
  /** Cuota aproximada sobre el total de crudo importado, en %. */
  cuota_pct: number
}

/** Resumen de dependencia petrolera de España (catálogo CORES/MITECO). */
export interface PetroleoDependencia {
  /** % del crudo consumido que se importa (≈99%, sin producción doméstica). */
  dependencia_importacion_pct: number
  /** Año de referencia de los datos. */
  ano_ref: number
  /** Principales países de origen del crudo, ordenados por cuota descendente. */
  origenes: PetroleoOrigen[]
  /** Fuente citada. */
  fuente: string
  /** URL pública de la fuente. */
  fuente_url: string
  /** Notas de contexto (chokepoints, diversificación, etc.). */
  nota: string
}

// ─────────────────────────────────────────────────────────────────────────
// Commodities energía con SERIES · Sprint Energía S7
//
// Tipos del cliente `lib/energia/commodities.ts`, que extiende el patrón
// commodities existente (`lib/commodities-yahoo-seed.ts`,
// `lib/nasdaq/data-link.ts`) para energía con SERIES históricas (no solo
// spot). Se mantienen planos para usarse en route handlers, componentes
// cliente y tests Node (--experimental-strip-types).
//
// Fuentes en cascada (la primera que responda gana):
//   1. Alpha Vantage commodity functions (BRENT, WTI, NATURAL_GAS) → serie
//      diaria/mensual. Rate-limit 25 req/día → caché agresiva 1h.
//   2. Nasdaq Data Link (OPEC/ORB para la cesta OPEP) → serie diaria.
//   3. Yahoo Finance chart (BZ=F, CL=F, NG=F, RB=F, HO=F) → serie diaria
//      larga (3 meses) vía el patrón existente.
//
// Degradación honesta (CLAUDE.md): nunca lanza; ante fallo de todas las
// fuentes devuelve `{ ok:false, error }`. Cada serie cita su fuente.
// ─────────────────────────────────────────────────────────────────────────

/** Identificador estable de un commodity energético. */
export type EnergyCommoditySymbol =
  | 'brent'
  | 'wti'
  | 'opec'
  | 'henry-hub'
  | 'ttf'
  | 'gasolina'
  | 'diesel'

/** Fuente real de la que provino la serie de un commodity energético. */
export type EnergyCommoditySource = 'alpha_vantage' | 'nasdaq_data_link' | 'yahoo_finance'

/** Un punto de una serie temporal de commodity (cierre del día). */
export interface EnergyCommodityPoint {
  /** Fecha ISO 'YYYY-MM-DD'. */
  date: string
  /** Valor de cierre en la unidad del commodity. */
  value: number
}

/**
 * Serie histórica + spot de un commodity energético.
 *
 * `latest` es el último punto disponible; `change_24h`/`change_7d`/`change_30d`
 * son variaciones porcentuales calculadas con `computeChange()` sobre `series`
 * (cronológica ascendente). Cualquiera puede ser `null` si no hay puntos
 * suficientes en la ventana.
 */
export interface EnergyCommoditySeries {
  symbol: EnergyCommoditySymbol
  /** Nombre legible (ej. "Brent"). */
  name: string
  /** Unidad de cotización (ej. "USD/bbl", "USD/MMBtu", "USD/gal"). */
  unit: string
  /** Moneda de cotización (ISO ej. "USD", "EUR"). */
  currency: string
  /** Último valor disponible (spot/cierre más reciente), null si sin datos. */
  latest: number | null
  /** Fecha del último valor (ISO 'YYYY-MM-DD'), null si sin datos. */
  latest_date: string | null
  /** Variación % a 24h (último vs anterior punto), null si insuficiente. */
  change_24h: number | null
  /** Variación % a 7 días naturales, null si insuficiente. */
  change_7d: number | null
  /** Variación % a 30 días naturales, null si insuficiente. */
  change_30d: number | null
  /** Serie histórica cronológica ascendente (más antigua → más reciente). */
  series: EnergyCommodityPoint[]
  /** Fuente real de la que provino la serie. */
  source: EnergyCommoditySource
  /** Etiqueta legible de la fuente para citar en la UI. */
  source_label: string
  /** URL pública de la fuente para el badge. */
  source_url: string
}

/**
 * Envoltura de degradación común al cliente de commodities energía.
 * Patrón Politeia: nunca lanza; ante fallo de todas las fuentes en cascada
 * devuelve `{ ok:false, error, fetched_at }`.
 */
export interface EnergyCommodityResponse {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: EnergyCommoditySeries
  /** ISO timestamp del momento de la petición (o cache hit). */
  fetched_at: string
}

// ─────────────────────────────────────────────────────────────────────────
// AGSI gas storage (GIE) · Sprint Energía S8
//
// Tipos del cliente `lib/energia/agsi.ts`, que consume la API REST de GIE
// AGSI+ (Aggregated Gas Storage Inventory · https://agsi.gie.eu/api). Se
// mantienen planos para usarse en route handlers, componentes cliente y tests
// Node (--experimental-strip-types).
//
// API real (confirmada vía WebFetch del endpoint + User Manual GIE v007 ·
// 2026-06-02):
//   - Base: https://agsi.gie.eu/api
//   - Auth: header HTTP `x-key: <GIE_API_KEY>`. La key es GRATUITA pero
//       OBLIGATORIA desde 2022 (registro en https://agsi.gie.eu/account).
//       Sin key la API responde HTTP 401 con un envelope JSON:
//       { last_page:0, total:0, dataset:"storage ERROR",
//         error:"access denied", message:"Invalid or missing API key", data:[] }
//   - Query: `country` (ISO-2, ej. "ES"), `type=eu` (agregado UE), `date`,
//       `from`/`to` (YYYY-MM-DD), `size`, `page`.
//   - Envelope OK: { last_page, total, data: [ {...registro diario} ] }.
//   - Campos de cada registro (User Manual GIE):
//       gasDayStart (fecha YYYY-MM-DD) · gasInStorage (TWh, 4 dec) ·
//       full (% de llenado) · trend (variación diaria de `full`) ·
//       injection (GWh/d) · withdrawal (GWh/d) ·
//       workingGasVolume (TWh, capacidad técnica) ·
//       injectionCapacity / withdrawalCapacity (GWh/d) ·
//       consumption / consumptionFull · status · name · code · url.
//   - Los valores numéricos llegan como STRING ("87.62") → el cliente los
//       parsea con tolerancia a "-"/""/null (huecos de la fuente).
// ─────────────────────────────────────────────────────────────────────────

/** Un punto diario de la serie de almacenamiento de gas (AGSI). */
export interface GasStoragePoint {
  /** Fecha del gas-day (ISO 'YYYY-MM-DD'). */
  date: string
  /** % de llenado del almacenamiento ese día (null si hueco). */
  full_pct: number | null
  /** Gas almacenado en TWh (null si hueco). */
  gas_in_storage_twh: number | null
  /** Inyección del día en GWh/d (null si hueco). */
  injection_gwh: number | null
  /** Extracción del día en GWh/d (null si hueco). */
  withdrawal_gwh: number | null
}

/** Almacenamiento de gas de una zona (UE agregado o un país) · AGSI. */
export interface GasStorage {
  /** Ámbito: 'eu' (agregado UE) o ISO-2 del país (ej. "ES"). */
  zone: string
  /** Etiqueta legible (ej. "Unión Europea", "España"). */
  zone_label: string
  /** Fecha del último dato disponible (ISO 'YYYY-MM-DD'). */
  latest_date: string | null
  /** % de llenado más reciente (null si sin datos). */
  full_pct: number | null
  /** Gas almacenado más reciente en TWh (null si sin datos). */
  gas_in_storage_twh: number | null
  /** Capacidad técnica (working gas volume) en TWh (null si no disponible). */
  working_gas_volume_twh: number | null
  /** Inyección del último día en GWh/d (null si sin datos). */
  injection_gwh: number | null
  /** Extracción del último día en GWh/d (null si sin datos). */
  withdrawal_gwh: number | null
  /** Tendencia diaria de `full` (variación puntos % vs día anterior, null). */
  trend: number | null
  /** Fase neta dominante derivada de inyección/extracción del último día. */
  fase: 'inyeccion' | 'extraccion' | 'equilibrio' | null
  /** Serie histórica diaria ascendente (más antigua → más reciente). */
  series: GasStoragePoint[]
}

/**
 * Envoltura de degradación común al cliente AGSI.
 * Patrón Politeia (ver `lib/ember/client.ts`, `lib/entsoe/client.ts`): nunca
 * lanza; ante key ausente o fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export interface GasStorageResponse {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: GasStorage
  /** ISO timestamp del momento de la petición. */
  fetched_at: string
  /** URL pública de GIE AGSI para citar la fuente en la UI. */
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// GNL España · plantas de regasificación + orígenes (catálogo) · S8
//
// Tipos del catálogo curado `GNL_ESPANA` en `lib/energia/catalog.ts`. España
// es el país con mayor capacidad de regasificación de la UE (6 plantas en
// operación + El Musel en Asturias en proceso de puesta en marcha). Fuentes:
// Enagás (operador del sistema gasista) y CORES (estadística de hidrocarburos).
// ─────────────────────────────────────────────────────────────────────────

/** Planta de regasificación de GNL en España (catálogo Enagás). */
export interface GnlPlanta {
  /** Nombre de la planta (ej. "Barcelona"). */
  nombre: string
  /** Ubicación (provincia / CCAA). */
  ubicacion: string
  /** Operador de la terminal. */
  operador: string
  /**
   * Capacidad de emisión (regasificación) en GWh/día, orden de magnitud.
   * Null para plantas sin emisión comercial plena (ej. en puesta en marcha).
   */
  emision_gwh_dia: number | null
  /** Estado operativo. */
  estado: 'operativa' | 'puesta en marcha' | 'planificada'
  /** Nota de contexto. */
  nota?: string
}

/** País de origen del GNL importado por España (catálogo CORES/Enagás). */
export interface GnlOrigen {
  /** País de origen del GNL. */
  pais: string
  /** Cuota aproximada sobre el total de GNL importado, en %. */
  cuota_pct: number
}

/** Resumen del aprovisionamiento de GNL de España (catálogo Enagás/CORES). */
export interface GnlEspana {
  /** Año de referencia de los datos. */
  ano_ref: number
  /** Plantas de regasificación. */
  plantas: GnlPlanta[]
  /** Principales orígenes del GNL, ordenados por cuota descendente. */
  origenes: GnlOrigen[]
  /** % aproximado del gas natural consumido que llega como GNL (vs gasoducto). */
  cuota_gnl_pct: number
  /** Fuente citada. */
  fuente: string
  /** URL pública de la fuente. */
  fuente_url: string
  /** Notas de contexto (capacidad UE, dependencia, diversificación). */
  nota: string
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
