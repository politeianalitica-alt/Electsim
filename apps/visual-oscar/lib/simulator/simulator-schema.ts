import { z } from "zod";

export const OutcomeSchema = z.object({
  id:             z.string(),
  label:          z.string(),
  probability:    z.number().min(0).max(100),
  likelihood:     z.enum(["high", "moderate", "low"]),
  narrative:      z.string().min(10),
  impactPublic:   z.number().min(-100).max(100),
  impactInternal: z.number().min(-100).max(100),
  signals:        z.array(z.string()).default([]),
});

export const CounterMoveSchema = z.object({
  actor:     z.string(),
  move:      z.string(),
  rationale: z.string(),
});

export const SimulationPayloadSchema = z.object({
  outcomes:       z.array(OutcomeSchema).length(3),
  counterMoves:   z.array(CounterMoveSchema).min(1).max(5),
  recommendation: z.string().min(20),
  riskFlags:      z.array(z.string()).default([]),
});

export const SIM_SCHEMA_HINT = `Devuelve ÚNICAMENTE JSON con esta forma:
{
  "outcomes": [
    {
      "id": "base",
      "label": "Escenario base",
      "probability": 50,
      "likelihood": "moderate",
      "narrative": "2-3 frases describiendo cómo se desarrollaría",
      "impactPublic":   -10 a +50,
      "impactInternal": -10 a +50,
      "signals": ["señal temprana 1", "señal temprana 2"]
    },
    { "id": "optimo",  ... "label": "Escenario óptimo",  ... },
    { "id": "adverso", ... "label": "Escenario adverso", ... }
  ],
  "counterMoves": [
    { "actor": "Oposición", "move": "...", "rationale": "..." }
  ],
  "recommendation": "Recomendación operativa 2-3 frases",
  "riskFlags": ["bandera roja 1", "bandera roja 2"]
}
Reglas: SIEMPRE 3 escenarios (base/óptimo/adverso). Probabilidades suman aprox 100.
Español, sin emojis, sin markdown, sin texto fuera del JSON.`;
