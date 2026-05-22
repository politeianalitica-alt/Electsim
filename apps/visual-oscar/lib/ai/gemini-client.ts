/**
 * Cliente Google Gemini (Generative Language API · v1beta).
 *
 * Sprint M D2 (2026-05-22): añadido como provider primario tras el bug
 * Groq json_schema y los límites del tier free de Groq. Gemini Flash Lite
 * tiene cuota generosa y soporta structured output nativo.
 *
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Auth: query param `?key={GEMINI_API_KEY}` (sólo server, NUNCA cliente).
 *
 * Modelo default: gemini-2.0-flash-lite (más barato/estable, cuota alta).
 * Override vía env var GEMINI_MODEL.
 *
 * API pública idéntica a anthropic-client + groq-client para drop-in
 * compatibility:
 *   - generateText(opts) → Promise<string>
 *   - generateJSON<T>(opts) → Promise<T>   (usa responseSchema strict)
 *
 * No soporta `reasoning_format` ni `stop` (Gemini ignora silenciosamente).
 */
import { AI_CONFIG } from "./ai-config";
import {
  AiUnavailableError,
  type AiChatOptions,
  type AiMessage,
} from "./anthropic-client";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ─── Conversión schema OpenAI → Gemini ──────────────────────────────────
//
// Gemini structured output usa un subset de JSON Schema. Diferencias clave:
//  - NO acepta `additionalProperties`, `oneOf`, `not`, `$ref`, `pattern`
//  - SÍ acepta `type`, `properties`, `required`, `items`, `enum`,
//    `description`, `minItems`, `maxItems`, `minimum`, `maximum`
//  - El campo `type` debe ser STRING uppercase: "OBJECT", "ARRAY", "STRING",
//    "NUMBER", "INTEGER", "BOOLEAN"
//
// Esta función traduce el schema OpenAI a Gemini in-place.

function geminiizeSchema(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(geminiizeSchema);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    // Drop unsupported keys
    if (
      k === "additionalProperties" ||
      k === "$schema" ||
      k === "$ref" ||
      k === "pattern" ||
      k === "patternProperties" ||
      k === "oneOf" ||
      k === "anyOf" ||
      k === "allOf" ||
      k === "not"
    ) {
      continue;
    }
    if (k === "type" && typeof v === "string") {
      out.type = v.toUpperCase();
    } else if (k === "properties" || k === "items") {
      out[k] = geminiizeSchema(v);
    } else {
      out[k] = geminiizeSchema(v);
    }
  }
  return out;
}

// ─── Conversión mensajes ────────────────────────────────────────────────
//
// OpenAI/Anthropic style: [{ role: 'system'|'user'|'assistant', content }]
// Gemini style: contents=[{ role: 'user'|'model', parts: [{text}] }]
//                + systemInstruction = { parts: [{text}] }
//
// `system` se separa en systemInstruction. assistant→model. user→user.

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

function buildGeminiMessages(opts: AiChatOptions): {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
} {
  const messages: AiMessage[] = opts.messages || [];
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];
  if (opts.system) systemTexts.push(opts.system);
  for (const m of messages) {
    if (m.role === "system") {
      systemTexts.push(m.content);
    } else if (m.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    } else {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    }
  }
  return {
    contents,
    systemInstruction: systemTexts.length
      ? { parts: [{ text: systemTexts.join("\n\n") }] }
      : undefined,
  };
}

function pickModel(opts: AiChatOptions): string {
  if (opts.model) return opts.model;
  const tier = opts.tier ?? "premium";
  return tier === "fast"
    ? AI_CONFIG.geminiFastModel
    : AI_CONFIG.geminiReasoningModel;
}

// ─── Core fetch ─────────────────────────────────────────────────────────

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }>; role?: string };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { code?: number; message?: string; status?: string };
}

async function callGemini(
  model: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<GeminiResponse> {
  if (!AI_CONFIG.geminiApiKey) {
    throw new AiUnavailableError("GEMINI_API_KEY is not configured");
  }
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${AI_CONFIG.geminiApiKey}`;

  // Retry 1x en 429/5xx con backoff fijo 600ms
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AI_CONFIG.geminiTimeoutMs);
    if (signal) {
      signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        const body = await res.text().catch(() => "");
        lastErr = new AiUnavailableError(
          `Gemini HTTP ${res.status}: ${body.slice(0, 200)}`
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
          `Gemini HTTP ${res.status}: ${body.slice(0, 300)}`
        );
      }

      const json = (await res.json()) as GeminiResponse;
      if (json.error) {
        throw new AiUnavailableError(
          `Gemini error: ${json.error.message || json.error.status || "unknown"}`
        );
      }
      if (json.usageMetadata) {
        // eslint-disable-next-line no-console
        console.log(
          `[gemini] model=${model} in=${json.usageMetadata.promptTokenCount ?? "?"} out=${json.usageMetadata.candidatesTokenCount ?? "?"} total=${json.usageMetadata.totalTokenCount ?? "?"}`
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
        `Gemini request failed: ${(err as Error).message}`,
        err
      );
    }
  }
  throw lastErr instanceof Error
    ? new AiUnavailableError(lastErr.message, lastErr)
    : new AiUnavailableError("Gemini request failed (unknown)");
}

function extractText(res: GeminiResponse): string {
  const cand = res.candidates?.[0];
  if (!cand) throw new AiUnavailableError("Gemini returned no candidates");
  const parts = cand.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("");
  if (!text) throw new AiUnavailableError("Gemini returned empty text");
  return text;
}

// ─── API pública ────────────────────────────────────────────────────────

export async function generateText(opts: AiChatOptions): Promise<string> {
  const model = pickModel(opts);
  const { contents, systemInstruction } = buildGeminiMessages(opts);
  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 1024,
    },
  };
  if (systemInstruction) payload.systemInstruction = systemInstruction;
  const res = await callGemini(model, payload, opts.signal);
  return extractText(res);
}

interface GeminiJSONOptions
  extends Omit<AiChatOptions, "format"> {
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  schemaHint?: string;
}

export async function generateJSON<T = unknown>(
  opts: GeminiJSONOptions
): Promise<T> {
  const model = pickModel(opts);
  const { contents, systemInstruction } = buildGeminiMessages(opts);
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: opts.maxTokens ?? 2048,
    responseMimeType: "application/json",
  };
  if (opts.jsonSchema) {
    generationConfig.responseSchema = geminiizeSchema(opts.jsonSchema);
  }
  const payload: Record<string, unknown> = {
    contents,
    generationConfig,
  };
  if (systemInstruction) payload.systemInstruction = systemInstruction;

  const res = await callGemini(model, payload, opts.signal);
  const text = extractText(res);

  // Gemini con responseMimeType=application/json devuelve JSON puro,
  // pero por robustez intentamos extraer si viene envuelto.
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) {
      throw new AiUnavailableError(
        `Gemini returned non-JSON content: ${text.slice(0, 200)}`
      );
    }
    try {
      return JSON.parse(match[0]) as T;
    } catch (err) {
      throw new AiUnavailableError(
        `Gemini JSON parse failed: ${(err as Error).message}`
      );
    }
  }
}

// Stub streamText para parity (no implementado; los call sites macro/ai/*
// no lo usan, sólo generateJSON).
export function streamText(_opts: AiChatOptions): ReadableStream<Uint8Array> {
  throw new AiUnavailableError(
    "Gemini streamText not implemented in this client"
  );
}
