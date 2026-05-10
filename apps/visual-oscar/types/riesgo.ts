export type NivelRiesgo = 'critico' | 'alto' | 'medio' | 'bajo';
export type DimensionRiesgo =
  | 'estabilidad_gubernamental'
  | 'tension_territorial'
  | 'riesgo_electoral'
  | 'conflicto_social'
  | 'presion_mediatica'
  | 'riesgo_legislativo';

export interface IndicadorRiesgo {
  id: string;
  dimension: DimensionRiesgo;
  titulo: string;
  descripcion: string;
  nivel: NivelRiesgo;
  score: number;
  variacion_7d: number;
  tendencia: 'subiendo' | 'bajando' | 'estable';
  ultima_actualizacion: string;
  actores_implicados: string[];
  fuentes: string[];
  horizonte: '24h' | '7d' | '30d' | '90d';
}

export interface MatrizRiesgo {
  fecha_calculo: string;
  score_global: number;
  nivel_global: NivelRiesgo;
  indicadores: IndicadorRiesgo[];
  historico_30d: Array<{ fecha: string; score: number }>;
  alertas_activas: number;
}
