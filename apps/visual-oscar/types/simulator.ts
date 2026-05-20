/** Tipos para el Simulador de Decisión (M16). */

export type Likelihood = "high" | "moderate" | "low";

export interface DecisionOutcome {
  id:           string;
  label:        string;          // "Escenario base", "Escenario adverso", "Escenario óptimo"
  probability:  number;          // 0-100
  likelihood:   Likelihood;
  narrative:    string;          // 2-3 frases
  impactPublic: number;          // -100..+100 (impacto opinión pública)
  impactInternal: number;        // -100..+100 (impacto en coalición/equipo)
  signals:      string[];        // señales tempranas a vigilar
}

export interface CounterMove {
  actor:    string;
  move:     string;
  rationale: string;
}

export interface DecisionSimulation {
  id:           string;
  workspaceId:  string;
  scenario:     string;          // pregunta original del usuario
  generatedAt:  string;
  source:       "ollama" | "anthropic" | "mock";
  context:      string;          // contexto recogido del workspace (resumen)
  outcomes:     DecisionOutcome[];
  counterMoves: CounterMove[];
  recommendation: string;        // recomendación del agente
  riskFlags:    string[];        // banderas rojas
}

export interface DecisionLogEntry {
  id:          string;
  workspaceId: string;
  scenario:    string;
  loggedAt:    string;
  outcomeChosen?: string;        // qué outcome se materializó (analista lo marca después)
  predictionAccuracy?: number;   // 0-100, fijado a posteriori
}
