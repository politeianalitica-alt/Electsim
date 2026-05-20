import { NextRequest } from 'next/server'
import { fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SECTIONS = [
  { id: 'contexto', titulo: 'Qué está pasando hoy', delay: 1200 },
  { id: 'senales', titulo: 'Lo que vemos venir', delay: 1800 },
  { id: 'riesgo', titulo: 'Dónde está el riesgo', delay: 1500 },
  { id: 'diplomatico', titulo: 'En lo internacional', delay: 1400 },
  { id: 'economico', titulo: 'La economía hoy', delay: 1000 },
  { id: 'recomendaciones', titulo: 'Qué deberías hacer', delay: 2000 },
  { id: 'escenarios', titulo: 'Posibles escenarios', delay: 1600 },
  { id: 'alertas', titulo: 'A lo que tienes que prestar atención', delay: 800 },
]

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

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

      send('generation_start', { total_steps: SECTIONS.length, ts: new Date().toISOString() })

      // Try to get real context from backend
      let backendContext: unknown = null
      try {
        backendContext = await fromBackend('/api/geopolitica/kpis')
      } catch { /* use null */ }

      for (let i = 0; i < SECTIONS.length; i++) {
        if (closed) break
        const section = SECTIONS[i]
        await sleep(section.delay)
        if (closed) break

        send('section_ready', {
          step: i + 1,
          total: SECTIONS.length,
          section_id: section.id,
          titulo: section.titulo,
          progress: Math.round(((i + 1) / SECTIONS.length) * 100),
          contenido: `Estamos revisando ${section.titulo.toLowerCase()}. ${backendContext ? 'Con datos al minuto.' : 'Con la mejor información que tenemos ahora mismo.'}`,
        })
      }

      if (!closed) {
        send('generation_complete', {
          briefing_id: `briefing_${Date.now()}`,
          titulo: `Tu briefing de hoy — ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          ts: new Date().toISOString(),
        })
      }
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
