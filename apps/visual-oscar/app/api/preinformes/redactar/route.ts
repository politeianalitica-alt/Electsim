/**
 * /api/preinformes/redactar — Fase 3 · redacción asistida de secciones.
 *
 * El asistente de Preinformes ya selecciona fuentes REALES (notas del
 * Cuaderno, macroargumentos de la Cama); este endpoint las convierte en
 * un borrador de sección usando la capa de IA existente (cascada
 * Gemini → Groq → Anthropic → Ollama de lib/ai).
 *
 * Body: {
 *   titulo:    string            // título del informe
 *   plantilla: string            // nombre de plantilla (ejecutivo, campaña…)
 *   publico:   string            // dirección, cliente, equipo, prensa
 *   seccion:   { titulo: string; guia: string }
 *   fuentes:   Array<{ tipo: string; label: string; contenido?: string }>
 * }
 * Respuesta: { ok: true, texto } | { ok: false, error } (503 si IA apagada)
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, AI_CONFIG } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `Eres analista senior de Politeia Analítica (consultora española de
inteligencia política y regulatoria). Redactas SECCIONES de informes
preliminares para clientes.

Reglas:
- Español neutro profesional, frases cortas, voz activa, sin relleno.
- SOLO afirmas lo que las fuentes aportadas sostienen; si faltan datos,
  lo dices explícitamente ("pendiente de validar con …").
- Sin emojis. Sin markdown de cabeceras (el título de sección ya existe);
  puedes usar guiones para listas.
- Longitud: 80-180 palabras salvo que la guía pida otra cosa.
- Nunca inventes cifras, fechas ni declaraciones.`

interface FuenteIn { tipo?: string; label?: string; contenido?: string }

export async function POST(req: NextRequest) {
  let body: {
    titulo?: string
    plantilla?: string
    publico?: string
    seccion?: { titulo?: string; guia?: string }
    fuentes?: FuenteIn[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'body JSON inválido' }, { status: 400 })
  }
  if (!body?.seccion?.titulo) {
    return NextResponse.json({ ok: false, error: 'falta seccion.titulo' }, { status: 400 })
  }
  if (AI_CONFIG.provider === 'none') {
    return NextResponse.json(
      { ok: false, error: 'IA no configurada en este entorno (sin API keys)' },
      { status: 503 },
    )
  }

  const fuentes = (body.fuentes ?? []).slice(0, 12)
  const conContenido = fuentes.filter(f => f.contenido?.trim())
  const soloLabel = fuentes.filter(f => !f.contenido?.trim())

  const bloquesFuentes = conContenido
    .map(f => `### Fuente [${f.tipo}] ${f.label}\n${(f.contenido ?? '').slice(0, 4_000)}`)
    .join('\n\n')

  const prompt = [
    `INFORME: "${body.titulo || 'Sin título'}" · plantilla ${body.plantilla || '—'} · público: ${body.publico || '—'}.`,
    `SECCIÓN A REDACTAR: "${body.seccion.titulo}".`,
    body.seccion.guia ? `GUÍA DE LA SECCIÓN: ${body.seccion.guia}` : '',
    bloquesFuentes
      ? `\nFUENTES SELECCIONADAS (úsalas como única base factual):\n\n${bloquesFuentes}`
      : '\nSin fuentes con contenido: redacta un esqueleto breve señalando qué datos faltan.',
    soloLabel.length
      ? `\nFuentes adicionales solo referenciadas (sin contenido accesible): ${soloLabel.map(f => f.label).join(', ')}.`
      : '',
    '\nRedacta SOLO el cuerpo de la sección.',
  ].filter(Boolean).join('\n')

  try {
    const texto = await generateText({
      tier: 'fast',
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 700,
    })
    if (!texto?.trim()) {
      return NextResponse.json({ ok: false, error: 'el modelo no devolvió texto' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, texto: texto.trim() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
