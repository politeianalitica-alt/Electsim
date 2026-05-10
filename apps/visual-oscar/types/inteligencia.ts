// types/inteligencia.ts
import type { NivelImpacto } from './legislativo';

export type OrigenSenal =
  | 'prensa_nacional'
  | 'prensa_internacional'
  | 'redes_sociales'
  | 'fuente_institucional'
  | 'mercados_financieros'
  | 'monitor_legislativo'
  | 'sector_report'
  | 'manual';

export type CategoriaSenal =
  | 'politica_interior'
  | 'politica_exterior'
  | 'economica'
  | 'social'
  | 'seguridad'
  | 'judicial'
  | 'institucional'
  | 'geopolitica'
  | 'tecnologica';

export interface SenalCritica {
  id: string;
  titulo: string;
  descripcion: string;
  origen: OrigenSenal;
  categoria: CategoriaSenal;
  nivel: NivelImpacto;
  fecha_deteccion: string;
  fecha_evento?: string;
  actores_implicados: string[];
  paises_afectados: string[];
  score_urgencia: number;
  score_credibilidad: number;
  verificada: boolean;
  url_fuente?: string;
  fuente: string;
  etiquetas: string[];
  resolucion?: SenalResolucion;
}

export interface SenalResolucion {
  fecha: string;
  tipo: 'confirmada' | 'descartada' | 'escalada' | 'absorbida';
  nota: string;
}

export type NivelTermometro = 'crisis' | 'tension' | 'elevado' | 'moderado' | 'calma';

export interface TermometroSnapshot {
  timestamp: string;
  temperatura: number;
  nivel: NivelTermometro;
  variacion_24h: number;
  variacion_7d: number;
  dimensiones: TermometroDimension[];
  senales_activas_count: number;
  resumen_ia?: string;
}

export interface TermometroDimension {
  id: string;
  nombre: string;
  valor: number;
  peso: number;
  tendencia: 'subiendo' | 'bajando' | 'estable';
  contribucion: number;
}

export interface TermometroHistorico {
  serie: Array<{ fecha: string; temperatura: number; nivel: NivelTermometro }>;
  eventos_marcados: Array<{ fecha: string; etiqueta: string }>;
}

export type DimensionRiesgo =
  | 'estabilidad_gubernamental'
  | 'fragmentacion_parlamentaria'
  | 'conflictividad_social'
  | 'exposicion_exterior'
  | 'vulnerabilidad_economica'
  | 'tension_territorial'
  | 'riesgo_judicial'
  | 'riesgo_reputacional';

export interface MatrizRiesgo {
  generado_en: string;
  score_global: number;
  nivel_global: NivelImpacto;
  dimensiones: RiesgoDimension[];
  horizonte_30d: RiesgoHorizonte;
  horizonte_90d: RiesgoHorizonte;
  nota_analitica?: string;
}

export interface RiesgoDimension {
  id: DimensionRiesgo;
  nombre: string;
  score: number;
  nivel: NivelImpacto;
  tendencia: 'deteriorando' | 'mejorando' | 'estable';
  factores: string[];
  mitigantes: string[];
}

export interface RiesgoHorizonte {
  periodo: string;
  score_esperado: number;
  rango_min: number;
  rango_max: number;
  probabilidad_escalada: number;
  eventos_clave: string[];
}

export type TipoEscenario = 'base' | 'optimista' | 'pesimista' | 'ruptura' | 'black_swan';
export type EstadoEscenario = 'activo' | 'archivado' | 'materializado' | 'descartado';

export interface Escenario {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoEscenario;
  estado: EstadoEscenario;
  probabilidad: number;
  horizonte: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  autor?: string;
  supuestos: string[];
  indicadores_disparo: IndicadorDisparo[];
  implicaciones: ImplicacionEscenario[];
  impacto_estimado: NivelImpacto;
  areas_afectadas: string[];
  etiquetas: string[];
}

export interface IndicadorDisparo {
  id: string;
  descripcion: string;
  umbral: string;
  estado: 'pendiente' | 'disparado' | 'superado';
  fecha_disparo?: string;
}

