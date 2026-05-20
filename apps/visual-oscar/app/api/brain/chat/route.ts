import { NextRequest, NextResponse } from 'next/server'
import { callBackend, fromBackend, backendConfigured } from '@/lib/backend'
import { generateText, generateWithTools, AI_CONFIG } from '@/lib/ai'
import { buildLiveContext } from '@/lib/ai/context-builder'
import { buildBrainSystemPrompt } from '@/lib/ai/system-prompts/politeia-brain'
import { BRAIN_TOOLS, WEB_SEARCH_TOOL, executeTool } from '@/lib/ai/tools'
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
        // BRAIN_TOOLS = nuestras 13 tools custom (BOE, actores, polls...)
        // + WEB_SEARCH_TOOL = server tool de Anthropic (búsqueda web nativa).
        // Web search se usa solo si las custom no devuelven datos y Claude
        // detecta que necesita info fresca de internet.
        tools: [...BRAIN_TOOLS, WEB_SEARCH_TOOL],
        executor: executeTool,
        maxIterations: 4,
      })
      if (result.text) {
        const cost = calculateCost(result.model, result.usage)

        // Detectar si Claude usó el fallback de conocimiento general
        // (marcador "GENERAL::" al inicio de la respuesta)
        const GENERAL_MARKER = /^GENERAL::\s*respuesta basada en conocimiento general[^\n]*\n+/i
        const fromGeneralKnowledge = GENERAL_MARKER.test(result.text)
        const cleanedReply = fromGeneralKnowledge
          ? result.text.replace(GENERAL_MARKER, "").trim()
          : result.text

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
          return NextResponse.json({
            reply,
            source: 'anthropic',
            model: AI_CONFIG.anthropicFastModel,
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
