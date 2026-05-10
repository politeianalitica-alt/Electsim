export type FuenteTipo = 'prensa_nacional' | 'prensa_regional' | 'agencia' | 'redes_sociales' | 'institucional' | 'think_tank';
export type RelevanciaSignal = 'breaking' | 'alta' | 'media' | 'baja';
export type SentimientoTono = 'positivo' | 'negativo' | 'neutro' | 'mixto';

export interface SignalItem {
  id: string;
  titulo: string;
  resumen: string;
  fuente: string;
  fuente_tipo: FuenteTipo;
  url: string;
  publicado_en: string;
  relevancia: RelevanciaSignal;
  tono: SentimientoTono;
  temas: string[];
  actores: string[];
  score_relevancia: number;
  es_breaking: boolean;
  cluster_narrativo?: string;
}

export interface NarrativaCluster {
  id: string;
  nombre: string;
  descripcion: string;
  items_count: number;
  intensidad: number;
  tendencia: 'creciendo' | 'estable' | 'decayendo';
  primera_deteccion: string;
  actores_principales: string[];
  medios_principales: string[];
}

export interface IntelligenceFeedState {
  signals: SignalItem[];
  clusters: NarrativaCluster[];
  ultima_sync: string;
  total_monitorizados_24h: number;
  breaking_activos: number;
}
