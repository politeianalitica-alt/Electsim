// types/contratacion.ts
// Shared types for all P10 Contratación Pública pages

// ─── Shared enums ────────────────────────────────────────────────────────────

export type SectorContratacion =
  | 'Sanidad' | 'Defensa' | 'Infraestructuras' | 'TIC' | 'Energía'
  | 'Educación' | 'Servicios sociales' | 'Cultura' | 'Otros'

export type RiesgoContrato = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'

// ─── Licitaciones ────────────────────────────────────────────────────────────

export type TipoContrato = 'Servicios' | 'Suministro' | 'Obras' | 'Concesión' | 'Mixto'
export type ProcedimientoLic =
  | 'Abierto' | 'Restringido' | 'Negociado' | 'Diálogo competitivo'
  | 'Acuerdo marco' | 'Simplificado'
export type EstadoLicitacion =
  | 'Anuncio previo' | 'En plazo' | 'En estudio' | 'Adjudicación' | 'Cerrado'
export type FuenteContratacion =
  | 'PLACSP' | 'BOE' | 'TED (UE)' | 'BOCG' | 'Generalitat'
  | 'Junta Andalucía' | 'C. Madrid' | 'Ayto. Madrid' | 'Ayto. Barcelona' | 'Otros'
export type MatchContrato = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'

export interface Licitacion {
  id: string
  exp: string
  titulo: string
  organismo: string
  ccaa: string
  sector: SectorContratacion
  tipo: TipoContrato
  procedimiento: ProcedimientoLic
  estado: EstadoLicitacion
  fuente: FuenteContratacion
  importeBase: number
  cpv: string
  publicacion: string
  fechaLimite: string
  diasRestantes: number
  pliegos: number
  match: MatchContrato
  matchScore: number
  keywords: string[]
  region: string
  duracion: string
}

// ─── Adjudicaciones ──────────────────────────────────────────────────────────

export type ProcedimientoAdj =
  | 'Abierto' | 'Restringido' | 'Negociado' | 'Diálogo competitivo'
  | 'Emergencia' | 'Acuerdo marco' | 'Concursal'
export type EstadoExpediente =
  | 'Adjudicado' | 'En licitación' | 'Recurrido' | 'Anulado' | 'Modificado'

export interface Adjudicacion {
  id: string
  exp: string
  titulo: string
  organismo: string
  ccaa: string
  sector: SectorContratacion
  procedimiento: ProcedimientoAdj
  importeBase: number
  importeAdj: number
  baja: number
  fechaAdj: string
  duracion: string
  adjudicatario: string
  numLicit: number
  estado: EstadoExpediente
  riesgo: RiesgoContrato
  alertas: string[]
}

export interface OrganismoAdj {
  nombre: string
  tipo: 'AGE' | 'CCAA' | 'Local' | 'Empresa pública'
  totalAdj: number
  numAdj: number
  bajaMedia: number
  concentracion: number
  modificacionesPct: number
}

export interface EmpresaAdj {
  nombre: string
  cif: string
  sectores: SectorContratacion[]
  totalAdj: number
  numAdj: number
  vinculacion: 'Ninguna' | 'Mediática' | 'Política' | 'Investigada'
  paisMatriz: string
  empleados: string
  webOk: boolean
}

export interface CasoMediatico {
  caso: string
  estado: 'En instrucción' | 'Sumario abierto' | 'Sentencia' | 'Archivado'
  importe: number
  protag: string
  detalle: string
  severidad: RiesgoContrato
}

// ─── Contratos Vigentes ───────────────────────────────────────────────────────

export type EstadoContrato =
  | 'En ejecución' | 'En curso · prórroga' | 'Suspendido'
  | 'En modificación' | 'Próximo a vencer' | 'Pendiente recepción'

export interface Modificacion {
  fecha: string
  tipo: 'Modificado' | 'Prórroga' | 'Reajuste' | 'Adenda'
  importe: number
  motivo: string
}

export interface Incidencia {
  fecha: string
  tipo: 'Penalización' | 'Aviso' | 'Reclamación' | 'Litigio' | 'Resolución'
  importe?: number
  descripcion: string
  estado: 'Abierta' | 'Resuelta' | 'En curso'
}

export interface Hito {
  fecha: string
  descripcion: string
  estado: 'Pendiente' | 'Completado' | 'Retrasado'
}

