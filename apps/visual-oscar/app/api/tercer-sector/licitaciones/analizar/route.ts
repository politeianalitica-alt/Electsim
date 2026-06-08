/**
 * /api/tercer-sector/licitaciones/analizar · TS-Deep B2.
 *
 * Analisis de pliegos de licitacion: DETERMINISTA PRIMERO, LLM DESPUES.
 *
 * Pipeline:
 *   1. Descarga el documento (PDF/DOCX/XLSX/HTML/TXT).
 *   2. Extraccion DETERMINISTA por regex (analizar-determinista.ts):
 *      CPV, presupuesto, plazos, criterios, solvencia, elegibilidad,
 *      clausulas sociales, lotes, garantias.
 *   3. Si GEMINI_API_KEY disponible, llama al LLM para campos restantes
 *      (resumen, interpretacion, campos que regex no extrajo).
 *   4. MERGE: campos deterministas prevalecen. Si regex y LLM discrepan,
 *      se marcan AMBOS valores con flag de conflicto.
 *   5. Scoring de aptitud ONG (analizar-determinista.ts::scoreAptitudOng)
 *      basado en los campos EXTRAIDOS (no inventados).
 *
 * Regla: "no declares aptitud si no puedes ensenar evidencia".
 *
 * Metodo: POST.
 *   Body: { "url": "...", "titulo"?, "comprador"?, "noCache"? }
 *       o { "urls": [...], "titulo"?, "comprador"?, "noCache"? }
 *
 * LEY VERCEL HOBBY: maxDuration=60 (config existente, NO crear nueva).
 */
import { NextResponse } from 'next/server'
import {
  analizarPliego,
  fetchDocumento,
  convertirATexto,
  recortarTexto,
  type AnalizarPliegoResponse,
} from '@/lib/tercer-sector/analizar-pliego'
import {
  extractDeterminista,
  scoreAptitudOng,
  classifyDocumento,
  prioritizeDocuments,
  type DeterministicResult,
} from '@/lib/tercer-sector/analizar-determinista'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_URLS = 5

interface AnalizarBody {
  url?: unknown
  urls?: unknown
  titulo?: unknown
  comprador?: unknown
  noCache?: unknown
}

const META = {
  source: 'determinista+gemini',
  source_label:
    'Analisis de pliegos: extraccion regex determinista + Google Gemini (si disponible)',
  env_hint: 'GEMINI_API_KEY',
  note:
    'Campos extraidos por regex primero (CPV, presupuesto, plazos, criterios, elegibilidad, ' +
    'clausulas sociales, lotes). LLM solo para campos restantes. Si discrepan, se marcan conflictos.',
} as const

function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

/**
 * Analiza UN documento: determinista primero, LLM despues, merge con conflictos.
 */
