/**
 * Tier router · decide si una pregunta merece Sonnet 4.5 (mejor calidad,
 * más caro) o Haiku 4.5 (más rápido, más barato).
 *
 * Heurística por keywords. Pensada para minimizar coste sin sacrificar
 * calidad en preguntas que lo requieren.
 *
 * Default: Haiku. Solo escala a Sonnet si detecta señales de complejidad
 * o análisis estratégico.
 */

import type { AiTier } from "./anthropic-client";

const SONNET_TRIGGERS = [
  // Análisis estratégico
  "analiza", "análisis", "analiza", "evalúa", "evaluación",
  "estrategia", "estratégico", "implicación", "consecuencia",
  "impacto", "perspectiva", "escenario", "futuro",
  // Comparativas profundas
  "compáralo", "compárame", "diferencia entre", "compara",
  // Triggers de profundidad (mismos que el system prompt)
  "detalle", "profundiza", "explícame", "explica", "amplía",
  "desglosa", "desglose",
  // Razonamiento multi-paso
  "por qué", "cómo se explica", "qué pasaría si", "qué pasaria si",
  "cuáles son las causas", "qué efecto", "implicacion", "implicaciones",
  // Productos largos
  "informe", "memo", "briefing completo", "redacta", "escribe",
  // ⚠ Preguntas que requieren MÚLTIPLES tools encadenados → Sonnet
  // mucho más fiable que Haiku en tool use complejo
  "boe", "norma", "normas", "decreto", "ley", "leyes", "legislativ",
  "tramitación", "tramitacion", "sumario", "publicación", "publicacion",
];

const HAIKU_PREFERRED = [
  // Preguntas factuales cortas
  "qué es", "quién es", "cuándo", "cuánto", "dónde",
  "cómo va", "cómo está", "última", "actual",
  "hola", "gracias", "ok", "vale",
];

export function chooseTier(userMessage: string): AiTier {
  const lower = userMessage.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  // 1. Preguntas muy cortas (≤5 palabras) → Haiku
  if (wordCount <= 5) return "fast";

  // 2. Empieza con keyword factual simple → Haiku
  if (HAIKU_PREFERRED.some((k) => lower.startsWith(k))) return "fast";

  // 3. Contiene trigger de Sonnet → escala a premium
  if (SONNET_TRIGGERS.some((k) => lower.includes(k))) return "premium";

  // 4. Pregunta larga (>25 palabras) → Sonnet (probablemente requiere análisis)
  if (wordCount > 25) return "premium";

  // 5. Default: Haiku (más barato y suficiente para 80% de casos)
  return "fast";
}

/**
 * Devuelve la última pregunta del usuario en el historial de mensajes.
 * Si no hay, devuelve string vacío.
 */
export function lastUserMessage(messages: Array<{ role: string; content: string }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}
