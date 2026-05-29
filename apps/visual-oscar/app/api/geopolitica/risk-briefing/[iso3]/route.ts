/**
 * /api/geopolitica/risk-briefing/[iso3] · Sprint G17 item 7
 *
 * Briefing IA-generado para SubBriefing del drawer de Riesgo País.
 * El usuario pidió explícitamente: "el briefing funcione con gemini y dé
 * información de por qué esa cifra de riesgo".
 *
 * Estrategia:
 *   1. Cargar país-profile (11 capas: identity, government, conflict,
 *      economic, sanctions, travel, concerns, etc.) como CONTEXTO.
 *   2. Construir prompt en español que pida explicar:
 *      - Por qué el IRPC tiene ese valor (qué componentes lo empujan)
 *      - Top 3 riesgos prioritarios para el analista España
 *      - Qué vigilar próximos 30 días
 *      - Implicaciones operativas/comerciales para empresas españolas
 *   3. withCascade · Gemini → Groq → heurístico fallback.
 *   4. Devolver markdown + metadata de qué modelo respondió.
 *
 * Cache: s-maxage=3600 (briefings cambian con baja frecuencia, evita
 * hammer al LLM).
 */
import { NextRequest, NextResponse } from 'next/server'
import { withCascade, AiUnavailableError } from '@/lib/ai'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface ProfileLite {
  country_name?: string
  layers?: {
    identity?: { region?: string | null; population?: number | null; capital?: string | null }
    government?: { head_of_state?: string | null; head_of_government?: string | null; form_of_government?: string | null }
    economic?: {
      gdp_growth_pct_latest?: number | null
      inflation_pct_latest?: number | null
      unemployment_pct_latest?: number | null
      debt_pct_gdp_latest?: number | null
      economic_health?: string
      alerts?: string[]
    } | null
    conflict?: { max_intensity_level?: number; interpretation?: string } | null
    sanctions?: { total_count?: number } | null
    travel?: { score?: number; band?: string } | null
    concerns?: {
      total?: number
      by_severity?: Record<string, number>
      concerns?: Array<{ rank: number; title: string; severity: string; category: string }>
    } | null
    risk?: { score?: number; band?: string; baseline_risk?: number; uplift?: number } | null
  }
}

function buildPrompt(iso3: string, profile: ProfileLite | null, coordName: string): string {
  // G23 fix · usar SIEMPRE nombre completo del país (no iso3) para evitar ambigüedades.
  // Bug previo: ISO3 "CAN" → LLM interpretaba como "Comunidad Andina de Naciones"
  // en lugar de Canadá. Idem CHN/CHE/etc. ambiguos.
  const fullName = coordName || profile?.country_name || iso3
  if (!profile?.country_name) {
    return `Genera briefing geopolítico ejecutivo (200-300 palabras) en español sobre el país ${fullName} (código ISO3 ${iso3}). Atención: NO confundir el código ISO3 con ningún acrónimo organizacional. Incluye: situación actual, riesgos top 3, implicaciones España.`
  }
  const name = fullName
  const layers = profile?.layers ?? {}
  const lines: string[] = []
  lines.push(`Datos del país ${name} (ISO3 ${iso3}):`)
  if (layers.identity) {
    lines.push(`- Región: ${layers.identity.region ?? '?'} · Capital: ${layers.identity.capital ?? '?'} · Población: ${layers.identity.population?.toLocaleString('es-ES') ?? '?'}`)
  }
  if (layers.government) {
    lines.push(`- Jefe Estado: ${layers.government.head_of_state ?? '?'} · Jefe Gobierno: ${layers.government.head_of_government ?? '?'} · Forma: ${layers.government.form_of_government ?? '?'}`)
  }
  if (layers.risk) {
    lines.push(`- Risk score Politeia: ${layers.risk.score ?? '?'}/100 (banda ${layers.risk.band ?? '?'}). Baseline curado=${layers.risk.baseline_risk ?? '?'} + uplift por eventos recientes=${layers.risk.uplift ?? '?'}.`)
  }
  if (layers.economic) {
    const e = layers.economic
    lines.push(`- Macro World Bank: PIB ${e.gdp_growth_pct_latest ?? '?'}% · IPC ${e.inflation_pct_latest ?? '?'}% · paro ${e.unemployment_pct_latest ?? '?'}% · deuda ${e.debt_pct_gdp_latest ?? '?'}% PIB · salud=${e.economic_health ?? '?'}`)
    if ((e.alerts?.length ?? 0) > 0) lines.push(`- Alertas macro: ${e.alerts!.join(' | ')}`)
  }
  if (layers.conflict && layers.conflict.max_intensity_level !== undefined && layers.conflict.max_intensity_level > 0) {
    lines.push(`- Conflicto UCDP: intensidad ${layers.conflict.max_intensity_level}/5. ${layers.conflict.interpretation ?? ''}`)
  }
  if (layers.sanctions && (layers.sanctions.total_count ?? 0) > 0) {
    lines.push(`- Sanciones OpenSanctions: ${layers.sanctions.total_count} entidades.`)
  }
  if (layers.travel && (layers.travel.score ?? 0) >= 2) {
    lines.push(`- Travel Advisory: ${layers.travel.band} (${layers.travel.score}/5).`)
  }
  if (layers.concerns && (layers.concerns.total ?? 0) > 0) {
    const top = layers.concerns.concerns?.slice(0, 5) ?? []
    if (top.length) {
      lines.push(`- Top concerns multi-fuente (${layers.concerns.total}):`)
      for (const c of top) lines.push(`  · ${c.rank}. [${c.severity}] ${c.title} (${c.category})`)
    }
  }
  return `Eres analista geopolítico senior para una firma de inteligencia estratégica española.

${lines.join('\n')}

Redacta un briefing ejecutivo en ESPAÑOL (350-450 palabras) con esta estructura exacta usando títulos en negrita:

**Por qué el risk score está en ${layers.risk?.score ?? '?'}/100.** Explica QUÉ COMPONENTES lo empujan al alza (baseline + uplift) y QUÉ FRENA. Sé específico (V-Dem, GDELT, ACLED equivalentes, conflicto activo, alertas macro). 60-100 palabras.

**Top 3 riesgos prioritarios.** Lista numerada concisa: para cada riesgo identifica naturaleza (político/macro/conflicto/sanciones/social) y horizonte temporal (días/semanas/meses). 80-120 palabras.

**Qué vigilar próximos 30 días.** Lista de 3-5 señales tempranas concretas (declaraciones de gobierno, votaciones legislativas, datos macro venideros, fechas electorales, riesgos sectoriales). 60-100 palabras.

**Implicaciones España.** Riesgos para empresas españolas presentes en el país (sectores afectados, infraestructura, contratos, ciudadanos), oportunidades estratégicas si las hay, y recomendación clara (suspender / cautela / proceder con due diligence / oportunidad). 80-120 palabras.

Sin emojis. Sin asteriscos en el cuerpo (solo en los títulos negrita). Lenguaje analítico institucional. Si te falta dato, dilo explícitamente ("dato no disponible"); no inventes cifras.`
}

