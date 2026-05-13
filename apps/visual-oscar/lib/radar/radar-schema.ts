import { z } from "zod";

export const RadarActionSchema = z.object({
  label:    z.string().min(3),
  timeline: z.string().min(1),
  owner:    z.string().optional(),
});

export const RadarOpportunitySchema = z.object({
  id:          z.string().min(1),
  title:       z.string().min(3),
  score:       z.number().min(0).max(100),
  impact:      z.enum(["transformacional", "alto", "medio", "bajo"]),
  confidence:  z.number().min(0).max(1),
  horizon:     z.enum(["now", "week", "month", "quarter"]),
  category:    z.string().min(1),
  rationale:   z.string().min(5),
  actions:     z.array(RadarActionSchema).min(1).max(4),
  relatedIds:  z.array(z.string()).default([]),
});

export const RadarPayloadSchema = z.object({
  opportunities: z.array(RadarOpportunitySchema).min(1).max(8),
});

export type RadarPayload = z.infer<typeof RadarPayloadSchema>;

/**
 * Hint que se incrusta en el system prompt para guiar a Ollama hacia el
 * esquema esperado. Mantenerlo conciso para no inflar el contexto.
 */
export const RADAR_SCHEMA_HINT = `Devuelve ÚNICAMENTE un objeto JSON con la forma:
{
  "opportunities": [
    {
      "id": "opp_001",
      "title": "Título corto y accionable",
      "score": 0-100,
      "impact": "transformacional"|"alto"|"medio"|"bajo",
      "confidence": 0.0-1.0,
      "horizon": "now"|"week"|"month"|"quarter",
      "category": "Legislativo|Mediático|Electoral|Sectorial|Geopolítico|Riesgo",
      "rationale": "1-2 frases explicando por qué es oportunidad",
      "actions": [
        { "label": "...", "timeline": "48h", "owner": "Comunicación" }
      ],
      "relatedIds": ["iss_001"]
    }
  ]
}
Reglas estrictas: 4-6 oportunidades, score realista, sin texto fuera del JSON,
sin Markdown, sin emojis, en español, owners en español.`;
