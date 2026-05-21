import { NextRequest, NextResponse } from 'next/server'
import { withMeta } from '@/lib/backend'

// POST /api/legislativo/analyze
//
// Body: { id, titulo, departamento, tipo?, materia? }
// Llama a /api/brain/chat (proxy Ollama/backend) con un prompt estructurado
// que devuelve JSON con análisis de la disposición:
//
// Response: {
//   resumen: string                    (2-3 frases)
//   sectores_afectados: string[]       (lista de sectores económicos)
//   actores_politicos: string[]        (partidos / instituciones implicados)
//   impacto_politico: -100..+100       (negativo = polariza, positivo = consenso)
//   urgencia: 'baja' | 'media' | 'alta' | 'crítica'
//   pronostico: 'aprobación probable' | 'controversia' | 'rechazo previsible' | 'sin oposición'
//   _meta: { source, ms, ts }
// }

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

interface AnalyzeRequest {
  id?: string
  titulo: string
  departamento?: string
  tipo?: string
  materia?: string
}

interface OllamaResponse {
  resumen?: string
  sectores_afectados?: string[]
  actores_politicos?: string[]
  impacto_politico?: number
  urgencia?: string
  pronostico?: string
}

function buildPrompt(req: AnalyzeRequest): string {
  return `Eres "Politeia", analista político de Politeia Analítica.

Acabas de recibir una disposición publicada hoy en el BOE. Analízala y devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto antes ni después) con estos campos:

{
 "resumen": "...",                       // 2-3 frases · qué hace la norma · castellano de España
 "sectores_afectados": ["...","..."],    // máx 5 · sectores económicos o áreas afectadas
 "actores_politicos": ["...","..."],     // máx 5 · partidos / ministerios / instituciones implicados
 "impacto_politico": 0,                  // entero -100 a +100 · negativo = polariza · positivo = consenso
 "urgencia": "media",                    // baja | media | alta | crítica
 "pronostico": "aprobación probable" // aprobación probable | controversia | rechazo previsible | sin oposición
}

Disposición:
TÍTULO: ${req.titulo}
DEPARTAMENTO: ${req.departamento || 'desconocido'}
TIPO DETECTADO: ${req.tipo || '?'}
MATERIA DETECTADA: ${req.materia || '?'}

Responde SOLO el objeto JSON. Si no puedes valorar algún campo, omítelo.`
}

function tryParseJson(text: string): OllamaResponse | null {
  // El modelo a veces envuelve en markdown · limpiamos
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  // Buscamos el primer { ... } más exterior
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  let body: AnalyzeRequest
  try {
    body = (await req.json()) as AnalyzeRequest
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body?.titulo || typeof body.titulo !== 'string') {
    return NextResponse.json({ error: 'falta titulo' }, { status: 400 })
  }

  // Llamamos a /api/brain/chat (que ya enrout-ea a backend FastAPI o Ollama)
  // Construimos URL absoluta basada en el host de la request
  const origin = req.nextUrl.origin
  let analysis: OllamaResponse | null = null
  let llmSource: 'ollama' | 'backend' | 'fallback' = 'fallback'

  try {
    const chatRes = await fetch(`${origin}/api/brain/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: buildPrompt(body) }],
      }),
    })
    if (chatRes.ok) {
      const chatData = await chatRes.json() as { reply: string; source: 'ollama' | 'backend' | 'fallback' }
      llmSource = chatData.source
      if (chatData.reply) {
        analysis = tryParseJson(chatData.reply)
      }
    }
  } catch { /* noop · cae a fallback heurístico */ }

  // Fallback heurístico si Ollama no está disponible
  if (!analysis) {
    analysis = {
      resumen: `Disposición del BOE ${body.titulo.length > 100 ? body.titulo.slice(0, 100) + '…' : body.titulo}. ${body.departamento ? `Promovida por ${body.departamento}.` : ''}`,
      sectores_afectados: body.materia ? [body.materia] : [],
      actores_politicos: body.departamento ? [body.departamento] : [],
      impacto_politico: 0,
      urgencia: 'media',
      pronostico: 'sin valoración (LLM no disponible)',
    }
  }

  return NextResponse.json({
    id: body.id,
    ...analysis,
    ms: Date.now() - started,
    llm_source: llmSource,         // 'ollama' | 'backend' | 'fallback' (sin LLM)
    _meta: {
      source: llmSource === 'fallback' ? 'mock' : 'backend',
      ts: new Date().toISOString(),
    },
  })
}
