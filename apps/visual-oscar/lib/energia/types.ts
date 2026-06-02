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
