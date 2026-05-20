/**
 * Anthropic Claude client — mirror exacto de la API expuesta por
 * `ollama-client.ts` para que el resto del código no se entere de qué
 * provider hay debajo.
 *
 * Helpers:
 *  - generateText  → completion única (no streaming)
 *  - streamText    → ReadableStream<Uint8Array> con deltas UTF-8
 *  - generateJSON  → output JSON validable contra Zod en el caller
 *
 * Lanza `AiUnavailableError` si `ANTHROPIC_API_KEY` no está configurada o
 * la llamada upstream falla — así los callers caen al mock determinista
 * (vía `withAiFallback`) sin romper el dashboard.
 *
 * Optimizaciones:
 *  - Prompt caching automático: cualquier `system` prompt > 1024 tokens
 *    se marca con `cache_control: { type: "ephemeral" }`, reduciendo
 *    el coste de input hasta un 90% en llamadas repetidas (5min TTL).
 *  - Selección de modelo por "tier" para que las rutas de high-volume
 *    (chat) usen Haiku y las de high-quality (briefings, JSON) usen Sonnet.
 *  - Logging de tokens consumidos en cada llamada (console.log) para
 *    medir coste real en producción.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "./ai-config";

// ─── Tipos compatibles con OllamaChatOptions ────────────────────────────

export type AiRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export type AiTier = "premium" | "fast";

export interface AiChatOptions {
  /** Si se pasa, override directo del nombre del modelo. */
  model?: string;
  /** Atajo: 'premium' = Sonnet, 'fast' = Haiku. Default 'premium'. */
  tier?: AiTier;
  /** System prompt. Se cachea automáticamente si supera ~1K tokens. */
  system?: string;
  messages: AiMessage[];
  temperature?: number;
  /** Stop tokens. */
  stop?: string[];
  /** Max tokens en la respuesta. */
  maxTokens?: number;
  /** Si true, pide JSON-only output al modelo. */
  format?: "json";
  signal?: AbortSignal;
}

export class AiUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

// ─── Cliente singleton ──────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!AI_CONFIG.anthropicApiKey) {
    throw new AiUnavailableError("ANTHROPIC_API_KEY is not configured");
  }
  if (!_client) {
    _client = new Anthropic({
      apiKey: AI_CONFIG.anthropicApiKey,
      timeout: AI_CONFIG.timeoutMs,
    });
  }
  return _client;
}

function pickModel(opts: AiChatOptions): string {
  if (opts.model) return opts.model;
  const tier = opts.tier ?? "premium";
  return tier === "fast" ? AI_CONFIG.anthropicFastModel : AI_CONFIG.anthropicModel;
}

// ─── Helper: construir mensajes para la API Anthropic ──────────────────
//
// Claude no acepta `role: "system"` en messages — el system prompt va
// como parámetro top-level. Filtramos.

interface BuiltRequest {
  system: Anthropic.Messages.TextBlockParam[] | string | undefined;
  messages: Anthropic.Messages.MessageParam[];
}

function buildRequest(opts: AiChatOptions): BuiltRequest {
  const userMessages: Anthropic.Messages.MessageParam[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // System prompt con caching si es lo suficientemente largo. Anthropic
  // cobra solo 1.25× la primera vez por tokens cacheados pero 0.10× en
  // todas las siguientes llamadas (TTL 5min).
  const systemText = opts.system?.trim() ?? "";
  let system: BuiltRequest["system"];
  if (!systemText) {
    system = undefined;
  } else if (systemText.length > 4000) {
    // Heurística: ~1 token = 4 chars en español. >1024 tokens vale la
    // pena cachear (rompe-en-empate del 90% de descuento).
    system = [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ];
  } else {
    system = systemText;
  }

  return { system, messages: userMessages };
}

// ─── Wrapping de errores con código HTTP/status preservado ────────────
//
// Anthropic SDK lanza errores tipados (APIError, RateLimitError,
// AuthenticationError, etc.) con `status`, `error.type` y `message`.
// Los envolvemos en AiUnavailableError pero preservamos el detalle para
// que sea visible en Vercel logs y útil para debug.

function wrapError(context: string, err: unknown): AiUnavailableError {
  if (err instanceof AiUnavailableError) return err;
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? "?";
    const type = (err.error as { error?: { type?: string } })?.error?.type ?? "unknown";
    return new AiUnavailableError(
      `Anthropic ${context} failed [${status} ${type}]: ${err.message}`,
      err
    );
  }
  return new AiUnavailableError(
    `Anthropic ${context} failed: ${(err as Error).message}`,
    err
  );
}

// ─── Logging de tokens para visibilidad de coste real ──────────────────

