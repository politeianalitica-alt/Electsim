import { NextRequest } from 'next/server'
import { fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Server-Sent Events stream for intelligence feed
// Polls backend every 8s and pushes new signals
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

      // Initial connection event
      send('init', { connected: true, ts: new Date().toISOString() })

      let lastIds = new Set<string>()

      const poll = async () => {
        if (closed) return

        try {
          const data = await fromBackend<{ data?: Array<{ id?: unknown; titulo?: unknown; urgencia?: unknown }> }>(
 '/api/geopolitica/events?limit=5'
          )
          const items = Array.isArray(data) ? data : (data?.data ?? [])

          // Send new_signal for items not seen before
          for (const item of items) {
            const id = String(item.id ?? item.titulo ?? Math.random())
            if (!lastIds.has(id)) {
              lastIds.add(id)
              const urgencia = Number(item.urgencia ?? item.impact ?? 2)
              if (urgencia >= 4) {
                send('breaking', item)
              } else {
                send('new_signal', item)
              }
            }
          }

          // Stats update every poll
          send('stats_update', {
            total_monitorizados_24h: items.length * 12,
            breaking_activos: items.filter((i) => Number(i.urgencia ?? 0) >= 4).length,
            ts: new Date().toISOString(),
          })
        } catch {
          // backend unreachable — send heartbeat
          send('heartbeat', { ts: new Date().toISOString() })
        }

        if (!closed) {
          setTimeout(poll, 8000)
        }
      }

      // Start polling after short delay
      setTimeout(poll, 1000)

      // Keepalive comment every 20s
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
    cancel() {
      closed = true
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
