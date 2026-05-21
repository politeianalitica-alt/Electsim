/**
 * POST /api/briefings/morning/pdf?format=informe|nota
 *
 * Genera un PDF descargable del briefing matinal en dos formatos:
 *   · informe · documento ejecutivo completo (2-3 páginas)
 *               · resumen ejecutivo
 *               · alertas clave priorizadas
 *               · top stories + narrativas activas
 *               · las tres preguntas del día
 *               · snapshot electoral
 *               · nota del analista
 *   · nota    · nota informativa breve (1 página) · solo lo crítico
 *
 * Usa renderPdf() basado en @react-pdf/renderer · sin Chromium ni puppeteer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderPdf, type PdfDocSpec } from '@/lib/render/pdf-renderer'
import type { MorningBriefing } from '@/lib/api-types'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

type BriefingFormat = 'informe' | 'nota'

function levelTone(level?: string): 'info' | 'warn' | 'danger' {
  const l = (level || '').toLowerCase()
  if (l === 'critical' || l === 'high') return 'danger'
  if (l === 'medium' || l === 'warning') return 'warn'
  return 'info'
}

function spanishLevel(level?: string): string {
  const l = (level || '').toLowerCase()
  if (l === 'critical') return 'CRÍTICA'
  if (l === 'high')     return 'ALTA'
  if (l === 'medium')   return 'MEDIA'
  if (l === 'low')      return 'BAJA'
  if (l === 'warning')  return 'AVISO'
  return (level || 'INFO').toUpperCase()
}

function buildInforme(briefing: MorningBriefing): PdfDocSpec['blocks'] {
  const blocks: PdfDocSpec['blocks'] = []

  blocks.push({ type: 'h2', text: 'Lo importante de hoy' })
  blocks.push({ type: 'p', text: briefing.executive_summary || 'Hoy no tenemos datos suficientes — te avisamos en cuanto los tengamos.' })

  // Alertas clave
  if (briefing.key_alerts && briefing.key_alerts.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'A lo que tienes que prestar atención' })
    briefing.key_alerts.forEach(a => {
      blocks.push({ type: 'h3', text: `[${spanishLevel(a.level)}]  ${a.title}` })
      if (a.body) blocks.push({ type: 'p', text: a.body })
    })
  }

  // Top stories
  if (briefing.top_stories && briefing.top_stories.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'Las noticias que más se están moviendo' })
    briefing.top_stories.slice(0, 5).forEach(s => {
      const rel = s.relevance != null ? ` (relevancia ${Math.round(s.relevance * 100)}%)` : ''
      blocks.push({ type: 'bullet', text: `${s.title} — ${s.source || 'fuente desconocida'}${rel}` })
    })
  }

  // Narrativas activas
  if (briefing.active_narratives && briefing.active_narratives.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'De qué se está hablando' })
    briefing.active_narratives.forEach(n => {
      const vel = n.velocity === 'up' ? '↑ subiendo' : n.velocity === 'down' ? '↓ enfriándose' : '→ estable'
      blocks.push({ type: 'h3', text: `${n.frame_label}  ·  ${vel}` })
      if (n.recommended_action) blocks.push({ type: 'p', text: `Qué hacer · ${n.recommended_action}` })
    })
  }

  // Las tres preguntas
  if (briefing.three_questions && briefing.three_questions.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'Tres preguntas para que te lleves al día' })
    briefing.three_questions.forEach((q, i) => {
      blocks.push({ type: 'h3', text: `${i + 1}.  ${q}` })
    })
  }

  // Snapshot electoral
  if (briefing.electoral_snapshot) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'Cómo va la cosa electoral' })
    const es = briefing.electoral_snapshot
    const tendencia = es.trend === 'up' ? '↑ subiendo' : es.trend === 'down' ? '↓ bajando' : '→ estable'
    const pairs: Array<[string, string]> = []
    if (es.itpe != null) pairs.push(['ITPE', `${es.itpe} · ${tendencia}`])
    if (es.top_parties) {
      Object.entries(es.top_parties).slice(0, 5).forEach(([k, v]) => pairs.push([k, `${v}%`]))
    }
    if (pairs.length > 0) blocks.push({ type: 'kv', pairs })
  }

  // Nota del analista
  if (briefing.analyst_note) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h2', text: 'Una última cosa' })
    blocks.push({ type: 'callout', text: briefing.analyst_note, tone: 'info' })
  }

  return blocks
}

function buildNota(briefing: MorningBriefing): PdfDocSpec['blocks'] {
  const blocks: PdfDocSpec['blocks'] = []

  blocks.push({ type: 'h2', text: 'Lo importante de hoy' })
  blocks.push({ type: 'p', text: briefing.executive_summary || 'Hoy no tenemos datos suficientes — te avisamos en cuanto los tengamos.' })

  // Solo las 2 alertas críticas máximas
  const criticas = (briefing.key_alerts || [])
    .filter(a => ['critical', 'high'].includes((a.level || '').toLowerCase()))
    .slice(0, 3)
  if (criticas.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h3', text: 'Lo urgente de hoy' })
    criticas.forEach(a => {
      blocks.push({ type: 'callout', text: `${a.title}${a.body ? ' · ' + a.body : ''}`, tone: levelTone(a.level) })
    })
  }

  // 3 preguntas como teaser
  if (briefing.three_questions && briefing.three_questions.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'h3', text: 'Para darle vueltas' })
    briefing.three_questions.slice(0, 3).forEach((q, i) => {
      blocks.push({ type: 'bullet', text: `${i + 1}.  ${q}` })
    })
  }

  if (briefing.analyst_note) {
    blocks.push({ type: 'callout', text: briefing.analyst_note, tone: 'info' })
  }

  return blocks
}

export async function POST(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get('format') || 'informe') as BriefingFormat
  if (!['informe', 'nota'].includes(format)) {
    return NextResponse.json({ error: 'invalid_format', message: 'format debe ser "informe" o "nota"' }, { status: 400 })
  }

  // Fetch del briefing matinal (usa la URL absoluta del propio host para que
  // el proxy interno respete cookies/headers de auth si los hubiera).
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${proto}://${host}`

  let briefing: MorningBriefing | null = null
  try {
    const r = await fetch(`${baseUrl}/api/briefings/morning?workspace_id=default`, {
      cache: 'no-store',
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    })
    if (r.ok) briefing = (await r.json()) as MorningBriefing
  } catch (e) {
    console.warn('[briefings/pdf] fetch briefing failed:', e instanceof Error ? e.message : e)
  }

  if (!briefing) {
    return NextResponse.json({ error: 'briefing_unavailable', message: 'no se pudo obtener el briefing matinal' }, { status: 502 })
  }

  const today = new Date()
  const fechaLarga = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fechaCorta = today.toISOString().slice(0, 10)

  const titulo = format === 'nota'
    ? 'Tu briefing de la mañana · resumen rápido'
    : 'Tu briefing de la mañana · informe completo'

  const spec: PdfDocSpec = {
    title: titulo,
    subtitle: fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1),
    workspace: 'Politeia Analítica',
    generatedAt: today.toISOString(),
    blocks: format === 'nota' ? buildNota(briefing) : buildInforme(briefing),
    meta: {
      Modo: briefing.mode || 'demo',
      Workspace: briefing.workspace_id || 'default',
      Fuentes: 'Politeia · agregador propio · feeds públicos',
    },
  }

  try {
    const buf = await renderPdf(spec)
    const filename = `briefing-${format}-${fechaCorta}.pdf`
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
 'Content-Type': 'application/pdf',
 'Content-Disposition': `attachment; filename="${filename}"`,
 'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[briefings/pdf] render failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'render_failed', message: (e as Error).message }, { status: 500 })
  }
}

// GET para conveniencia · idéntico al POST · permite descargar abriendo URL
export async function GET(req: NextRequest) {
  return POST(req)
}
