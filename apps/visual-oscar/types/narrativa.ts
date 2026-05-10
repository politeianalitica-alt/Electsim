// types/narrativa.ts
export type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type FaseAtaque = 'Detectado' | 'Escalando' | 'Pico' | 'Decayendo' | 'Cerrado'
export type Plataforma =
  | 'X (Twitter)' | 'Facebook' | 'TikTok' | 'Telegram'
  | 'Instagram' | 'YouTube' | 'Foros' | 'WhatsApp'
export type TipoAtaque =
  | 'Desinformación' | 'Bulo viral' | 'Hashtag coordinado'
  | 'Fake video / deepfake' | 'Astroturfing' | 'Doxing' | 'Smear campaign'
export type TipoAmplificador =
  | 'Cuenta verificada' | 'Cuenta anónima' | 'Medio'
  | 'Político' | 'Influencer' | 'Bot detectado'
export type PosicionAmplificador = 'A favor' | 'En contra' | 'Neutral'
export type EstadoAccion = 'Pendiente' | 'En curso' | 'Completada'

export interface HashtagAtaque {
  h: string
  vol: number
  hostil: boolean
}

export interface Amplificador {
  nombre: string
  tipo: TipoAmplificador
  seguidores: string
  posicion: PosicionAmplificador
  menciones: number
}

export interface Patron {
  tipo: string
  evidencia: string
  severidad: Severidad
}

export interface AccionRespuesta {
  accion: string
  plazo: string
  estado: EstadoAccion
}

export interface AtaqueNarrativo {
  id: string
  titulo: string
  target: string
  narrativa: string
  tipo: TipoAtaque
  severidad: Severidad
  fase: FaseAtaque
  inicio: string
  alcance: string
  cuentasSospechosas: number
  plataformas: { p: Plataforma; peso: number }[]
  evolucion: number[]
  hashtags: HashtagAtaque[]
  amplificadores: Amplificador[]
  patrones: Patron[]
  acciones: AccionRespuesta[]
}

export type LineEditorial = 'Centro-izquierda' | 'Centro' | 'Centro-derecha' | 'Derecha' | 'Izquierda' | 'Independiente'
export type SentimientoMedio = 'Positivo' | 'Neutro' | 'Negativo' | 'Mixto'
export type TipoMedio = 'Prensa' | 'TV' | 'Radio' | 'Digital' | 'Agencia'

export interface NarrativaMedio {
  medio: string
  tipo: TipoMedio
  linea_editorial: LineEditorial
  sentimiento: SentimientoMedio
  menciones_semana: number
  temas_principales: string[]
  titular_destacado: string
  url?: string
}

export interface FrameNarrativo {
  id: string
  nombre: string
  descripcion: string
  presencia_pct: number
  tendencia: 'creciente' | 'estable' | 'decreciente'
  medios_principales: string[]
  color: string
}

export interface MediosNarrativaSnapshot {
  generado_en: string
  periodo: string
  medios: NarrativaMedio[]
  frames: FrameNarrativo[]
  terminos_calientes: { termino: string; volumen: number; delta_pct: number }[]
}

export type UrgenciaBriefing = 'URGENTE' | 'ALTA' | 'NORMAL'
export type TipoBriefingItem =
  | 'Geopolítica' | 'Economía' | 'Legislativo' | 'Electoral'
  | 'Narrativa' | 'Seguridad' | 'Social' | 'Energía'

export interface BriefingItem {
  id: string
  titulo: string
  tipo: TipoBriefingItem
  urgencia: UrgenciaBriefing
  resumen: string
  implicaciones: string[]
  fuentes: string[]
  tags: string[]
  fecha: string
  leido?: boolean
}

export interface BriefingDiario {
  id: string
  fecha: string
  periodo: string
  items: BriefingItem[]
  alertas_criticas: number
  total_items: number
  generado_por: string
}

export type SentimientoComm = 'Positivo' | 'Negativo' | 'Neutro' | 'Mixto'
export type TendenciaComm = 'up' | 'down' | 'stable'

export interface KpiComunicacion {
  id: string
  nombre: string
  valor: number | string
  unidad?: string
  tendencia: TendenciaComm
  delta?: string
  color: string
}

export interface TopicoComunicacion {
  id: string
  tema: string
  volumen: number
  sentimiento: SentimientoComm
  tendencia: TendenciaComm
  plataformas: Plataforma[]
  mentions_delta_pct: number
}

export interface CommunicationIntelSnapshot {
  generado_en: string
  kpis: KpiComunicacion[]
  topicos: TopicoComunicacion[]
  sentimiento_global: SentimientoComm
  alerta_narrativa: boolean
  alertas: { mensaje: string; severidad: Severidad; timestamp: string }[]
}
