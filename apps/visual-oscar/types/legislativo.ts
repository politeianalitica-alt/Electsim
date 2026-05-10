// ============================================================
// Tipos de dominio — Legislative Stack
// ============================================================

export type EstadoIniciativa =
  | 'en_tramite'
  | 'aprobada'
  | 'rechazada'
  | 'retirada'
  | 'caducada'
  | 'en_comision'

export type TipoIniciativa =
  | 'proyecto_de_ley'
  | 'proposicion_de_ley'
  | 'proposicion_no_de_ley'
  | 'mocion'
  | 'interpelacion'
  | 'pregunta'
  | 'enmienda'

export type VotoTipo = 'si' | 'no' | 'abstencion' | 'ausente'

export type TipoComision =
  | 'permanente'
  | 'especial'
  | 'investigacion'
  | 'mixta'

// ---- Grupos parlamentarios ----
export interface GrupoParlamentario {
  id: string
  nombre: string
  acronimo: string
  partido_principal: string
  diputados: number
  senadores?: number
  color: string
  portavoz?: string
  posicion_ideologica: 'izquierda' | 'centroizquierda' | 'centro' | 'centroderecha' | 'derecha' | 'nacionalista' | 'regionalista'
}

// ---- Iniciativas legislativas ----
export interface IniciativaLegislativa {
  id: string
  titulo: string
  tipo: TipoIniciativa
  estado: EstadoIniciativa
  fecha_presentacion: string
  fecha_ultima_actualizacion: string
  grupo_proponente: string
  grupos_apoyo?: string[]
  comision_tramitacion?: string
  descripcion?: string
  url_congreso?: string
  etiquetas?: string[]
  relevancia_score?: number
  // Tracking votación
  votacion_id?: string
  // Lifecycle
  dias_en_tramite?: number
  probabilidad_aprobacion?: number
}

// ---- Votaciones ----
export interface VotacionGrupo {
  grupo_id: string
  grupo_nombre: string
  voto: VotoTipo
  diputados_favor: number
  diputados_contra: number
  diputados_abstencion: number
  diputados_ausente: number
}

export interface VotacionPlenaria {
  id: string
  titulo: string
  fecha: string
  tipo: string
  resultado: 'aprobada' | 'rechazada' | 'nula'
  votos_favor: number
  votos_contra: number
  votos_abstencion: number
  votos_ausente: number
  quorum: number
  iniciativa_id?: string
  desglose_grupos: VotacionGrupo[]
  descripcion?: string
}

// ---- Comisiones ----
export interface MiembroComision {
  nombre: string
  grupo: string
  cargo: 'presidente' | 'vicepresidente' | 'vocal' | 'portavoz'
}

export interface Comision {
  id: string
  nombre: string
  tipo: TipoComision
  camara: 'congreso' | 'senado' | 'mixta'
  miembros: MiembroComision[]
  temas_principales: string[]
  reuniones_este_mes?: number
  proxima_reunion?: string
  iniciativas_activas?: number
}

// ---- Agenda legislativa ----
export interface EventoAgenda {
  id: string
  titulo: string
  fecha: string
  hora?: string
  tipo: 'pleno' | 'comision' | 'votacion' | 'debate' | 'control_gobierno'
  camara: 'congreso' | 'senado' | 'ambas'
  descripcion?: string
  iniciativas_relacionadas?: string[]
  relevancia: number
}

// ---- Huella legislativa ----
export interface ContribucionLegislativa {
  grupo_id: string
  grupo_nombre: string
  partido: string
  color: string
  iniciativas_presentadas: number
  iniciativas_aprobadas: number
  votos_favor: number
  votos_contra: number
  votos_abstencion: number
  tasa_exito: number
  temas_principales: string[]
}

export interface HuellaLegislativa {
  periodo: string
  total_iniciativas: number
  total_votaciones: number
  tasa_aprobacion_global: number
  contribuciones: ContribucionLegislativa[]
  temas_hot: Array<{ tema: string; count: number; tendencia: 'sube' | 'baja' | 'estable' }>
}

// ---- Estado general del legislativo ----
export interface EstadoLegislativo {
  legislatura: string
  camara: 'congreso'
  grupos_parlamentarios: GrupoParlamentario[]
  distribucion_escanos: Record<string, number>
  sesiones_celebradas: number
  leyes_aprobadas: number
  leyes_en_tramite: number
  proxima_sesion_plenaria?: string
  alertas_legislativas?: string[]
}

// ---- API response wrappers ----
export interface LegislativoApiResponse<T> {
  data: T
  _meta: {
    source: 'backend' | 'opendata' | 'mock'
    ts: string
    count?: number
  }
}
