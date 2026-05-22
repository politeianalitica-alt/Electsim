/**
 * Entry point unificado de la capa de IA.
 *
 * Las rutas API importan de `@/lib/ai` y nunca tocan directamente el
 * cliente de un provider concreto. Esto permite cambiar de Groq a
 * Anthropic (o a futuros OpenAI / Gemini) tocando solo `ai-config.ts`.
 *
 * Las tres funciones expuestas tienen la MISMA firma en los providers:
 *   - generateText(opts)  → string
 *   - generateJSON(opts)  → T (parsea + lanza si no es JSON)
 *   - streamText(opts)    → ReadableStream<Uint8Array> con deltas UTF-8
 *
 * Adicionalmente:
 *   - `tier: 'premium' | 'fast'` selecciona el modelo del provider activo
 *     (Sonnet/Haiku en Anthropic, gpt-oss-120b/gpt-oss-20b en Groq).
 *   - `withAiFallback(primary, fallback)` para cubrir el caso AI off.
 *   - `withCascade(fn)` ejecuta `fn()` contra Groq y, si lanza
 *     `AiUnavailableError`, reintenta contra Anthropic transparentemente.
 *     Usado por `/api/macro/ai/*` para garantizar respuesta aunque Groq
 *     esté rate-limited.
 *   - `AiUnavailableError` exportado para que los caller hagan catch.
 */

import { AI_CONFIG, isAiEnabled } from "./ai-config";
import * as anthropic from "./anthropic-client";
import * as groq from "./groq-client";
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
export { getProviderName, isGroqCascadeAvailable } from "./ai-config";
export { AI_CONFIG, isAiEnabled };

// Alias de compatibilidad con código previo que importaba el error de Ollama
export { OllamaUnavailableError } from "./ollama-client";

import type { AiChatOptions } from "./anthropic-client";
import { AiUnavailableError } from "./anthropic-client";

// ─── Routing por provider ───────────────────────────────────────────────

function ensureEnabled(): void {
  if (AI_CONFIG.provider === "none") {
    throw new AiUnavailableError(
      "No AI provider configured (set GROQ_API_KEY, ANTHROPIC_API_KEY or OLLAMA_URL)"
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

// ─── API pública (provider activo) ──────────────────────────────────────

export async function generateText(opts: AiChatOptions): Promise<string> {
  ensureEnabled();
  if (AI_CONFIG.provider === "groq") return groq.generateText(opts);
  if (AI_CONFIG.provider === "anthropic") return anthropic.generateText(opts);
  return ollama.generateText(toOllamaOptions(opts));
}

export function streamText(opts: AiChatOptions): ReadableStream<Uint8Array> {
  ensureEnabled();
  if (AI_CONFIG.provider === "groq") return groq.streamText(opts);
  if (AI_CONFIG.provider === "anthropic") return anthropic.streamText(opts);
  return ollama.streamText(toOllamaOptions(opts));
}

export async function generateJSON<T = unknown>(
  opts: Omit<AiChatOptions, "format"> & {
    schemaHint?: string;
    jsonSchema?: Record<string, unknown>;
    schemaName?: string;
  }
): Promise<T> {
  ensureEnabled();
  if (AI_CONFIG.provider === "groq") {
    return groq.generateJSON<T>(opts);
  }
  if (AI_CONFIG.provider === "anthropic") {
    const { jsonSchema, schemaName, ...rest } = opts;
    void jsonSchema;
    void schemaName;
    return anthropic.generateJSON<T>(rest);
  }
  const { schemaHint, jsonSchema, schemaName, ...rest } = opts;
  void jsonSchema;
  void schemaName;
  const ollamaOpts = toOllamaOptions({ ...rest, tier: opts.tier ?? "premium" });
  return ollama.generateJSON<T>({ ...ollamaOpts, schemaHint });
}

// ─── Cascade: Groq → Anthropic ──────────────────────────────────────────

export type CascadeProvider = "groq";

export interface CascadeResult<T> {
  result: T;
  provider: CascadeProvider;
  modelHint: string;
}

/**
 * Ejecuta `fn(client)` contra Groq. **Política Groq-only desde Sprint C
 * 2026-05-22 por decisión del propietario.** Cualquier error se propaga
 * al caller; no hay fallback a Anthropic. La función conserva su nombre
 * `withCascade` para no romper los call-sites que ya la usan, pero a
 * efectos prácticos es un wrapper sobre el cliente Groq con tracking de
 * modelo + provider en el resultado.
 *
 * Si en el futuro se quiere reintroducir un segundo provider, modificar
 * `CascadeProvider` y reactivar el bloque catch/fallback debajo.
 */
export interface CascadeClient {
  provider: CascadeProvider;
  generateText: (opts: AiChatOptions) => Promise<string>;
  generateJSON: <T = unknown>(
    opts: Omit<AiChatOptions, "format"> & {
      jsonSchema?: Record<string, unknown>;
      schemaName?: string;
      schemaHint?: string;
    }
  ) => Promise<T>;
  modelName: (opts: AiChatOptions) => string;
}

function makeGroqClient(): CascadeClient {
  return {
    provider: "groq",
    generateText: (opts) => groq.generateText(opts),
    generateJSON: (opts) => groq.generateJSON(opts),
    modelName: (opts) => {
      if (opts.model) return opts.model;
      return opts.tier === "fast"
        ? AI_CONFIG.groqFastModel
        : AI_CONFIG.groqReasoningModel;
    },
  };
}

export async function withCascade<T>(
  fn: (client: CascadeClient) => Promise<T>
): Promise<CascadeResult<T>> {
  if (!AI_CONFIG.groqApiKey) {
    throw new AiUnavailableError(
      "GROQ_API_KEY is not configured (Groq-only mode)"
    );
  }
  const client = makeGroqClient();
  const result = await fn(client);
  return {
    result,
    provider: "groq",
    modelHint: AI_CONFIG.groqReasoningModel,
  };
}

// `anthropic` import se conserva sólo porque ai-config.ts re-exporta el
// tipo `AiUnavailableError` desde anthropic-client.ts. No se llama en
// runtime desde aquí (Groq-only desde 2026-05-22).
void anthropic;

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