export interface ImplicacionEscenario {
  area: string;
  descripcion: string;
  nivel: NivelImpacto;
  plazo: string;
}

export type FaseCrisis = 'alerta' | 'emergente' | 'activa' | 'contenida' | 'resuelta';
export type TipoCrisis =
  | 'politica'
  | 'institucional'
  | 'economica'
  | 'social'
  | 'diplomatica'
  | 'judicial'
  | 'territorial';

export interface CrisisActiva {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoCrisis;
  fase: FaseCrisis;
  fecha_inicio: string;
  fecha_resolucion?: string;
  nivel: NivelImpacto;
  actores_implicados: string[];
  cronologia: EventoCrisis[];
  indicadores_evolucion: string[];
  escenarios_ids: string[];
  senales_ids: string[];
  nota_situacion?: string;
  url_seguimiento?: string;
}

export interface EventoCrisis {
  id: string;
  crisis_id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'escalada' | 'desescalada' | 'hito' | 'declaracion' | 'decision';
  impacto: NivelImpacto;
}

export type RegionGeopolitica =
  | 'europa'
  | 'mediteraneo'
  | 'magreb'
  | 'medio_oriente'
  | 'atlantico_norte'
  | 'indopacífico'
  | 'africa_subsahariana'
  | 'latinoamerica'
  | 'global';

export interface EventoGeopolitico {
  id: string;
  titulo: string;
  descripcion: string;
  region: RegionGeopolitica;
  paises: string[];
  fecha: string;
  impacto_espana: NivelImpacto;
  impacto_ue: NivelImpacto;
  dimensiones: CategoriaSenal[];
  senales_ids: string[];
  relevancia_otan: boolean;
  relevancia_ue: boolean;
  nota_analitica?: string;
  url_fuente?: string;
}

export interface MapaGeopolitico {
  generado_en: string;
  eventos_activos: EventoGeopolitico[];
  alertas_globales: string[];
  score_exposicion_exterior: number;
}

export type IndicadorMacro =
  | 'pib_crecimiento'
  | 'inflacion'
  | 'desempleo'
  | 'prima_riesgo'
  | 'deuda_pib'
  | 'deficit_pib'
  | 'balanza_corriente'
  | 'irs_10a'
  | 'ibex35'
  | 'euribor';

export interface DatoMacro {
  id: IndicadorMacro;
  nombre: string;
  valor: number | null;
  unidad: string;
  periodo: string;
  variacion_mensual?: number;
  variacion_anual?: number;
  fuente: string;
  fecha_publicacion: string;
  alerta?: string;
  nivel_alerta?: NivelImpacto;
  serie_historica?: Array<{ fecha: string; valor: number }>;
}

export interface PanelMacro {
  generado_en: string;
  indicadores: DatoMacro[];
  score_estabilidad_macro: number;
  nota_analitica?: string;
}

export interface NowcastVariable {
  id: string;
  nombre: string;
  valor_actual: number | null;
  prediccion_7d: number | null;
  prediccion_30d: number | null;
  intervalo_confianza_7d?: [number, number];
  intervalo_confianza_30d?: [number, number];
  modelo: string;
  ultima_actualizacion: string;
  metricas_modelo?: {
    rmse?: number;
    mae?: number;
    r2?: number;
  };
}

export interface NowcastReport {
  generado_en: string;
  variables: NowcastVariable[];
  nota_metodologica?: string;
  alertas: string[];
}

export type IdIndice =
  | 'riesgo_politico'
  | 'estabilidad_gobernabilidad'
  | 'temperatura_politica'
  | 'exposicion_exterior'
  | 'vulnerabilidad_macro'
  | 'actividad_legislativa';

export interface IndiceCompuesto {
  id: IdIndice;
  nombre: string;
  descripcion: string;
  valor: number;
  nivel: NivelImpacto;
  variacion_7d: number;
  variacion_30d: number;
  componentes: ComponenteIndice[];
  timestamp: string;
  metodologia_url?: string;
}

export interface ComponenteIndice {
  nombre: string;
  peso: number;
  valor: number;
  fuente_modulo: string;
}

export interface PanelIndices {
  generado_en: string;
  indices: IndiceCompuesto[];
}
