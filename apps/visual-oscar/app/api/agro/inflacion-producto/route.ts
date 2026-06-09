/**
 * GET /api/agro/inflacion-producto
 *
 * Inflación por GRUPO DE PRODUCTO alimentario (Eurostat HICP prc_hicp_manr,
 * tasa anual) para los 8 subgrupos COICOP de alimentación: pan y cereales,
 * carne, pescado, lácteos/huevos, aceites y grasas, fruta, hortalizas y azúcar/
 * chocolate. España vs UE-27, con serie de 13 meses para sparkline, y un
 * análisis Gemini de las CAUSAS de cada movimiento (degradación honesta si
 * Gemini no responde: se muestran los datos sin el análisis).
 *
 * Eurostat es público y fiable. Cero datos inventados.
 */
import { NextResponse } from 'next/server'
import { generateJSON } from '@/lib/ai/gemini-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr'

const GRUPOS: Array<{ coicop: string; nombre: string; productos: string }> = [
  { coicop: 'CP0111', nombre: 'Pan y cereales', productos: 'trigo, harina, pan, pasta, arroz' },
  { coicop: 'CP0112', nombre: 'Carne', productos: 'porcino, vacuno, aves, ovino' },
  { coicop: 'CP0113', nombre: 'Pescado y marisco', productos: 'pesca y acuicultura' },
  { coicop: 'CP0114', nombre: 'Leche, queso y huevos', productos: 'lácteos, huevos' },
  { coicop: 'CP0115', nombre: 'Aceites y grasas', productos: 'aceite de oliva, girasol, mantequilla' },
  { coicop: 'CP0116', nombre: 'Fruta', productos: 'cítricos, fruta de hueso, frutos rojos' },
  { coicop: 'CP0117', nombre: 'Hortalizas y legumbres', productos: 'tomate, patata, hortícolas' },
  { coicop: 'CP0118', nombre: 'Azúcar, chocolate y confitería', productos: 'azúcar, cacao, confitería' },
]

interface Punto {
  time: string
  value: number | null
}

async function hicp(coicop: string, geo: string, n: number): Promise<Punto[] | null> {
  const url = `${EUROSTAT}?format=JSON&unit=RCH_A&coicop=${coicop}&geo=${geo}&lastTimePeriod=${n}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Politeia-Analitica/1.0' }, signal: ctrl.signal, next: { revalidate: 21600 } })
    clearTimeout(timer)
    if (!r.ok) return null
    const j = await r.json()
    const idx: Record<string, number> | undefined = j?.dimension?.time?.category?.index
    const vals: Record<string, number> | undefined = j?.value
    if (!idx || !vals) return null
    const times = Object.entries(idx).sort((a, b) => a[1] - b[1]).map(([c]) => c)
    return times.map((t, i) => ({ time: t, value: typeof vals[i] === 'number' ? vals[i] : null }))
  } catch {
    clearTimeout(timer)
    return null
  }
}

function last(pts: Punto[] | null): number | null {
  if (!pts) return null
  const v = [...pts].reverse().find((p) => p.value != null)
  return v ? (v.value as number) : null
}

interface CausaItem {
  grupo: string
  causa: string
}
const CAUSAS_SCHEMA = {
  type: 'object',
  properties: {
    causas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          grupo: { type: 'string', description: 'Nombre exacto del grupo (igual al de entrada)' },
          causa: { type: 'string', description: 'Causa concreta del movimiento de precios de ese grupo en España (1-2 frases, factores verificables: clima, energía, sanidad animal, mercados internacionales, márgenes)' },
        },
        required: ['grupo', 'causa'],
      },
    },
    resumen: { type: 'string', description: 'Resumen de 2-3 frases del cuadro de inflación alimentaria en España' },
  },
  required: ['causas', 'resumen'],
}

export async function GET() {
  const N = 13
  const results = await Promise.all(
    GRUPOS.map(async (g) => {
      const [es, eu] = await Promise.all([hicp(g.coicop, 'ES', N), hicp(g.coicop, 'EU27_2020', N)])
      return {
        coicop: g.coicop,
        nombre: g.nombre,
        productos: g.productos,
        es_series: es ?? [],
        es_latest: last(es),
        eu_latest: last(eu),
        es_periodo: es && es.length ? es[es.length - 1].time : null,
      }
    })
  )
  const conDato = results.filter((r) => r.es_latest != null)
  if (conDato.length === 0) {
    return NextResponse.json(
      { ok: false, data: null, fuente: 'Eurostat HICP', fuentes_error: ['Eurostat HICP sin respuesta'] },
      { headers: { 'Cache-Control': 's-maxage=600' } }
    )
  }

  // Análisis Gemini de causas (degradable).
  let causas: CausaItem[] = []
  let resumen = ''
  let generated_by_llm = false
  try {
    const prompt =
      'Tasa de inflación anual (HICP) por grupo de alimentos en España (último dato):\n' +
      conDato.map((r) => `- ${r.nombre}: ${r.es_latest! > 0 ? '+' : ''}${r.es_latest}% (UE-27: ${r.eu_latest != null ? r.eu_latest + '%' : 's/d'})`).join('\n') +
      '\n\nExplica brevemente la causa concreta del movimiento de precios de CADA grupo en España (factores verificables: clima/sequía, costes energéticos y de piensos, sanidad animal —gripe aviar, PPA—, mercados internacionales, márgenes de distribución, normalización tras picos previos como el aceite de oliva). Devuelve JSON con la forma del schema. Sé concreto y no inventes cifras nuevas.'
    const out = await generateJSON<{ causas: CausaItem[]; resumen: string }>({
      system: 'Eres un analista de mercados agroalimentarios españoles. Explicas causas de inflación alimentaria con factores verificables, tono profesional, sin emojis.',
      messages: [{ role: 'user', content: prompt }],
      jsonSchema: CAUSAS_SCHEMA,
      temperature: 0.3,
      maxTokens: 900,
    })
    causas = out.causas || []
    resumen = out.resumen || ''
    generated_by_llm = true
  } catch {
    causas = []
    resumen = ''
  }

  // Adjuntar la causa a cada grupo por nombre.
  const causaByNombre = new Map(causas.map((c) => [c.grupo.toLowerCase().trim(), c.causa]))
  const grupos = results.map((r) => ({
    ...r,
    causa: causaByNombre.get(r.nombre.toLowerCase().trim()) ?? null,
  }))

  return NextResponse.json(
    {
      ok: true,
      data: { grupos, resumen, n_con_dato: conDato.length },
      fuente: 'Eurostat · HICP prc_hicp_manr (tasa anual)' + (generated_by_llm ? ' + Gemini (causas)' : ''),
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table',
      generated_by_llm,
      modelo: generated_by_llm ? process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite' : null,
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}
