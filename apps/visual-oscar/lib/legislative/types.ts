/**
 * Tipos compartidos para el ecosistema legislativo español.
 *
 * Ontología:
 *  - LegislativeInitiative    → iniciativa en tramitación (Congreso/Senado/CCAA)
 *  - PublishedLaw             → norma publicada en BOE/boletín autonómico
 *  - LegislativeStage         → etapa del proceso (presentación, comisión, pleno, votación)
 *  - TraceStep                → un paso concreto en la trazabilidad
 *  - FootprintActor           → actor con presencia en la huella (lobby, audiencia, etc.)
 *  - Commission               → comisión parlamentaria
 *  - CommissionSession        → sesión concreta
 *  - Speaker                  → compareciente / interviniente
 */

// ─── Ámbito territorial ─────────────────────────────────────────────────────

export type Ambito =
  | 'nacional-congreso'
  | 'nacional-senado'
  | 'autonomico'
  | 'ue'

export type CCAA =
  | 'andalucia' | 'aragon' | 'asturias' | 'baleares' | 'canarias'
  | 'cantabria' | 'castilla-leon' | 'castilla-mancha' | 'cataluna'
  | 'extremadura' | 'galicia' | 'madrid' | 'murcia' | 'navarra'
  | 'pais-vasco' | 'rioja' | 'valenciana' | 'ceuta' | 'melilla'

export const CCAA_LABEL: Record<CCAA, string> = {
  'andalucia':       'Andalucía',
  'aragon':          'Aragón',
  'asturias':        'Asturias',
  'baleares':        'Illes Balears',
  'canarias':        'Canarias',
  'cantabria':       'Cantabria',
  'castilla-leon':   'Castilla y León',
  'castilla-mancha': 'Castilla-La Mancha',
  'cataluna':        'Cataluña',
  'extremadura':     'Extremadura',
  'galicia':         'Galicia',
  'madrid':          'Madrid',
  'murcia':          'Región de Murcia',
  'navarra':         'Navarra',
  'pais-vasco':      'País Vasco',
  'rioja':           'La Rioja',
  'valenciana':      'C. Valenciana',
  'ceuta':           'Ceuta',
  'melilla':         'Melilla',
}

// ─── Tipos de iniciativa y norma ───────────────────────────────────────────

export type InitiativeKind =
  | 'PL'    // Proyecto de Ley (Gobierno)
  | 'PPL'   // Proposición de Ley (parlamentarios)
  | 'RDL'   // Real Decreto-Ley
  | 'RD'    // Real Decreto
  | 'LO'    // Ley Orgánica
  | 'PROP'  // Propuesta autonómica genérica
  | 'MOCI'  // Moción
  | 'INTE'  // Interpelación
  | 'REFC'  // Reforma constitucional
  | 'OTHER'

export type Materia =
  | 'Económica' | 'Social' | 'Justicia' | 'Educación' | 'Sanidad'
  | 'Territorial' | 'Energía' | 'Defensa' | 'Internacional'
  | 'Digital' | 'Agraria' | 'Cultura' | 'Vivienda' | 'Migración' | 'Otro'

export type Stage =
  | 'registrado'
  | 'calificacion'
  | 'comision'
  | 'enmiendas'
  | 'ponencia'
  | 'dictamen'
  | 'pleno-origen'
  | 'pleno-revision'   // Cámara revisora
  | 'aprobado'
  | 'rechazado'
  | 'caducado'
  | 'publicado'
  | 'desconocido'

export const STAGE_META: Record<Stage, { label: string; color: string; pct: number }> = {
  'registrado':     { label: 'Registrado',          color: '#6e6e73', pct:  10 },
  'calificacion':   { label: 'Calificación Mesa',   color: '#94A3B8', pct:  18 },
  'comision':       { label: 'En comisión',         color: '#F97316', pct:  35 },
  'enmiendas':      { label: 'Enmiendas',           color: '#FB923C', pct:  45 },
  'ponencia':       { label: 'Ponencia',            color: '#EAB308', pct:  55 },
  'dictamen':       { label: 'Dictamen',            color: '#A3A3A3', pct:  60 },
  'pleno-origen':   { label: 'Pleno · cámara origen', color: '#1F4E8C', pct: 70 },
  'pleno-revision': { label: 'Pleno · cámara revisora', color: '#5B21B6', pct: 85 },
  'aprobado':       { label: 'Aprobado',            color: '#16A34A', pct: 100 },
  'rechazado':      { label: 'Rechazado',           color: '#DC2626', pct: 100 },
  'caducado':       { label: 'Caducado',            color: '#525252', pct: 100 },
  'publicado':      { label: 'Publicado en BOE',    color: '#16A34A', pct: 100 },
  'desconocido':    { label: 'Estado desconocido',  color: '#94A3B8', pct:  20 },
}

// ─── Iniciativa legislativa (entrada al sistema) ───────────────────────────

export interface LegislativeInitiative {
  /** ID único compuesto: ambito + numero (ej. "cgr-121/000034", "sen-624/000007", "and-13H/PNL-000089") */
  id: string
  ambito: Ambito
  ccaa?: CCAA | null
  /** Número/código del expediente original */
  expediente: string
  titulo: string
  kind: InitiativeKind
  materia: Materia
  /** Promotor o presentante (Gobierno + departamento, o grupo parlamentario) */
  promotor: string
  /** Etapa actual estimada */
  stage: Stage
  /** Fecha de registro/presentación ISO */
  fechaRegistro: string | null
  /** Última actualización ISO */
  fechaActualizacion: string | null
  /** URL oficial al expediente */
  urlOficial: string | null
  /** Fuente de origen (para auditoría) */
  fuente: string
  /** Próximo trámite estimado, si conocido */
  proxTramite?: string | null
  proxFecha?: string | null
  /** Etiquetas inferidas del título (palabras clave) */
  tags: string[]
}