function logUsage(
  model: string,
  usage: Anthropic.Messages.Usage | undefined,
  context: string
): void {
  if (!usage) return;
  // Anthropic pricing model:
  //   - input_tokens                 → full price (1.00x)
  //   - cache_creation_input_tokens  → 1.25x price (escritura al caché)
  //   - cache_read_input_tokens      → 0.10x price (lectura del caché)
  //   - output_tokens                → output price
  // Total real "tokens leídos" como input = in + cache_read + cache_write.
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const totalInput = input + cacheRead + cacheWrite;
  // eslint-disable-next-line no-console
  console.log(
    `[ai] ${context} · ${model} · in_billed=${input}${
      cacheRead ? ` cache_hit=${cacheRead}` : ""
    }${cacheWrite ? ` cache_write=${cacheWrite}` : ""} · in_total=${totalInput} · out=${output}`
  );
}

// ─── generateText ───────────────────────────────────────────────────────

export async function generateText(opts: AiChatOptions): Promise<string> {
  const client = getClient();
  const model = pickModel(opts);
  const { system, messages } = buildRequest(opts);

  try {
    const res = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.3,
      system,
      messages,
      stop_sequences: opts.stop,
    }, { signal: opts.signal });

    logUsage(model, res.usage, "generateText");

    // Concatenar bloques de texto de la respuesta (Claude puede devolver
    // varios bloques: texto, tool_use, etc. — aquí solo nos interesa text).
    const text = res.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return text;
  } catch (err) {
    throw wrapError("generateText", err);
  }
}

// ─── streamText ─────────────────────────────────────────────────────────
//
// Devuelve ReadableStream<Uint8Array> con deltas UTF-8 planos, compatible
// con `useResearchSynthesis` y resto de hooks que concatenan `res.body`.

export function streamText(opts: AiChatOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;
  // Referencia al stream activo para poder abortarlo si el caller cancela.
  let activeStream: ReturnType<Anthropic["messages"]["stream"]> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const client = getClient();
        const model = pickModel(opts);
        const { system, messages } = buildRequest(opts);

        activeStream = client.messages.stream({
          model,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
          system,
          messages,
          stop_sequences: opts.stop,
        }, { signal: opts.signal });

        for await (const event of activeStream) {
          if (cancelled) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        }

        // Log final usage solo si el stream se completó naturalmente.
        // Si fue cancelado, `finalMessage()` puede no estar listo y
        // bloquearía el cierre del controller.
        if (!cancelled) {
          try {
            const finalMessage = await activeStream.finalMessage();
            logUsage(model, finalMessage.usage, "streamText");
          } catch {
            // Si falla el finalMessage (ya consumido, abortado, etc.)
            // no es crítico — el contenido ya se entregó al cliente.
          }
        }
        controller.close();
      } catch (err) {
        controller.error(
          err instanceof AiUnavailableError
            ? err
            : wrapError("streamText", err)
        );
      }
    },
    cancel() {
      cancelled = true;
      // Abortar la conexión upstream para liberar la cuota de Anthropic
      // inmediatamente cuando el cliente desconecta.
      activeStream?.abort();
    },
  });
}

// ─── generateJSON ───────────────────────────────────────────────────────
//
// Anthropic no tiene `format: "json"` nativo como Ollama, pero la forma
// estándar de forzar JSON estricto es:
//   1) System prompt explícito + schemaHint
//   2) Prefill: empezar el assistant con "{" para que el modelo continúe
//   3) Stop sequence en cierre del JSON (opcional)
//
// Si el modelo devuelve no-JSON, lanzamos AiUnavailableError para que el
// caller caiga al mock.

export async function generateJSON<T = unknown>(
  opts: Omit<AiChatOptions, "format"> & { schemaHint?: string }
): Promise<T> {
  const sysParts: string[] = [];
  if (opts.system) sysParts.push(opts.system);
  if (opts.schemaHint) sysParts.push(opts.schemaHint);
  sysParts.push(
    "Devuelve ÚNICAMENTE un JSON válido sin texto adicional, sin markdown, sin ```. Empieza directamente con { y termina con }."
  );

  // Prefill trick: el assistant arranca con "{" para que el modelo continúe
  // generando JSON. Anthropic lo soporta nativamente.
  const messagesWithPrefill: AiMessage[] = [
    ...opts.messages,
    { role: "assistant", content: "{" },
  ];

  const raw = await generateText({
    ...opts,
    system: sysParts.join("\n\n"),
    messages: messagesWithPrefill,
    temperature: opts.temperature ?? 0.2,
  });

  // Concatenar el "{" del prefill al inicio
  const jsonText = "{" + raw;

  try {
    return JSON.parse(jsonText) as T;
  } catch (err) {
    throw new AiUnavailableError(
      `Anthropic returned non-JSON payload: ${jsonText.slice(0, 200)}`,
      err
    );
  }
}
