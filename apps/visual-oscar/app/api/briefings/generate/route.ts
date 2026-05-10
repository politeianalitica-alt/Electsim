import { NextRequest } from 'next/server'
import { fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SECTIONS = [
  { id: 'contexto', titulo: 'Contexto político actual', delay: 1200 },
  { id: 'senales', titulo: 'Señales de inteligencia', delay: 1800 },
  { id: 'riesgo', titulo: 'Evaluación de riesgo', delay: 1500 },
  { id: 'diplomatico', titulo: 'Frente diplomático', delay: 1400 },
  { id: 'economico', titulo: 'Panorama económico', delay: 1000 },
  { id: 'recomendaciones', titulo: 'Recomendaciones', delay: 2000 },
  { id: 'escenarios', titulo: 'Escenarios probables', delay: 1600 },
  { id: 'alertas', titulo: 'Alertas prioritarias', delay: 800 },
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
          contenido: `Análisis de ${section.titulo.toLowerCase()} en curso. ${backendContext ? 'Datos en tiempo real integrados.' : 'Usando fuentes analíticas disponibles.'}`,
        })
      }

      if (!closed) {
        send('generation_complete', {
          briefing_id: `briefing_${Date.now()}`,
          titulo: `Briefing Ejecutivo — ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`,
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