async function analizarConDeterminista(
  url: string,
  opts: { titulo?: string; comprador?: string; noCache?: boolean },
): Promise<{
  ok: boolean
  determinista: DeterministicResult | null
  llm: AnalizarPliegoResponse | null
  merged: Record<string, unknown>
  conflictos: { campo: string; valor_regex: unknown; valor_llm: unknown }[]
  aptitud_ong: {
    score: number
    label: string
    razones: string[]
    blockers: string[]
    recomendacion: string
  }
  campos_extraidos_por_regex: string[]
  campos_extraidos_por_llm: string[]
  campos_no_encontrados: string[]
  source_url: string
  fetched_at: string
  generated_by_llm: boolean
}> {
  const fetched_at = new Date().toISOString()
  let detResult: DeterministicResult | null = null
  let llmResult: AnalizarPliegoResponse | null = null
  const conflictos: { campo: string; valor_regex: unknown; valor_llm: unknown }[] = []

  // ── Step 1: Download document ────────────────────────────────────────
  const doc = await fetchDocumento(url)

  // ── Step 2: Deterministic extraction ─────────────────────────────────
  if (doc.ok && doc.bytes) {
    let texto = ''
    if (doc.formato === 'pdf') {
      // For PDF, try text extraction (some PDFs are text-based)
      // convertirATexto handles non-PDF; for PDF we attempt basic text extraction
      const textVersion = new TextDecoder('utf-8', { fatal: false }).decode(doc.bytes)
      // Check if it has enough readable text (not just binary PDF)
      const readableChars = textVersion.replace(/[^\x20-\x7E\xC0-\xFF]/g, '')
      if (readableChars.length > 200) {
        texto = recortarTexto(readableChars)
      }
    } else {
      const conv = await convertirATexto(doc.bytes, doc.formato)
      if (conv.ok && conv.texto) {
        texto = recortarTexto(conv.texto)
      }
    }

    if (texto.length > 50) {
      detResult = extractDeterminista(texto)
    }
  }

  // ── Step 3: LLM analysis (if key available) ──────────────────────────
  const hasGeminiKey = !!process.env.GEMINI_API_KEY
  if (hasGeminiKey) {
    try {
      llmResult = await analizarPliego(url, {
        titulo: opts.titulo,
        comprador: opts.comprador,
        noCache: opts.noCache,
      })
    } catch {
      // LLM failed - continue with deterministic only
      llmResult = null
    }
  }

  // ── Step 4: Merge ────────────────────────────────────────────────────
  const campos_regex = detResult?.campos_extraidos ?? []
  const campos_llm: string[] = []
  const campos_no_encontrados: string[] = []
  const merged: Record<string, unknown> = {}

  // Start with deterministic fields (they have evidence)
  if (detResult) {
    if (detResult.expediente.cpv?.length) merged['cpv'] = detResult.expediente.cpv
    if (detResult.economia.presupuesto_base_eur != null)
      merged['presupuesto_base_eur'] = detResult.economia.presupuesto_base_eur
    if (detResult.economia.valor_estimado_eur != null)
      merged['valor_estimado_eur'] = detResult.economia.valor_estimado_eur
    if (detResult.plazos.presentacion) merged['plazo_presentacion'] = detResult.plazos.presentacion
    if (detResult.plazos.ejecucion) merged['plazo_ejecucion'] = detResult.plazos.ejecucion
    if (detResult.plazos.dias_restantes != null)
      merged['dias_restantes'] = detResult.plazos.dias_restantes
    if (detResult.criterios.length) merged['criterios_adjudicacion'] = detResult.criterios
    if (detResult.solvencia.economica || detResult.solvencia.tecnica)
      merged['solvencia'] = detResult.solvencia
    merged['elegibilidad'] = detResult.elegibilidad
    merged['clausulas_sociales'] = detResult.clausulas_sociales
    if (detResult.garantias.provisional || detResult.garantias.definitiva)
      merged['garantias'] = detResult.garantias
    if (detResult.lotes.length) merged['lotes'] = detResult.lotes
  }

  // Add LLM fields that deterministic didn't extract
  if (llmResult?.ok && llmResult.data) {
    const llmData = llmResult.data as Record<string, unknown>
    for (const [key, val] of Object.entries(llmData)) {
      if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) continue
      campos_llm.push(key)

      // Check for conflicts with deterministic values
      if (key in merged) {
        const regexVal = merged[key]
        // Only flag conflict if values are meaningfully different
        const regexStr = JSON.stringify(regexVal)
        const llmStr = JSON.stringify(val)
        if (regexStr !== llmStr) {
          conflictos.push({ campo: key, valor_regex: regexVal, valor_llm: val })
        }
        // Deterministic prevails — don't overwrite
      } else {
        // LLM adds fields that regex didn't find
        merged[key] = val
      }
    }
  }

  // Track what wasn't found by either method
  const allPossible = [
    'cpv',
    'presupuesto_base_eur',
    'valor_estimado_eur',
    'plazo_presentacion',
    'plazo_ejecucion',
    'criterios_adjudicacion',
    'solvencia',
    'elegibilidad',
    'clausulas_sociales',
    'garantias',
    'lotes',
  ]
  for (const f of allPossible) {
    if (!(f in merged) || merged[f] == null) {
      campos_no_encontrados.push(f)
    }
  }

  // ── Step 5: Scoring ──────────────────────────────────────────────────
  const docName = url.split('/').pop() || ''
  const docTipo = classifyDocumento(docName)
  const hasPcap = docTipo === 'pcap'
  const hasPpt = docTipo === 'ppt'

  const aptitud = detResult
    ? scoreAptitudOng(detResult, {
        titulo: opts.titulo || '',
        hasPcap,
        hasPpt,
        hasDocumentos: doc.ok,
      })
    : {
        score: 0,
        label: 'incierta' as const,
        razones: ['No se pudo extraer texto del documento.'],
        blockers: ['Sin texto analizable.'],
        recomendacion: 'Revisar el documento manualmente.',
      }

  return {
    ok: detResult !== null || (llmResult?.ok ?? false),
    determinista: detResult,
    llm: llmResult,
    merged,
    conflictos,
    aptitud_ong: aptitud,
    campos_extraidos_por_regex: campos_regex,
    campos_extraidos_por_llm: campos_llm,
    campos_no_encontrados,
    source_url: url,
    fetched_at,
    generated_by_llm: llmResult?.ok ?? false,
  }
}