export interface Contrato {
  id: string
  exp: string
  titulo: string
  organismo: string
  adjudicatario: string
  ccaa: string
  sector: SectorContratacion
  estado: EstadoContrato
  riesgo: RiesgoContrato
  importeOriginal: number
  importeActual: number
  importeEjecutado: number
  fechaInicio: string
  fechaFinPrev: string
  diasParaFin: number
  duracionMeses: number
  prorrogasUsadas: number
  prorrogasMax: number
  modificaciones: Modificacion[]
  incidencias: Incidencia[]
  proxHito: Hito
  responsable: string
}

// ─── Litigios ────────────────────────────────────────────────────────────────

export type TipoLitigio =
  | 'Recurso especial' | 'Recurso CA' | 'Sanción' | 'Reclamación'
  | 'Resolución contrato' | 'Litigio civil' | 'Penal' | 'Arbitraje'
export type TribunalLitigio =
  | 'TACRC' | 'TACP Madrid' | 'OARC Andalucía' | 'TCCSP Catalunya'
  | 'TS · Supremo' | 'AN · Audiencia Nacional' | 'TSJ'
  | 'Audiencia Provincial' | 'Tribunal Cuentas' | 'JEC' | 'Comisión Europea'
export type EstadoLitigio =
  | 'Admitido' | 'En instrucción' | 'Sentencia 1ª inst.' | 'Recurrido'
  | 'Firme · estimado' | 'Firme · desestimado' | 'Cautelar' | 'Archivado'
export type SeveridadLitigio = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'
export type FaseLitigio =
  | 'Activa' | 'En recurso' | 'Resuelta · favorable'
  | 'Resuelta · adversa' | 'Suspendida'

export interface HitoLitigio {
  fecha: string
  tipo: string
  nota: string
}

export interface CasoLitigio {
  id: string
  expCaso: string
  expContrato: string
  titulo: string
  tipo: TipoLitigio
  tribunal: TribunalLitigio
  estado: EstadoLitigio
  fase: FaseLitigio
  severidad: SeveridadLitigio
  importeImpacto: number
  fechaInicio: string
  fechaUltima: string
  proxAccion: string
  fechaProx: string
  recurrente: string
  recurrido: string
  resumen: string
  alegaciones: string[]
  hitos: HitoLitigio[]
}

// ─── Trazabilidad (Expedientes Legislativos) ─────────────────────────────────

export type FaseHitoTraz =
  | 'registro' | 'mesa' | 'totalidad' | 'enmiendas' | 'ponencia'
  | 'comision' | 'pleno-c' | 'senado' | 'devuelto' | 'aprobado' | 'boe'

export interface HitoTraz {
  fase: FaseHitoTraz
  fecha: string
  titulo: string
  detalle: string
  autores?: string[]
  resultado?: 'ok' | 'pendiente' | 'rechazado'
}

export interface Enmienda {
  num: string
  autor: string
  partido: string
  color: string
  alcance: 'Totalidad' | 'Parcial' | 'Transaccional'
  articulo: string
  estado: 'Aceptada' | 'Rechazada' | 'Transaccionada' | 'Retirada' | 'Pendiente'
  votacion?: string
}

export interface VersionExpediente {
  v: string
  fecha: string
  fuente: string
  cambios: string
  diff: { add: number; del: number; mod: number }
}

export interface ActorExpediente {
  nombre: string
  rol: 'Ponente' | 'Portavoz' | 'Compareciente' | 'Promotor'
  partido: string
  color: string
}

export type FaseExpediente =
  | 'En tramitación' | 'Aprobada' | 'En Senado' | 'En BOE' | 'Devuelta'

export interface Expediente {
  id: string
  exp: string
  title: string
  promotor: string
  registro: string
  fase: FaseExpediente
  diasTramite: number
  enmiendasTotal: number
  enmiendasAceptadas: number
  comparecencias: number
  votacionesTotales: number
  hitos: HitoTraz[]
  enmiendas: Enmienda[]
  versiones: VersionExpediente[]
  actores: ActorExpediente[]
}

// ─── Snapshot types for API responses ────────────────────────────────────────

export interface LicitacionesSnapshot {
  licitaciones: Licitacion[]
  alertas_plazos: { exp: string; dias: number; importe: number; titulo: string }[]
  watchlist: { sector: string; activos: number; importe: number; color: string }[]
  top_org: { org: string; n: number; importe: number }[]
}

export interface AdjudicacionesSnapshot {
  adjudicaciones: Adjudicacion[]
  organismos: OrganismoAdj[]
  empresas: EmpresaAdj[]
  casos_mediaticos: CasoMediatico[]
}

export interface ContratosVigentesSnapshot {
  contratos: Contrato[]
}

export interface LitigiosSnapshot {
  casos: CasoLitigio[]
}

export interface TrazabilidadSnapshot {
  expedientes: Expediente[]
}