// ─── Norma publicada ───────────────────────────────────────────────────────

export interface PublishedLaw {
  id: string                       // BOE-A-2026-XXXXX o equivalente CCAA
  fecha: string                    // YYYY-MM-DD
  titulo: string
  departamento: string
  ambito: Ambito
  ccaa?: CCAA | null
  kind: InitiativeKind
  materia: Materia
  urlOficial: string
  urlPdf?: string
  /** Sección del boletín (BOE: I/II/III/IV/V) */
  seccion?: string
  /** Eli URI si aplica */
  eli?: string
  /** Importancia 0-100 (heurística) */
  importance: number
  /** Tags inferidos */
  tags: string[]
}

// ─── Trazabilidad ──────────────────────────────────────────────────────────

export type TraceStepKind =
  | 'presentacion'
  | 'calificacion'
  | 'toma-consideracion'
  | 'enmiendas-totalidad'
  | 'enmiendas-articulado'
  | 'comparecencias'
  | 'ponencia'
  | 'dictamen-comision'
  | 'pleno-debate'
  | 'pleno-votacion'
  | 'remision-camara'
  | 'devolucion-enmiendas'
  | 'aprobacion-final'
  | 'sancion-real'
  | 'publicacion-boe'
  | 'recurso-inconstitucionalidad'
  | 'sentencia-tc'
  | 'otro'

export interface TraceStep {
  /** Orden cronológico */
  order: number
  kind: TraceStepKind
  label: string
  /** Fecha ISO (puede ser sólo YYYY-MM-DD) */
  date: string | null
  /** Cámara/órgano: Congreso, Senado, Comisión X, BOE, TC, etc. */
  forum: string
  /** Resultado/observación */
  outcome?: string | null
  /** URL al documento o sesión asociada */
  url?: string | null
  /** Voto si aplica */
  vote?: { yes: number; no: number; abs: number; total: number } | null
}

export interface InitiativeTraceability {
  initiative: LegislativeInitiative
  steps: TraceStep[]
  /** Resumen automático del avance */
  summary: {
    totalSteps: number
    currentStage: Stage
    daysSinceStart: number | null
    nextExpected: string | null
  }
}

// ─── Huella legislativa ────────────────────────────────────────────────────

export interface FootprintActor {
  name: string
  type: 'compareciente' | 'lobby' | 'enmendante' | 'ponente' | 'oposicion' | 'gobierno' | 'experto' | 'institucion'
  organization?: string | null
  rol?: string | null
  /** Posición declarada respecto a la norma */
  posicion?: 'favor' | 'contra' | 'neutral' | 'matizada' | null
  /** Fecha de la intervención o registro */
  fecha?: string | null
  /** URL a la intervención (acta, vídeo, registro) */
  url?: string | null
  /** Resumen de su aportación */
  resumen?: string | null
}

export interface InitiativeFootprint {
  initiative: LegislativeInitiative
  actors: FootprintActor[]
  /** Enmiendas registradas */
  amendments: Array<{
    grupo: string
    n: number
    aceptadas?: number
    rechazadas?: number
  }>
  /** Audiencias y comparecencias */
  hearings: Array<{
    fecha: string
    comision: string
    comparecientes: string[]
    url?: string
  }>
  /** Resumen narrativo construido */
  summary: string
}

// ─── Comisiones ─────────────────────────────────────────────────────────────

export type CommissionKind =
  | 'permanente'
  | 'no-permanente'
  | 'investigacion'
  | 'mixta'
  | 'subcomision'
  | 'ponencia'

export type CommissionCamara = 'congreso' | 'senado' | 'mixta' | 'autonomico'

export interface Commission {
  id: string                      // p.ej. "cgr-302" o "sen-S011000" o "ccaa-and-comX"
  codigo: string                  // código original
  nombre: string
  nombreCorto?: string
  camara: CommissionCamara
  ccaa?: CCAA | null
  kind: CommissionKind
  /** ¿Está activa actualmente? */
  active: boolean
  /** ¿Es comisión de investigación? */
  isInvestigation: boolean
  /** URL oficial de la comisión */
  url: string | null
  /** Composición: cuando se conozca */
  composicion?: Array<{ grupo: string; n: number; color?: string }>
  /** Próxima convocatoria, si conocida */
  proxConvocatoria?: { fecha: string; tema: string; url?: string } | null
  /** Total de sesiones registradas */
  nSesiones?: number
  /** Temas/materias que ha tratado */
  topMaterias?: string[]
  /** Conclusiones o resumen si existe */
  conclusiones?: string | null
}

export interface CommissionSession {
  id: string
  commissionId: string
  fecha: string
  titulo: string
  /** Comparecientes registrados en esta sesión */
  comparecientes: Speaker[]
  /** Resumen de los temas discutidos */
  resumen?: string | null
  url?: string | null
  /** Acta oficial si publicada */
  actaUrl?: string | null
  /** Video si publicado */
  videoUrl?: string | null
}

export interface Speaker {
  nombre: string
  rol?: string | null
  organizacion?: string | null
  partido?: string | null
  /** Resumen de la declaración */
  declaracion?: string | null
  /** URL al fragmento de video o página oficial */
  url?: string | null
}
