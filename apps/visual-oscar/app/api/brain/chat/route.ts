import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, backendConfigured } from '@/lib/backend'

// POST /api/brain/chat
//
// Pasarela hacia el LLM:
//   1. Si BACKEND_URL está configurada, intenta /api/brain/chat del FastAPI
//   2. Si no, intenta Ollama directamente (OLLAMA_URL · default localhost:11434)
//   3. Si nada responde, devuelve `source: 'fallback'` y el cliente muestra
//      una respuesta canned con la lógica de palabras-clave existente.
//
// Body esperado:
//   { messages: [{ role: 'user'|'assistant', content: string }] }
// Response:
//   { reply: string, source: 'backend'|'ollama'|'fallback',
//     model?: string, ms: number, _meta: { ts } }

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // segundos · permite respuestas largas de Ollama

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90_000)

const SYSTEM_PROMPT = `Eres "Politeia", asistente de inteligencia política de Politeia Analítica, plataforma de análisis electoral, riesgo político y contratación pública en España.

Contexto del usuario: analistas que trabajan con datos electorales españoles, encuestas, escenarios de coalición, riesgo político, contratación pública, fondos europeos y monitoreo legislativo.

Estilo:
- Conciso. Máx 3-4 párrafos cortos. Sin preámbulos.
- Usa **negrita** para cifras y conclusiones clave.
- Usa \`código\` para referirte a secciones del dashboard (ej: \`/escenarios\`, \`/nowcasting\`, \`/riesgo\`).
- Castellano de España.
- Si no tienes una cifra concreta, dilo: "no tengo el dato exacto" — NO inventes números.
- Si la pregunta queda fuera de tu ámbito (política española, datos electorales, contratación pública, geopolítica), redirígela con amabilidad.

Secciones disponibles del dashboard que puedes mencionar: \`/dashboard\`, \`/nowcasting\`, \`/escenarios\`, \`/coaliciones\`, \`/riesgo\`, \`/macro\`, \`/prensa\`, \`/congreso\`, \`/briefing\`, \`/microdatos\`, \`/mapa-actores\`, \`/partidos\`, \`/instituciones\`, \`/adjudicaciones\`, \`/licitaciones\`, \`/fondos-europeos\`, \`/crisis\`, \`/medios-narrativa\`, \`/monitor-legislativo\`.`

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

interface ChatRequest {
  messages: Msg[]
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
        options: {
          temperature: 0.4,
          num_predict: 600, // límite de tokens generados (~450 palabras)
        },
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

async function callBackend(messages: Msg[]): Promise<string | null> {
  if (!backendConfigured()) return null
  const data = await fromBackend<{ reply?: string; answer?: string; content?: string }>(
    '/api/brain/chat',
    { method: 'POST', body: JSON.stringify({ messages }) },
  )
  if (!data) return null
  return data.reply || data.answer || data.content || null
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
  // Sanea: descarta mensajes vacíos y limita a últimos 20 turnos
  const clean: Msg[] = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-20)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
      content: m.content.slice(0, 4000),
    }))

  // 1. Intentamos backend FastAPI si está configurado
  const fromB = await callBackend(clean)
  if (fromB) {
    return NextResponse.json({
      reply: fromB,
      source: 'backend',
      model: 'backend-llm',
      ms: Date.now() - started,
      _meta: { ts: new Date().toISOString() },
    })
  }
  // 2. Intentamos Ollama
  const fromO = await callOllama(clean)
  if (fromO) {
    return NextResponse.json({
      reply: fromO,
      source: 'ollama',
      model: OLLAMA_MODEL,
      ms: Date.now() - started,
      _meta: { ts: new Date().toISOString() },
    })
  }
  // 3. Fallback · el cliente decide qué mostrar (ya tiene su lógica canned)
  return NextResponse.json({
    reply: '',
    source: 'fallback',
    model: 'none',
    ms: Date.now() - started,
    _meta: { ts: new Date().toISOString() },
  })
}

// GET /api/brain/chat → diagnóstico para saber si Ollama responde
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
    },
    ts: new Date().toISOString(),
  })
}
