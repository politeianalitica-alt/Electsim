/**
 * Centralised AI provider configuration.
 *
 * Politeia uses Ollama as the unified LLM provider.
 * - OLLAMA_URL: base URL of the Ollama HTTP API (e.g. https://ollama.mydomain/ or http://127.0.0.1:11434)
 * - OLLAMA_MODEL: default model name (defaults to "llama3.2:latest")
 *
 * When OLLAMA_URL is missing the runtime falls back to deterministic mock
 * payloads so preview deploys never break.
 */

export const AI_CONFIG = {
  ollamaUrl: (process.env.OLLAMA_URL ?? "").replace(/\/+$/, ""),
  defaultModel: process.env.OLLAMA_MODEL || "llama3.2:latest",
  jsonModel: process.env.OLLAMA_JSON_MODEL || process.env.OLLAMA_MODEL || "llama3.2:latest",
  fastModel: process.env.OLLAMA_FAST_MODEL || process.env.OLLAMA_MODEL || "llama3.2:latest",
  timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 90_000),
} as const;

export function isAiEnabled(): boolean {
  return AI_CONFIG.ollamaUrl.length > 0;
}
