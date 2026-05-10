import type { NivelRiesgo } from './riesgo';

export type BriefingTipo = 'diario' | 'semanal' | 'especial' | 'crisis';
export type EstadoBriefing = 'generando' | 'listo' | 'archivado';

export interface BriefingSeccion {
  id: string;
  tipo: 'situacion' | 'senales' | 'escenarios' | 'recomendaciones' | 'watchlist';
  titulo: string;
  contenido: string;
  bullets?: string[];
  nivel_alerta?: NivelRiesgo;
  fuentes_usadas?: string[];
}

export interface EscenarioBriefing {
  nombre: string;
  probabilidad: number;
  descripcion: string;
  impacto: 'alto' | 'medio' | 'bajo';
  horizonte: string;
  triggers: string[];
}

export interface Briefing {
  id: string;
  titulo: string;
  tipo: BriefingTipo;
  fecha: string;
  estado: EstadoBriefing;
  score_riesgo_contexto: number;
  resumen_ejecutivo: string;
  secciones: BriefingSeccion[];
  escenarios: EscenarioBriefing[];
  generado_por: string;
  tiempo_generacion_s: number;
  signals_analizadas: number;
  palabras: number;
}
