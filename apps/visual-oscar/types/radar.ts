/** Tipos para el Radar de Oportunidades (Sprint 14). */

export type RadarHorizon = "now" | "week" | "month" | "quarter";
export type RadarImpact  = "transformacional" | "alto" | "medio" | "bajo";

export interface RadarAction {
  label:   string;
  /** Plazo aproximado en lenguaje natural ("48h", "2 semanas"…). */
  timeline: string;
  /** Quién debería ejecutarlo ("Comunicación", "Dirección"…). */
  owner?:  string;
}

export interface RadarOpportunity {
  id:           string;
  title:        string;
  /** 0-100, mayor = más alta prioridad estratégica. */
  score:        number;
  impact:       RadarImpact;
  /** 0-1 confianza del modelo. */
  confidence:   number;
  horizon:      RadarHorizon;
  category:     string;          // "Legislativo", "Mediático", "Electoral", "Sectorial", "Geopolítico", "Riesgo"
  rationale:    string;          // 1-2 frases explicando la oportunidad
  actions:      RadarAction[];   // 1-3 acciones recomendadas
  relatedIds:   string[];        // ids de issues / docs / canvas relacionados
  generatedAt:  string;          // ISO timestamp
  source:       "ollama" | "anthropic" | "mock";
}

export interface RadarBatch {
  id:           string;
  workspaceId:  string;
  generatedAt:  string;
  source:       "ollama" | "anthropic" | "mock";
  opportunities: RadarOpportunity[];
}
