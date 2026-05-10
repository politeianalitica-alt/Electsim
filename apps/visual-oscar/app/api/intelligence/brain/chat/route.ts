import type { BrainSnapshot } from '@/types/intelligence'
import { MOCK_BRAIN_SESSIONS, nowIso } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/brain/chat`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 30 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const snap: BrainSnapshot = { sessions: MOCK_BRAIN_SESSIONS, generado_en: nowIso() }
  return Response.json(snap)
}

interface ChatBody {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
}

function synthesizeReply(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('riesgo') || lower.includes('amenaza')) {
    return 'El indice de riesgo politico se situa en 64 puntos (alto), con tres drivers principales: (1) tension Junts-PSOE tras la votacion de la ley de amnistia el 22 de abril, (2) presion del PP por una mocion de censura constructiva, (3) frame narrativo "fin de ciclo" en redes con 480.000 menciones del hashtag #DimisionSanchez. Recomiendo elevar la vigilancia sobre el bloque de votaciones del 12 al 16 de mayo en el Congreso.'
  }
  if (lower.includes('elec') || lower.includes('adelanto')) {
    return 'La probabilidad de adelanto electoral en mayo-junio 2026 se estima en 25-30%. Senales clave a vigilar: (a) convalidacion del Real Decreto-ley 4/2026 de medidas agroalimentarias, (b) postura final de Junts sobre transferencia de Cercanias, (c) resultado del barometro CIS de junio. El escenario base sigue siendo el agotamiento de legislatura.'
  }
  if (lower.includes('vivienda') || lower.includes('tc')) {
    return 'La sentencia del Tribunal Constitucional del 2 de mayo declara nulo el articulo 19 sobre indices de precios pero avala el resto de la Ley de Vivienda. Las 14 zonas tensionadas ya declaradas mantienen su vigencia, pero queda en suspenso el mecanismo de revision automatica. El Ministerio de Vivienda prepara un decreto correctivo.'
  }
  if (lower.includes('pp') || lower.includes('feijoo')) {
    return 'Estrategia del PP en mayo de 2026: combinacion de presion parlamentaria (mocion de censura constructiva planteada por Feijoo el 5 de mayo) con narrativa de "agotamiento del Gobierno". Los datos de Sigma Dos lo situan en 33,2% de intencion de voto. Sin embargo, no tienen mayoria suficiente sin VOX, que mantiene veto a coaliciones formales.'
  }
  return 'He revisado las evidencias disponibles y los indicadores actuales. El panorama politico de la semana esta dominado por la tension entre Junts y el Gobierno, la sentencia del TC sobre vivienda y la presion del PP por una mocion de censura. Si quieres profundizar en algun aspecto especifico (riesgo, electoral, regulatorio o narrativo), dime el angulo y te genero un analisis con citas a la base de evidencias.'
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody
    const last = body.messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? ''
    try {
      if (BACKEND) {
        const res = await fetch(`${BACKEND}/api/v1/intelligence/brain/chat`, {
          method: 'POST',
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const ct = res.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            return Response.json(await res.json())
          }
          return new Response(await res.text(), { headers: { 'content-type': ct || 'text/plain' } })
        }
      }
    } catch {}
    return Response.json({ content: synthesizeReply(last), created_at: nowIso() })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
