/**
 * Feature flags para migración frontend a capa canónica.
 *
 * Sprint 0+1 · Task 9 · 2026-06-02
 *
 * Default OFF en producción. Activación granular vía ENV vars en Vercel preview:
 *
 *   NEXT_PUBLIC_USE_CANONICAL_PULSO=true       → /api/medios/pulso
 *   NEXT_PUBLIC_USE_CANONICAL_NARRATIVAS=true  → /api/medios/narrativas
 *   NEXT_PUBLIC_USE_CANONICAL_MAPAS=true       → endpoints canónicos en MapasImpacto
 *   MEDIOS_LLM_CLASSIFIER=groq|gemini|ollama|disabled
 *                                              → cliente LLM en producción
 *
 * Convención:
 *  - `USE_CANONICAL_*` son flags client-side (NEXT_PUBLIC_*).
 *  - `MEDIOS_LLM_CLASSIFIER` es server-side (sin NEXT_PUBLIC_).
 *
 * Sprint 2 C1 (2026-06-02): añadido 'gemini' como provider seleccionable
 * (lib/medios/canonical/llm-classifier.ts → GeminiProductionClient).
 */
export const VALID_CLASSIFIERS = [
  'ollama',
  'groq',
  'gemini',
  'disabled',
] as const

export type LlmClassifierProvider = (typeof VALID_CLASSIFIERS)[number]

function readClassifier(): LlmClassifierProvider {
  const raw = process.env.MEDIOS_LLM_CLASSIFIER ?? 'ollama'
  return (VALID_CLASSIFIERS as readonly string[]).includes(raw)
    ? (raw as LlmClassifierProvider)
    : 'ollama'
}

export const FLAGS = {
  USE_CANONICAL_PULSO: process.env.NEXT_PUBLIC_USE_CANONICAL_PULSO === 'true',
  USE_CANONICAL_NARRATIVAS: process.env.NEXT_PUBLIC_USE_CANONICAL_NARRATIVAS === 'true',
  USE_CANONICAL_MAPAS: process.env.NEXT_PUBLIC_USE_CANONICAL_MAPAS === 'true',
  MEDIOS_LLM_CLASSIFIER: readClassifier(),
} as const

export type FeatureFlags = typeof FLAGS
