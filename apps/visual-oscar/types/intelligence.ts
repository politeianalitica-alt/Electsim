// Intelligence Platform Types
// Comprehensive domain model for evidence locker, canvas, notebooks, drafts,
// risk, signals, sources, team and brain.

// ─── Credibility & Confidence (NATO Admiralty Scale) ──────────────────
export type CredibilidadFuente = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type ConfianzaContenido = 1 | 2 | 3 | 4 | 5 | 6

// ─── Sources ──────────────────────────────────────────────────────────
export type TipoFuente =
  | 'oficial'
  | 'medio'
  | 'osint'
  | 'humint'
  | 'sigint'
  | 'datos_abiertos'
  | 'redes_sociales'
  | 'documento'
  | 'otro'

export interface Fuente {
  id: string
  nombre: string
  tipo: TipoFuente
  url?: string
  credibilidad_default?: CredibilidadFuente
  descripcion?: string
  activa: boolean
  created_at: string
  updated_at: string
}

// ─── Evidence Locker ──────────────────────────────────────────────────
export type ClasificacionDraft = 'publica' | 'interna' | 'confidencial' | 'restringida'

export interface Evidencia {
  id: string
  titulo: string
  resumen: string
  contenido?: string
  url?: string
  fuente_id: string
  fuente_nombre: string
  fuente_tipo: TipoFuente
  credibilidad: CredibilidadFuente
  confianza: ConfianzaContenido
  clasificacion: ClasificacionDraft
  tags: string[]
  entidades: string[]
  hash_contenido?: string
  fecha_documento?: string
  fecha_ingestion: string
  autor_ingestion?: string
  workspace_id?: string
}

export interface EvidenciaDraft {
  titulo: string
  resumen: string
  contenido?: string
  url?: string
  fuente_id: string
  credibilidad: CredibilidadFuente
  confianza: ConfianzaContenido
  clasificacion: ClasificacionDraft
  tags?: string[]
  entidades?: string[]
}

// ─── ACH (Analysis of Competing Hypotheses) ───────────────────────────
export type TipoCanvas = 'ach' | 'stakeholder' | 'scenario' | 'risk' | 'timeline'

export interface Canvas {
  id: string
  tipo: TipoCanvas
  titulo: string
  descripcion?: string
  workspace_id?: string
  autor: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ScoreACH {
  evidencia_id: string
  hipotesis_id: string
  score: -2 | -1 | 0 | 1 | 2
  nota?: string
}

export interface Hipotesis {
  id: string
  canvas_id: string
  enunciado: string
  probabilidad?: number
  notas?: string
  orden: number
}

export interface HipotesisACH {
  canvas_id: string
  hipotesis: Hipotesis[]
  evidencias: Evidencia[]
  matriz: ScoreACH[]
}

// ─── Notebooks ────────────────────────────────────────────────────────
export type TipoBlock =
  | 'texto'
  | 'hallazgo'
  | 'cita'
  | 'hipotesis'
  | 'pregunta'
  | 'separador'

export type EstadoNotebook = 'borrador' | 'revision' | 'aprobado' | 'archivado'

export interface WorkspaceBlock {
  id: string
  notebook_id: string
  tipo: TipoBlock
  contenido: string
  metadata?: Record<string, string | number | boolean>
  orden: number
  created_at: string
  updated_at: string
}

export interface Notebook {
  id: string
  titulo: string
  resumen?: string
  estado: EstadoNotebook
  version: number
  tags: string[]
  autor: string
  workspace_id?: string
  blocks?: WorkspaceBlock[]
  created_at: string
  updated_at: string
}

// ─── Drafts (Reports / Memos / Briefs) ────────────────────────────────
export type TipoProducto = 'memo' | 'informe' | 'briefing' | 'alerta' | 'ejecutivo'
export type EstadoDraft = 'borrador' | 'revision_interna' | 'aprobado' | 'entregado'

export interface SeccionDraft {
  id: string
  titulo: string
  contenido: string
  orden: number
}

export interface DraftDocument {
  id: string
  titulo: string
  tipo: TipoProducto
  estado: EstadoDraft
  clasificacion: ClasificacionDraft
  resumen?: string
  secciones: SeccionDraft[]
  autor: string
  revisores: string[]
  workspace_id?: string
  created_at: string
  updated_at: string
}

// ─── Workspaces (Intelligence-side) ───────────────────────────────────
export interface Workspace {
  id: string
  name: string
  description?: string
  sector?: string
  members?: number
  created_at?: string
  updated_at?: string
}

export interface WorkspaceKpis {
  evidencias_total: number
  evidencias_pendientes: number
  notebooks_revision: number
  drafts_revision: number
  alertas_activas: number
  signals_24h: number
}

// ─── Risk Index ───────────────────────────────────────────────────────
export type RiskDominio =
  | 'politico'
  | 'regulatorio'
  | 'reputacional'
  | 'narrativo'
  | 'electoral'
  | 'institucional'
  | 'geopolitico'
  | 'economico'

export interface RiskScore {
  dominio: RiskDominio
  valor: number
  delta_24h: number
  nivel: 'critico' | 'alto' | 'medio' | 'bajo'
  drivers: string[]
}

export interface RiskSnapshot {
  generado_en: string
  indice_global: number
  delta_24h: number
  nivel: 'critico' | 'alto' | 'medio' | 'bajo'
  subindices: RiskScore[]
  sparkline: number[]
}

// ─── Signals ──────────────────────────────────────────────────────────
export type NivelRelevancia = 'critica' | 'alta' | 'media' | 'baja'

export interface Signal {
  id: string
  titulo: string
  descripcion: string
  dominio: RiskDominio
  relevancia: NivelRelevancia
  fuente_nombre: string
  url?: string
  detectado_en: string
  tags: string[]
  evidencia_id?: string
}

// ─── Brain Chat ───────────────────────────────────────────────────────
export type BrainRole = 'user' | 'assistant' | 'system'

export interface BrainMessage {
  id: string
  role: BrainRole
  content: string
  created_at: string
  citas?: { titulo: string; url?: string }[]
}

export interface BrainSession {
  id: string
  titulo: string
  workspace_id?: string
  messages: BrainMessage[]
  created_at: string
  updated_at: string
}

// ─── Team ─────────────────────────────────────────────────────────────
export type TeamRol = 'admin' | 'analista' | 'editor' | 'lector'

export interface TeamMember {
  id: string
  nombre: string
  email: string
  rol: TeamRol
  activo: boolean
  ultimo_acceso?: string
}

// ─── Watchlists ───────────────────────────────────────────────────────
export interface Watchlist {
  id: string
  nombre: string
  descripcion?: string
  terminos: string[]
  activa: boolean
  alertas_count: number
  ultima_alerta?: string
  workspace_id?: string
  created_at: string
  updated_at: string
}

// ─── Snapshot wrappers ────────────────────────────────────────────────
export interface EvidenciaSnapshot { items: Evidencia[]; total: number; generado_en: string }
export interface CanvasSnapshot { items: Canvas[]; total: number; generado_en: string }
export interface NotebookSnapshot { items: Notebook[]; total: number; generado_en: string }
export interface DraftSnapshot { items: DraftDocument[]; total: number; generado_en: string }
export interface WatchlistSnapshot { items: Watchlist[]; total: number; generado_en: string }
export interface TeamSnapshot { items: TeamMember[]; total: number; generado_en: string }
export interface SignalsSnapshot { items: Signal[]; total: number; generado_en: string }
export interface BrainSnapshot { sessions: BrainSession[]; generado_en: string }
export interface FuenteSnapshot { items: Fuente[]; total: number; generado_en: string }
