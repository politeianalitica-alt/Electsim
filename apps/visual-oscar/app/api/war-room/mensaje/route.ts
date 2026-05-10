import { NextResponse } from 'next/server'
import type { MensajeDia } from '@/types/war-room'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK: MensajeDia = {
  titular: 'Cada día con el Gobierno es un día más de bloqueo y deterioro institucional.',
  subtitular: 'Los españoles merecen la posibilidad de elegir un cambio que recupere la sensatez económica y la unidad del país.',
  pilares: [
    { p:'Recuperar la sensatez económica',  detalle:'Bajada del IRPF, simplificación fiscal, plan choque para autónomos' },
    { p:'Restaurar la unidad y la igualdad', detalle:'Derogar la amnistía, recuperar el Estado de derecho' },
    { p:'Estabilidad institucional',          detalle:'Pactos de Estado para CGPJ, RTVE, financiación autonómica' },
  ],
  contraste: 'PSOE depende de Junts y Bildu para sobrevivir; nosotros gobernaremos con todos los españoles.',
  evitar: ['Detalles del pacto con VOX en CCAA', 'Conflictos internos del partido', 'Polémica con la Iglesia sobre IRPF'],
  hashtag: '#TiempoDeCambio',
}

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/mensaje`, {
        headers: { 'X-API-Key': apiKey ?? '' },
        next: { revalidate: 3600 },
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }
  }
  return NextResponse.json(MOCK)
}
