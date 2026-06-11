// =====================================================================
//  Preinformes — Generador de informes preliminares · Tipos de dominio
//
//  Módulo transversal: disponible en Estudio, War Room, Toolbox,
//  Cuaderno y Command Center. Un preinforme es un borrador de informe
//  construido con un asistente por pasos: plantilla → fuentes →
//  secciones → generación (Markdown descargable / PDF imprimible).
// =====================================================================

import type { EspacioCama } from './cama'

/** Mismo concepto de espacio anfitrión que en Cama. */
export type EspacioPreinforme = EspacioCama

export type PreinformeEstado = 'borrador' | 'generado'

export type PreinformePlantillaId =
  | 'ejecutivo'    // dirección / cliente C-level
  | 'campana'      // equipo de campaña (War Room)
  | 'riesgo'       // alerta / nota de crisis
  | 'sectorial'    // análisis sectorial con datos

export type PreinformePublico = 'direccion' | 'cliente' | 'equipo' | 'prensa'

/** Tipos de fuente seleccionables en el paso 2 del asistente. */
export type TipoFuentePreinforme =
  | 'panel'           // paneles del Estudio
  | 'vigilante'       // alertas del Estudio
  | 'consulta'        // queries de "Pregúntale a tus datos"
  | 'nota'            // notas del Cuaderno
  | 'macroargumento'  // narrativas de la Cama

export interface FuentePreinforme {
  id:      string
  tipo:    TipoFuentePreinforme
  label:   string
  detalle?: string
}

export interface SeccionPreinforme {
  id:       string
  titulo:   string
  contenido: string
  incluida: boolean
}

export interface PreinformePlantilla {
  id:          PreinformePlantillaId
  nombre:      string
  descripcion: string
  /** Secciones base que el asistente precarga (el usuario edita/excluye). */
  secciones:   Array<{ titulo: string; guia: string }>
}

export interface Preinforme {
  id:        string
  titulo:    string
  plantilla: PreinformePlantillaId
  publico:   PreinformePublico
  fuentes:   FuentePreinforme[]
  secciones: SeccionPreinforme[]
  estado:    PreinformeEstado
  espacio:   EspacioPreinforme
  /** Markdown final · solo cuando estado === 'generado'. */
  markdown?: string
  createdAt: number
  updatedAt: number
  /** Tombstone (Fase 2 · sync): borrado lógico que se propaga entre
   *  dispositivos; purgado a los 30 días. */
  deletedAt?: number
}
