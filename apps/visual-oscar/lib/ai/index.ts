/**
 * Entry point unificado de la capa de IA.
 *
 * Las rutas API importan de `@/lib/ai` y nunca tocan directamente el
 * cliente de un provider concreto. Esto permite cambiar de Anthropic a
 * Ollama (o a futuros OpenAI / Gemini) tocando solo `ai-config.ts`.
 *
 * Las tres funciones expuestas tienen la MISMA firma en ambos providers:
 *   - generateText(opts)  → string
 *   - generateJSON(opts)  → T (parsea + lanza si no es JSON)
 *   - streamText(opts)    → ReadableStream<Uint8Array> con deltas UTF-8
 *
 * Adicionalmente:
 *   - `tier: 'premium' | 'fast'` para elegir Sonnet/Haiku en Anthropic
 *     (las rutas legacy que no pasen tier reciben 'premium' por defecto).
 *   - `withAiFallback(primary, fallback)` para cubrir el caso AI off.
 *   - `AiUnavailableError` exportado para que los caller hagan catch.
 *
 * Compatibilidad backwards: re-exportamos `OllamaUnavailableError` como
 * alias de `AiUnavailableError` para que las rutas que aún lo importen
 * con el nombre antiguo sigan funcionando sin tocar el import.
 */

import { AI_CONFIG, isAiEnabled } from "./ai-config";
import * as anthropic from "./anthropic-client";
import * as ollama from "./ollama-client";

// ─── Tipos públicos (re-exports) ─────────────────────────────────────────

export type {
  AiRole,
  AiMessage,
  AiTier,
  AiChatOptions,
  ToolUseLog,
  GenerateWithToolsResult,
} from "./anthropic-client";
export { AiUnavailableError, generateWithTools } from "./anthropic-client";
export { getProviderName } from "./ai-config";
export { AI_CONFIG, isAiEnabled };

// Alias de compatibilidad con código previo que importaba el error de Ollama
export { OllamaUnavailableError } from "./ollama-client";

import type { AiChatOptions } from "./anthropic-client";
import { AiUnavailableError } from "./anthropic-client";

// ─── Routing por provider ───────────────────────────────────────────────

function ensureEnabled(): void {
  if (AI_CONFIG.provider === "none") {
    throw new AiUnavailableError(
      "No AI provider configured (set ANTHROPIC_API_KEY or OLLAMA_URL)"
    );
  }
}

/**
 * Convierte AiChatOptions (tier-aware) al formato esperado por
 * ollama-client (model-aware) cuando estamos en provider Ollama.
 */
function toOllamaOptions(opts: AiChatOptions): ollama.OllamaChatOptions {
  let model = opts.model;
  if (!model) {
    const tier = opts.tier ?? "premium";
    model = tier === "fast" ? AI_CONFIG.fastModel : AI_CONFIG.defaultModel;
  }
  return {
    model,
    system: opts.system,
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: opts.temperature,
    stop: opts.stop,
    maxTokens: opts.maxTokens,
    format: opts.format,
    signal: opts.signal,
  };
}

// ─── API pública ────────────────────────────────────────────────────────

export async function generateText(opts: AiChatOptions): Promise<string> {
  ensureEnabled();
  if (AI_CONFIG.provider === "anthropic") {
    return anthropic.generateText(opts);
  }
  return ollama.generateText(toOllamaOptions(opts));
}

export function streamText(opts: AiChatOptions): ReadableStream<Uint8Array> {
  ensureEnabled();
  if (AI_CONFIG.provider === "anthropic") {
    return anthropic.streamText(opts);
  }
  return ollama.streamText(toOllamaOptions(opts));
}

export async function generateJSON<T = unknown>(
  opts: Omit<AiChatOptions, "format"> & { schemaHint?: string }
): Promise<T> {
  ensureEnabled();
  if (AI_CONFIG.provider === "anthropic") {
    return anthropic.generateJSON<T>(opts);
  }
  const { schemaHint, ...rest } = opts;
  const ollamaOpts = toOllamaOptions({ ...rest, tier: opts.tier ?? "premium" });
  return ollama.generateJSON<T>({ ...ollamaOpts, schemaHint });
}

// ─── Helper: cubrir mock cuando AI off o falla ──────────────────────────

export async function withAiFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (!isAiEnabled()) return await fallback();
  try {
    return await primary();
  } catch (err) {
    // Log para que se vea en Vercel logs por qué cayó al mock
    // eslint-disable-next-line no-console
    console.warn("[ai] fallback to mock:", (err as Error).message);
    return await fallback();
  }
}
