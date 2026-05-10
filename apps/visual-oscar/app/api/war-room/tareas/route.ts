import { NextResponse } from 'next/server'
import type { TareaWarRoom } from '@/types/war-room'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK: TareaWarRoom[] = [
  { id:'t1', tarea:'Cierre nota de prensa · medidas autónomos',     resp:'Borja Sémper',  plazo:'12:00', estado:'En curso'   },
  { id:'t2', tarea:'Briefing técnico para entrevista Alsina (21h)', resp:'Equipo prensa', plazo:'18:00', estado:'Pendiente'  },
  { id:'t3', tarea:'Cierre del cartel del mitin de Valencia',        resp:'Carmen Fúnez',  plazo:'15:00', estado:'Completada' },
  { id:'t4', tarea:'Aprobar copy creatividades digitales semana',    resp:'Pablo Hispán',  plazo:'14:00', estado:'En curso'   },
  { id:'t5', tarea:'Reunión bilateral con Coalición Canaria',        resp:'Elías Bendodo', plazo:'17:00', estado:'Pendiente'  },
  { id:'t6', tarea:'Actualizar respuestas a deepfake TikTok',        resp:'Cuca Gamarra',  plazo:'16:00', estado:'Completada' },
]

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/tareas`, {
        headers: { 'X-API-Key': apiKey ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }
  }
  return NextResponse.json(MOCK)
}
