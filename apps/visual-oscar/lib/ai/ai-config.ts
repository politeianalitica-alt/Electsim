/**
 * Centralised AI provider configuration.
 *
 * Politeia soporta tres providers seleccionables via `LLM_PROVIDER`:
 *
 *   · LLM_PROVIDER=groq       → Groq GPT-OSS (rápido + razonamiento, primario)
 *   · LLM_PROVIDER=anthropic  → Claude (fallback / análisis profundo)
 *   · LLM_PROVIDER=ollama     → Ollama local/self-hosted (desarrollo)
 *   · (no set)                → auto-detect: Groq > Anthropic > Ollama > none.
 *
 * El módulo macro usa `withCascade(fn)` (ver `lib/ai/index.ts`) para
 * lanzar Groq primero y caer a Anthropic en errores 429/5xx/timeout.
 *
 * ─── Groq (primario para análisis macro / reasoning) ───
 *  - GROQ_API_KEY               (obligatorio — sólo servidor)
 *  - GROQ_MODEL_REASONING       (premium, default: openai/gpt-oss-120b)
 *  - GROQ_MODEL_FAST            (fast,    default: openai/gpt-oss-20b)
 *  - GROQ_TIMEOUT_MS            (default: 30_000)
 *
 * ─── Anthropic (cascade) ───
 *  - ANTHROPIC_API_KEY          (obligatorio para fallback)
 *  - ANTHROPIC_MODEL            (default: claude-sonnet-4-5-20250929)
 *  - ANTHROPIC_FAST_MODEL       (default: claude-haiku-4-5-20251001)
 *  - ANTHROPIC_TIMEOUT_MS       (default: 90_000)
 *
 * ─── Ollama (legacy fallback) ───
 *  - OLLAMA_URL                 (base URL)
 *  - OLLAMA_MODEL               (default: llama3.2:latest)
 *  - OLLAMA_JSON_MODEL          (default: OLLAMA_MODEL)
 *  - OLLAMA_FAST_MODEL          (default: OLLAMA_MODEL)
 *  - OLLAMA_TIMEOUT_MS          (default: 90_000)
 */

export type AiProvider = "gemini" | "groq" | "anthropic" | "ollama" | "none";

function detectProvider(): AiProvider {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  if (explicit === "gemini") return "gemini";
  if (explicit === "groq") return "groq";
  if (explicit === "anthropic") return "anthropic";
  if (explicit === "ollama") return "ollama";
  // Sprint M D2 (2026-05-22): auto-detect Gemini PRIMERO (más generoso en
  // free tier que Groq, mejor structured output con responseSchema nativo).
  // Gemini > Groq > Anthropic > Ollama > none
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OLLAMA_URL) return "ollama";
  return "none";
}

export const AI_CONFIG = {
  provider: detectProvider(),

  // Sprint M D2 (2026-05-22): Gemini como PRIMARIO. Tier free mucho más
  // generoso que Groq + structured output nativo via responseSchema.
  // Default model: gemini-2.0-flash-lite (el más barato, alta cuota).
  // Override via GEMINI_MODEL_REASONING/FAST env vars.
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiReasoningModel:
    process.env.GEMINI_MODEL_REASONING || "gemini-2.0-flash-lite",
  geminiFastModel:
    process.env.GEMINI_MODEL_FAST || "gemini-2.0-flash-lite",
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 30_000),

  // Groq (fallback / legacy macro reasoning)
  //
  // Sprint L (2026-05-22): default cambiado de openai/gpt-oss-120b a
  // llama-3.3-70b-versatile por mayor disponibilidad y estabilidad en el
  // tier actual. gpt-oss-* tienen capacidad limitada/intermitente.
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqReasoningModel:
    process.env.GROQ_MODEL_REASONING || "llama-3.3-70b-versatile",
  groqFastModel: process.env.GROQ_MODEL_FAST || "llama-3.1-8b-instant",
  groqTimeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 30_000),

  // Anthropic (cascade)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
  anthropicFastModel: process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001",

  // Ollama (legacy)
  ollamaUrl: (process.env.OLLAMA_URL ?? "").replace(/\/+$/, ""),
  defaultModel: process.env.OLLAMA_MODEL || "llama3.2:latest",
  jsonModel: process.env.OLLAMA_JSON_MODEL || process.env.OLLAMA_MODEL || "llama3.2:latest",
  fastModel: process.env.OLLAMA_FAST_MODEL || process.env.OLLAMA_MODEL || "llama3.2:latest",

  // Compartido
  timeoutMs: Number(
    process.env.ANTHROPIC_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS || 90_000
  ),
} as const;

export function isAiEnabled(): boolean {
  return AI_CONFIG.provider !== "none";
}

export function getProviderName(): string {
  return AI_CONFIG.provider;
}

/**
 * Devuelve true si el cascade está disponible (Gemini primario + Groq
 * fallback desde Sprint M D2 2026-05-22). Lo usa el endpoint macro para
 * decidir si activar `withCascade()`.
 */
export function isGroqCascadeAvailable(): boolean {
  // Conservamos el nombre `isGroqCascadeAvailable` por compatibilidad con
  // los call-sites en /api/macro/ai/*. Semánticamente ahora es "el cascade
  // multi-provider funciona si tenemos al menos un provider configurado".
  return Boolean(AI_CONFIG.geminiApiKey || AI_CONFIG.groqApiKey);
}
