/**
 * Minimal HTTP client for Ollama (https://github.com/ollama/ollama/blob/main/docs/api.md).
 *
 * Exposes three helpers tuned for our route handlers:
 *  - generateText  → single shot text completion (chat endpoint)
 *  - streamText    → ReadableStream<Uint8Array> with plain UTF-8 deltas (for `res.body`-based clients)
 *  - generateJSON  → structured output using Ollama's `format: "json"` parameter
 *
 * All helpers throw `OllamaUnavailableError` if `OLLAMA_URL` is missing or the
 * upstream call fails, so callers can fall back to deterministic mocks.
 */

import { AI_CONFIG, isAiEnabled } from "./ai-config";

export type OllamaRole = "system" | "user" | "assistant";

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  system?: string;
  messages: OllamaMessage[];
  temperature?: number;
  /** Stop tokens (passed to Ollama `options.stop`). */
  stop?: string[];
  /** Max tokens to predict (Ollama `options.num_predict`). */
  maxTokens?: number;
  /** When set, asks Ollama for JSON-only output. */
  format?: "json";
  signal?: AbortSignal;
}

export class OllamaUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

function buildBody(opts: OllamaChatOptions, stream: boolean) {
  const messages: OllamaMessage[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  for (const m of opts.messages) messages.push(m);

  return {
    model: opts.model || AI_CONFIG.defaultModel,
    messages,
    stream,
    format: opts.format,
    options: {
      temperature: opts.temperature ?? 0.3,
      num_predict: opts.maxTokens ?? 1024,
      stop: opts.stop,
    },
  };
}

async function postChat(body: unknown, signal?: AbortSignal): Promise<Response> {
  if (!isAiEnabled()) {
    throw new OllamaUnavailableError("OLLAMA_URL is not configured");
  }

  const url = `${AI_CONFIG.ollamaUrl}/api/chat`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), AI_CONFIG.timeoutMs);
  const composed = mergeAbort(signal, ctrl.signal);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: composed,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OllamaUnavailableError(`Ollama responded ${res.status}: ${text.slice(0, 200)}`);
    }
    return res;
  } catch (err) {
    if (err instanceof OllamaUnavailableError) throw err;
    throw new OllamaUnavailableError("Ollama fetch failed", err);
  } finally {
    clearTimeout(t);
  }
}

function mergeAbort(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (a.aborted || b.aborted) ctrl.abort();
  else {
    a.addEventListener("abort", onAbort, { once: true });
    b.addEventListener("abort", onAbort, { once: true });
  }
  return ctrl.signal;
}

/**
 * Single-shot text completion. Returns concatenated content.
 */
export async function generateText(opts: OllamaChatOptions): Promise<string> {
  const res = await postChat(buildBody(opts, false), opts.signal);
  const json: any = await res.json();
  return (json?.message?.content ?? "").toString();
}

/**
 * Streamed text completion. Each NDJSON chunk from Ollama is decoded and
 * pushed as a plain UTF-8 delta — compatible with the existing
 * `useResearchSynthesis` reader that concatenates the body.
 */
export function streamText(opts: OllamaChatOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await postChat(buildBody(opts, true), opts.signal);
        if (!res.body) throw new OllamaUnavailableError("Ollama stream has no body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              const delta: string = obj?.message?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
              if (obj?.done) {
                controller.close();
                return;
              }
            } catch {
              // skip malformed lines
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}

/**
 * Structured output. Ollama's `format: "json"` constrains the model to emit
 * a JSON value. We parse it and return the typed object — callers should
 * validate against a Zod schema before trusting the data.
 */
export async function generateJSON<T = unknown>(
  opts: Omit<OllamaChatOptions, "format"> & { schemaHint?: string }
): Promise<T> {
  const sys = [opts.system, opts.schemaHint]
    .filter(Boolean)
    .join("\n\n");
  const raw = await generateText({
    ...opts,
    system: sys || undefined,
    format: "json",
    temperature: opts.temperature ?? 0.2,
  });
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new OllamaUnavailableError("Ollama returned non-JSON payload", err);
  }
}

/**
 * Helper: wrap an async fn so the caller gets either the result or a
 * deterministic fallback when AI is disabled or fails. Keeps route handlers
 * tidy.
 */
export async function withAiFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (!isAiEnabled()) return await fallback();
  try {
    return await primary();
  } catch {
    return await fallback();
  }
}
