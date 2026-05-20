/**
 * Centralised AI provider configuration.
 *
 * Politeia ahora soporta dos providers seleccionables via `LLM_PROVIDER`:
 *
 *   · LLM_PROVIDER=anthropic  → Claude (producción)
 *   · LLM_PROVIDER=ollama     → Ollama local/self-hosted (desarrollo)
 *   · (no set)                → auto-detect: si hay ANTHROPIC_API_KEY usa
 *                               Anthropic; si no, Ollama si hay OLLAMA_URL;
 *                               si no, mock determinista.
 *
 * ─── Anthropic ───
 *  - ANTHROPIC_API_KEY        (obligatorio, https://console.anthropic.com)
 *  - ANTHROPIC_MODEL          (default: claude-sonnet-4-5-20250929)
 *  - ANTHROPIC_FAST_MODEL     (default: claude-haiku-4-5-20251001)
 *  - ANTHROPIC_TIMEOUT_MS     (default: 90_000)
 *
 * ─── Ollama (legacy, mantenido como fallback) ───
 *  - OLLAMA_URL               (base URL)
 *  - OLLAMA_MODEL             (default: llama3.2:latest)
 *  - OLLAMA_JSON_MODEL        (default: OLLAMA_MODEL)
 *  - OLLAMA_FAST_MODEL        (default: OLLAMA_MODEL)
 *  - OLLAMA_TIMEOUT_MS        (default: 90_000)
 */

export type AiProvider = "anthropic" | "ollama" | "none";

function detectProvider(): AiProvider {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  if (explicit === "anthropic") return "anthropic";
  if (explicit === "ollama") return "ollama";
  // Auto-detect: Anthropic > Ollama > none
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OLLAMA_URL) return "ollama";
  return "none";
}

export const AI_CONFIG = {
  provider: detectProvider(),

  // Anthropic
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
