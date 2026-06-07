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

/**
 * Subasta del European Hydrogen Bank (mecanismo de prima fija €/kg) · S9.
 *
 * El Banco Europeo del Hidrógeno subasta ayudas a la producción de H2 renovable
 * con una prima fija (€/kg) durante 10 años a los proyectos que pujan más bajo.
 * La 1ª subasta (piloto · IF24, resuelta abr-2024 tras cierre nov-2023) adjudicó
 * 7 proyectos en un rango de ~0,37-0,48 €/kg. Estas cifras son el resultado
 * público comunicado por la Comisión Europea / CINEA.
 */
export interface H2SubastaEU {
  /** Identificador / ronda de la subasta (ej. "1ª subasta (piloto)"). */
  ronda: string
  /** Fecha del resultado (ISO 'YYYY-MM-DD' o mes 'YYYY-MM'). */
  fecha: string
  /** Precio mínimo adjudicado en €/kg (puja más baja). */
  precio_min_eur_kg: number
  /** Precio máximo adjudicado en €/kg (puja más alta seleccionada). */
  precio_max_eur_kg: number
  /** Nº de proyectos adjudicatarios. */
  proyectos_adjudicados: number
  /** Presupuesto / ayuda total movilizada (millones de euros). */
  presupuesto_meur: number
  /** Observación + fuente del dato. */
  observacion: string
}

/**
 * Proyecto de infraestructura troncal / corredor de hidrógeno (backbone) · S9.
 *
 * Incluye el corredor H2Med (interconexión submarina Barcelona-Marsella, un PCI
 * europeo) y la futura Red Troncal Española de Hidrógeno que Enagás planifica
 * dentro del European Hydrogen Backbone. Cifras de longitud/horizonte son
 * objetivos de proyecto y pueden variar.
 */
