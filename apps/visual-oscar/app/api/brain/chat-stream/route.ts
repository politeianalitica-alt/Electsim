import { NextRequest } from 'next/server'
import { backendUrl, backendConfigured } from '@/lib/backend'

// POST /api/brain/chat-stream
//
// Proxy SSE hacia el backend FastAPI `/api/brain/chat-stream`. Si el backend
// no está configurado, intenta Ollama directo (también stream chunks).
//
// Formato SSE: cada evento es `data: {"chunk":"...", "done":false}\n\n`.
// El evento final tiene `done:true` y metadatos (`latency_ms`, `model_used`).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

interface ChatStreamRequest {
  messages?: Msg[]
  question?: string
  history?: Msg[]
  use_tools?: boolean
  workspace_id?: string
  session_id?: string
  tools?: string[]
  model?: string
}

async function* proxyBackendStream(body: object): AsyncGenerator<string> {
  const url = `${backendUrl()}/api/brain/chat-stream`
  const apiKey = process.env.BACKEND_API_KEY || ''
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    yield `data: ${JSON.stringify({ chunk: '', done: true, error: `backend_status_${res.status}` })}\n\n`
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  // Re-stream el body chunk a chunk.
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

async function* ollamaDirectStream(messages: Msg[], model: string): AsyncGenerator<string> {
  yield `data: ${JSON.stringify({ chunk: '', done: false, event: 'start', model })}\n\n`
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true, messages, options: { temperature: 0.4 } }),
  })
  if (!res.ok || !res.body) {
    yield `data: ${JSON.stringify({ chunk: '', done: true, error: `ollama_status_${res.status}` })}\n\n`
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let started = Date.now()
  let n = 0
  let chars = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      try {
        const obj = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
        const chunk = obj.message?.content ?? ''
        if (chunk) {
          n += 1
          chars += chunk.length
          yield `data: ${JSON.stringify({ chunk, done: false })}\n\n`
        }
        if (obj.done) {
          const latency = Date.now() - started
          yield `data: ${JSON.stringify({
            chunk: '', done: true, latency_ms: latency, model_used: model,
            n_chunks: n, answer_chars: chars, mode: 'ollama+stream',
          })}\n\n`
          return
        }
      } catch { /* parse error en chunk parcial — esperamos al siguiente */ }
    }
  }
  yield `data: ${JSON.stringify({ chunk: '', done: true, model_used: model, n_chunks: n, answer_chars: chars })}\n\n`
}

export async function POST(req: NextRequest) {
  let body: ChatStreamRequest
  try {
    body = (await req.json()) as ChatStreamRequest
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 })
  }

  // Normaliza a question + history (acepta ambos formatos)
  const fromMessages = Array.isArray(body.messages) ? body.messages : []
  const userLast = fromMessages.filter(m => m.role === 'user').slice(-1)[0]
  const question = body.question ?? userLast?.content ?? ''
  const history = body.history ?? fromMessages.slice(0, -1)
  if (!question) {
    return new Response(JSON.stringify({ error: 'question vacía' }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let gen: AsyncGenerator<string>
        if (backendConfigured()) {
          gen = proxyBackendStream({
            question,
            history,
            workspace_id: body.workspace_id,
            session_id: body.session_id,
            use_tools: body.use_tools ?? false,
            tools: body.tools,
            model: body.model,
          })
        } else {
          gen = ollamaDirectStream(
            [...history, { role: 'user', content: question }],
            body.model ?? OLLAMA_MODEL,
          )
        }
        for await (const ev of gen) {
          controller.enqueue(encoder.encode(ev))
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: '', done: true, error: msg })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
