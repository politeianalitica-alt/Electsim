/**
 * Groq client — paralelo a `anthropic-client.ts` con la MISMA firma.
 *
 * Groq expone una API OpenAI-compatible en https://api.groq.com/openai/v1
 * con dos características clave:
 *
 *  - `reasoning_format: 'hidden' | 'parsed' | 'raw'` en modelos GPT-OSS
 *    (openai/gpt-oss-120b, openai/gpt-oss-20b). En producción usamos
 *    'hidden' para NO exponer cadena de razonamiento cruda.
 *
 *  - Structured Outputs con `response_format: { type: 'json_schema',
 *    json_schema: { schema, strict: true } }`. Si el modelo no lo soporta
 *    o el schema es muy pesado, caemos a `response_format: { type:
 *    'json_object' }` + instrucción en system prompt.
 *
 * Modelos default:
 *  - GROQ_MODEL_REASONING  (premium) → openai/gpt-oss-120b
 *  - GROQ_MODEL_FAST       (fast)    → openai/gpt-oss-20b
 *
 * Sin SDK oficial → usamos fetch directo. Sin prompt caching server-side
 * (Groq no lo soporta hoy); la caché vive en el endpoint que llama al
 * cliente (hash determinista + TTL 1h).
 *
 * Lanza `AiUnavailableError` en errores upstream para que el wrapper
 * `withCascade` re-intente con Anthropic.
 */

import { AI_CONFIG } from "./ai-config";
import {
  AiUnavailableError,
  type AiChatOptions,
  type AiMessage,
} from "./anthropic-client";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// ─── Picker de modelo ────────────────────────────────────────────────────

function pickModel(opts: AiChatOptions): string {
  if (opts.model) return opts.model;
  const tier = opts.tier ?? "premium";
  return tier === "fast"
    ? AI_CONFIG.groqFastModel
    : AI_CONFIG.groqReasoningModel;
}

function isReasoningModel(model: string): boolean {
  // Sólo los GPT-OSS de Groq aceptan `reasoning_format`.
  return /gpt-oss/i.test(model);
}

// ─── Helper: convertir AiMessage[] → OpenAI chat format ─────────────────

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildMessages(opts: AiChatOptions): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  const system = opts.system?.trim();
  if (system) {
    out.push({ role: "system", content: system });
  }
  for (const m of opts.messages) {
    if (m.role === "system") {
      // Defensa: si llega un system en messages, concatenarlo al primero.
      const last = out[out.length - 1];
      if (last?.role === "system") {
        last.content = `${last.content}\n\n${m.content}`;
      } else {
        out.unshift({ role: "system", content: m.content });
      }
      continue;
    }
    out.push({ role: m.role as "user" | "assistant", content: m.content });
  }
  return out;
}

// ─── Llamada raw + retry ────────────────────────────────────────────────

interface GroqChoice {
  message: { role: "assistant"; content: string };
  finish_reason: string;
}

interface GroqResponse {
  id: string;
  model: string;
  choices: GroqChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string };
}

interface GroqRequestPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  stop?: string[];
  max_tokens?: number;
  reasoning_format?: "hidden" | "parsed" | "raw";
  response_format?:
    | { type: "json_object" }
    | {
        type: "json_schema";
        json_schema: {
          name: string;
          schema: Record<string, unknown>;
          strict?: boolean;
        };
      };
}

