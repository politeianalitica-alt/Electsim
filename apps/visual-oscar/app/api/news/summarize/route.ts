/**
 * POST /api/news/summarize
 *
 * Genera un resumen breve (~3-5 frases) de una noticia.
 *
 * Body: { title: string; source: string; description?: string; url?: string }
 *
 * Estrategia (degradación elegante):
 *   1. Si hay description con >120 chars · resumen extractivo local
 *      (limpiar HTML, recortar a primeras N frases). Cero coste, instantáneo.
 *   2. Si la descripción es muy corta o vacía · llamamos a /api/brain/chat
 *      con un prompt curado para producir el resumen vía LLM disponible
 *      (Ollama local o backend). Devuelve siempre algo útil.
 *   3. Fallback final · una frase neutral con la fuente.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

interface SummarizeBody {
  title?: string
  source?: string
  description?: string
  url?: string
}

interface SummarizeResponse {
  summary: string
  source: 'extractive' | 'llm' | 'fallback'
  warnings?: string[]
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resumen extractivo · primeras 2-3 frases · max 380 chars */
function extractiveSummary(text: string, maxChars = 380): string {
  const clean = stripHtml(text)
  if (clean.length <= maxChars) return clean
  const sentences = clean.split(/(?<=[.!?])\s+/)
  const out: string[] = []
  let acc = 0
  for (const s of sentences) {
    if (acc + s.length > maxChars) break
    out.push(s)
    acc += s.length + 1
  }
  const result = out.join(' ').trim()
  return result.length > 0 ? result : clean.slice(0, maxChars).trim() + '…'
}

async function llmSummary(req: NextRequest, params: { title: string; source: string; description?: string }): Promise<string | null> {
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${proto}://${host}`

  const prompt = [
 `Eres un analista político español. Resume la siguiente noticia en 3-4 frases claras y neutrales en español. No añadas opinión, solo hechos.`,
 ``,
 `Medio: ${params.source}`,
 `Titular: ${params.title}`,
    params.description ? `Resumen original: ${params.description}` : '',
  ].filter(Boolean).join('\n')

  try {
    const r = await fetch(`${baseUrl}/api/brain/chat`, {
      method: 'POST',
      headers: {
 'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) return null
    const data = await r.json() as { reply?: string; source?: string }
    if (!data.reply || data.source === 'fallback') return null
    return data.reply.trim().slice(0, 600)
  } catch (e) {
    console.warn('[news/summarize] llm failed:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: SummarizeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const title = (body.title || '').trim()
  const source = (body.source || 'fuente desconocida').trim()
  const description = (body.description || '').trim()

  if (!title) {
    return NextResponse.json({ error: 'missing_title' }, { status: 400 })
  }

  // 1. Si la descripción es suficiente · extractivo local
  if (description.length > 120) {
    const summary = extractiveSummary(description)
    if (summary.length > 80) {
      const payload: SummarizeResponse = { summary, source: 'extractive' }
      return NextResponse.json(payload)
    }
  }

  // 2. LLM via /api/brain/chat
  const llmText = await llmSummary(req, { title, source, description })
  if (llmText && llmText.length > 60) {
    const payload: SummarizeResponse = { summary: llmText, source: 'llm' }
    return NextResponse.json(payload)
  }

  // 3. Fallback · descripción truncada o frase neutral
  if (description.length > 0) {
    const payload: SummarizeResponse = {
      summary: extractiveSummary(description, 280) || `${source} informa: ${title}.`,
      source: 'fallback',
      warnings: ['short_description'],
    }
    return NextResponse.json(payload)
  }

  return NextResponse.json({
    summary: `${source} informa sobre: ${title}. No hay resumen ampliado disponible · pulsa "Leer →" para el artículo original.`,
    source: 'fallback',
    warnings: ['no_description', 'llm_unavailable'],
  } satisfies SummarizeResponse)
}
