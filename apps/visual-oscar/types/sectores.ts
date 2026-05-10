// types/sectores.ts
import type { NivelImpacto } from './legislativo';

export type TendenciaKPI = 'subida' | 'bajada' | 'estable' | 'sin_datos';

export interface KPISectorial {
  id: string;
  nombre: string;
  nombre_corto: string;
  valor: number | null;
  unidad: string;
  tendencia: TendenciaKPI;
  variacion_pct?: number;
  variacion_absoluta?: number;
  periodo: string;
  fuente_id: string;
  serie_historica?: KPIDataPoint[];
  alerta?: string;
  nivel_alerta?: NivelImpacto;
}

export interface KPIDataPoint {
  fecha: string;
  valor: number;
}

export interface ActorSectorial {
  id: string;
  nombre: string;
  tipo: 'empresa' | 'regulador' | 'asociacion' | 'sindicato' | 'think_tank' | 'organismo_publico';
  descripcion_corta: string;
  relevancia: NivelImpacto;
  url?: string;
  logo_url?: string;
  areas_influencia: string[];
  posicion_regulatoria?: 'favorable' | 'neutral' | 'contraria' | 'mixta';
}

export interface EventoSectorial {
  id: string;
  sector_id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'regulatorio' | 'economico' | 'politico' | 'judicial' | 'internacional' | 'otro';
  impacto: NivelImpacto;
  actores_implicados: string[];
  url_fuente?: string;
  fuente: string;
}

export interface ScoreSectorial {
  score_riesgo: number;
  score_actividad_legislativa: number;
  score_volatilidad: number;
  nivel: NivelImpacto;
  tendencia: TendenciaKPI;
  timestamp: string;
  nota_analitica?: string;
}

export interface SectorReport {
  sector_id: string;
  generado_en: string;
  score: ScoreSectorial;
  kpis: KPISectorial[];
  actores: ActorSectorial[];
  eventos_recientes: EventoSectorial[];
  iniciativas_legislativas_ids: string[];
  alertas: string[];
  resumen_ia?: string;
}

export interface SectoresIndex {
  sectores: Array<{
    id: string;
    score: ScoreSectorial;
    kpis_destacados: KPISectorial[];
    alertas_count: number;
    ultima_actualizacion: string;
  }>;
  generado_en: string;
}

// Re-export NivelImpacto for convenience
export type { NivelImpacto } from './legislativo';