export async function POST(req: Request) {
  const fetched_at = new Date().toISOString()

  let body: AnalizarBody
  try {
    body = (await req.json()) as AnalizarBody
  } catch {
    return NextResponse.json(
      { ok: false, error: 'json_invalido', fetched_at, _meta: META },
      { status: 200 },
    )
  }

  const titulo = asString(body.titulo)
  const comprador = asString(body.comprador)
  const noCache = body.noCache === true

  // ── Batch mode: { urls: [...] } ──────────────────────────────────────
  if (Array.isArray(body.urls)) {
    const urls = body.urls
      .map((u) => asString(u))
      .filter((u): u is string => Boolean(u))
      .slice(0, MAX_URLS)

    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'urls_vacias', fetched_at, _meta: META },
        { status: 200 },
      )
    }

    // Prioritize documents if we can classify them
    const docsWithUrl = urls.map((url) => ({
      nombre: url.split('/').pop() || url,
      url,
    }))
    const sorted = prioritizeDocuments(docsWithUrl)

    try {
      const resultados = await Promise.all(
        sorted.map((d) =>
          analizarConDeterminista(d.url, { titulo, comprador, noCache }),
        ),
      )

      return NextResponse.json(
        {
          ok: resultados.some((r) => r.ok),
          resultados,
          documento_prioritario: sorted[0]?.nombre || null,
          orden_analisis: sorted.map((d) => ({
            nombre: d.nombre,
            tipo: classifyDocumento(d.nombre),
          })),
          fetched_at,
          _meta: META,
        },
        { status: 200 },
      )
    } catch (e: unknown) {
      return NextResponse.json(
        {
          ok: false,
          error: String((e as Error)?.message ?? e),
          fetched_at,
          _meta: META,
        },
        { status: 200 },
      )
    }
  }

  // ── Single mode: { url: "..." } ──────────────────────────────────────
  const url = asString(body.url)
  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        error: 'falta_url',
        nota: 'Envia { url } o { urls: [] } con la(s) URL(s) del/los documento(s) de licitacion.',
        fetched_at,
        _meta: META,
      },
      { status: 200 },
    )
  }

  try {
    const res = await analizarConDeterminista(url, { titulo, comprador, noCache })
    return NextResponse.json({ ...res, _meta: META }, { status: 200 })
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: url,
        generated_by_llm: false,
        _meta: META,
      },
      { status: 200 },
    )
  }
}
