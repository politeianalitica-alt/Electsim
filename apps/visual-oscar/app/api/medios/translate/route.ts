/**
 * POST /api/medios/translate — traduce al español un lote de titulares (IA
 * Gemini). Gated: si no hay clave LLM configurada (o falla), responde 503 y el
 * cliente conserva los titulares originales. Body: { texts: string[] }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateJSON } from '@/lib/ai/gemini-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: { texts?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo inválido' }, { status: 400 })
  }
  const texts = Array.isArray(body.texts) ? body.texts.map((t) => String(t)).filter(Boolean).slice(0, 40) : []
  if (texts.length === 0) return NextResponse.json({ error: 'sin textos' }, { status: 400 })

  try {
    const out = await generateJSON<{ translations: string[] }>({
      messages: [
        {
          role: 'system',
          content:
            'Traduces titulares de prensa/análisis al español neutro. Devuelve un JSON {"translations":[...]} con las traducciones EN EL MISMO ORDEN y la MISMA cantidad que la entrada. Si un titular ya está en español, devuélvelo tal cual. No añadas comillas, numeración ni comentarios.',
        },
        { role: 'user', content: texts.map((t, i) => `${i + 1}. ${t}`).join('\n') },
      ],
      jsonSchema: {
        type: 'object',
        properties: { translations: { type: 'array', items: { type: 'string' } } },
        required: ['translations'],
      },
      temperature: 0.2,
      maxTokens: 2048,
    })
    const translations = Array.isArray(out?.translations) ? out.translations.map((t) => String(t)) : []
    return NextResponse.json({ translations })
  } catch (e) {
    return NextResponse.json(
      { error: 'IA no disponible', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    )
  }
}