export async function GET(req: NextRequest, { params }: { params: { iso3: string } }) {
  const startedAt = new Date().toISOString()
  const iso3 = (params.iso3 || '').toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json(
      { ok: false, error: `iso3_unknown · ${iso3}` },
      { status: 404 },
    )
  }
  const origin = req.nextUrl.origin

  // Cargar perfil país (FIX-A6/A7/B1 lo dejaron rico)
  let profile: ProfileLite | null = null
  try {
    const r = await fetch(`${origin}/api/geopolitica/country-profile/${iso3}`, {
      cache: 'force-cache',
    })
    if (r.ok) profile = (await r.json()) as ProfileLite
  } catch {
    /* sin profile · prompt genérico */
  }

  const prompt = buildPrompt(iso3, profile, coord.name_es)
  try {
    const cascade = await withCascade(async (client) => {
      return await client.generateText({
        messages: [{ role: 'user', content: prompt }],
        tier: 'premium', // queremos calidad analítica
        temperature: 0.4,
        maxTokens: 1100,
      })
    })
    return NextResponse.json(
      {
        ok: true,
        iso3,
        country: coord.name_es,
        briefing: cascade.result,
        provider: cascade.provider,
        model: cascade.modelHint,
        generated_at: startedAt,
        _meta: {
          source: 'AI cascade Gemini → Groq',
          prompt_chars: prompt.length,
          cache_ttl_seconds: 3600,
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' },
      },
    )
  } catch (err: unknown) {
    // Fallback heurístico para que el sub-tab nunca quede vacío
    const isUnavailable = err instanceof AiUnavailableError
    const layers = profile?.layers ?? {}
    const fallback: string[] = []
    fallback.push(`**Por qué el risk score está en ${layers.risk?.score ?? '?'}/100.**`)
    fallback.push(
      `Combinación de baseline curado (${layers.risk?.baseline_risk ?? '?'}/100) y uplift por eventos recientes (${layers.risk?.uplift ?? '?'}). ` +
      (layers.economic?.economic_health
        ? `La salud macro está clasificada como "${layers.economic.economic_health}". `
        : '') +
      (layers.conflict?.interpretation ? `${layers.conflict.interpretation}. ` : ''),
    )
    fallback.push('')
    fallback.push('**Top 3 riesgos prioritarios.**')
    if (layers.concerns?.concerns?.length) {
      layers.concerns.concerns.slice(0, 3).forEach((c, i) => {
        fallback.push(`${i + 1}. [${c.severity}] ${c.title} · categoría ${c.category}.`)
      })
    } else {
      fallback.push('1. Sin concerns multi-fuente detectados — país en banda estable.')
    }
    fallback.push('')
    fallback.push('**Qué vigilar próximos 30 días.** Eventos macro programados, declaraciones de gobierno, votaciones legislativas relevantes, cobertura GDELT con tono < -3.')
    fallback.push('')
    fallback.push('**Implicaciones España.** Análisis cualitativo individual no disponible automatizado. Consultar drawer completo en /geopolitica/pais/' + iso3.toLowerCase())
    return NextResponse.json(
      {
        ok: true,
        iso3,
        country: coord.name_es,
        briefing: fallback.join('\n'),
        provider: 'heuristic-fallback',
        model: 'heuristic',
        warning: isUnavailable
          ? 'Cascade Gemini→Groq no disponible · fallback heurístico desde capas del profile.'
          : (err instanceof Error ? err.message.slice(0, 200) : 'unknown_ai_error'),
        generated_at: startedAt,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
      },
    )
  }
}
