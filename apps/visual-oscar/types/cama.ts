// =====================================================================
//  Cama — Campañas y Macroargumentos · Tipos de dominio
//
//  Módulo transversal: disponible en Estudio, War Room, Toolbox,
//  Cuaderno y Command Center. Un macroargumento es una narrativa
//  central versionada (argumentario) con evidencias e indicadores
//  de impacto, vinculable a paneles, notas y workspaces.
// =====================================================================

export type MacroargumentoEstado = 'borrador' | 'activo' | 'archivado'

/** Espacio de Politeia desde el que se creó o se está viendo el módulo. */
export type EspacioCama =
  | 'estudio'
  | 'war-room'
  | 'toolbox'
  | 'cuaderno'
  | 'command-center'

export type FuerzaEvidencia = 'alta' | 'media' | 'baja'

export interface EvidenciaCama {
  id:     string
  texto:  string
  fuente?: string          // medio, panel, dataset o URL de origen
  fuerza: FuerzaEvidencia
}

export type TipoVinculoCama = 'panel' | 'nota' | 'dataset' | 'workspace' | 'vigilante'

/** Vínculo blando a otro objeto de la plataforma (paneles del Estudio,
 *  notas del Cuaderno, datasets…). `ref` es un slug/id/href según tipo. */
export interface VinculoCama {
  tipo:  TipoVinculoCama
  ref:   string
  label: string
}

/** Indicadores de impacto de la narrativa, escala 0-100. */
export interface ImpactoCama {
  penetracion: number   // cuánto ha calado el mensaje
  resonancia:  number   // engagement / eco en medios y redes
  riesgo:      number   // exposición a contraataque o fact-check
}

/** Snapshot inmutable de una versión anterior del argumentario. */
export interface VersionCama {
  version:     number
  fecha:       number          // epoch ms
  resumen:     string
  puntosClave: string[]
  nota?:       string          // comentario opcional del autor al versionar
}

export interface Macroargumento {
  id:          string
  titulo:      string
  resumen:     string
  puntosClave: string[]
  evidencias:  EvidenciaCama[]
  vinculos:    VinculoCama[]
  etiquetas:   string[]
  estado:      MacroargumentoEstado
  impacto:     ImpactoCama
  /** Espacio donde se creó (trazabilidad; el módulo es compartido). */
  espacio:     EspacioCama
  version:     number
  versiones:   VersionCama[]
  createdAt:   number
  updatedAt:   number
  /** Tombstone (Fase 2 · sync): borrado lógico con fecha. Los borrados se
   *  propagan entre dispositivos en vez de "resucitar" en el merge; el
   *  store los purga pasados 30 días. */
  deletedAt?:  number
}
