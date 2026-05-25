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
import { buildMeta } from '@/lib/medios/media-methodology'

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
    // Sprint M1 · soporta ArticleReading estructurado como input enriquecido
    readings_summary?: {
      n_readings?: number
      dominant_frames?: { frame: string; count: number }[]
      avg_controversy?: number
      avg_political_risk?: number
      avg_confidence?: number
      top_beneficiaries?: { actor: string; count: number }[]
      top_affected?: { actor: string; count: number }[]
      action_verbs?: { verb: string; count: number }[]
    }
    source_methodology?: {
      selected_sources?: number
      balance_mode?: string
      ideological_balance_score?: number
      warnings?: string[]
    }
    // Sprint M4 · contexto enriquecido NewsAPI search
    narrative_clusters?: Array<{
      title: string
      frame_type: string
      main_topic: string
      dominant_actors: string[]
      benefited_actors: string[]
      harmed_actors: string[]
      ideological_spread?: { left: number; center: number; right: number; balanced: boolean }
      velocity_score?: number
      acceleration_score?: number
      controversy_score?: number
      confidence?: { overall: number }
      why_this_is_a_narrative?: string
    }>
    framing_comparison?: Array<{
      bucket: string
      count: number
      dominant_topics?: { topic: string; count: number }[]
      dominant_frames?: { frame: string; count: number }[]
      actors_emphasized?: { actor: string; mentions: number }[]
      actors_omitted?: string[]
      average_tone?: number
      controversy_score?: number
      distinctive_terms?: { term: string; lift: number }[]
      interpretation?: string
    }>
    actor_impacts?: Array<{
      actor: string
      mentions: number
      dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
      beneficial: number
      harmful: number
      neutral: number
      uncertain: number
      sample_reasons?: string[]
    }>
    analysis_warnings?: Array<{
      level: 'info' | 'warning' | 'critical'
      category: string
      message: string
    }>
    coverage_gaps?: Array<{
      topic: string
      interpretation?: string
    }>
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
  // Sprint M1 · meter readings_summary y source_methodology si vienen
  if (c.readings_summary) {
    const rs = c.readings_summary
    lines.push('')
    lines.push('Lectura estructurada (ArticleReading):')
    if (rs.n_readings != null) lines.push(`  · ${rs.n_readings} artículos leídos estructuradamente`)
    if (rs.dominant_frames?.length) lines.push(`  · Frames dominantes: ${rs.dominant_frames.slice(0, 5).map((f) => `${f.frame}(${f.count})`).join(', ')}`)
    if (rs.avg_controversy != null) lines.push(`  · Controversia media: ${rs.avg_controversy.toFixed(0)}/100`)
    if (rs.avg_political_risk != null) lines.push(`  · Riesgo político medio: ${rs.avg_political_risk.toFixed(0)}/100`)
    if (rs.avg_confidence != null) lines.push(`  · Confianza metodológica media: ${(rs.avg_confidence * 100).toFixed(0)}%`)
    if (rs.action_verbs?.length) lines.push(`  · Acciones dominantes: ${rs.action_verbs.slice(0, 6).map((a) => `${a.verb}(${a.count})`).join(', ')}`)
    if (rs.top_beneficiaries?.length) lines.push(`  · Actores beneficiados: ${rs.top_beneficiaries.slice(0, 5).map((a) => `${a.actor}(${a.count})`).join(', ')}`)
    if (rs.top_affected?.length) lines.push(`  · Actores perjudicados: ${rs.top_affected.slice(0, 5).map((a) => `${a.actor}(${a.count})`).join(', ')}`)
  }
  if (c.source_methodology) {
    const sm = c.source_methodology
    lines.push('')
    lines.push('Metodología de fuentes:')
    if (sm.selected_sources != null) lines.push(`  · ${sm.selected_sources} fuentes seleccionadas con modo "${sm.balance_mode || 'pluralism'}"`)
    if (sm.ideological_balance_score != null) lines.push(`  · Balance ideológico: ${(sm.ideological_balance_score * 100).toFixed(0)}% (1=perfecto)`)
    if (sm.warnings?.length) {
      lines.push('  · Advertencias de muestra:')
      for (const w of sm.warnings.slice(0, 3)) lines.push(`    - ${w}`)
    }
  }
  // Sprint M4 · contexto enriquecido NewsAPI search
  if (c.narrative_clusters?.length) {
    lines.push('')
    lines.push(`Narrativas detectadas (${c.narrative_clusters.length}):`)
    for (const n of c.narrative_clusters.slice(0, 6)) {
      lines.push(`  · "${n.title}" · frame ${n.frame_type} · topic ${n.main_topic}`)
      if (n.dominant_actors?.length) lines.push(`    · actores: ${n.dominant_actors.slice(0, 4).join(', ')}`)
      if (n.harmed_actors?.length) lines.push(`    · perjudicados: ${n.harmed_actors.slice(0, 3).join(', ')}`)
      if (n.benefited_actors?.length) lines.push(`    · beneficiados: ${n.benefited_actors.slice(0, 3).join(', ')}`)
      if (n.ideological_spread) {
        const sp = n.ideological_spread
        lines.push(`    · spread ideo: izq ${(sp.left * 100).toFixed(0)}% centro ${(sp.center * 100).toFixed(0)}% der ${(sp.right * 100).toFixed(0)}% · ${sp.balanced ? 'balanceada' : 'sesgada'}`)
      }
      if (n.velocity_score != null) lines.push(`    · velocity ${n.velocity_score.toFixed(2)} art/h · accel ${((n.acceleration_score || 0) * 100).toFixed(0)}%`)
      if (n.why_this_is_a_narrative) lines.push(`    · por qué: ${n.why_this_is_a_narrative.slice(0, 200)}`)
    }
  }
  if (c.framing_comparison?.length) {
    lines.push('')
    lines.push('Comparación ideológica de framing:')
    for (const b of c.framing_comparison) {
      lines.push(`  · ${b.bucket} (${b.count} arts, tono ${((b.average_tone ?? 0) * 100).toFixed(0)}%, controv ${b.controversy_score ?? 0})`)
      if (b.dominant_frames?.length) lines.push(`    · frames: ${b.dominant_frames.slice(0, 3).map((f) => `${f.frame}(${f.count})`).join(', ')}`)
      if (b.actors_emphasized?.length) lines.push(`    · enfatiza: ${b.actors_emphasized.slice(0, 4).map((a) => `${a.actor}(${a.mentions})`).join(', ')}`)
      if (b.actors_omitted?.length) lines.push(`    · OMITE: ${b.actors_omitted.slice(0, 3).join(', ')}`)
      if (b.distinctive_terms?.length) lines.push(`    · vocab distintivo: ${b.distinctive_terms.slice(0, 3).map((t) => `${t.term}(lift ${t.lift})`).join(', ')}`)
    }
  }
  if (c.actor_impacts?.length) {
    lines.push('')
    lines.push(`Actores e impacto político (top ${Math.min(c.actor_impacts.length, 8)}):`)
    for (const a of c.actor_impacts.slice(0, 8)) {
      lines.push(`  · ${a.actor}: ${a.mentions} menciones · ${a.dominant_impact.toUpperCase()} dominante (b${a.beneficial}/h${a.harmful}/n${a.neutral}/u${a.uncertain})`)
      if (a.sample_reasons?.length) lines.push(`    · razón muestra: "${a.sample_reasons[0].slice(0, 100)}"`)
    }
  }
  if (c.coverage_gaps?.length) {
    lines.push('')
    lines.push('Gaps de cobertura detectados:')
    for (const g of c.coverage_gaps.slice(0, 4)) lines.push(`  · ${g.topic}: ${g.interpretation || ''}`)
  }
  if (c.analysis_warnings?.length) {
    lines.push('')
    lines.push('ADVERTENCIAS METODOLÓGICAS (citar al final del análisis):')
    for (const w of c.analysis_warnings.slice(0, 5)) {
      lines.push(`  · [${w.level.toUpperCase()}] ${w.message}`)
    }
  }
  lines.push('')
  lines.push('Produce un análisis estructurado en español con este formato exacto:')
  lines.push('')
  // Sprint M4 · formato extendido cuando hay contexto rico
  const richContext = !!(c.narrative_clusters?.length || c.framing_comparison?.length || c.actor_impacts?.length)
  if (richContext) {
    lines.push('**1. Resumen ejecutivo:** [una frase ejecutiva, máximo 30 palabras]')
    lines.push('')
    lines.push('**2. Qué está pasando:** [2-3 frases describiendo el cuadro general usando los datos]')
    lines.push('')
    lines.push('**3. Narrativas dominantes:**')
    lines.push('- [narrativa 1 · frame · qué actores · evidencia]')
    lines.push('- [narrativa 2 · frame · qué actores · evidencia]')
    lines.push('- [narrativa 3 · si aplica]')
    lines.push('')
    lines.push('**4. Actores que ganan / pierden:** [enumerar usando actor_impacts · cita beneficial/harmful con counts]')
    lines.push('')
    lines.push('**5. Diferencias de framing ideológico:** [usando framing_comparison · qué enfatiza/omite cada bloque · vocabulario distintivo]')
    lines.push('')
    lines.push('**6. Riesgos de interpretación:** [usar analysis_warnings · sesgos de muestra · cobertura asimétrica · limitaciones]')
    lines.push('')
    lines.push('**7. Qué vigilar en 24-72h:** [qué actor/tema/evento monitorizar · 1-2 frases concretas]')
    lines.push('')
    lines.push('REGLAS ESTRICTAS:')
    lines.push('- NO inventes datos · cita SOLO lo que está en el briefing.')
    lines.push('- Distingue hallazgos fuertes (≥5 evidencias, conf alta) de hipótesis (1-2 evidencias, conf media-baja).')
    lines.push('- Si un bloque ideológico tiene muestra muy pequeña, dilo explícitamente.')
    lines.push('- Si analysis_warnings señala sesgos, INCLÚYELOS en sección 6.')
    lines.push('- Cita números concretos cuando los tengas (n mensiones, % balance, controversy score).')
    lines.push('- Tono profesional analítico, sin opinión partidista.')
    lines.push('- NO uses emoticonos. NO uses negritas decorativas dentro del cuerpo · sólo en los headers numerados.')
    return lines.join('\n')
  }
  // Formato legacy más corto para contexto pobre
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
  const startedAt = Date.now()
  let body: LecturaRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'invalid JSON body',
      _meta: buildMeta({ source: 'error', startedAt, warnings: ['JSON parse failed'] }),
    }, { status: 400 })
  }
  if (!body.context) {
    return NextResponse.json({
      ok: false,
      error: 'context required',
      _meta: buildMeta({ source: 'error', startedAt, warnings: ['context missing'] }),
    }, { status: 400 })
  }
  try {
    const prompt = buildPrompt(body)
    const text = await generateText({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
      temperature: 0.3,
    })
    // confianza · escala según riqueza del contexto
    const c = body.context
    const richSignals =
      (c.readings_summary ? 1 : 0) +
      (c.source_methodology ? 1 : 0) +
      (c.narrative_clusters?.length ? 1 : 0) +
      (c.framing_comparison?.length ? 1 : 0) +
      (c.actor_impacts?.length ? 1 : 0) +
      (c.analysis_warnings?.length ? 0.5 : 0)
    const confidence = Math.min(0.95, 0.45 + richSignals * 0.10)
    return NextResponse.json({
      ok: true,
      tabId: body.tabId,
      query: body.query,
      generated_by_llm: true,
      disclaimer: 'Generado por IA · revisar antes de citar · Politeia · CLAUDE.md A2',
      lectura: text,
      generated_at: new Date().toISOString(),
      _meta: buildMeta({
        source: 'live',
        startedAt,
        confidence,
        articles_read: body.context.n_articles,
        warnings: richSignals >= 2 ? [] : ['Lectura con contexto pobre · considera enviar narrative_clusters + framing_comparison + actor_impacts'],
      }),
    })
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200)
    return NextResponse.json({
      ok: false,
      error: msg,
      generated_by_llm: false,
      hint: 'Verifica AI_CONFIG · ANTHROPIC_API_KEY / GROQ_API_KEY / OPENAI_API_KEY en Vercel env',
      _meta: buildMeta({ source: 'error', startedAt, warnings: [msg] }),
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
