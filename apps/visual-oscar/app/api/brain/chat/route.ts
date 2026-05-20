import { NextRequest, NextResponse } from 'next/server'
import { callBackend, fromBackend, backendConfigured } from '@/lib/backend'
import { generateText, generateWithTools, AI_CONFIG } from '@/lib/ai'
import { buildLiveContext } from '@/lib/ai/context-builder'
import { buildBrainSystemPrompt } from '@/lib/ai/system-prompts/politeia-brain'
import { BRAIN_TOOLS, executeTool } from '@/lib/ai/tools'
import { chooseTier, lastUserMessage } from '@/lib/ai/tier-router'
import { calculateCost } from '@/lib/ai/cost-calculator'

// POST /api/brain/chat
//
// Pasarela hacia el Brain. Estrategia jerárquica:
//   1. Si BACKEND_URL configurado y `use_tools=true` → `/api/brain/chat-with-tools`
//      del backend (Bloque P3 — tool-use con 8 herramientas reales: BOE, EUR-Lex,
//      AI Act, Congreso, actores).
//   2. Si BACKEND_URL configurado y sin tools → `/api/brain/chat`.
//   3. Anthropic Claude Haiku (si LLM_PROVIDER=anthropic + API key).
//   4. Ollama directo (si OLLAMA_URL configurado).
//   5. Si nada responde → `source: 'fallback'` con _meta.warnings.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90_000)

/**
 * Limpia XML residual de tool calls que Claude pueda haber "leaked" en
 * el texto visible. Esto pasa cuando el modelo (especialmente Haiku) decide
 * imprimir la invocación XML en vez de usar el formato nativo tool_use.
 * También filtra meta-comentarios tipo "Voy a buscar..." / "Déjame consultar..."
 * que el system prompt prohíbe pero a veces se cuelan.
 */
function stripToolXml(text: string): string {
  let cleaned = text
  // 1. Bloques completos <function_calls>...</function_calls>
  cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, "")
  // 2. Bloques <invoke>...</invoke> sueltos
  cleaned = cleaned.replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, "")
  // 3. Tags sueltas que puedan quedar (<parameter>, etc.)
  cleaned = cleaned.replace(/<\/?(?:function_calls|invoke|parameter)[^>]*>/gi, "")
  // 4. Meta-frases típicas del modelo ("Voy a buscar/llamar/consultar...")
  //    al inicio de la respuesta. Solo si aparecen en las primeras 2 líneas.
  const lines = cleaned.split("\n")
  while (lines.length > 0) {
    const first = lines[0].trim()
    if (!first) {
      lines.shift()
      continue
    }
    const metaPattern = /^(voy a (buscar|llamar|consultar|revisar|comprobar|verificar)|d[eé]jame (buscar|consultar|comprobar)|llamar[ée] a|consultar[ée]|comprobar[ée])\b/i
    if (metaPattern.test(first) && first.length < 120) {
      lines.shift()
    } else {
      break
    }
  }
  cleaned = lines.join("\n")
  // 5. Compactar líneas en blanco consecutivas (>2) a 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")
  return cleaned.trim()
}

// SYSTEM_PROMPT centralizado — refleja la guía editorial de Politeia.
// Cuando el backend nuevo `chat-with-tools` esté en producción, este prompt
// se mueve a `packages/prompts/src/system/politeia_brain.md` (versionado).
const SYSTEM_PROMPT = `Eres "Politeia", asistente de inteligencia política de Politeia Analítica.
Tu trabajo: ayudar a analistas a interpretar datos electorales, riesgo político,
contratación pública, fondos europeos y monitoreo legislativo en España.

Estilo:
- Conciso. Máx 3-4 párrafos cortos. Sin preámbulos.
- **Negrita** para cifras y conclusiones clave.
- \`código\` para rutas del dashboard (ej: \`/escenarios\`, \`/nowcasting\`).
- Castellano de España, registro profesional.
- Si no tienes una cifra concreta: "no tengo el dato exacto". NO inventes números.
- Cuando uses una herramienta, indica brevemente qué consultaste (BOE, Congreso, etc.).
- Si la pregunta está fuera de tu ámbito, redirige con amabilidad.

Cuando tengas tools disponibles, úsalas para obtener datos frescos en lugar
de responder de memoria. Cita las fuentes consultadas al final.`

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

interface ChatRequest {
  messages: Msg[]
  use_tools?: boolean
  workspace_id?: string
  session_id?: string
  tools?: string[]
}

interface BackendReply {
  answer?: string
  reply?: string
  content?: string
  model_used?: string
  tools_used?: string[]
  citations?: Array<{ source: string; url?: string; snippet?: string }>
  mode?: string
}

