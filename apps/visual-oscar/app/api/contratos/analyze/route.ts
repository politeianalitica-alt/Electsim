import { NextRequest, NextResponse } from 'next/server'

// POST /api/contratos/analyze
//
// Body: { id, titulo, organismo, importe, estado, tipo, expediente }
// Llama a /api/brain/chat (Ollama o backend) con prompt JSON estructurado
// que devuelve análisis del contrato:
//
// Response: {
//   resumen: string                         (2-3 frases)
//   sectores: string[]                      (sectores económicos · máx 5)
//   riesgos: string[]                       (señales de alarma · máx 5)
//                                            ej: "importe alto sin justificación", "adjudicación directa", "monopolio sectorial"
//   indicador_competencia: 'alta'|'media'|'baja'|'nula'
//   relevancia_politica: -100..+100         (negativo = oposición lo usaría · positivo = gobierno lo usaría)
//   alertas: string[]                       (puntos a destacar)
//   llm_source, ms, _meta
// }

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

interface AnalyzeRequest {
  id?: string
  titulo: string
  organismo?: string
  importe?: number
  estado?: string
  tipo?: string
  expediente?: string
  ciudad?: string | null
}

function buildPrompt(req: AnalyzeRequest): string {
  const importeStr = req.importe ? `${req.importe.toLocaleString('es-ES')} EUR` : 'desconocido'
  return `Eres "Politeia", analista de contratación pública en España.

Acabas de recibir un expediente de la Plataforma de Contratación del Sector Público (PLACSP). Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto antes ni después) con estos campos:

{
 "resumen": "...",                          // 2-3 frases · qué es el contrato y por qué importa
 "sectores": ["..."],                        // máx 5 sectores económicos afectados
 "riesgos": ["..."],                         // máx 5 señales de alarma · ej "adjudicación directa", "importe atípico", "concentración geográfica"
 "indicador_competencia": "media",           // alta | media | baja | nula
 "relevancia_politica": 0,                   // entero -100 a +100 · negativo = oposición lo usaría · positivo = gobierno lo destacaría
 "alertas": ["..."]                          // puntos clave para un analista político
}

Datos del expediente:
TÍTULO: ${req.titulo}
ORGANISMO: ${req.organismo || 'desconocido'}
IMPORTE: ${importeStr}
ESTADO: ${req.estado || '?'}
TIPO: ${req.tipo === 'adjudicacion' ? 'Adjudicación' : 'Licitación'}
EXPEDIENTE: ${req.expediente || '?'}
CIUDAD: ${req.ciudad || '?'}

Responde SOLO el objeto JSON. Si no puedes valorar algún campo, omítelo.`
}

interface AnalysisResult {
  resumen?: string
  sectores?: string[]
  riesgos?: string[]
  indicador_competencia?: string
  relevancia_politica?: number
  alertas?: string[]
}

function tryParseJson(text: string): AnalysisResult | null {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
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
  if (!body?.titulo) {
    return NextResponse.json({ error: 'falta titulo' }, { status: 400 })
  }

  const origin = req.nextUrl.origin
  let analysis: AnalysisResult | null = null
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
      if (chatData.reply) analysis = tryParseJson(chatData.reply)
    }
  } catch { /* noop */ }

  if (!analysis) {
    // Fallback heurístico si Ollama no está disponible
    const importe = body.importe || 0
    analysis = {
      resumen: `${body.tipo === 'adjudicacion' ? 'Adjudicación' : 'Licitación'} por ${importe ? `${importe.toLocaleString('es-ES')} EUR` : 'importe sin determinar'} promovida por ${body.organismo || 'organismo desconocido'}. ${body.titulo.slice(0, 100)}…`,
      sectores: [],
      riesgos: importe > 5_000_000 ? ['importe muy elevado · revisar publicidad y concurrencia'] : [],
      indicador_competencia: importe > 1_000_000 ? 'media' : 'alta',
      relevancia_politica: 0,
      alertas: ['Análisis heurístico (LLM no disponible)'],
    }
  }

  return NextResponse.json({
    id: body.id,
    ...analysis,
    ms: Date.now() - started,
    llm_source: llmSource,
    _meta: {
      source: llmSource === 'fallback' ? 'mock' : 'backend',
      ts: new Date().toISOString(),
    },
  })
}
