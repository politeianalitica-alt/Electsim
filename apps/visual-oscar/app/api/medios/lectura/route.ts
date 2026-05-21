/**
 * /api/medios/lectura · "Lectura Politeia" IA por tab/búsqueda.
 *
 * Genera resumen ejecutivo (3-5 bullets) en español a partir del
 * contexto del tab (datos agregados) o de los resultados de una
 * búsqueda puntual.
 *
 * Reutiliza `generateText` de @/lib/ai (LLM con fallback configurado
 * vía AI_CONFIG · Anthropic/Groq/OpenAI según env).
 *
 * Disclaimer obligatorio CLAUDE.md A2: respuesta marcada `generated_by_llm`.
 */
import { NextResponse } from 'next/server'
import { generateText } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface LecturaRequest {
  tabId?: string                 // ej. 'busqueda' | 'radar' | 'agenda' | ...
  query?: string                 // si viene de búsqueda puntual
  context: {
    n_articles?: number
    total_results?: number
    top_sources?: { source: string; count: number }[]
    actors?: { name: string; mentions: number; sentiment: number }[]
    topics?: { label: string; count: number }[]
    narratives?: { frame: string; count: number }[]
    sentiment?: { score: number; positive: number; negative: number; neutral: number }
    ideologicalComparison?: { bucket: string; count: number; sentiment: number; dominantFrames?: string[] }[]
    timeline_summary?: { from: string; to: string; peak_date?: string; peak_value?: number }
    sample_titles?: string[]
  }
  language?: 'es' | 'en'
}

function buildPrompt(req: LecturaRequest): string {
  const c = req.context || {}
  const isSearch = !!req.query
  const lines: string[] = []
  lines.push(
    isSearch
      ? `Eres un analista de medios de Politeia. Analiza esta búsqueda y produce un resumen ejecutivo profesional de la cobertura.`
      : `Eres un analista de medios de Politeia. Analiza estos datos agregados del tab "${req.tabId}" y produce un briefing ejecutivo profesional.`,
  )
  lines.push('')
  if (isSearch) lines.push(`Búsqueda investigada: "${req.query}"`)
  if (c.n_articles != null) lines.push(`Artículos analizados: ${c.n_articles} de ${c.total_results?.toLocaleString('es-ES') ?? '—'} totales.`)
  if (c.sentiment) {
    lines.push(`Sentimiento global: score ${(c.sentiment.score * 100).toFixed(0)}% · positivos ${c.sentiment.positive}, negativos ${c.sentiment.negative}, neutros ${c.sentiment.neutral}.`)
  }
  if (c.timeline_summary?.peak_date) {
    lines.push(`Pico de cobertura: ${c.timeline_summary.peak_date} con ${c.timeline_summary.peak_value} artículos.`)
  }
  if (c.top_sources?.length) {
    lines.push(`Top medios: ${c.top_sources.slice(0, 5).map((s) => `${s.source} (${s.count})`).join(', ')}.`)
  }
  if (c.actors?.length) {
    lines.push(`Actores más mencionados: ${c.actors.slice(0, 6).map((a) => `${a.name} (${a.mentions}, tono ${(a.sentiment * 100).toFixed(0)}%)`).join(', ')}.`)
  }
  if (c.topics?.length) {
    lines.push(`Topics emergentes: ${c.topics.slice(0, 8).map((t) => `${t.label} (${t.count})`).join(', ')}.`)
  }
  if (c.narratives?.length) {
    lines.push(`Frames narrativos detectados: ${c.narratives.slice(0, 6).map((n) => `${n.frame} (${n.count})`).join(', ')}.`)
  }
  if (c.ideologicalComparison?.length) {
    lines.push('Comparación ideológica:')
    for (const b of c.ideologicalComparison) {
      lines.push(`  - ${b.bucket}: ${b.count} artículos, tono ${(b.sentiment * 100).toFixed(0)}%, frames [${(b.dominantFrames || []).join(', ')}]`)
    }
  }
  if (c.sample_titles?.length) {
    lines.push('Muestra de titulares:')
    for (const t of c.sample_titles.slice(0, 8)) lines.push(`  - ${t}`)
  }
  lines.push('')
  lines.push('Produce un análisis estructurado en español con este formato exacto:')
  lines.push('')
  lines.push('**Resumen ejecutivo:** [una frase, máximo 25 palabras]')
  lines.push('')
  lines.push('**Hallazgos clave:**')
  lines.push('- [bullet 1 · dato concreto + interpretación]')
  lines.push('- [bullet 2 · dato concreto + interpretación]')
  lines.push('- [bullet 3 · dato concreto + interpretación]')
  lines.push('- [bullet 4 · opcional si hay material]')
  lines.push('')
  lines.push('**Riesgo de framing:** [una frase identificando posible sesgo en la cobertura o disparidad ideológica]')
  lines.push('')
  lines.push('**Próximos a vigilar:** [una frase con qué actor/tema/evento monitorizar próximamente]')
  lines.push('')
  lines.push('REGLAS:')
  lines.push('- Cita números reales del briefing, no inventes.')
  lines.push('- Si no hay datos suficientes para una sección, escribe "(insuficiente)".')
  lines.push('- Tono profesional analítico, sin opinión partidista.')
  lines.push('- NO uses emoticonos.')
  return lines.join('\n')
}

export async function POST(req: Request) {
  let body: LecturaRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 })
  }
  if (!body.context) {
    return NextResponse.json({ ok: false, error: 'context required' }, { status: 400 })
  }
  try {
    const prompt = buildPrompt(body)
    const text = await generateText({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
      temperature: 0.3,
    })
    return NextResponse.json({
      ok: true,
      tabId: body.tabId,
      query: body.query,
      generated_by_llm: true,
      disclaimer: 'Generado por IA · revisar antes de citar · Politeia · CLAUDE.md A2',
      lectura: text,
      generated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200)
    return NextResponse.json({
      ok: false,
      error: msg,
      generated_by_llm: false,
      hint: 'Verifica AI_CONFIG · ANTHROPIC_API_KEY / GROQ_API_KEY / OPENAI_API_KEY en Vercel env',
    }, { status: 502 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: false,
    error: 'Use POST',
    body_schema: {
      tabId: 'string opcional · ej busqueda, radar, agenda',
      query: 'string opcional · si viene de búsqueda puntual',
      context: 'object · n_articles, sentiment, actors, topics, narratives, ideologicalComparison...',
      language: 'es | en (default es)',
    },
  }, { status: 405 })
}
