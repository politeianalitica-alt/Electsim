/**
 * /api/tercer-sector/licitaciones/analizar · Tercer Sector v3 · Sprint TS2-lic-doc
 *
 * Análisis de pliegos de licitación por IA. Recibe la URL de un documento de
 * licitación (o varias) y devuelve sus REQUISITOS de forma ESTRUCTURADA,
 * extraídos por Gemini:
 *   - PDF  → Gemini multimodal NATIVO (el PDF viaja como inline_data base64).
 *   - DOCX → texto con mammoth → Gemini.
 *   - XLSX → texto/tablas con xlsx/SheetJS → Gemini.
 *   - HTML/TXT → texto → Gemini.
 * Ver `lib/tercer-sector/analizar-pliego.ts`.
 *
 * Método: POST.
 *   Body (uno de):
 *     { "url": "https://.../pliego.pdf", "titulo"?, "comprador"? }
 *     { "urls": ["https://.../pcap.pdf", "https://.../ppt.docx"], "titulo"?, "comprador"? }
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   un único documento  → { ok, data: RequisitosPliego | null, error?, nota?,
 *                           fetched_at, source_url, formato?, via?, generated_by_llm }
 *   varios documentos   → { ok, resultados: AnalizarPliegoResponse[], fetched_at }
 *
 * Disclaimer: `generated_by_llm: true` cuando el contenido lo produjo el LLM.
 *
 * Auth: requiere GEMINI_API_KEY (server-side, en Vercel env). Sin ella el
 * endpoint degrada con `{ ok:false, error:'no_key', nota }` y HTTP 200.
 *
 * Caché: en memoria por URL (TTL 12h) dentro del lib. Sin caché HTTP (es POST).
 */
import { NextResponse } from 'next/server'
import {
  analizarPliego,
  type AnalizarPliegoResponse,
} from '@/lib/tercer-sector/analizar-pliego'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** Límite de documentos por petición batch (evita timeouts en Vercel). */
const MAX_URLS = 5

interface AnalizarBody {
  url?: unknown
  urls?: unknown
  titulo?: unknown
  comprador?: unknown
  noCache?: unknown
}

const META = {
  source: 'gemini',
  source_label: 'Análisis de pliegos por IA · Google Gemini (multimodal)',
  env_hint: 'GEMINI_API_KEY',
  note:
    'Requisitos extraídos por LLM de documentos de licitación (PDF nativo / DOCX / XLSX / HTML / TXT). ' +
    'Contenido orientativo generado por IA: verificar siempre contra el pliego oficial.',
} as const

function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
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

  // ── Modo batch: { urls: [...] } ──────────────────────────────────────────
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

    let resultados: AnalizarPliegoResponse[]
    try {
      resultados = await Promise.all(
        urls.map((url) => analizarPliego(url, { titulo, comprador, noCache })),
      )
    } catch (e: unknown) {
      // analizarPliego no lanza, pero por si acaso degradamos a 200.
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

    return NextResponse.json(
      {
        ok: resultados.some((r) => r.ok),
        resultados,
        fetched_at,
        _meta: META,
      },
      { status: 200 },
    )
  }

  // ── Modo simple: { url: "..." } ──────────────────────────────────────────
  const url = asString(body.url)
  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        error: 'falta_url',
        nota: 'Envía { url } o { urls: [] } con la(s) URL(s) del/los documento(s) de licitación.',
        fetched_at,
        _meta: META,
      },
      { status: 200 },
    )
  }

  try {
    const res = await analizarPliego(url, { titulo, comprador, noCache })
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
