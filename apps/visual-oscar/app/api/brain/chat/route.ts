import { NextRequest, NextResponse } from 'next/server'
import { callBackend, fromBackend, backendConfigured } from '@/lib/backend'

// POST /api/brain/chat
//
// Pasarela hacia el Brain. Estrategia jerárquica:
//   1. Si BACKEND_URL configurado y `use_tools=true` → `/api/brain/chat-with-tools`
//      del backend (Bloque P3 — tool-use con 8 herramientas reales: BOE, EUR-Lex,
//      AI Act, Congreso, actores).
//   2. Si BACKEND_URL configurado y sin tools → `/api/brain/chat`.
//   3. Si backend no responde → Ollama directo (OLLAMA_URL).
//   4. Si nada responde → `source: 'fallback'` con _meta.warnings.

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

  // 1. Backend (con tools si se pidió o si está habilitado por env)
  const useTools = body.use_tools ?? (process.env.BRAIN_USE_TOOLS === '1')
  const fromB = await callBackendChat(clean, {
    use_tools: useTools,
    workspace_id: body.workspace_id,
    session_id: body.session_id,
    tools: body.tools,
  })
  if (fromB && 'reply' in fromB && fromB.reply) {
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
  const backendWarning = fromB && 'error' in fromB && fromB.error ? fromB.error : null

  // 2. Ollama directo
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
