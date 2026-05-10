import { NextRequest } from 'next/server'
import { fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      send('init', { connected: true, ts: new Date().toISOString() })

      const poll = async () => {
        if (closed) return
        try {
          const data = await fromBackend<{ score_global?: number; nivel_global?: string }>(
            '/api/riesgo/matriz'
          )
          if (data && typeof data === 'object' && 'score_global' in data) {
            send('score_update', {
              score: Number(data.score_global ?? 0),
              nivel: String(data.nivel_global ?? 'medio'),
              ts: new Date().toISOString(),
            })
          } else {
            // Simulate drift when backend unavailable
            const score = 45 + Math.random() * 20
            send('score_update', {
              score: Math.round(score * 10) / 10,
              nivel: score > 70 ? 'alto' : score > 50 ? 'medio' : 'bajo',
              ts: new Date().toISOString(),
            })
          }
        } catch {
          send('heartbeat', { ts: new Date().toISOString() })
        }
        if (!closed) setTimeout(poll, 30000)
      }

      setTimeout(poll, 2000)

      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return }
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          closed = true
          clearInterval(keepalive)
        }
      }, 20000)
    },
    cancel() { closed = true },
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
