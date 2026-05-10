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

      send('init', { connected: true, channel: 'global_alerts', ts: new Date().toISOString() })

      let seenIds = new Set<string>()

      const poll = async () => {
        if (closed) return
        try {
          const data = await fromBackend<{ data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
            '/api/alertas/active'
          )
          const items: Array<Record<string, unknown>> = Array.isArray(data)
            ? data
            : Array.isArray((data as { data?: unknown[] })?.data)
              ? (data as { data: Array<Record<string, unknown>> }).data
              : []

          for (const item of items) {
            const id = String(item.id ?? item.titulo ?? Math.random())
            if (seenIds.has(id)) continue
            seenIds.add(id)

            const severidad = String(item.severidad ?? item.nivel ?? item.urgencia_nivel ?? 'medio').toLowerCase()
            send('alert', {
              id,
              titulo: String(item.titulo ?? item.title ?? 'Alerta'),
              descripcion: String(item.descripcion ?? item.resumen ?? ''),
              severidad: ['critico', 'alto', 'medio', 'bajo'].includes(severidad) ? severidad : 'medio',
              timestamp: String(item.timestamp ?? item.fecha ?? new Date().toISOString()),
              pais: item.pais ? String(item.pais) : undefined,
              categoria: item.categoria ? String(item.categoria) : undefined,
            })
          }
        } catch {
          send('heartbeat', { ts: new Date().toISOString() })
        }
        if (!closed) setTimeout(poll, 15000)
      }

      setTimeout(poll, 500)

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
