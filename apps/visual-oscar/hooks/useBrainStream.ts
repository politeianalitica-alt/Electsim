'use client'

/**
 * useBrainStream — hook para consumir el endpoint SSE `/api/brain/chat-stream`.
 *
 * El backend emite eventos `data: {"chunk":"...", "done":false}\n\n` token-a-token.
 * Este hook acumula los chunks en `streaming` y, al recibir `done:true`, pasa
 * el texto completo a `answer` con metadata (latency, tools_used, model_used).
 *
 * Uso:
 *   const { send, streaming, answer, isStreaming, error, reset } = useBrainStream()
 *   send({ question: '¿Cómo evoluciona el riesgo regulatorio?', use_tools: true })
 */

import { useCallback, useRef, useState } from 'react'

export interface BrainStreamEnd {
  latency_ms?: number
  model_used?: string
  n_chunks?: number
  answer_chars?: number
  tools_used?: string[]
  citations?: Array<{ source: string; url?: string; snippet?: string }>
  mode?: string
  error?: string
}

export interface BrainStreamRequest {
  question: string
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  use_tools?: boolean
  workspace_id?: string
  session_id?: string
  tools?: string[]
  model?: string
}

interface State {
  /** Texto acumulado hasta ahora (live mientras streaming). */
  streaming: string
  /** Respuesta final cuando done:true. */
  answer: string
  /** Metadatos del cierre. */
  end?: BrainStreamEnd
  /** True si hay un stream activo. */
  isStreaming: boolean
  /** Error si lo hubo. */
  error: string | null
}

export function useBrainStream() {
  const [state, setState] = useState<State>({
    streaming: '',
    answer: '',
    isStreaming: false,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (req: BrainStreamRequest) => {
    // Cancela cualquier stream en curso
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ streaming: '', answer: '', isStreaming: true, error: null })

    try {
      const res = await fetch('/api/brain/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        setState({ streaming: '', answer: '', isStreaming: false, error: errText })
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let finalEnd: BrainStreamEnd | undefined

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Eventos SSE separados por `\n\n`
        let sep: number
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const lines = event.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (!payload) continue
            try {
              const obj = JSON.parse(payload) as {
                chunk?: string
                done?: boolean
                error?: string
              } & BrainStreamEnd
              if (obj.chunk) {
                accumulated += obj.chunk
                setState(s => ({ ...s, streaming: accumulated }))
              }
              if (obj.error) {
                setState(s => ({ ...s, error: obj.error || 'stream_error' }))
              }
              if (obj.done) {
                finalEnd = {
                  latency_ms: obj.latency_ms,
                  model_used: obj.model_used,
                  n_chunks: obj.n_chunks,
                  answer_chars: obj.answer_chars,
                  tools_used: obj.tools_used,
                  citations: obj.citations,
                  mode: obj.mode,
                  error: obj.error,
                }
              }
            } catch (e) {
              // Eventos parciales — ignorar y esperar más bytes
            }
          }
        }
      }

      setState({
        streaming: accumulated,
        answer: accumulated,
        end: finalEnd,
        isStreaming: false,
        error: finalEnd?.error ?? null,
      })
    } catch (e: unknown) {
      if (controller.signal.aborted) {
        setState(s => ({ ...s, isStreaming: false }))
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      setState(s => ({ ...s, isStreaming: false, error: msg }))
    } finally {
      abortRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setState(s => ({ ...s, isStreaming: false }))
  }, [])

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setState({ streaming: '', answer: '', isStreaming: false, error: null })
  }, [])

  return {
    ...state,
    send,
    cancel,
    reset,
  }
}
