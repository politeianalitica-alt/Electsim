export type RolEquipo = 'Director' | 'Estrategia' | 'Comunicación' | 'Datos' | 'Digital' | 'Ground game' | 'Finanzas' | 'Legal' | 'Crisis'
export type EstadoMiembro = 'En war room' | 'En terreno' | 'Remoto' | 'En reunión' | 'Reunión'
export type TipoActo = 'Mitin' | 'Acto territorial' | 'Debate' | 'Rueda de prensa' | 'Entrevista' | 'Reunión interna' | 'Visita'
export type CoverageActo = 'TV nacional' | 'Prensa nacional' | 'Solo regional' | 'Streaming'
export type EstadoActo = 'Confirmado' | 'Pendiente' | 'Cancelado'
export type PrioridadTerritorio = 'Crítica' | 'Alta' | 'Media' | 'Mantener'
export type SeveridadCrisis = 'CRÍTICA' | 'ALTA' | 'MEDIA'
export type EstadoCrisis = 'Activa' | 'Contenida'
export type EstadoTarea = 'Pendiente' | 'En curso' | 'Completada'

export interface CandidatoConfig {
  nombre: string
  partido: string
  color: string
  iniciales: string
  cargo: string
}

export interface EncuestaOla {
  fecha: string
  casa: string
  cliente: string
  pp: number
  psoe: number
  vox: number
  sumar: number
  otros: number
}

export interface KpisCampaña {
  intencionPP: number
  diferencialPSOE: number
  intencionPSOE: number
  participacionPrev: number
  conocimiento: number
  valoracion: number
  imagenLider: number
  voluntarios: number
  localesAbiertos: number
  socios: number
}

export interface MiembroEquipo {
  rol: RolEquipo
  nombre: string
  estado: EstadoMiembro
  ult: string
}

export interface ActoAgenda {
  fecha: string
  hora: string
  tipo: TipoActo
  titulo: string
  ubicacion: string
  aforo?: number
  coverage: CoverageActo
  estado: EstadoActo
}

export interface ProvinciaCampaña {
  prov: string
  ccaa: string
  prioridad: PrioridadTerritorio
  intencion: number
  gap: number
  recursos: number
  voluntarios: number
}

export interface PilarMensaje {
  p: string
  detalle: string
}

export interface MensajeDia {
  titular: string
  subtitular: string
  pilares: PilarMensaje[]
  contraste: string
  evitar: string[]
  hashtag: string
}

export interface LineaPresupuesto {
  concepto: string
  gastado: number
  presupuestado: number
  color: string
}

export interface PresupuestoCampaña {
  total: number
  gastado: number
  lineas: LineaPresupuesto[]
}

export interface CrisisWarRoom {
  id: string
  titulo: string
  severidad: SeveridadCrisis
  tipo: string
  estado: EstadoCrisis
}

export interface TareaWarRoom {
  id: string
  tarea: string
  resp: string
  plazo: string
  estado: EstadoTarea
}

export interface WarRoomSnapshot {
  candidato: CandidatoConfig
  elecciones_fecha: string  // ISO date string
  encuestas: EncuestaOla[]
  kpis: KpisCampaña
  equipo: MiembroEquipo[]
  agenda: ActoAgenda[]
  territorio: ProvinciaCampaña[]
  mensaje: MensajeDia
  presupuesto: PresupuestoCampaña
  crisis: CrisisWarRoom[]
  tareas: TareaWarRoom[]
}
