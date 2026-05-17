/**
 * Catálogo expandido de figuras públicas.
 * Cubre 7 categorías más allá del catálogo político tradicional.
 */

export type FigureCategory =
  | 'politico'        // diputados, senadores, gobierno, oposición
  | 'institucional'   // CGPJ, BdE, Casa Real, TC, Fiscalía
  | 'empresario'      // CEOs, fundadores, accionistas, consejeros
  | 'mediatico'       // dueños, directores, presentadores estrella
  | 'periodista'      // periodistas con influencia editorial
  | 'lobbista'        // representantes registrados de grupos de interés
  | 'consultor'       // consultoras y consultores estratégicos
  | 'fondo'           // gestores de fondos de inversión
  | 'academico'       // catedráticos, think tanks
  | 'judicial'        // jueces relevantes, fiscales
  | 'sindical'        // líderes sindicales
  | 'patronal'        // CEOE, CEPYME, asociaciones empresariales

export interface Figure {
  id: string
  nombre: string
  category: FigureCategory
  cargo: string
  organizacion: string
  /** Partido (para políticos), grupo empresarial (empresarios), medio (periodistas), etc. */
  afiliacion: string | null
  /** Color asociado (partido, sector...) */
  color: string
  /** Coordenadas ideológicas estimadas (-100..+100) */
  ejeX: number     // izquierda → derecha
  ejeY: number     // descentralización → centralización
  /** Influencia 0-100 */
  influencia: number
  /** ¿Aparece en X / Twitter? handle si tiene */
  twitter?: string | null
  /** URL Wikipedia ES */
  wikipedia?: string | null
  /** Foto URL */
  foto?: string | null
  /** Etiquetas/sectores en los que opera */
  tags: string[]
  /** CCAA principal de actividad */
  ccaa?: string | null
  /** Edad estimada o año de nacimiento */
  nacido?: number | null
  /** Nivel de exposición pública (frecuencia mediática) */
  exposicion: number  // 0-100
}

export interface FigureDossier {
  figure: Figure
  /** Resumen biográfico (de Wikipedia, otros) */
  bio: {
    extract: string
    source: string | null
    sourceUrl: string | null
  }
  /** Noticias recientes que mencionan a la figura (de los RSS feeds) */
  noticias: Array<{
    titulo: string
    medio: string
    fecha: string | null
    url: string
    sentiment: 'positive' | 'negative' | 'neutral'
    sentiment_score: number
    resumen: string
  }>
  /** Intervenciones parlamentarias (sólo para diputados/comparecientes) */
  intervenciones: Array<{
    fecha: string
    organo: string
    fase: string
    inicio: string
    duracion?: string
    videoUrl?: string | null
    pdfUrl?: string | null
  }>
  /** Votos en leyes recientes (sólo diputados) */
  votos: Array<{
    fecha: string
    iniciativa: string
    voto: 'a-favor' | 'en-contra' | 'abstencion' | 'no-vota'
    resultadoFinal: 'aprobada' | 'rechazada' | 'desconocido'
  }>
  /** Comisiones a las que pertenece */
  comisiones: Array<{
    codigo: string
    nombre: string
    cargo: string
    camara: string
  }>
  /** Declaración de bienes (Congreso publica como PDF/JSON) */
  declaracionBienes?: {
    fecha: string | null
    url: string | null
    resumen: string | null
  }
  /** Cargos previos */
  cargosPrevios: string[]
  /** Conexiones con otras figuras (mismo partido, comisión, empresa...) */
  conexiones: Array<{
    figureId: string
    nombre: string
    relacion: 'mismo-partido' | 'misma-comision' | 'misma-empresa' | 'mismo-medio' | 'mismo-sector' | 'familiar' | 'lobby' | 'otro'
    intensidad: number  // 0-1
    detalle?: string
  }>
  /** Sentimiento agregado de noticias 30d */
  sentimientoAgregado: {
    positivo: number
    negativo: number
    neutral: number
    score: number
    tendencia: 'up' | 'down' | 'stable'
  }
  /** Tags clave que aparecen en su cobertura mediática */
  tagsCobertura: string[]
  /** Última actualización */
  updatedAt: string
}

export interface FigureGraphNode {
  id: string
  nombre: string
  category: FigureCategory
  afiliacion: string | null
  color: string
  size: number       // basado en influencia
  ejeX: number
  ejeY: number
  exposicion: number
}

export interface FigureGraphEdge {
  source: string
  target: string
  type: 'mismo-partido' | 'misma-comision' | 'misma-empresa' | 'mismo-medio' | 'mismo-sector' | 'mismo-lobby' | 'mismo-fondo' | 'familiar' | 'mentor' | 'rival'
  weight: number
  label?: string
  /** Para arcos basados en comisión, el código */
  comisionCodigo?: string
}

export interface FigureGraph {
  nodes: FigureGraphNode[]
  edges: FigureGraphEdge[]
  stats: {
    totalNodes: number
    totalEdges: number
    porCategoria: Record<string, number>
    porTipoEdge: Record<string, number>
  }
}