async function callOllama(messages: Msg[]): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        options: { temperature: 0.4, num_predict: 600 },
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { message?: { content?: string } }
    const content = data?.message?.content?.trim()
    return content && content.length > 0 ? content : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callBackendChat(
  messages: Msg[],
  options: { use_tools: boolean; workspace_id?: string; session_id?: string; tools?: string[] },
) {
  if (!backendConfigured()) return null
  const last = messages.filter(m => m.role === 'user').slice(-1)[0]
  const question = last?.content ?? ''
  const history = messages.slice(0, -1) // todo menos el último user msg

  const endpoint = options.use_tools ? '/api/brain/chat-with-tools' : '/api/brain/chat'
  const result = await callBackend<BackendReply>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      question,
      history,
      context: '',
      workspace_id: options.workspace_id,
      session_id: options.session_id,
      use_tools: options.use_tools,
      tools: options.tools,
    }),
  })
  if (!result.data) return { error: result.error, latency_ms: result.latency_ms }
  return {
    reply: result.data.answer || result.data.reply || result.data.content || '',
    model: result.data.model_used || 'backend-llm',
    tools_used: result.data.tools_used || [],
    citations: result.data.citations || [],
    mode: result.data.mode || 'live',
    latency_ms: result.latency_ms,
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  let body: ChatRequest
  try {
    body = (await req.json()) as ChatRequest
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const messages = Array.isArray(body?.messages) ? body.messages : []
  if (messages.length === 0) {
    return NextResponse.json({ error: 'messages vacío' }, { status: 400 })
  }
  const clean: Msg[] = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-20)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
      content: m.content.slice(0, 4000),
    }))

  // ── Detector: el backend a veces responde con un mensaje mock interno
  // (cuando él mismo no tiene un LLM real). En ese caso preferimos
  // saltar al siguiente fallback (Anthropic) en vez de mostrarlo al usuario.
  const isBackendMockReply = (reply: string): boolean => {
    const r = reply.toLowerCase()
    return (
      r.includes('modo demo') ||
      r.includes('ollama ejecutándose') ||
      r.includes('ollama ejecutandose') ||
      r.includes('politeia-brain:latest') ||
      r.includes('temporalmente en modo')
    )
  }

  // 1. Anthropic Claude (Haiku · tool use loop) — PRIORIDAD MÁXIMA
  //    cuando LLM_PROVIDER=anthropic. Inyecta contexto vivo del dashboard
  //    + define tools que Claude puede llamar para profundizar.
  if (AI_CONFIG.provider === 'anthropic') {
    try {
      const liveContext = await buildLiveContext()
      const systemPrompt = buildBrainSystemPrompt(liveContext)

      // Auto-router: decide Sonnet (premium) o Haiku (fast) según la
      // complejidad de la última pregunta del usuario. Reduce coste 60%
      // en preguntas simples sin sacrificar calidad en las complejas.
      const tier = chooseTier(lastUserMessage(clean))

      const result = await generateWithTools({
        tier,
        system: systemPrompt,
        messages: clean.map(m => ({
          role: m.role === 'system' ? 'system' : m.role,
          content: m.content,
        })),
        temperature: 0.3,
        maxTokens: tier === 'premium' ? 2000 : 1500,
        tools: BRAIN_TOOLS,
        executor: executeTool,
        maxIterations: 4,
      })
      if (result.text) {
        const cost = calculateCost(result.model, result.usage)

        // Detectar si Claude usó el fallback de conocimiento general
        // (marcador "GENERAL::" al inicio de la respuesta). Regex permisivo:
        // detecta el marcador en las primeras líneas y limpia hasta el
        // primer doble \n.
        const trimmedText = result.text.trimStart()
        const fromGeneralKnowledge = /^GENERAL::/i.test(trimmedText)
        let cleanedReply = result.text
        if (fromGeneralKnowledge) {
          // Quita la primera línea (marcador) + posibles líneas en blanco
          // hasta llegar al contenido real
          cleanedReply = trimmedText
            .replace(/^GENERAL::[^\n]*\n+/i, "")
            .trim()
        }
        // Post-process: stripear XML de tool calls que Claude pueda haber
        // "leaked" en el texto visible (bug ocasional del modelo, sobre
        // todo Haiku). El system prompt lo prohíbe pero hacemos defensa.
        cleanedReply = stripToolXml(cleanedReply)

        return NextResponse.json({
          reply: cleanedReply,
          source: 'anthropic',
          model: result.model,
          tier,
          from_general_knowledge: fromGeneralKnowledge,
          tools_used: result.toolsUsed.map(t => ({
            name: t.name,
            input: t.input,
            ms: t.ms,
          })),
          citations: [],
          iterations: result.iterations,
          usage: result.usage,
          cost: { usd: cost.usd, cents: cost.cents, breakdown: cost.breakdown },
          ms: Date.now() - started,
          _meta: { source: 'anthropic', ts: new Date().toISOString() },
        })
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      // eslint-disable-next-line no-console
      console.warn('[brain/chat] anthropic failed:', err)
      // Fallback simple sin tools si tool use falla
      try {
        const reply = await generateText({
          tier: 'fast',
          system: buildBrainSystemPrompt(await buildLiveContext()),
          messages: clean.map(m => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content,
          })),
          temperature: 0.4,
          maxTokens: 1024,
        })
        if (reply) {
          // También detectar marcador GENERAL:: en el fallback
          const trimmedFb = reply.trimStart()
          const fbGeneral = /^GENERAL::/i.test(trimmedFb)
          let cleanedFb = fbGeneral
            ? trimmedFb.replace(/^GENERAL::[^\n]*\n+/i, "").trim()
            : reply
          cleanedFb = stripToolXml(cleanedFb)
          return NextResponse.json({
            reply: cleanedFb,
            source: 'anthropic',
            model: AI_CONFIG.anthropicFastModel,
            tier: 'fast',
            from_general_knowledge: fbGeneral,
            tools_used: [],
            citations: [],
            ms: Date.now() - started,
            _meta: { source: 'anthropic', ts: new Date().toISOString(), fallback: 'no_tools' },
          })
        }
      } catch (e2) {
        // eslint-disable-next-line no-console
        console.warn('[brain/chat] anthropic fallback also failed:', (e2 as Error).message)
      }
    }
  }

  // 2. Backend (con tools si se pidió). Solo si Anthropic falló o no está.
  //    Si el backend responde con un mensaje mock interno, lo descartamos.
  const useTools = body.use_tools ?? (process.env.BRAIN_USE_TOOLS === '1')
  const fromB = await callBackendChat(clean, {
    use_tools: useTools,
    workspace_id: body.workspace_id,
    session_id: body.session_id,
    tools: body.tools,
  })
  if (fromB && 'reply' in fromB && fromB.reply && !isBackendMockReply(fromB.reply)) {
    return NextResponse.json({
      reply: fromB.reply,
      source: 'backend',
      model: fromB.model,
      tools_used: fromB.tools_used,
      citations: fromB.citations,
      ms: Date.now() - started,
      _meta: {
        source: 'backend',
        ts: new Date().toISOString(),
        latency_ms: fromB.latency_ms,
      },
    })
  }
  const backendWarning = fromB && 'error' in fromB && fromB.error
    ? fromB.error
    : (fromB && 'reply' in fromB && fromB.reply && isBackendMockReply(fromB.reply))
      ? 'backend_in_demo_mode'
      : null

  // 3. Ollama directo
  const fromO = await callOllama(clean)
  if (fromO) {
    return NextResponse.json({
      reply: fromO,
      source: 'ollama',
      model: OLLAMA_MODEL,
      tools_used: [],
      citations: [],
      ms: Date.now() - started,
      _meta: {
        source: 'backend',  // Ollama directo cuenta como "datos frescos del LLM"
        ts: new Date().toISOString(),
        warnings: backendWarning ? [`backend_unavailable:${backendWarning}`] : undefined,
      },
    })
  }

  // 3. Fallback
  return NextResponse.json({
    reply: '',
    source: 'fallback',
    model: 'none',
    tools_used: [],
    citations: [],
    ms: Date.now() - started,
    _meta: {
      source: 'fallback',
      ts: new Date().toISOString(),
      warnings: [
        backendWarning ? `backend_unavailable:${backendWarning}` : 'backend_no_reply',
 'ollama_unreachable',
      ],
    },
  })
}

// GET /api/brain/chat → diagnóstico
export async function GET() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  let ollamaUp = false
  let availableModels: string[] = []
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal })
    if (r.ok) {
      ollamaUp = true
      const j = (await r.json()) as { models?: { name: string }[] }
      availableModels = (j.models || []).map(m => m.name)
    }
  } catch { /* noop */ }
  clearTimeout(timer)

  // Estado del backend brain (tools)
  let backendStatus: unknown = null
  if (backendConfigured()) {
    try {
      backendStatus = await fromBackend('/api/brain/status')
    } catch { backendStatus = null }
  }

  return NextResponse.json({
    ollama: {
      url: OLLAMA_URL,
      reachable: ollamaUp,
      configured_model: OLLAMA_MODEL,
      model_loaded: availableModels.includes(OLLAMA_MODEL),
      available_models: availableModels,
    },
    backend: {
      configured: backendConfigured(),
      brain_status: backendStatus,
    },
    ts: new Date().toISOString(),
  })
}
