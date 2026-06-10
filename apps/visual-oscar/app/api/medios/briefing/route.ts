/**
 * POST /api/medios/briefing — redacta con IA (Gemini) un briefing breve del
 * pulso de prensa a partir de un contexto estructurado. Gated: si no hay clave
 * LLM configurada (o falla), responde 503 y el cliente conserva su briefing
 * determinista. NUNCA expone la clave (solo server).
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: { context?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo inválido' }, { status: 400 })
  }
  const context = (body.context || '').slice(0, 6000).trim()
  if (!context) return NextResponse.json({ error: 'sin contexto' }, { status: 400 })

  try {
    const briefing = await generateText({
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista de medios español. Redactas un briefing diario claro y conciso en español (4-6 frases, registro periodístico, SIN markdown, SIN emojis, SIN viñetas). Vas al grano: qué domina la agenda, qué acelera y qué riesgos hay. No inventes datos que no estén en el contexto.',
        },
        { role: 'user', content: `Datos del pulso de prensa de hoy:\n${context}\n\nRedacta el briefing.` },
      ],
      temperature: 0.4,
      maxTokens: 400,
    })
    return NextResponse.json({ briefing: briefing.trim(), source: 'ia' })
  } catch (e) {
    return NextResponse.json(
      { error: 'IA no disponible', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    )
  }
}
