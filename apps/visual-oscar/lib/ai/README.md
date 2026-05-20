# Capa de IA · Politeia Analítica

Cliente unificado multi-provider para todas las funciones de IA del
dashboard. Las rutas API importan **siempre** de `@/lib/ai` (nunca
directamente de `anthropic-client.ts` u `ollama-client.ts`) para que el
provider sea intercambiable vía env var.

## Arquitectura

```
                      ┌─────────────────┐
   route.ts  ───────► │  lib/ai/index   │ ───► routing por LLM_PROVIDER
                      └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ anthropic-client │            │  ollama-client   │
    │  (Claude 4.5)    │            │  (self-hosted)   │
    └──────────────────┘            └──────────────────┘
```

## Funciones expuestas (firma idéntica en ambos providers)

```ts
import { generateText, generateJSON, streamText, withAiFallback } from "@/lib/ai";

// 1) Texto plano (sin streaming)
const txt = await generateText({
  tier: "premium",                // 'premium' = Sonnet, 'fast' = Haiku
  system: "Eres un analista...",
  messages: [{ role: "user", content: "..." }],
  temperature: 0.3,
  maxTokens: 1024,
});

// 2) Streaming (devuelve ReadableStream<Uint8Array> con deltas UTF-8)
const stream = streamText({ tier: "fast", messages: [...] });
return new Response(stream, { headers: { "Content-Type": "text/plain" } });

// 3) JSON estructurado (parsea + lanza si no es JSON válido)
const obj = await generateJSON<MyType>({
  system: "...",
  schemaHint: SCHEMA_HINT,
  messages: [...],
});

// 4) Mock fallback automático (si no hay AI configurada o falla)
const result = await withAiFallback(
  () => generateText({ ... }),     // primario
  () => "[respuesta mock]",         // fallback
);
```

## Selección de tier

| Tarea típica | Tier | Modelo Anthropic | Coste in/out |
|---|---|---|---:|
| Chat alto volumen, clasificación, sentimiento | `fast` | Claude Haiku 4.5 | $1 / $5 |
| Briefings, research, JSON estructurado | `premium` | Claude Sonnet 4.5 | $3 / $15 |

Rutas que ya usan `tier: 'fast'`:
- `/api/brain/chat` (fallback Anthropic en cadena)
- `/api/brain/chat-stream` (fallback Anthropic en cadena)

Rutas que usan `premium` por defecto:
- `/api/research/synthesize`
- `/api/workspace/executive-summary`
- `/api/workspace/slides`
- `/api/workspace/simulator`
- `/api/workspace/radar`

## Variables de entorno

### Para Anthropic (producción · recomendado)

```bash
# Obligatorio
ANTHROPIC_API_KEY=sk-ant-...              # https://console.anthropic.com/settings/keys

# Opcionales (con defaults sensatos)
LLM_PROVIDER=anthropic                    # auto-detect si hay API key, pero mejor explícito
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929   # default premium
ANTHROPIC_FAST_MODEL=claude-haiku-4-5-20251001  # default fast
ANTHROPIC_TIMEOUT_MS=90000                # default 90s
```

### Para Ollama (desarrollo local · fallback)

```bash
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_FAST_MODEL=llama3.2:3b
OLLAMA_TIMEOUT_MS=90000
```

### Auto-detección

Si `LLM_PROVIDER` no está set:
1. Si hay `ANTHROPIC_API_KEY` → usa Anthropic
2. Si no, hay `OLLAMA_URL` → usa Ollama
3. Si ninguno → mock determinista (vía `withAiFallback`)

## Optimizaciones activadas

### 1) Prompt caching (Anthropic)
System prompts > 4000 chars se marcan automáticamente con
`cache_control: { type: "ephemeral" }`. Esto reduce el coste del input
~90% en las siguientes 5 minutos (TTL del caché).

Caso típico: el system prompt de briefings ejecutivos es repetitivo
(mismo prompt para los 5 briefings del día) → caché reduce coste
input de ese system de $0.018 a $0.0018 por llamada.

### 2) Logging de tokens
Cada llamada loguea en `console.log` (visible en Vercel logs):
```
[ai] generateText · claude-sonnet-4-5-20250929 · in=1240 out=512 cache_read=890 · total=2642
```
Útil para auditar coste real sin entrar al dashboard de Anthropic.

### 3) Prefill JSON
`generateJSON` inyecta un `assistant: "{"` como último mensaje para que
el modelo empiece directamente con JSON válido (no markdown, no comillas).

## Monitorización

- **Coste real**: https://console.anthropic.com/settings/usage
- **Hard cap mensual**: https://console.anthropic.com/settings/limits
- **Recomendado**: cap inicial $40/mes con alerta a $20

## Cambiar de provider

Sin tocar código, solo cambiando env vars en Vercel:
```bash
# Anthropic → Ollama (rollback)
LLM_PROVIDER=ollama
# (necesitas tener OLLAMA_URL apuntando a una instancia accesible desde Vercel)

# Ollama → Anthropic (default)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Redespliega Vercel (Settings → Deployments → Redeploy) y todas las
funciones de IA cambian de provider automáticamente.