export interface H2BackboneProject {
  nombre: string
  /** Tipo de infraestructura (ej. "Interconexión submarina", "Red troncal"). */
  tipo: string
  /** Promotores / TSOs implicados. */
  promotores: string[]
  /** Trazado / ámbito geográfico (ej. "Barcelona ↔ Marsella"). */
  trazado: string
  /** Longitud aproximada en km (null si no aplica / no fijada). */
  longitud_km: number | null
  /** Año horizonte de puesta en servicio objetivo. */
  horizonte: number
  /** Estado (ej. "planificado", "PCI europeo", "estudios"). */
  estado: string
  /** Observación + fuente. */
  observacion: string
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

// ─────────────────────────────────────────────────────────────────────────
// Empresas energéticas enriquecidas (grid + ficha drill-down) · Sprint S9
//
// `lib/energia/companies.ts` enriquece el catálogo `EMPRESAS_ENERGIA` con:
//   - cotización Finnhub (tiempo real, vía /api/finnhub o servidor)
//   - estructura societaria OpenCorporates (jurisdicción, nº registro, estado,
//     filiales/officers) en la ficha drill-down.
// Degradación honesta (CLAUDE.md): si Finnhub/OpenCorporates fallan, se
// devuelve lo del catálogo y los campos enriquecidos quedan null/[].
// ─────────────────────────────────────────────────────────────────────────

/** Cotización compacta de una empresa (Finnhub). */
export interface EnergyCompanyQuote {
  /** Precio actual / último cierre. */
  price: number | null
  /** Variación absoluta del día. */
  change: number | null
  /** Variación porcentual del día. */
  change_percent: number | null
  /** Máximo del día. */
  high: number | null
  /** Mínimo del día. */
  low: number | null
  /** Apertura. */
  open: number | null
  /** Cierre anterior. */
  previous_close: number | null
  /** True si se obtuvo cotización en vivo; false si degradó. */
  available: boolean
}

/** Empresa del catálogo + cotización (para el grid). */
export interface EnergyCompanyListItem extends EnergyCompany {
  /** Cotización Finnhub (null si privada o sin dato). */
  quote: EnergyCompanyQuote | null
}

/** Officer / directivo de OpenCorporates (subset para la ficha). */
export interface EnergyCompanyOfficer {
  name: string
  position: string | null
}

/** Estructura societaria de OpenCorporates para la ficha. */
export interface EnergyCompanyStructure {
  /** True si OpenCorporates devolvió datos. */
  available: boolean
  /** Nombre legal según OpenCorporates. */
  legal_name: string | null
  /** Jurisdicción (ej. "es"). */
  jurisdiction: string | null
  /** Número de registro. */
  company_number: string | null
  /** Estado (Active / Dissolved / ...). */
  status: string | null
  /** Fecha de constitución (YYYY-MM-DD). */
  incorporation_date: string | null
  /** Tipo legal (Sociedad Anónima, ...). */
  company_type: string | null
  /** Dirección registrada. */
  registered_address: string | null
  /** URL pública OpenCorporates de la empresa. */
  opencorporates_url: string | null
  /** Directivos/officers (subset, si disponibles). */
  officers: EnergyCompanyOfficer[]
  /** Otras empresas del grupo halladas en la misma jurisdicción (subset). */
  related: Array<{ name: string; company_number: string; opencorporates_url: string }>
  /** Motivo de degradación si `available === false` (ej. "no_key", "rate_limited"). */
  note?: string
}

/** Ficha completa drill-down de una empresa energética. */
export interface EnergyCompanyFichaData extends EnergyCompany {
  /** Cotización Finnhub (null si privada o sin dato). */
  quote: EnergyCompanyQuote | null
  /** Estructura societaria OpenCorporates. */
  structure: EnergyCompanyStructure
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

// ─────────────────────────────────────────────────────────────────────────
// ALSI almacenamiento de GNL (GIE) · Sprint Energía S8b · "exprimir GIE"
//
// Tipos del cliente `lib/energia/alsi.ts`, que consume la API REST de GIE
// ALSI (Aggregated LNG Storage Inventory · https://alsi.gie.eu/api), la
// plataforma hermana de AGSI pero para terminales de regasificación de GNL
// (existencias de GNL en tanque + emisión a la red). España es el país con
// mayor capacidad de regasificación de la UE → el dato vivo es muy relevante.
//
// API real (capturada en vivo con la key · 2026-06-06):
//   - Base: https://alsi.gie.eu/api
//   - Auth: header HTTP `x-key: <GIE_API_KEY>` (la MISMA key que AGSI).
//   - Query: `country` (ISO-2, ej. "ES"), `type=eu` (agregado UE),
//       `from`/`to` (YYYY-MM-DD), `size`, `page`.
//   - Envelope OK: { last_page, total, data: [ {...registro diario} ] }.
//   - Campos por registro (valores como STRING, huecos "-"):
//       name · code · gasDayStart (YYYY-MM-DD) ·
//       inventory: { lng (kt de GNL), gwh (energía almacenada) } ·
//       sendOut (GWh/d emitidos a la red) ·
//       dtmi: { lng (kt máx), gwh (capacidad máxima declarada) } ·
//       dtrs · contractedCapacity · availableCapacity ·
//       coveredCapacity · status.
//   - fullness % = inventory.gwh / dtmi.gwh × 100 (ES ≈ 75%).
// ─────────────────────────────────────────────────────────────────────────

/** Un punto diario de la serie de almacenamiento de GNL (ALSI). */
export interface LngStoragePoint {
  /** Fecha del gas-day (ISO 'YYYY-MM-DD'). */
  date: string
  /** % de llenado (inventory.gwh / dtmi.gwh × 100), null si hueco. */
  fullness_pct: number | null
  /** Energía de GNL en tanque ese día en GWh (inventory.gwh), null si hueco. */
  inventory_gwh: number | null
  /** Emisión a la red ese día en GWh/d (sendOut), null si hueco. */
  send_out_gwh: number | null
}

/** Almacenamiento de GNL de una zona (UE agregado o un país) · ALSI. */
export interface LngStorage {
  /** Ámbito: 'eu' (agregado UE) o ISO-2 del país (ej. "ES"). */
  zona: string
  /** Etiqueta legible (ej. "Unión Europea", "España"). */
  zona_label: string
  /** % de llenado más reciente (inventory.gwh / dtmi.gwh × 100), null si sin datos. */
  fullness_pct: number | null
  /** Energía de GNL en tanque más reciente en GWh (inventory.gwh), null. */
  inventory_gwh: number | null
  /** Capacidad máxima declarada en GWh (dtmi.gwh), null si no disponible. */
  dtmi_gwh: number | null
  /** Emisión a la red del último día en GWh/d (sendOut), null si sin datos. */
  send_out_gwh: number | null
  /** Fecha del último dato disponible (ISO 'YYYY-MM-DD'). */
  updated_at: string | null
  /** Serie histórica diaria ascendente (más antigua → más reciente). */
  series: LngStoragePoint[]
}

/**
 * Envoltura de degradación común al cliente ALSI.
 * Patrón Politeia (ver `lib/energia/agsi.ts`): nunca lanza; ante key ausente o
 * fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export interface LngStorageResponse {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: LngStorage
  /** ISO timestamp del momento de la petición. */
  fetched_at: string
  /** URL pública de GIE ALSI para citar la fuente en la UI. */
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// IIP Inside Information Platform (GIE) · Sprint Energía S8b · "exprimir GIE"
//
// Tipos del cliente `lib/energia/iip.ts`, que consume la API REST de GIE IIP
// (Inside Information Platform · https://iip.gie.eu/api). Publica UMM (Urgent
// Market Messages): indisponibilidades planificadas/no planificadas de
// infraestructura gasista (plantas de tratamiento, almacenamiento subterráneo,
// terminales de GNL, interconexiones). Es la fuente regulada de "eventos de
// mercado gasista / señales de suministro" en tiempo casi real.
//
// API real (capturada en vivo con la key · 2026-06-06):
//   - Base: https://iip.gie.eu/api
//   - Auth: header HTTP `x-key: <GIE_API_KEY>` (la MISMA key que AGSI/ALSI).
//   - Query: `size`, `page`, `country` (ISO-2 · filtra por país, parcial).
//   - Envelope OK: { current_page, last_page, total, data: [ {...UMM} ] }.
//   - Campos por UMM (anidados, muchos opcionales):
//       submitted ("YYYY-MM-DD HH:mm:ss") ·
//       reportingEntity: { name, code, type } ·
//       message: { messageId, messageType, reportType, unavailabilityType } ·
//       messageString · status · from · to · duration ·
//       marketParticipant · asset · direction · unavailable · available ·
//       technical · balancingZone · unavailabilityReason · remarks · published.
// ─────────────────────────────────────────────────────────────────────────

/** Un evento de mercado gasista (UMM) de la GIE Inside Information Platform. */
export interface GieInsideEvent {
  /** Timestamp de envío del mensaje (ISO-like "YYYY-MM-DD HH:mm:ss"), null. */
  submitted: string | null
  /** Entidad que reporta (operador de la infraestructura), null si ausente. */
  entity: string | null
  /** Activo / instalación afectada, null si la fuente no lo declara. */
  asset: string | null
  /** Tipo de mensaje (ej. "Gas treatment plant unavailability"), null. */
  message_type: string | null
  /** Naturaleza de la indisponibilidad ("Planned" / "Unplanned"), null. */
  unavailability_type: string | null
  /** Inicio de la ventana de indisponibilidad (string crudo de la fuente), null. */
  from: string | null
  /** Fin de la ventana de indisponibilidad (string crudo de la fuente), null. */
  to: string | null
  /** Capacidad/cantidad no disponible (string crudo de la fuente), null. */
  unavailable: string | null
  /** Zona de balance afectada, null si no se declara. */
  balancing_zone: string | null
  /** Motivo declarado de la indisponibilidad, null si ausente. */
  reason: string | null
}

/**
 * Envoltura de degradación común al cliente IIP.
 * Patrón Politeia (ver `lib/energia/agsi.ts`): nunca lanza; ante key ausente o
 * fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export interface GieInsideInfoResponse {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: { events: GieInsideEvent[] }
  /** ISO timestamp del momento de la petición. */
  fetched_at: string
  /** URL pública de GIE IIP para citar la fuente en la UI. */
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// energy-charts.info (Fraunhofer ISE) · contexto eléctrico europeo · S-EU
//
// Tipos del cliente `lib/energia/energy-charts.ts`, que consume la API REST
// pública (SIN key · licencia CC-BY) de energy-charts.info, mantenida por el
// Fraunhofer Institute for Solar Energy Systems (ISE). Es la fuente PRIMARIA
// del "Contexto europeo" del sistema eléctrico en Politeia: sustituye al panel
// ENTSO-E (que requiere un security token aún no disponible), que se conserva
// como fuente adicional opcional cuando se configure ENTSOE_SECURITY_TOKEN.
//
// API real (verificada en vivo · 2026-06-06):
//   - Base: https://api.energy-charts.info
//   - Auth: NINGUNA (keyless). Rate-limit: devuelve HTTP 429 si se piden muchas
//       zonas simultáneamente → el cliente hace fetches SECUENCIALES + caché 1h.
//   - GET /price?bzn=ES → { license_info, unix_seconds:[…], price:[…], unit,
//       deprecated }. Precio day-ahead €/MWh. unix_seconds en pasos de 900s
//       (15-min) o 3600s. Bidding zones: ES, FR, DE-LU, PT, IT-North, BE, NL.
//   - GET /public_power?country=es → { unix_seconds:[…], production_types:[
//       {name, data:[…]}, … ], deprecated }. Generación por fuente en MW.
//       Incluye series especiales: "Load" (demanda), "Renewable share of load",
//       "Renewable share of generation" (%), y series de consumo con valores
//       NEGATIVOS ("Hydro pumped storage consumption", "Battery Consumption",
//       "Cross border electricity trading"). country en minúsculas ISO2.
//   - GET /cbpf?country=es → { unix_seconds:[…], countries:[{name, data:[…]},
//       …], deprecated }. Flujos físicos cross-border NETOS por país vecino,
//       en GW. Incluye una entrada agregada name="sum" (saldo total). Convención
//       de signo (observada): valor POSITIVO = importación neta hacia el país
//       consultado; NEGATIVO = exportación neta desde el país consultado.
//
// Diseño defensivo (CLAUDE.md): nunca lanza; ante fallo de la API devuelve
// `{ ok:false, error, fetched_at }`. NO inventa datos. Caché en memoria 1h.
// ─────────────────────────────────────────────────────────────────────────

/** Precio day-ahead de una bidding zone (último valor + media del día + serie). */
export interface EuPrice {
  /** Clave de bidding zone tal como la espera la API (ej. "ES", "DE-LU", "IT-North"). */
  zone: string
  /** Etiqueta legible para la UI (ej. "España", "Alemania-Luxemburgo"). */
  label: string
  /** Último precio disponible en €/MWh (null si la serie viene vacía). */
  latest_eur_mwh: number | null
  /** Precio medio del último día natural cubierto por la serie (€/MWh, null). */
  avg_today: number | null
  /** Precio mínimo de la serie devuelta (€/MWh, null si vacía). */
  min_eur_mwh: number | null
  /** Precio máximo de la serie devuelta (€/MWh, null si vacía). */
  max_eur_mwh: number | null
  /** Timestamp ISO del último punto (derivado de unix_seconds), null si vacía. */
  latest_ts: string | null
  /** Serie completa (timestamp ISO + valor €/MWh) ascendente. */
  series: Array<{ ts: string; value: number }>
}

/** Una fuente de generación del mix eléctrico (energy-charts public_power). */
export interface EuGenerationSource {
  /** Nombre de la fuente tal como la devuelve la API (ej. "Solar", "Nuclear", "Fossil gas"). */
  name: string
  /** Potencia más reciente de esa fuente en MW (último valor no nulo). */
  mw: number
  /** Cuota de esa fuente sobre la generación total del último instante, en %. */
  share_pct: number
}

/** Generación por fuente de un país (mix EU-style · MW + % renovable). */
export interface EuGeneration {
  /** ISO-2 del país consultado (minúsculas, ej. "es"). */
  country: string
  /** Etiqueta legible (ej. "España"). */
  label: string
  /** Timestamp ISO del último instante con datos (null si vacío). */
  latest_ts: string | null
  /** Demanda (carga) del último instante en MW, si la API la provee (serie "Load"). */
  load_mw: number | null
  /** Generación total (suma de fuentes con producción positiva) en MW. */
  total_generation_mw: number
  /** % renovable sobre la generación, según la API ("Renewable share of generation"). */
  renewable_share_pct: number | null
  /** % renovable sobre la carga, según la API ("Renewable share of load"). */
  renewable_share_of_load_pct: number | null
  /** Desglose por fuente (solo producción positiva), ordenado de mayor a menor MW. */
  sources: EuGenerationSource[]
}

/** Flujo físico neto cross-border con un país vecino (energy-charts cbpf). */
export interface EuCrossBorderFlow {
  /** Nombre del país vecino tal como lo devuelve la API (ej. "France", "Portugal"). */
  neighbour: string
  /** Flujo neto más reciente en MW (positivo = importa el país consultado). */
  net_mw: number
  /** Flujo neto medio de la serie en MW (positivo = importa el país consultado). */
  avg_mw: number
  /** Dirección dominante legible del último valor (ej. "FR → ES" o "ES → PT"). */
  direction: string
}

/** Flujos cross-border de un país + saldo neto agregado. */
export interface EuCrossBorder {
  /** ISO-2 del país consultado (minúsculas, ej. "es"). */
  country: string
  /** Etiqueta legible (ej. "España"). */
  label: string
  /** Timestamp ISO del último instante con datos (null si vacío). */
  latest_ts: string | null
  /** Flujos por país vecino (excluye la entrada agregada "sum"). */
  neighbours: EuCrossBorderFlow[]
  /** Saldo neto agregado más reciente en MW (positivo = importador neto), null. */
  net_balance_mw: number | null
}

/**
 * Envoltura de degradación común al cliente energy-charts.
 * Patrón Politeia (ver `lib/ember/client.ts`, `lib/entsoe/client.ts`): nunca
 * lanza; ante fallo de la API devuelve `{ ok:false, error, fetched_at }`.
 */
export interface EuPowerResponse<T> {
  ok: boolean
  /** Mensaje de error legible cuando `ok === false`. */
  error?: string
  /** Payload tipado cuando `ok === true`. */
  data?: T
  /** ISO timestamp del momento de la petición (o cache hit). */
  fetched_at: string
  /** URL pública de energy-charts.info para citar la fuente en la UI. */
  source_url?: string
}