async function callGroq(
  payload: GroqRequestPayload,
  signal?: AbortSignal
): Promise<GroqResponse> {
  if (!AI_CONFIG.groqApiKey) {
    throw new AiUnavailableError("GROQ_API_KEY is not configured");
  }

  const url = `${GROQ_BASE_URL}/chat/completions`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AI_CONFIG.groqApiKey}`,
  };

  // Retry 1x en 429 / 5xx / timeout. Backoff fijo 600ms.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AI_CONFIG.groqTimeoutMs);
    if (signal) {
      signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        const body = await res.text().catch(() => "");
        lastErr = new AiUnavailableError(
          `Groq HTTP ${res.status}: ${body.slice(0, 200)}`
        );
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        throw lastErr;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new AiUnavailableError(
          `Groq HTTP ${res.status}: ${body.slice(0, 300)}`
        );
      }

      const json = (await res.json()) as GroqResponse;
      if (json.error) {
        throw new AiUnavailableError(
          `Groq error: ${json.error.message || json.error.type || "unknown"}`
        );
      }
      // Log de uso para Vercel logs
      if (json.usage) {
        // eslint-disable-next-line no-console
        console.log(
          `[groq] model=${json.model} in=${json.usage.prompt_tokens ?? "?"} out=${
            json.usage.completion_tokens ?? "?"
          } total=${json.usage.total_tokens ?? "?"}`
        );
      }
      return json;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const isAbort = (err as Error).name === "AbortError";
      if (attempt === 0 && (isAbort || err instanceof AiUnavailableError)) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      if (err instanceof AiUnavailableError) throw err;
      throw new AiUnavailableError(
        `Groq request failed: ${(err as Error).message}`,
        err
      );
    }
  }
  throw lastErr instanceof Error
    ? new AiUnavailableError(lastErr.message, lastErr)
    : new AiUnavailableError("Groq request failed (unknown)");
}

// ─── API pública ────────────────────────────────────────────────────────

export async function generateText(opts: AiChatOptions): Promise<string> {
  const model = pickModel(opts);
  const payload: GroqRequestPayload = {
    model,
    messages: buildMessages(opts),
    temperature: opts.temperature,
    stop: opts.stop,
    max_tokens: opts.maxTokens,
  };
  if (isReasoningModel(model)) {
    payload.reasoning_format = "hidden";
  }
  if (opts.format === "json") {
    payload.response_format = { type: "json_object" };
  }

  const res = await callGroq(payload, opts.signal);
  const text = res.choices[0]?.message?.content ?? "";
  if (!text) {
    throw new AiUnavailableError("Groq returned empty completion");
  }
  return text;
}

/**
 * generateJSON con structured outputs constrained.
 *
 * Si pasas `jsonSchema`, usamos Groq Structured Outputs (strict=true) →
 * el modelo está GARANTIZADO a devolver JSON válido contra el schema.
 *
 * Si no, usamos `response_format: json_object` (modo legacy) + parse.
 */
export interface GroqJSONOptions extends Omit<AiChatOptions, "format"> {
  /** JSON Schema (Draft 2020-12 subset soportado por Groq). */
  jsonSchema?: Record<string, unknown>;
  /** Nombre del schema (Groq lo requiere). */
  schemaName?: string;
  /** Pista textual cuando no se pasa schema (modo legacy). */
  schemaHint?: string;
}

export async function generateJSON<T = unknown>(
  opts: GroqJSONOptions
): Promise<T> {
  const model = pickModel(opts);
  const payload: GroqRequestPayload = {
    model,
    messages: buildMessages(opts),
    temperature: opts.temperature,
    stop: opts.stop,
    max_tokens: opts.maxTokens,
  };
  if (isReasoningModel(model)) {
    payload.reasoning_format = "hidden";
  }

  if (opts.jsonSchema) {
    payload.response_format = {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName || "response",
        schema: opts.jsonSchema,
        strict: true,
      },
    };
  } else {
    payload.response_format = { type: "json_object" };
  }

  const res = await callGroq(payload, opts.signal);
  const text = res.choices[0]?.message?.content ?? "";
  if (!text) {
    throw new AiUnavailableError("Groq returned empty JSON completion");
  }

  // Intenta extraer JSON robusto: a veces el modelo añade prefijo o
  // codeblock cuando NO usamos structured outputs.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) {
      throw new AiUnavailableError(
        `Groq returned non-JSON content: ${text.slice(0, 200)}`
      );
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      throw new AiUnavailableError(
        `Groq JSON parse failed: ${(err as Error).message}`
      );
    }
  }
  return parsed as T;
}

/**
 * streamText — chunked deltas. Mismo formato que anthropic.streamText.
 */
export function streamText(opts: AiChatOptions): ReadableStream<Uint8Array> {
  const model = pickModel(opts);
  const payload: GroqRequestPayload & { stream: true } = {
    model,
    messages: buildMessages(opts),
    temperature: opts.temperature,
    stop: opts.stop,
    max_tokens: opts.maxTokens,
    stream: true,
  };
  if (isReasoningModel(model)) {
    payload.reasoning_format = "hidden";
  }
  if (opts.format === "json") {
    payload.response_format = { type: "json_object" };
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!AI_CONFIG.groqApiKey) {
        controller.error(new AiUnavailableError("GROQ_API_KEY is not configured"));
        return;
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), AI_CONFIG.groqTimeoutMs);
      if (opts.signal) {
        opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
      }
      try {
        const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AI_CONFIG.groqApiKey}`,
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.text().catch(() => "");
          controller.error(
            new AiUnavailableError(
              `Groq stream HTTP ${res.status}: ${body.slice(0, 200)}`
            )
          );
          return;
        }
        const reader = res.body.getReader();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE: cada evento separado por "\n\n"
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const ev of events) {
            const line = ev.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const obj = JSON.parse(data);
              const delta = obj?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(
          err instanceof AiUnavailableError
            ? err
            : new AiUnavailableError((err as Error).message, err)
        );
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

export function isGroqEnabled(): boolean {
  return Boolean(AI_CONFIG.groqApiKey);
}
